import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, User, Check, Edit2, Save, X } from "lucide-react";
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
  const [editingSegments, setEditingSegments] = useState<{ [key: string]: boolean }>({});
  const [editedTexts, setEditedTexts] = useState<{ [key: string]: string }>({});

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

  const handleEditText = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (segment) {
      setEditedTexts(prev => ({
        ...prev,
        [segmentId]: editedTexts[segmentId] || segment.content
      }));
      setEditingSegments(prev => ({
        ...prev,
        [segmentId]: true
      }));
    }
  };

  const handleSaveText = (segmentId: string) => {
    setEditingSegments(prev => ({
      ...prev,
      [segmentId]: false
    }));
  };

  const handleCancelEdit = (segmentId: string) => {
    const segment = segments.find(s => s.id === segmentId);
    if (segment) {
      setEditedTexts(prev => ({
        ...prev,
        [segmentId]: segment.content
      }));
    }
    setEditingSegments(prev => ({
      ...prev,
      [segmentId]: false
    }));
  };

  const handleTextChange = (segmentId: string, newText: string) => {
    setEditedTexts(prev => ({
      ...prev,
      [segmentId]: newText
    }));
  };

  const handleComplete = () => {
    const conversationSegments: ConversationSegment[] = segments.map(segment => {
      const speakerId = selectedSpeakers[segment.id] || people[0].id;
      const speaker = people.find(p => p.id === speakerId) || people[0];
      
      return {
        ...segment,
        speakerId,
        speakerName: speaker.name,
        content: editedTexts[segment.id] || segment.content, // Use edited text if available
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

      {/* Speaker Assignment Overview */}
      <Card className="p-4 bg-secondary/30">
        <h3 className="text-sm font-medium mb-3">Speaker Assignment Overview</h3>
        <div className="space-y-2">
          {Object.entries(
            segments.reduce((acc, segment) => {
              const speakerId = selectedSpeakers[segment.id];
              const speaker = people.find(p => p.id === speakerId);
              if (speaker) {
                acc[speaker.name] = (acc[speaker.name] || 0) + 1;
              }
              return acc;
            }, {} as { [key: string]: number })
          ).map(([speakerName, count]) => (
            <div key={speakerName} className="flex justify-between items-center">
              <span className="text-sm text-foreground">{speakerName}</span>
              <Badge variant="secondary">{count} segments</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Conversation Segments */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Conversation Segments</h3>
          <p className="text-sm text-muted-foreground">
            Click speakers to reassign • Hover text to edit
          </p>
        </div>
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
              
              <div className="space-y-2">
                {editingSegments[segment.id] ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editedTexts[segment.id] || segment.content}
                      onChange={(e) => handleTextChange(segment.id, e.target.value)}
                      className="min-h-[80px] resize-none"
                      placeholder="Edit the transcribed text..."
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSaveText(segment.id)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Save className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCancelEdit(segment.id)}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between group">
                    <p className="text-foreground leading-relaxed flex-1">
                      "{editedTexts[segment.id] || segment.content}"
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditText(segment.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>
              
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