import { useCallback, useRef, useState } from "react";
import { useDataProvider } from "ra-core";
import {
  executeAction,
  parseAction,
  SYSTEM_PROMPT,
  type ActionResult,
} from "./chatbotActions";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "google/gemini-2.5-flash-preview";
const STORAGE_KEY = "crm_openrouter_api_key";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  actionResult?: ActionResult;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getApiKey(): string {
  return localStorage.getItem(STORAGE_KEY) ?? "";
}

export function setApiKey(key: string): void {
  localStorage.setItem(STORAGE_KEY, key);
}

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dataProvider = useDataProvider();
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userText: string) => {
      const apiKey = getApiKey();
      if (!apiKey) {
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "user",
            content: userText,
            timestamp: new Date(),
          },
          {
            id: generateId(),
            role: "assistant",
            content:
              "Please set your OpenRouter API key in the Settings page (AI Chatbot section) before using the chatbot.",
            timestamp: new Date(),
          },
        ]);
        return;
      }

      const userMessage: ChatMessage = {
        id: generateId(),
        role: "user",
        content: userText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);

      try {
        // Build conversation history for the API
        const apiMessages = [
          { role: "system" as const, content: SYSTEM_PROMPT },
          ...messages.map((m) => ({
            role: m.role as "user" | "assistant" | "system",
            content: m.content,
          })),
          { role: "user" as const, content: userText },
        ];

        abortControllerRef.current = new AbortController();

        const response = await fetch(OPENROUTER_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: OPENROUTER_MODEL,
            messages: apiMessages,
            max_tokens: 2048,
            temperature: 0.3,
          }),
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => "");
          throw new Error(
            `OpenRouter API error (${response.status}): ${errorBody || response.statusText}`,
          );
        }

        const data = await response.json();
        const assistantContent =
          data.choices?.[0]?.message?.content ?? "No response from AI.";

        // Check if the response contains a CRUD action
        const action = parseAction(assistantContent);

        if (action) {
          // Execute the action against the data provider
          const actionResult = await executeAction(dataProvider, action);

          // Create a message with the action result
          const assistantMessage: ChatMessage = {
            id: generateId(),
            role: "assistant",
            content: assistantContent,
            timestamp: new Date(),
            actionResult,
          };

          setMessages((prev) => [...prev, assistantMessage]);

          // Send the result back to the AI to get a user-friendly summary
          const followUpMessages = [
            ...apiMessages,
            { role: "assistant" as const, content: assistantContent },
            {
              role: "user" as const,
              content: `The action was executed. Here is the result:\n\n${JSON.stringify(actionResult, null, 2)}\n\nPlease summarize this result for the user in a friendly way. Do NOT include another action block.`,
            },
          ];

          const followUpResponse = await fetch(OPENROUTER_API_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: OPENROUTER_MODEL,
              messages: followUpMessages,
              max_tokens: 2048,
              temperature: 0.3,
            }),
            signal: abortControllerRef.current.signal,
          });

          if (followUpResponse.ok) {
            const followUpData = await followUpResponse.json();
            const summaryContent =
              followUpData.choices?.[0]?.message?.content ??
              (actionResult.success
                ? "Action completed successfully."
                : `Action failed: ${actionResult.error}`);

            setMessages((prev) => [
              ...prev,
              {
                id: generateId(),
                role: "assistant",
                content: summaryContent,
                timestamp: new Date(),
              },
            ]);
          }
        } else {
          // No action, just a conversational response
          setMessages((prev) => [
            ...prev,
            {
              id: generateId(),
              role: "assistant",
              content: assistantContent,
              timestamp: new Date(),
            },
          ]);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return; // User cancelled
        }
        const errorMessage =
          err instanceof Error ? err.message : "An unexpected error occurred.";
        setMessages((prev) => [
          ...prev,
          {
            id: generateId(),
            role: "assistant",
            content: `Error: ${errorMessage}`,
            timestamp: new Date(),
          },
        ]);
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, dataProvider],
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const cancelRequest = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
  }, []);

  return {
    messages,
    isLoading,
    sendMessage,
    clearMessages,
    cancelRequest,
  };
}
