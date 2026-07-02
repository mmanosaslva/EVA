import { api } from "./apiClient";

export interface InsightMessage {
  id: string;
  role: "user" | "eva";
  content: string;
  timestamp: string;
}

export interface InsightResponse {
  insight: string;
  source: string;
  disclaimer: string;
}

interface InsightHistoryItem {
  id: string;
  question: string;
  insight: string;
  phase: string | null;
  source: string;
  created_at: string;
}

interface InsightHistoryResponse {
  total: number;
  limit: number;
  offset: number;
  insights: InsightHistoryItem[];
}

export async function getInsightsHistory(): Promise<InsightMessage[]> {
  try {
    const data = await api.get<InsightHistoryResponse>("/insights/history");

    const messages: InsightMessage[] = [];
    for (const item of data.insights) {
      messages.push({
        id: `${item.id}-q`,
        role: "user",
        content: item.question,
        timestamp: item.created_at,
      });
      messages.push({
        id: `${item.id}-a`,
        role: "eva",
        content: item.insight,
        timestamp: item.created_at,
      });
    }
    return messages;
  } catch {
    return [];
  }
}

export async function postInsight(question: string): Promise<InsightResponse> {
  return api.post<InsightResponse>("/insights", {
    question,
    context_cycles: 3,
  });
}
