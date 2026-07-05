import { useInsights } from "../hooks/useInsights";
import { useRef, useEffect } from "react";
import { ChatBubble } from "../components/chat/ChatBubble";
import { ChatInput } from "../components/chat/ChatInput";
import { Card } from "../components/ui/Card";

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="rounded-2xl rounded-bl-md bg-surface-container-low px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-body-sm text-text-muted">
            EVA está pensando
          </span>
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed-dim animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed-dim animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-primary-fixed-dim animate-bounce [animation-delay:300ms]" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="text-label-md text-text-muted text-center px-2">
      EVA no reemplaza el consejo médico profesional. Ante síntomas graves,
      consultá con tu ginecóloga.
    </p>
  );
}

export default function InsightsPage() {
  const { messages, loading, sending, error, sendQuestion } = useInsights();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-[100dvh] bg-surface">
      <div className="px-4 py-4 border-b border-border-subtle">
        <h1 className="text-headline-sm text-center">
          Asistente EVA
        </h1>
        <p className="text-label-md text-text-muted text-center mt-0.5">
          Tu asistente de salud menstrual
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-fixed-dim border-t-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl text-text-muted mb-3">
              chat
            </span>
            <h2 className="text-headline-sm mb-1">
              ¿En qué puedo ayudarte?
            </h2>
            <p className="text-body-sm text-text-muted max-w-xs">
              Preguntame sobre tu ciclo, síntomas, alimentación o cualquier
              duda de salud menstrual.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))
        )}

        {sending && <TypingIndicator />}

        {error && (
          <Card padding="sm" className="border-error/20 bg-error-container/30">
            <p className="text-body-sm text-on-error-container text-center">{error}</p>
          </Card>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-border-subtle bg-surface space-y-2">
        <ChatInput onSend={sendQuestion} disabled={sending} />
        <Disclaimer />
      </div>
    </div>
  );
}
