import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Conversation } from "./MemoryApp";

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  relatedConversations?: string[];
}

interface ChatInterfaceProps {
  conversations: Conversation[];
}

export const ChatInterface = ({ conversations }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      content: "Hi! I can help you search through your conversation memories. Try asking me about past meetings, specific topics, or what certain people said.",
      isUser: false,
      timestamp: new Date(),
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const searchConversations = (query: string): string[] => {
    const searchTerms = query.toLowerCase().split(' ');
    const relevantConversations: string[] = [];

    conversations.forEach(conversation => {
      const content = [
        conversation.title,
        ...conversation.segments.map(s => s.content),
        ...conversation.participants
      ].join(' ').toLowerCase();

      const hasMatch = searchTerms.some(term => content.includes(term));
      if (hasMatch) {
        relevantConversations.push(conversation.id);
      }
    });

    return relevantConversations;
  };

  const generateResponse = (query: string, relatedConversationIds: string[]) => {
    const relatedConversations = conversations.filter(c => 
      relatedConversationIds.includes(c.id)
    );

    if (relatedConversations.length === 0) {
      return "I couldn't find any conversations related to your query. Try asking about different topics or check your conversation history.";
    }

    // Mock RAG response based on conversations
    const segments = relatedConversations.flatMap(c => c.segments);
    const participants = [...new Set(relatedConversations.flatMap(c => c.participants))];
    
    if (query.toLowerCase().includes('meeting') || query.toLowerCase().includes('discuss')) {
      return `Based on your conversations, I found ${relatedConversations.length} relevant meeting(s). Key participants included ${participants.slice(0, 3).join(', ')}. Main topics discussed were project planning, authentication systems, and database migration strategies.`;
    }
    
    if (query.toLowerCase().includes('who said') || query.toLowerCase().includes('what did')) {
      const randomSegment = segments[Math.floor(Math.random() * segments.length)];
      return `I found this relevant quote from ${randomSegment.speakerName}: "${randomSegment.content}"`;
    }

    return `I found ${relatedConversations.length} conversation(s) that might be relevant to your query. They involved discussions with ${participants.join(', ')} about various topics including project planning and technical decisions.`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate processing time
    setTimeout(() => {
      const relatedConversationIds = searchConversations(inputValue);
      const response = generateResponse(inputValue, relatedConversationIds);

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        isUser: false,
        timestamp: new Date(),
        relatedConversations: relatedConversationIds,
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Chat with Your Memories</h2>
        <p className="text-muted-foreground">
          Ask questions about your past conversations and get AI-powered insights
        </p>
      </div>

      <Card className="h-80 md:h-96 flex flex-col bg-card border-border">{/* Reduced height for mobile */}
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${message.isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className={message.isUser ? "bg-primary text-primary-foreground" : "bg-secondary"}>
                  {message.isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
              
              <div className={`max-w-[80%] ${message.isUser ? 'text-right' : 'text-left'}`}>
                <div
                  className={`p-3 rounded-lg ${
                    message.isUser
                      ? 'bg-primary text-primary-foreground ml-auto'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                
                {message.relatedConversations && message.relatedConversations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    <Sparkles className="h-3 w-3 text-muted-foreground mt-1" />
                    <span className="text-xs text-muted-foreground">
                      Found in {message.relatedConversations.length} conversation(s)
                    </span>
                  </div>
                )}
                
                <span className="text-xs text-muted-foreground mt-1 block">
                  {message.timestamp.toLocaleTimeString()}
                </span>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-secondary">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-secondary p-3 rounded-lg">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask about your conversations..."
              className="flex-1"
              disabled={isTyping}
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={!inputValue.trim() || isTyping}
              size="icon"
              className="bg-primary hover:bg-primary-glow text-primary-foreground"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Suggestions */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Try asking:</Label>
        <div className="flex flex-wrap gap-2">
          {[
            "What did we discuss in the last meeting?",
            "Who mentioned authentication?",
            "Show me conversations about planning",
          ].map((suggestion, index) => (
            <Badge
              key={index}
              variant="outline"
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
              onClick={() => setInputValue(suggestion)}
            >
              {suggestion}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};