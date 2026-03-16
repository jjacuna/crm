import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, MessageSquare, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useChatbot, type ChatMessage, getApiKey } from "./useChatbot";

/**
 * Floating chat widget that provides AI-powered CRM assistant.
 * Renders a bubble button in the bottom-right corner that opens a chat panel.
 */
export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { messages, isLoading, sendMessage, clearMessages, cancelRequest } =
    useChatbot();
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSend = useCallback(() => {
    const text = inputValue.trim();
    if (!text || isLoading) return;
    setInputValue("");
    sendMessage(text);
  }, [inputValue, isLoading, sendMessage]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  return (
    <>
      {/* Chat Panel */}
      {isOpen && (
        <div
          className={cn(
            "fixed bottom-20 right-4 z-50 flex flex-col",
            "w-[400px] h-[500px] max-h-[80vh]",
            "bg-background border rounded-lg shadow-xl",
            "animate-in slide-in-from-bottom-4 fade-in duration-300",
            // Mobile: full width
            "max-sm:bottom-0 max-sm:right-0 max-sm:left-0 max-sm:top-0 max-sm:w-full max-sm:h-full max-sm:max-h-full max-sm:rounded-none",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-secondary rounded-t-lg max-sm:rounded-t-none">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-secondary-foreground" />
              <h3 className="font-semibold text-secondary-foreground text-sm">
                AI Assistant
              </h3>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-secondary-foreground/70 hover:text-secondary-foreground"
                onClick={clearMessages}
                title="Clear chat"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-secondary-foreground/70 hover:text-secondary-foreground"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {messages.length === 0 && <EmptyState hasApiKey={!!getApiKey()} />}
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && <ThinkingIndicator onCancel={cancelRequest} />}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your CRM..."
                className="flex-1 px-3 py-2 text-sm bg-muted rounded-md border-0 outline-none placeholder:text-muted-foreground/60 focus:ring-1 focus:ring-ring"
                disabled={isLoading}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleSend}
                disabled={!inputValue.trim() || isLoading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bubble Button */}
      <Button
        onClick={() => setIsOpen((prev) => !prev)}
        size="icon"
        className={cn(
          "fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full shadow-lg",
          "transition-transform hover:scale-105",
          isOpen && "max-sm:hidden",
        )}
      >
        {isOpen ? (
          <X className="h-5 w-5" />
        ) : (
          <MessageSquare className="h-5 w-5" />
        )}
      </Button>
    </>
  );
};

const EmptyState = ({ hasApiKey }: { hasApiKey: boolean }) => (
  <div className="flex flex-col items-center justify-center h-full text-center px-4 gap-3">
    <Bot className="h-10 w-10 text-muted-foreground/50" />
    <div>
      <p className="text-sm font-medium text-muted-foreground">
        AI CRM Assistant
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {hasApiKey
          ? "Ask me to find contacts, create deals, update records, or answer questions about your CRM data."
          : "Set your OpenRouter API key in Settings to get started."}
      </p>
    </div>
  </div>
);

const MessageBubble = ({ message }: { message: ChatMessage }) => {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap break-words",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground",
        )}
      >
        {message.content}
      </div>
    </div>
  );
};

const ThinkingIndicator = ({ onCancel }: { onCancel: () => void }) => (
  <div className="flex justify-start">
    <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
      <div className="flex gap-1">
        <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
      </div>
      <button
        onClick={onCancel}
        className="text-xs text-muted-foreground/60 hover:text-muted-foreground ml-2"
      >
        Cancel
      </button>
    </div>
  </div>
);
