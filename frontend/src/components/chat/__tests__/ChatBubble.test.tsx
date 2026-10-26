import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatBubble } from "../ChatBubble";
import type { InsightMessage } from "../../../services/insightService";

const base: InsightMessage = {
  id: "e-1",
  role: "eva",
  content: "Respuesta de EVA",
  timestamp: "2026-10-26T12:00:00.000Z",
};

describe("ChatBubble", () => {
  it("no muestra etiqueta en una respuesta de IA", () => {
    render(<ChatBubble message={{ ...base, isAutomatic: false }} />);
    expect(screen.getByText("Respuesta de EVA")).toBeInTheDocument();
    expect(screen.queryByText("Respuesta automática")).not.toBeInTheDocument();
  });

  it("marca la respuesta por reglas como automática", () => {
    render(<ChatBubble message={{ ...base, isAutomatic: true }} />);
    expect(screen.getByText("Respuesta automática")).toBeInTheDocument();
  });

  it("nunca nombra al proveedor del LLM", () => {
    const { container } = render(<ChatBubble message={{ ...base, isAutomatic: false }} />);
    expect(container.textContent).not.toMatch(/groq|cloudflare|gpt-oss/i);
  });
});
