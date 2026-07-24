import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mic, MicOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/app/voice")({
  head: () => ({ meta: [{ title: "Voice Search · HTE Copilot" }] }),
  component: Voice,
});

function Voice() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const toggle = () => {
    if (listening) {
      setListening(false);
      setTranscript(
        "How do I apply for a post-matric scholarship for OBC students in engineering?",
      );
    } else {
      setListening(true);
      setTranscript("");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-center">
      <header>
        <h1 className="text-3xl font-bold">Voice Search</h1>
        <p className="text-sm text-muted-foreground">
          Ask in English or Marathi. Hear the answer read back to you.
        </p>
      </header>

      <div className="glass rounded-3xl p-10 shadow-elevated">
        <button
          onClick={toggle}
          className={`relative grid h-32 w-32 place-items-center rounded-full gradient-primary shadow-elevated transition-transform ${
            listening ? "scale-110" : "hover:scale-105"
          }`}
        >
          {listening ? (
            <MicOff className="h-12 w-12 text-primary-foreground" />
          ) : (
            <Mic className="h-12 w-12 text-primary-foreground" />
          )}
          {listening && (
            <span className="absolute inset-0 -z-10 animate-ping rounded-full bg-accent/50" />
          )}
        </button>
        <div className="mt-6 text-sm text-muted-foreground">
          {listening ? "Listening… tap to stop" : "Tap the microphone to speak"}
        </div>

        {transcript && (
          <div className="mt-8 rounded-2xl border bg-card p-5 text-left shadow-card">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">
              Transcript
            </div>
            <p className="mt-1 text-base">{transcript}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" className="gradient-primary">
                Search
              </Button>
              <Button size="sm" variant="outline">
                <Volume2 className="mr-1.5 h-4 w-4" /> Play back
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
