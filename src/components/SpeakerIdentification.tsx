import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, User, Check } from "lucide-react";
import { Person, ConversationSegment } from "./MemoryApp";

interface SpeakerIdentificationProps {
  transcript: string;
  people: Person[];
  onSpeakerIdentified: (speakerId: string, segments: ConversationSegment[]) => void;
  onAddNewPerson: (name: string) => Person;
}

export const SpeakerIdentification = ({ 
  transcript, 
  people, 
  onSpeakerIdentified, 
  onAddNewPerson 
}: SpeakerIdentificationProps) => {
  const [selectedSpeakers, setSelectedSpeakers] = useState<{ [key: string]: string }>({});
  const [newPersonName, setNewPersonName] = useState("");
  const [isAddingPerson, setIsAddingPerson] = useState(false);

  // Check if we have structured speaker data from the transcription
  const segments = (() => {
    // Try to get speaker segments from the audio blob metadata
    const audioBlob = (window as any).currentAudioBlob;
    if (audioBlob?.speakerSegments && Array.isArray(audioBlob.speakerSegments)) {
      return audioBlob.speakerSegments.map((segment: any) => ({
        id: segment.id || segment.speaker + '_' + segment.start,
        content: segment.text,
        timestamp: new Date(Date.now() + (segment.start * 1000)), // Convert seconds to milliseconds
        suggestedSpeaker: segment.speaker, // Store the AI-suggested speaker (Speaker A, Speaker B, etc.)
        startTime: segment.start,
        endTime: segment.end,
        duration: segment.end - segment.start
      }));
    }
    
    // Fallback to simple sentence splitting
    return transcript.split('.').filter(s => s.trim()).map((segment, index) => ({
      id: index.toString(),
      content: segment.trim() + '.',
      timestamp: new Date(Date.now() + index * 30000), // 30 seconds apart
    }));
  })();

  // Auto-assign speakers based on AI suggestions when component mounts
  useEffect(() => {
    const autoAssignments: { [key: string]: string } = {};
    const speakerMapping: { [key: string]: string } = {};
    
    segments.forEach(segment => {
      if (segment.suggestedSpeaker) {
        // Map AI speaker names to people in our list
        if (!speakerMapping[segment.suggestedSpeaker]) {
          // Find the next available person or default to first person
          const availablePerson = people[Object.keys(speakerMapping).length] || people[0];
          speakerMapping[segment.suggestedSpeaker] = availablePerson?.id;
        }
        
        if (speakerMapping[segment.suggestedSpeaker]) {
          autoAssignments[segment.id] = speakerMapping[segment.suggestedSpeaker];
        }
      }
    });
    
    setSelectedSpeakers(autoAssignments);
  }, [segments, people]);

  const handleSpeakerSelect = (segmentId: string, speakerId: string) => {
    setSelectedSpeakers(prev => ({
      ...prev,
      [segmentId]: speakerId
    }));
  };

  const handleAddNewPerson = () => {
    if (newPersonName.trim()) {
      onAddNewPerson(newPersonName.trim());
      setNewPersonName("");
      setIsAddingPerson(false);
    }
  };

  const handleComplete = () => {
    const conversationSegments: ConversationSegment[] = segments.map(segment => {
      const speakerId = selectedSpeakers[segment.id] || people[0].id;
      const speaker = people.find(p => p.id === speakerId) || people[0];
      
      return {
        ...segment,
        speakerId,
        speakerName: speaker.name,
      };
    });

    onSpeakerIdentified(people[0].id, conversationSegments);
  };

  const allSegmentsAssigned = segments.every(segment => selectedSpeakers[segment.id]);

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Identify Speakers</h2>
        <p className="text-muted-foreground">
          Assign each part of the conversation to the correct speaker
        </p>
      </div>

      {/* People Selection */}
      <Card className="p-4 bg-secondary/50">
        <div className="flex items-center justify-between mb-4">
          <Label className="text-sm font-medium">Available People</Label>
          <Dialog open={isAddingPerson} onOpenChange={setIsAddingPerson}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Person
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Person</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newPersonName}
                    onChange={(e) => setNewPersonName(e.target.value)}
                    placeholder="Enter person's name"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddNewPerson()}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddNewPerson} disabled={!newPersonName.trim()}>
                    Add Person
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddingPerson(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex flex-wrap gap-2">
          {people.map((person) => (
            <Badge key={person.id} variant="secondary" className="p-2">
              <Avatar className="h-6 w-6 mr-2">
                <AvatarFallback className="text-xs">
                  {person.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {person.name}
            </Badge>
          ))}
        </div>
      </Card>

      {/* Conversation Segments */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Conversation Segments</h3>
        {segments.map((segment, index) => (
          <Card key={segment.id} className="p-4 bg-card border-border">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Segment {index + 1}
                  </span>
                  {segment.suggestedSpeaker && (
                    <Badge variant="outline" className="text-xs">
                      AI: {segment.suggestedSpeaker}
                    </Badge>
                  )}
                  {segment.startTime !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      {Math.round(segment.startTime)}s - {Math.round(segment.endTime)}s
                    </span>
                  )}
                </div>
                {selectedSpeakers[segment.id] && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
              
              <p className="text-foreground leading-relaxed">
                "{segment.content}"
              </p>
              
              <div className="flex flex-wrap gap-2">
                {people.map((person) => (
                  <Button
                    key={person.id}
                    variant={selectedSpeakers[segment.id] === person.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleSpeakerSelect(segment.id, person.id)}
                    className={selectedSpeakers[segment.id] === person.id ? "bg-primary text-primary-foreground" : ""}
                  >
                    <User className="h-4 w-4 mr-2" />
                    {person.name}
                  </Button>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Complete Button */}
      <div className="text-center">
        <Button 
          onClick={handleComplete}
          size="lg"
          disabled={!allSegmentsAssigned}
          className="bg-primary hover:bg-primary-glow text-primary-foreground"
        >
          Complete Identification
        </Button>
        {!allSegmentsAssigned && (
          <p className="text-sm text-muted-foreground mt-2">
            Please assign all segments to speakers before continuing
          </p>
        )}
      </div>
    </div>
  );
};