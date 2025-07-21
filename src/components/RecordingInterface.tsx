import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, Square, Play, Pause, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface RecordingInterfaceProps {
  onRecordingComplete: (audioBlob: Blob, transcript: string) => void;
}

export const RecordingInterface = ({
  onRecordingComplete,
}: RecordingInterfaceProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showSpeakerDialog, setShowSpeakerDialog] = useState(false);
  const [speakerCount, setSpeakerCount] = useState(2);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();
  const { currentUser } = useAuth();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      const chunks: BlobPart[] = [];
      mediaRecorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: "audio/wav" });
        setRecordedAudio(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

      toast({
        title: "Recording started",
        description: "Speak clearly into your microphone",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      toast({
        title: "Recording stopped",
        description: "Processing your audio...",
      });
    }
  };

  const playRecording = () => {
    if (recordedAudio && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        const audioUrl = URL.createObjectURL(recordedAudio);
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setIsPlaying(true);

        audioRef.current.onended = () => {
          setIsPlaying(false);
        };
      }
    }
  };

  const showSpeakerCountDialog = () => {
    setShowSpeakerDialog(true);
  };

  const processRecording = async () => {
    if (recordedAudio) {
      try {
        toast({
          title: "Processing audio",
          description: "Converting audio and getting transcription...",
        });

        // Convert blob to base64 data URL
        const reader = new FileReader();
        const audioDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(recordedAudio);
        });

        // Get Firebase ID token for authentication
        const token = currentUser ? await currentUser.getIdToken() : null;
        
        // Send the audio data URL to transcription endpoint
        const transcribeResponse = await fetch(
          "https://12484f40-7983-4c27-b7d7-4b2f4efa749b-00-zvkwzd4ad4mt.worf.replit.dev/transcribe",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token && { "Authorization": `Bearer ${token}` }),
            },
            body: JSON.stringify({
              audio_url: audioDataUrl,
              language: "en",
              num_speakers: speakerCount,
            }),
          },
        );

        if (!transcribeResponse.ok) {
          throw new Error(`Transcription failed: ${transcribeResponse.status}`);
        }

        const transcribeResult = await transcribeResponse.json();

        // Handle the new diarized_conversation payload format
        if (transcribeResult && 
            transcribeResult.status === "success" && 
            transcribeResult.diarized_conversation && 
            Array.isArray(transcribeResult.diarized_conversation)) {
          
          const diarizedSegments = transcribeResult.diarized_conversation;
          const fullTranscript = transcribeResult.raw_transcription?.text || 
                                diarizedSegments.map(seg => seg.text).join(' ');
          
          // Convert diarized segments to our format
          const speakerSegments = diarizedSegments.map((segment, index) => ({
            id: index.toString(),
            speaker: segment.speaker,
            text: segment.text.trim(),
            timestamp: [segment.start, segment.end],
            start: segment.start,
            end: segment.end
          }));

          // Store the structured data for later use in speaker identification
          const audioWithMetadata = Object.assign(recordedAudio, {
            speakerSegments: speakerSegments,
            summary: transcribeResult.summary
          });

          onRecordingComplete(audioWithMetadata, fullTranscript.trim());

          setRecordedAudio(null);
          setRecordingTime(0);

          toast({
            title: "Processing complete",
            description: `Audio transcribed with ${speakerSegments.length} speaker segments!`,
          });
        } else {
          throw new Error("Invalid transcription response format or processing failed");
        }
      } catch (error) {
        console.error("Error processing audio:", error);
        toast({
          title: "Processing failed",
          description:
            error instanceof Error ? error.message : "Failed to process audio",
          variant: "destructive",
        });
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">Record Conversation</h2>
        <p className="text-muted-foreground">
          Click the microphone to start recording your conversation
        </p>
      </div>

      <Card className="p-6 md:p-8 text-center bg-gradient-secondary border-0">
        <div className="space-y-6">
          {/* Recording Visualization */}
          <div className="flex justify-center">
            <div
              className={`
              relative p-6 md:p-8 rounded-full transition-all duration-300 cursor-pointer touch-manipulation
              ${
                isRecording
                  ? "bg-gradient-recording shadow-recording animate-pulse-recording"
                  : "bg-gradient-primary shadow-glow hover:scale-105 active:scale-95"
              }
            `}
            >
              <Mic className="h-10 w-10 md:h-12 md:w-12 text-white" />
              {isRecording && (
                <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
              )}
            </div>
          </div>

          {/* Recording Controls */}
          <div className="space-y-4">
            {/* rest of controls remain the same */}
            {!isRecording && !recordedAudio && (
              <Button
                onClick={startRecording}
                size="lg"
                className="bg-primary hover:bg-primary-glow text-primary-foreground"
              >
                <Mic className="mr-2 h-4 w-4" />
                Start Recording
              </Button>
            )}

            {isRecording && (
              <div className="space-y-4">
                <div className="text-2xl font-mono text-foreground">
                  {formatTime(recordingTime)}
                </div>
                <Button onClick={stopRecording} size="lg" variant="destructive">
                  <Square className="mr-2 h-4 w-4" />
                  Stop Recording
                </Button>
              </div>
            )}

            {recordedAudio && (
              <div className="space-y-4">
                <div className="text-muted-foreground">
                  Recording complete ({formatTime(recordingTime)})
                </div>
                <div className="flex gap-3 justify-center">
                  <Button onClick={playRecording} variant="outline">
                    {isPlaying ? (
                      <Pause className="mr-2 h-4 w-4" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <Button
                    onClick={showSpeakerCountDialog}
                    className="bg-primary hover:bg-primary-glow text-primary-foreground"
                  >
                    Process Recording
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      <audio ref={audioRef} className="hidden" />

      {/* Speaker Count Dialog */}
      <Dialog open={showSpeakerDialog} onOpenChange={setShowSpeakerDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              How many speakers?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Knowing the expected number of speakers helps improve the accuracy of speaker identification.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="speakerCount">Number of speakers in this recording</Label>
              <Input
                id="speakerCount"
                type="number"
                min="1"
                max="10"
                value={speakerCount}
                onChange={(e) => setSpeakerCount(parseInt(e.target.value) || 2)}
                className="text-center text-lg font-semibold"
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((count) => (
                <Button
                  key={count}
                  variant={speakerCount === count ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSpeakerCount(count)}
                  className="aspect-square"
                >
                  {count}
                </Button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                onClick={() => {
                  setShowSpeakerDialog(false);
                  processRecording();
                }}
                className="flex-1 bg-primary hover:bg-primary-glow text-primary-foreground"
              >
                Process with {speakerCount} speaker{speakerCount !== 1 ? 's' : ''}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSpeakerDialog(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
