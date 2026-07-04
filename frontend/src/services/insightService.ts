import { apiClient } from "./apiClient";

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

interface BackendInsightItem {
  id: string;
  question: string;
  insight: string;
  phase: string | null;
  source: string;
  created_at: string;
}

interface BackendInsightHistory {
  total: number;
  limit: number;
  offset: number;
  insights: BackendInsightItem[];
}

export async function getInsightsHistory(): Promise<InsightMessage[]> {
  try {
    const data = await apiClient<BackendInsightHistory>("/insights/history");
    const messages: InsightMessage[] = [];

    for (const item of data.insights) {
      messages.push({
        id: `u-${item.id}`,
        role: "user",
        content: item.question,
        timestamp: item.created_at,
      });
      messages.push({
        id: `e-${item.id}`,
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
  return apiClient<InsightResponse>("/insights", {
    method: "POST",
    body: { question },
  });
}
