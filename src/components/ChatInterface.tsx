import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Sparkles } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Conversation } from "./MemoryApp";
import { useAuth } from "@/contexts/AuthContext";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessage {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  relatedConversations?: string[];
  sources?: Array<{
    id: string;
    title: string;
    type: string;
    relevance_score: number;
    metadata?: any;
  }>;
  retrievedDocuments?: number;
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
  const { currentUser } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const queryRAG = async (query: string) => {
    try {
      // Get Firebase ID token for authentication
      const token = currentUser ? await currentUser.getIdToken() : null;
      
      const response = await fetch(
        "https://12484f40-7983-4c27-b7d7-4b2f4efa749b-00-zvkwzd4ad4mt.worf.replit.dev/rag-query",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { "Authorization": `Bearer ${token}` }),
          },
          body: JSON.stringify({
            query: query,
            max_results: 5
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`RAG query failed: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.status === "success") {
        return {
          answer: result.answer,
          sources: result.sources || [],
          retrievedDocuments: result.retrieved_documents || 0
        };
      } else {
        throw new Error("RAG query returned error status");
      }
    } catch (error) {
      console.error("Error querying RAG:", error);
      return {
        answer: "I'm sorry, I'm having trouble accessing your conversation memories right now. Please try again later.",
        sources: [],
        retrievedDocuments: 0
      };
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    const currentQuery = inputValue;
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const ragResult = await queryRAG(currentQuery);
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: ragResult.answer,
        isUser: false,
        timestamp: new Date(),
        relatedConversations: ragResult.sources.map(s => s.id),
        sources: ragResult.sources,
        retrievedDocuments: ragResult.retrievedDocuments
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error("Error processing message:", error);
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm sorry, I encountered an error while processing your request. Please try again.",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
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
                  <div className="text-sm leading-relaxed prose prose-sm max-w-none prose-invert">
                    <Markdown remarkPlugins={[remarkGfm]}>{message.content}</Markdown>
                  </div>
                </div>
                
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Sources ({message.retrievedDocuments || message.sources.length} documents)
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {message.sources.slice(0, 3).map((source, index) => (
                        <Badge 
                          key={index} 
                          variant="outline" 
                          className="text-xs px-1 py-0.5"
                          title={`Relevance: ${(source.relevance_score * 100).toFixed(1)}%`}
                        >
                          {source.title}
                        </Badge>
                      ))}
                      {message.sources.length > 3 && (
                        <Badge variant="outline" className="text-xs px-1 py-0.5">
                          +{message.sources.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
                
                {message.relatedConversations && message.relatedConversations.length > 0 && !message.sources && (
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
          {conversations.length > 0 ? (
            // Get unique people names from conversations
            Array.from(new Set(
              conversations.flatMap(conv => 
                conv.participants || []
              )
            )).slice(0, 4).map((person, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setInputValue(`What did ${person} say?`)}
              >
                What did {person} say?
              </Badge>
            ))
          ) : (
            // Fallback suggestions when no conversations exist
            [
              "What did we discuss about quarterly goals?",
              "Who mentioned authentication systems?",
              "Show me conversations about project planning",
              "What decisions were made about the database?",
            ].map((suggestion, index) => (
              <Badge
                key={index}
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => setInputValue(suggestion)}
              >
                {suggestion}
              </Badge>
            ))
          )}
        </div>
      </div>
    </div>
  );
};