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

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setIsScanning(true);
      
      // Mock OCR processing
      setTimeout(() => {
        const mockOCRResult = `
Dr. Sarah Wilson
Medical Center
Phone: (555) 123-4567

Patient: John Doe
DOB: 01/15/1985

Prescription:
Medication: Lisinopril
Dosage: 10mg tablets
Frequency: Once daily
Quantity: 30 tablets
Refills: 2

Instructions: Take with food, preferably in the morning.
Avoid potassium supplements.

Date: ${new Date().toLocaleDateString()}
        `;
        
        setScannedText(mockOCRResult);
        setIsScanning(false);
        
        // Auto-extract medication info
        setNewMedication({
          name: "Lisinopril",
          dosage: "10mg",
          frequency: "Once daily",
          instructions: "Take with food, preferably in the morning",
          reminderTimes: ["09:00"]
        });
        
        toast({
          title: "Document scanned successfully",
          description: "Medication information extracted",
        });
      }, 2000);
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