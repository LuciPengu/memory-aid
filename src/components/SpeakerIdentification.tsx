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
import { useAuth } from "@/contexts/AuthContext";

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
  const [speakerMapping, setSpeakerMapping] = useState<{ [key: string]: string }>({});
  const { currentUser } = useAuth();

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
    // Only auto-assign if there are no existing assignments
    if (Object.keys(selectedSpeakers).length > 0) return;

    const autoAssignments: { [key: string]: string } = {};
    const initialSpeakerMapping: { [key: string]: string } = {};

    // Get unique AI speakers
    const aiSpeakers = [...new Set(segments.map(s => s.suggestedSpeaker).filter(Boolean))];

    // Auto-map AI speakers to people
    aiSpeakers.forEach((aiSpeaker, index) => {
      const assignedPerson = people[index] || people[0];
      if (assignedPerson) {
        initialSpeakerMapping[aiSpeaker] = assignedPerson.id;
      }
    });

    setSpeakerMapping(initialSpeakerMapping);

    // Assign segments based on mapping
    segments.forEach(segment => {
      if (segment.suggestedSpeaker && initialSpeakerMapping[segment.suggestedSpeaker]) {
        autoAssignments[segment.id] = initialSpeakerMapping[segment.suggestedSpeaker];
      }
    });

    setSelectedSpeakers(autoAssignments);
  }, [segments.length]); // Only depend on segments length, not the full segments array or people

  const handleSpeakerSelect = (segmentId: string, speakerId: string) => {
    console.log(`Assigning segment ${segmentId} to speaker ${speakerId}`);
    setSelectedSpeakers(prev => {
      const updated = {
        ...prev,
        [segmentId]: speakerId
      };
      console.log('Updated speaker assignments:', updated);
      return updated;
    });
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
      // Initialize with current content (either edited version or original)
      const currentText = editedTexts[segmentId] || segment.content;
      setEditedTexts(prev => ({
        ...prev,
        [segmentId]: currentText
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
    // Don't reset the edited text, just exit editing mode
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

  const handleComplete = async () => {
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

    // Send conversation to server
    try {
      const conversationData = {
        title: `Conversation ${new Date().toLocaleDateString()}`,
        date: new Date().toISOString(),
        participants: [...new Set(conversationSegments.map(s => s.speakerName))],
        segments: conversationSegments.map(segment => ({
          id: segment.id,
          speakerId: segment.speakerId,
          speakerName: segment.speakerName,
          content: segment.content,
          timestamp: segment.timestamp,
          startTime: segment.startTime,
          endTime: segment.endTime
        }))
      };

      console.log('Sending conversation to server:', conversationData);

      const idToken = currentUser ? await currentUser.getIdToken() : null;

      const response = await fetch(
        "https://12484f40-7983-4c27-b7d7-4b2f4efa749b-00-zvkwzd4ad4mt.worf.replit.dev/save-conversation",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
          },
          body: JSON.stringify(conversationData),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save conversation: ${response.status}`);
      }

      const result = await response.json();
      console.log('Conversation saved successfully:', result);

    } catch (error) {
      console.error('Error saving conversation to server:', error);
      // Continue with local handling even if server save fails
    }

    onSpeakerIdentified(people[0].id, conversationSegments);
  };

  const allSegmentsAssigned = segments.every(segment => selectedSpeakers[segment.id]);

  const handleBulkReassign = (fromSpeakerId: string, toSpeakerId: string) => {
    setSelectedSpeakers(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(segmentId => {
        if (updated[segmentId] === fromSpeakerId) {
          updated[segmentId] = toSpeakerId;
        }
      });
      return updated;
    });
  };

  const handleSpeakerMappingChange = (aiSpeaker: string, personId: string) => {
    setSpeakerMapping(prev => ({
      ...prev,
      [aiSpeaker]: personId
    }));

    // Update all segments that were assigned to this AI speaker
    setSelectedSpeakers(prev => {
      const updated = { ...prev };
      segments.forEach(segment => {
        if (segment.suggestedSpeaker === aiSpeaker) {
          updated[segment.id] = personId;
        }
      });
      return updated;
    });
  };

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

      {/* AI Speaker Mapping */}
      {Object.keys(speakerMapping).length > 0 && (
        <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <h3 className="text-sm font-medium mb-3 text-blue-900 dark:text-blue-100">AI Speaker Mapping</h3>
          <p className="text-xs text-blue-700 dark:text-blue-300 mb-3">
            Reassign who each AI-detected speaker actually is:
          </p>
          <div className="space-y-3">
            {Object.entries(speakerMapping).map(([aiSpeaker, currentPersonId]) => {
              const currentPerson = people.find(p => p.id === currentPersonId);
              const segmentCount = segments.filter(s => s.suggestedSpeaker === aiSpeaker).length;

              return (
                <div key={aiSpeaker} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                      {aiSpeaker}
                    </Badge>
                    <span className="text-xs text-muted-foreground">({segmentCount} segments)</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">is actually:</span>
                    <div className="flex gap-1">
                      {people.map((person) => (
                        <Button
                          key={person.id}
                          variant={currentPersonId === person.id ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleSpeakerMappingChange(aiSpeaker, person.id)}
                          className={`text-xs ${
                            currentPersonId === person.id 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-secondary"
                          }`}
                        >
                          {person.name}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
            Click speaker buttons to reassign • Click edit to modify text
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
                      className="opacity-60 group-hover:opacity-100 transition-opacity ml-2 shrink-0"
                      title="Edit text"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Assign to speaker:</Label>
                <div className="flex flex-wrap gap-2">
                  {people.map((person) => (
                    <Button
                      key={person.id}
                      variant={selectedSpeakers[segment.id] === person.id ? "default" : "outline"}
                      size="sm"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSpeakerSelect(segment.id, person.id);
                      }}
                      className={`
                        ${selectedSpeakers[segment.id] === person.id 
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/50" 
                          : "hover:bg-secondary"
                        }
                        transition-all duration-200 cursor-pointer
                      `}
                    >
                      <User className="h-4 w-4 mr-2" />
                      {person.name}
                      {selectedSpeakers[segment.id] === person.id && (
                        <Check className="h-3 w-3 ml-1" />
                      )}
                    </Button>
                  ))}
                </div>
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