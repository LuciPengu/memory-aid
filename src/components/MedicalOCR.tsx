import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, Calendar as CalendarIcon, Clock, Pill, Plus, Bell } from "lucide-react";
import { format } from "date-fns";

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date;
  endDate?: Date;
  instructions: string;
  documentImage?: string;
  reminders: MedicationReminder[];
}

export interface MedicationReminder {
  id: string;
  medicationId: string;
  time: string;
  enabled: boolean;
}

export const MedicalOCR = () => {
  const [medications, setMedications] = useState<Medication[]>([
    {
      id: "1",
      name: "Lisinopril",
      dosage: "10mg",
      frequency: "Once daily",
      startDate: new Date(),
      instructions: "Take with food, preferably in the morning",
      reminders: [
        { id: "1", medicationId: "1", time: "09:00", enabled: true }
      ]
    }
  ]);

  const [isScanning, setIsScanning] = useState(false);
  const [scannedText, setScannedText] = useState("");
  const [isAddingMed, setIsAddingMed] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [newMedication, setNewMedication] = useState({
    name: "",
    dosage: "",
    frequency: "",
    instructions: "",
    reminderTimes: ["09:00"]
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsScanning(true);

      try {
        // Convert file to data URL
        const reader = new FileReader();
        const imageDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Send to medication calendar endpoint
        const response = await fetch('https://12484f40-7983-4c27-b7d7-4b2f4efa749b-00-zvkwzd4ad4mt.worf.replit.dev/medication-calendar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image_url: imageDataUrl
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to process prescription: ${response.status}`);
        }

        const result = await response.json();

        if (result.status === "success" && result.medication_info) {
          const medicines = result.medication_info.medicines || [];
          const calendarLinks = Array.isArray(result.calendar_links) ? result.calendar_links : [];
          const startDate = new Date(result.medication_info.start_date);

          // Helper function to parse frequency
          const parseFrequency = (frequencyText: string): string => {
            if (!frequencyText) return "1x daily";
            if (frequencyText.includes("Every 4 hours")) return "6x daily";
            if (frequencyText.includes("Every 6 hours")) return "4x daily";
            if (frequencyText.includes("Every 8 hours")) return "3x daily";
            if (frequencyText.includes("Every 12 hours")) return "2x daily";
            if (frequencyText.includes("Once a day") || frequencyText.includes("Daily")) return "1x daily";
            return frequencyText; // fallback to original text
          };

          // Get duration from calendar links (fallback to 7 days)
          const getDuration = (medicineName: string): number => {
            if (!Array.isArray(calendarLinks) || calendarLinks.length === 0) return 7;
            const link = calendarLinks.find((link: any) => link && link.medicine === medicineName);
            return link?.duration_days || 7;
          };

          // Get reminder times from calendar links
          const getReminderTimes = (medicineName: string): string[] => {
            if (!Array.isArray(calendarLinks) || calendarLinks.length === 0) return ["09:00"];
            const link = calendarLinks.find((link: any) => link && link.medicine === medicineName);
            return Array.isArray(link?.all_dose_times) ? link.all_dose_times : ["09:00"];
          };

          // Create detailed scanned text from the API response
          const medicationList = Array.isArray(medicines) ? medicines.map((med: any) => {
            if (!med || !med.name) return "Invalid medication data";
            const duration = getDuration(med.name);
            const frequency = parseFrequency(med.frequency);
            return `Medication: ${med.name}\nDosage: ${med.dosage || "Not specified"}\nFrequency: ${frequency}\nTiming: ${med.timing || "As prescribed"}\nDuration: ${duration} days\nInstructions: ${med.special_instructions || "Follow prescription"}`;
          }).join('\n\n') : "No medications found";

          setScannedText(`Prescription processed successfully:\n\n${medicationList}\n\nStart Date: ${startDate.toLocaleDateString()}\n\nTotal calendar events created: ${result.total_events}`);

          // Convert file to data URL for local storage
          const reader = new FileReader();
          const imageDataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Auto-fill with first medication for manual adding if needed
          if (medicines.length > 0) {
            const firstMed = medicines[0];
            const firstMedFrequency = parseFrequency(firstMed.frequency);
            const firstMedTimes = getReminderTimes(firstMed.name);

            setNewMedication({
              name: firstMed.name,
              dosage: firstMed.dosage,
              frequency: firstMedFrequency,
              instructions: `${firstMed.timing}. ${firstMed.special_instructions}`.trim(),
              reminderTimes: firstMedTimes
            });
            setSelectedDate(startDate);
          }

          // Add all medications to the list
          const newMedications = Array.isArray(medicines) ? medicines.filter((med: any) => med && med.name).map((med: any, index: number) => {
            const reminderTimes = getReminderTimes(med.name);
            const duration = getDuration(med.name);
            const frequency = parseFrequency(med.frequency);

            const medication: Medication = {
              id: `${Date.now()}-${index}`,
              name: med.name,
              dosage: med.dosage || "Not specified",
              frequency: frequency,
              startDate: startDate,
              endDate: new Date(startDate.getTime() + (duration * 24 * 60 * 60 * 1000)), // Add duration to start date
              instructions: `${med.timing || "As prescribed"}. ${med.special_instructions || ""}`.trim(),
              documentImage: imageDataUrl,
              reminders: Array.isArray(reminderTimes) ? reminderTimes.map((time: string, timeIndex: number) => ({
                id: `${Date.now()}-${index}-${timeIndex}`,
                medicationId: `${Date.now()}-${index}`,
                time: time || "09:00",
                enabled: true
              })) : [{
                id: `${Date.now()}-${index}-0`,
                medicationId: `${Date.now()}-${index}`,
                time: "09:00",
                enabled: true
              }]
            };

            return medication;
          }) : [];

          setMedications(prev => [...prev, ...newMedications]);

          setIsScanning(false);

          toast({
            title: "Prescription processed successfully",
            description: `${medicines.length} medication(s) added with ${result.total_events} calendar reminders`,
            action: result.calendar_links?.length > 0 ? {
              label: "Open Calendar",
              onClick: () => window.open(result.calendar_links[0].calendar_url, '_blank')
            } : undefined
          });

          // Show calendar links if available
          if (Array.isArray(result.calendar_links) && result.calendar_links.length > 0) {
            setTimeout(() => {
              toast({
                title: "Calendar reminders ready",
                description: "Click to add medication reminders to your calendar",
                action: {
                  label: "Add to Calendar",
                  onClick: () => {
                    result.calendar_links.filter((link: any) => link && link.calendar_url).forEach((link: any) => {
                      window.open(link.calendar_url, '_blank');
                    });
                  }
                }
              });
            }, 2000);
          }
        } else {
          throw new Error(result.error || "Failed to process prescription");
        }
      } catch (error) {
        console.error("Error processing prescription:", error);
        setIsScanning(false);

        toast({
          title: "Processing failed",
          description: error instanceof Error ? error.message : "Failed to process prescription image",
          variant: "destructive",
        });
      }
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const addMedication = () => {
    if (!newMedication.name || !selectedDate) return;

    const medication: Medication = {
      id: Date.now().toString(),
      name: newMedication.name,
      dosage: newMedication.dosage,
      frequency: newMedication.frequency,
      startDate: selectedDate,
      instructions: newMedication.instructions,
      reminders: newMedication.reminderTimes.map((time, index) => ({
        id: `${Date.now()}-${index}`,
        medicationId: Date.now().toString(),
        time,
        enabled: true
      }))
    };

    setMedications(prev => [...prev, medication]);
    setNewMedication({
      name: "",
      dosage: "",
      frequency: "",
      instructions: "",
      reminderTimes: ["09:00"]
    });
    setSelectedDate(undefined);
    setScannedText("");
    setIsAddingMed(false);

    toast({
      title: "Medication added",
      description: "Reminders have been set up",
    });
  };

  const toggleReminder = (medicationId: string, reminderId: string) => {
    setMedications(prev => prev.map(med => {
      if (med.id === medicationId) {
        return {
          ...med,
          reminders: med.reminders.map(reminder => 
            reminder.id === reminderId 
              ? { ...reminder, enabled: !reminder.enabled }
              : reminder
          )
        };
      }
      return med;
    }));
  };

  const createCalendarReminders = async (medication: Medication) => {
    if (!medication.documentImage) {
      toast({
        title: "No document available",
        description: "This medication doesn't have an associated prescription image",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Creating calendar reminders",
        description: "Generating medication schedule...",
      });

      // Convert data URL back to blob for FormData
      const response = await fetch(medication.documentImage);
      const blob = await response.blob();

      const formData = new FormData();
      formData.append('image', blob, 'medication.jpg');

      const apiResponse = await fetch('https://12484f40-7983-4c27-b7d7-4b2f4efa749b-00-zvkwzd4ad4mt.worf.replit.dev/medication-calendar', {
        method: 'POST',
        body: formData,
      });

      if (!apiResponse.ok) {
        throw new Error(`Failed to create calendar: ${apiResponse.status}`);
      }

      const result = await apiResponse.json();

      if (result.status === "success" && result.calendar_links?.length > 0) {
        // Filter calendar links for this specific medication
        const medicationLinks = result.calendar_links.filter((link: any) => 
          link.medicine.toLowerCase() === medication.name.toLowerCase()
        );

        if (medicationLinks.length > 0) {
          toast({
            title: "Calendar reminders ready",
            description: `${medicationLinks.length} reminders created for ${medication.name}`,
            action: {
              label: "Open Calendar",
              onClick: () => {
                medicationLinks.forEach((link: any) => {
                  window.open(link.calendar_url, '_blank');
                });
              }
            }
          });
        } else {
          toast({
            title: "All calendar reminders ready",
            description: `${result.total_events} total reminders created`,
            action: {
              label: "Open All Calendars",
              onClick: () => {
                result.calendar_links.forEach((link: any) => {
                  window.open(link.calendar_url, '_blank');
                });
              }
            }
          });
        }
      } else {
        throw new Error("No calendar links generated");
      }
    } catch (error) {
      console.error("Calendar creation error:", error);
      toast({
        title: "Calendar creation failed",
        description: error instanceof Error ? error.message : "Failed to create calendar reminders",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Medical Documents & Meds</h2>
        <p className="text-muted-foreground">
          Scan prescriptions and manage your medication schedule
        </p>
      </div>

      {/* OCR Scanning Section */}
      <Card className="p-6 bg-gradient-secondary border-0">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-center">Scan Prescription</h3>

          <div className="flex gap-3 justify-center">
            <Button 
              onClick={handleCameraCapture}
              disabled={isScanning}
              className="bg-primary hover:bg-primary-glow text-primary-foreground"
            >
              <Camera className="mr-2 h-4 w-4" />
              Take Photo
            </Button>
            <Button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isScanning}
              variant="outline"
            >
              <Upload className="mr-2 h-4 w-4" />
              Upload Image
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />

          {isScanning && (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Processing document...</p>
            </div>
          )}

          {scannedText && (
            <div className="bg-secondary/50 p-4 rounded-lg">
              <Label className="text-sm font-medium mb-2 block">Extracted Text:</Label>
              <Textarea 
                value={scannedText} 
                onChange={(e) => setScannedText(e.target.value)}
                className="min-h-32 text-sm"
                placeholder="Scanned text will appear here..."
              />
            </div>
          )}
        </div>
      </Card>

      {/* Add Medication Dialog */}
      <div className="text-center">
        <Dialog open={isAddingMed} onOpenChange={setIsAddingMed}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary-glow text-primary-foreground">
              <Plus className="mr-2 h-4 w-4" />
              Add Medication
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Medication</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="med-name">Medication Name</Label>
                <Input
                  id="med-name"
                  value={newMedication.name}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Lisinopril"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="dosage">Dosage</Label>
                  <Input
                    id="dosage"
                    value={newMedication.dosage}
                    onChange={(e) => setNewMedication(prev => ({ ...prev, dosage: e.target.value }))}
                    placeholder="e.g., 10mg"
                  />
                </div>
                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select 
                    value={newMedication.frequency} 
                    onValueChange={(value) => setNewMedication(prev => ({ ...prev, frequency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select frequency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Once daily">Once daily</SelectItem>
                      <SelectItem value="Twice daily">Twice daily</SelectItem>
                      <SelectItem value="Three times daily">Three times daily</SelectItem>
                      <SelectItem value="As needed">As needed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Start Date</Label>
                <div className="mt-2">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    className="rounded-md border bg-background p-3 pointer-events-auto"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="instructions">Instructions</Label>
                <Textarea
                  id="instructions"
                  value={newMedication.instructions}
                  onChange={(e) => setNewMedication(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="e.g., Take with food"
                  className="min-h-20"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={addMedication} 
                  disabled={!newMedication.name || !selectedDate}
                  className="flex-1 bg-primary hover:bg-primary-glow text-primary-foreground"
                >
                  Add Medication
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsAddingMed(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Current Medications */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Your Medications</h3>
        {medications.map((medication) => (
          <Card key={medication.id} className="p-4 bg-card border-border">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <Pill className="h-4 w-4 text-primary" />
                    {medication.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {medication.dosage} • {medication.frequency}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Started: {format(medication.startDate, "MMM dd, yyyy")}
                  </p>
                </div>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Active
                </Badge>
              </div>

              {medication.instructions && (
                <p className="text-sm text-muted-foreground bg-secondary/30 p-2 rounded">
                  {medication.instructions}
                </p>
              )}

              <div className="space-y-2">
                <Label className="text-sm font-medium">Reminders:</Label>
                <div className="flex flex-wrap gap-2">
                  {medication.reminders.map((reminder) => (
                    <Button
                      key={reminder.id}
                      variant={reminder.enabled ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleReminder(medication.id, reminder.id)}
                      className={reminder.enabled ? "bg-primary text-primary-foreground" : ""}
                    >
                      <Bell className="mr-1 h-3 w-3" />
                      {reminder.time}
                    </Button>
                  ))}
                </div>
                {medication.documentImage && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => createCalendarReminders(medication)}
                    className="mt-2"
                  >
                    <CalendarIcon className="mr-1 h-3 w-3" />
                    Add to Calendar
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}

        {medications.length === 0 && (
          <Card className="p-8 text-center bg-secondary/30">
            <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No medications yet</h3>
            <p className="text-muted-foreground">
              Scan a prescription or add a medication manually to get started
            </p>
          </Card>
        )}
      </div>
    </div>
  );
};