import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { RecordingInterface } from "./RecordingInterface";
import { SpeakerIdentification } from "./SpeakerIdentification";
import { ChatInterface } from "./ChatInterface";
import { ConversationHistory } from "./ConversationHistory";
import { MedicalOCR } from "./MedicalOCR";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, MessageCircle, History, Users, Pill } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import AuthPage from "./Auth/AuthPage";
import UserProfile from "./UserProfile";


export interface Person {
  id: string;
  name: string;
  avatar?: string;
}

export interface ConversationSegment {
  id: string;
  speakerId: string;
  speakerName: string;
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  title: string;
  date: Date;
  segments: ConversationSegment[];
  participants: string[];
}

export const MemoryApp = () => {
  const { currentUser } = useAuth();
  const [people, setPeople] = useState<Person[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentRecording, setCurrentRecording] = useState<{
    audioBlob?: Blob;
    transcript?: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState("meds");

  // Subscribe to people changes from Firebase Realtime Database
  useEffect(() => {
    if (!currentUser) return;

    console.log("Setting up people subscription for user:", currentUser.uid);

    import("firebase/database").then(({ ref, onValue }) => {
      import("@/lib/firebase").then(({ rtdb }) => {
        const peopleRef = ref(rtdb, `users/${currentUser.uid}/people`);
        const unsubscribe = onValue(peopleRef, (snapshot) => {
          const data = snapshot.val();
          console.log("People data updated:", data);

          if (data) {
            const localPeople = Object.entries(data).map(([id, personData]: [string, any]) => ({
              id,
              name: personData.name,
              avatar: undefined // Keep existing avatar field structure
            }));
            setPeople(localPeople);
          } else {
            setPeople([]);
          }
        });

        return () => {
          console.log("Unsubscribing from people updates");
          unsubscribe();
        };
      });
    });
  }, [currentUser]);

  // Show auth page if user is not logged in
  if (!currentUser) {
    return <AuthPage />;
  }

  const handleRecordingComplete = (audioBlob: Blob, transcript: string) => {
    setCurrentRecording({ audioBlob, transcript });
    // Store the audio blob globally so SpeakerIdentification can access the speaker data
    (window as any).currentAudioBlob = audioBlob;
    setActiveTab("identify");
  };

  const handleSpeakerIdentified = (speakerId: string, segments: ConversationSegment[]) => {
    // Create new conversation
    const newConversation: Conversation = {
      id: Date.now().toString(),
      title: `Conversation ${new Date().toLocaleDateString()}`,
      date: new Date(),
      participants: [...new Set(segments.map(s => s.speakerName))],
      segments
    };

    setConversations(prev => [newConversation, ...prev]);
    setCurrentRecording(null);
    setActiveTab("chat");
  };

  const addNewPerson = (name: string) => {
    const newPerson: Person = {
      id: Date.now().toString(),
      name
    };
    setPeople(prev => [...prev, newPerson]);
    return newPerson;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile-first header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Chatter Memory
            </h1>
            <p className="text-sm text-muted-foreground hidden md:block">
              AI-powered memory & health assistant
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 pb-20 max-w-4xl">
        <UserProfile />
        <Card className="bg-card border-border shadow-glow mt-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            {/* Mobile-optimized tab bar */}
            <TabsList className="grid w-full grid-cols-5 bg-secondary/50 backdrop-blur-sm h-14 md:h-auto">
              <TabsTrigger value="meds" className="flex flex-col items-center gap-1 py-2">
                <Pill className="h-4 w-4" />
                <span className="text-xs">Meds</span>
              </TabsTrigger>
              <TabsTrigger value="record" className="flex flex-col items-center gap-1 py-2">
                <Mic className="h-4 w-4" />
                <span className="text-xs">Record</span>
              </TabsTrigger>
              <TabsTrigger value="identify" className="flex flex-col items-center gap-1 py-2" disabled={!currentRecording}>
                <Users className="h-4 w-4" />
                <span className="text-xs">Identify</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="flex flex-col items-center gap-1 py-2">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs">Chat</span>
              </TabsTrigger>
              <TabsTrigger value="history" className="flex flex-col items-center gap-1 py-2">
                <History className="h-4 w-4" />
                <span className="text-xs">History</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meds" className="p-4 md:p-6">
              <MedicalOCR />
            </TabsContent>

            <TabsContent value="record" className="p-4 md:p-6">
              <RecordingInterface onRecordingComplete={handleRecordingComplete} />
            </TabsContent>

            <TabsContent value="identify" className="p-4 md:p-6">
              {currentRecording && (
                <SpeakerIdentification
                  transcript={currentRecording.transcript || ""}
                  people={people}
                  onSpeakerIdentified={handleSpeakerIdentified}
                  onAddNewPerson={addNewPerson}
                />
              )}
            </TabsContent>

            <TabsContent value="chat" className="p-4 md:p-6">
              <ChatInterface conversations={conversations} people={people} />
            </TabsContent>

            <TabsContent value="history" className="p-4 md:p-6">
              <ConversationHistory conversations={conversations} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default MemoryApp;