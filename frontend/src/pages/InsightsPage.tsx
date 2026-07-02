import { useInsights } from "../hooks/useInsights";
import { useRef, useEffect } from "react";
import { ChatBubble } from "../components/chat/ChatBubble";
import { ChatInput } from "../components/chat/ChatInput";
import { Card } from "../components/ui/Card";

function TypingIndicator() {
  return (
    <div className="flex justify-start mb-3">
      <div className="rounded-2xl rounded-bl-md bg-gray-100 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-text-secondary">
            EVA está pensando
          </span>
          <span className="flex gap-0.5">
            <span className="h-1.5 w-1.5 rounded-full bg-eva-400 animate-bounce [animation-delay:0ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-eva-400 animate-bounce [animation-delay:150ms]" />
            <span className="h-1.5 w-1.5 rounded-full bg-eva-400 animate-bounce [animation-delay:300ms]" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Disclaimer() {
  return (
    <p className="text-[11px] text-text-muted text-center px-2">
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
    <div className="mx-auto max-w-lg flex flex-col h-[100dvh]">
      <div className="px-4 py-4 border-b border-border bg-white">
        <h1 className="text-lg font-bold text-text-primary text-center">
          Hablá con EVA
        </h1>
        <p className="text-xs text-text-muted text-center mt-0.5">
          Tu asistente de salud menstrual
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-eva-300 border-t-eva-600" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-4xl mb-3" aria-hidden="true">💬</span>
            <h2 className="text-base font-semibold text-text-primary mb-1">
              ¿En qué puedo ayudarte?
            </h2>
            <p className="text-sm text-text-secondary max-w-xs">
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
          <Card padding="sm" className="border-red-200 bg-red-50">
            <p className="text-xs text-red-600 text-center">{error}</p>
          </Card>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t border-border bg-white space-y-2">
        <ChatInput onSend={sendQuestion} disabled={sending} />
        <Disclaimer />
      </div>
    </div>
  );
}
