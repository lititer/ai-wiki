"use client";

import { useState, useRef, useEffect, useCallback, FormEvent } from "react";
import Link from "next/link";
import { MessageSquareQuote, Send, BookOpen, Sparkles } from "lucide-react";
import { api, QAResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/components/providers/language-provider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: QAResponse["sources"];
  confidence?: number;
}

const SUGGESTED_QUESTION_KEYS = [
  "ask.suggestions.q1",
  "ask.suggestions.q2",
  "ask.suggestions.q3",
  "ask.suggestions.q4",
];

function ConfidenceBadge({ score }: { score: number }) {
  const { t } = useLanguage();
  const percent = Math.round(score * 100);
  let variant: "success" | "warning" | "error" = "success";
  let label = t("ask.confidence.high");
  if (percent < 60) {
    variant = "error";
    label = t("ask.confidence.low");
  } else if (percent < 80) {
    variant = "warning";
    label = t("ask.confidence.medium");
  }
  return (
    <Badge variant={variant} size="md">
      {label} {percent}%
    </Badge>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
    </div>
  );
}

export default function AskPage() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextMessageIdRef = useRef(0);

  const nextMessageId = () => {
    nextMessageIdRef.current += 1;
    return `message-${nextMessageIdRef.current}`;
  };

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading, scrollToBottom]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent, overrideQuestion?: string) => {
    e.preventDefault();
    const question = overrideQuestion ?? input.trim();
    if (!question || loading) return;

    const userMessage: Message = {
      id: nextMessageId(),
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await api.askQuestion(question);
      const assistantMessage: Message = {
        id: nextMessageId(),
        role: "assistant",
        content: response.answer,
        sources: response.sources,
        confidence: response.confidence,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("ask.error"));
    } finally {
      setLoading(false);
    }
  };

  const isEmpty = messages.length === 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] w-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200 shrink-0">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-100 text-blue-600">
          <MessageSquareQuote size={22} />
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900">{t("ask.title")}</h1>
          <p className="text-sm text-gray-500">
            {t("ask.description")}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        {isEmpty && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary-500 text-white mb-6">
              <Sparkles size={32} />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t("ask.empty.title")}
            </h2>
            <p className="text-gray-500 mb-8 max-w-md">
              {t("ask.empty.description")}
            </p>

            {/* Suggested questions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
              {SUGGESTED_QUESTION_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={(e) => handleSubmit(e as unknown as FormEvent, t(key))}
                  className="group text-left p-4 rounded-xl border border-gray-200 bg-white hover:border-primary-300 hover:bg-primary-50 transition-all duration-200 shadow-sm hover:shadow"
                >
                  <div className="flex items-start gap-2">
                    <Sparkles
                      size={16}
                      className="text-primary-400 mt-0.5 shrink-0 group-hover:text-primary-600 transition-colors"
                    />
                    <span className="text-sm text-gray-700 group-hover:text-primary-700 transition-colors">
                      {t(key)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.role === "user" ? (
              <div className="max-w-[80%] bg-primary-600 text-white rounded-2xl rounded-br-md px-4 py-3 shadow-sm">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            ) : (
              <div className="max-w-[85%] space-y-3">
                <Card padding="md" className="rounded-2xl rounded-bl-md shadow-sm">
                  <CardContent>
                    <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </CardContent>
                </Card>

                {/* Meta row: confidence + sources */}
                <div className="flex flex-wrap items-center gap-3 px-1">
                  {msg.confidence !== undefined && (
                    <ConfidenceBadge score={msg.confidence} />
                  )}

                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <BookOpen size={12} />
                        {t("ask.source")}
                      </span>
                      {msg.sources.map((src) => (
                        <Link
                          key={src.page_id}
                          href={`/pages/${src.slug}`}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                        >
                          <BookOpen size={10} />
                          {src.title}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <Card padding="none" className="rounded-2xl rounded-bl-md shadow-sm">
              <TypingIndicator />
            </Card>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              {error}
              <button
                onClick={() => setError(null)}
                className="ml-2 text-red-400 hover:text-red-600"
              >
                &times;
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-4 py-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("ask.placeholder")}
            disabled={loading}
            icon={<MessageSquareQuote size={16} />}
            className="flex-1"
            aria-label={t("ask.inputLabel")}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!input.trim() || loading}
            loading={loading}
          >
            {!loading && <Send size={16} className="mr-1" />}
            {loading ? t("ask.thinking") : t("ask.send")}
          </Button>
        </form>
        <p className="mt-2 text-xs text-center text-gray-400">
          {t("ask.disclaimer")}
        </p>
      </div>
    </div>
  );
}
