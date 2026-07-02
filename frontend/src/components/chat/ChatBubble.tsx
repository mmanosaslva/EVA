import type { InsightMessage } from "../../services/insightService";

interface ChatBubbleProps {
  message: InsightMessage;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "bg-eva-500 text-white rounded-br-md"
            : "bg-gray-100 text-text-primary rounded-bl-md"
        }`}
      >
        <p className="leading-relaxed whitespace-pre-wrap">{message.content}</p>
        <p
          className={`text-[11px] mt-1 ${
            isUser ? "text-eva-100" : "text-text-muted"
          }`}
        >
          {formatTime(message.timestamp)}
        </p>
      </div>
    </div>
  );
}
