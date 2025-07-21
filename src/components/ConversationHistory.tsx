import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Calendar, Users, ChevronDown, ChevronRight, Clock } from "lucide-react";
import { Conversation } from "./MemoryApp";

interface ConversationHistoryProps {
  conversations: Conversation[];
}

export const ConversationHistory = ({ conversations }: ConversationHistoryProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedConversations, setExpandedConversations] = useState<Set<string>>(new Set());
  const [allVectors, setAllVectors] = useState<any[]>([]);

  useEffect(() => {
    const fetchAllVectors = async () => {
      try {
        const response = await fetch('https://12484f40-7983-4c27-b7d7-4b2f4efa749b-00-zvkwzd4ad4mt.worf.replit.dev/list-all-vectors');
        if (response.ok) {
          const data = await response.json();
          if (data.status === "success") {
            setAllVectors(data.vectors);
          } else {
            console.error("Failed to fetch vectors:", data);
          }
        } else {
          console.error("Failed to fetch vectors:", response.status);
        }
      } catch (error) {
        console.error("Error fetching vectors:", error);
      }
    };

    fetchAllVectors();
  }, []);

  const filteredConversations = allVectors.filter(conversation => {
    if (!conversation || !conversation.metadata) return false;

    const searchTerm = searchQuery.toLowerCase();
    const title = conversation.metadata.title || '';
    const participants = Array.isArray(conversation.metadata.participants) ? conversation.metadata.participants : [];
    const document = conversation.document || '';
    
    try {
      return (
        title.toLowerCase().includes(searchTerm) ||
        participants.some((p: string) => p && typeof p === 'string' && p.toLowerCase().includes(searchTerm)) ||
        document.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      console.warn('Error filtering conversation:', error);
      return false;
    }
  });

  const toggleExpanded = (conversationId: string) => {
    setExpandedConversations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(conversationId)) {
        newSet.delete(conversationId);
      } else {
        newSet.add(conversationId);
      }
      return newSet;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;

    return date.toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Conversation History</h2>
        <p className="text-muted-foreground">
          Browse and search through all your recorded conversations
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search conversations..."
          className="pl-10"
        />
      </div>

      {/* Conversations List */}
      <div className="space-y-4">
        {filteredConversations.length === 0 ? (
          <Card className="p-8 text-center bg-secondary/30">
            <div className="space-y-2">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto" />
              <h3 className="text-lg font-medium">
                {searchQuery ? "No conversations found" : "No conversations yet"}
              </h3>
              <p className="text-muted-foreground">
                {searchQuery
                  ? "Try different search terms or check your spelling"
                  : "Start recording conversations to see them here"
                }
              </p>
            </div>
          </Card>
        ) : (
          filteredConversations.map((conversation) => {
            if (!conversation || !conversation.metadata) return null;

            const isExpanded = expandedConversations.has(conversation.id);

            return (
              <Card key={conversation.id} className="bg-card border-border overflow-hidden">
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(conversation.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full p-4 h-auto justify-start hover:bg-secondary/50">
                      <div className="flex items-start gap-3 w-full">
                        <div className="flex-shrink-0 mt-1">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className="flex-1 text-left space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-foreground">{conversation.metadata.title || 'Untitled Conversation'}</h3>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDate(conversation.metadata.date)}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Users className="h-3 w-3 text-muted-foreground" />
                            <div className="flex items-center gap-1">
                              {Array.isArray(conversation.metadata.participants) && conversation.metadata.participants.slice(0, 3).map((participant: string, index: number) => 
                                participant ? (
                                  <Badge key={`participant-${conversation.id}-${index}`} variant="secondary" className="text-xs">
                                    {participant}
                                  </Badge>
                                ) : null
                              )}
                              {Array.isArray(conversation.metadata.participants) && conversation.metadata.participants.length > 3 && (
                                <Badge key={`more-participants-${conversation.id}`} variant="secondary" className="text-xs">
                                  +{conversation.metadata.participants.length - 3}
                                </Badge>
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {conversation.document ? conversation.document.substring(0, 100) + '...' : 'No content available'}
                          </p>
                        </div>
                      </div>
                    </Button>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <Separator />
                    <div className="p-4 space-y-4">
                      <div className="text-sm text-muted-foreground">
                        {conversation.metadata.summary ? (
                          <div className="mb-3 p-3 bg-secondary/30 rounded-lg">
                            <h4 className="font-medium text-foreground mb-1">Summary</h4>
                            <p className="text-sm">{conversation.metadata.summary}</p>
                          </div>
                        ) : null}
                        
                        {conversation.metadata.diarized_segments?.length || conversation.metadata.segments?.length || 0} segments • {formatTime(conversation.metadata.date)}
                      </div>

                      <div className="space-y-3">
                        {/* Display diarized segments if available */}
                        {Array.isArray(conversation.metadata.diarized_segments) && conversation.metadata.diarized_segments.map((segment: any, index: number) => 
                          segment && segment.text ? (
                            <div key={`diarized-${conversation.id}-${index}`} className="flex gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="text-xs bg-secondary">
                                  {segment.speaker || `S${index + 1}`}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {segment.speaker || `Speaker ${index + 1}`}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {segment.start && segment.end ? `${Math.floor(segment.start)}s - ${Math.floor(segment.end)}s` : ''}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed">
                                  {segment.text}
                                </p>
                              </div>
                            </div>
                          ) : null
                        )}
                        
                        {/* Fallback to regular segments if diarized not available */}
                        {!conversation.metadata.diarized_segments && Array.isArray(conversation.metadata.segments) && conversation.metadata.segments.map((segment: any, index: number) => 
                          segment && (segment.content || segment.text) ? (
                            <div key={segment.id || `segment-${conversation.id}-${index}`} className="flex gap-3">
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                <AvatarFallback className="text-xs bg-secondary">
                                  {segment.speakerName ? segment.speakerName.split(' ').map((n: string) => n[0]).join('').toUpperCase() : `S${index + 1}`}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-foreground">
                                    {segment.speakerName || `Speaker ${index + 1}`}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {segment.timestamp ? (typeof segment.timestamp === 'string' ? segment.timestamp : formatTime(segment.timestamp)) : ''}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground leading-relaxed">
                                  {segment.content || segment.text}
                                </p>
                              </div>
                            </div>
                          ) : null
                        )}
                        
                        {/* If no segments available, show raw document */}
                        {!conversation.metadata.diarized_segments && !conversation.metadata.segments && conversation.document && (
                          <div className="p-3 bg-secondary/30 rounded-lg">
                            <p className="text-sm text-foreground leading-relaxed">
                              {conversation.document}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>
      {filteredConversations.length > 0 && (
        <Card className="p-4 bg-secondary/30">
          <div className="text-center text-sm text-muted-foreground">
            Showing {filteredConversations.length} of {allVectors.length} conversations
          </div>
        </Card>
      )}
    </div>
  );
};