"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Save, Eye, Tag, Sparkles } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";

export default function NewPage() {
  const router = useRouter();
  const { t } = useLanguage();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [errors, setErrors] = useState<{ title?: string; content?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isAssisting, setIsAssisting] = useState(false);
  const [assistSuggestions, setAssistSuggestions] = useState<string[]>([]);

  // ---- Tag management ----

  const addTag = useCallback(() => {
    const trimmed = tagInput.trim();
    if (!trimmed) return;
    if (tags.includes(trimmed)) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setTagInput("");
  }, [tagInput, tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }, []);

  const handleTagKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addTag();
      }
    },
    [addTag]
  );

  // ---- Validation ----

  const validate = useCallback((): boolean => {
    const newErrors: { title?: string; content?: string } = {};
    if (!title.trim()) {
      newErrors.title = t("editor.titleRequired");
    }
    if (!content.trim()) {
      newErrors.content = t("editor.contentRequired");
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [title, content, t]);

  // ---- Submit ----

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!validate()) return;

      setIsSubmitting(true);
      try {
        const page = await api.createPage({
          title: title.trim(),
          content: content.trim(),
          tags,
        });
        router.push(`/pages/${page.slug}`);
      } catch (err) {
        setErrors({
          title: err instanceof Error ? err.message : t("editor.createError"),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [title, content, tags, validate, router, t]
  );

  // ---- Writing assistant ----

  const handleWritingAssist = useCallback(async () => {
    if (!content.trim()) {
      setErrors({ content: t("editor.assistNeedContent") });
      return;
    }

    setIsAssisting(true);
    setAssistSuggestions([]);
    try {
      const result = await api.writingAssist({
        content: content.trim(),
        task: "improve",
        context: title.trim() ? t("editor.titleContext", { title: title.trim() }) : undefined,
      });
      if (result.result) {
        setContent(result.result);
      }
      if (result.suggestions.length > 0) {
        setAssistSuggestions(result.suggestions);
      }
    } catch (err) {
      setErrors({
        content:
          err instanceof Error ? err.message : t("editor.assistError"),
      });
    } finally {
      setIsAssisting(false);
    }
  }, [content, title, t]);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">{t("editor.newTitle")}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {t("editor.newDescription")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <Card>
            <CardContent>
              <Input
                label={t("editor.titleLabel")}
                placeholder={t("editor.titlePlaceholder")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />
            </CardContent>
          </Card>

          {/* Content editor */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("editor.contentLabel")}</CardTitle>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                  >
                    <Eye className="w-4 h-4 mr-1.5" />
                    {showPreview ? t("editor.edit") : t("editor.preview")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    loading={isAssisting}
                    onClick={handleWritingAssist}
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    {t("editor.writingAssistant")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {showPreview ? (
                <div className="min-h-[300px] rounded-lg border border-gray-200 bg-gray-50 p-4 prose prose-sm max-w-none">
                  {content.trim() ? (
                    <ReactMarkdown>{content}</ReactMarkdown>
                  ) : (
                    <p className="text-gray-400 italic">{t("editor.contentPlaceholder")}</p>
                  )}
                </div>
              ) : (
                <Textarea
                  placeholder={t("editor.contentPlaceholder")}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  error={errors.content}
                  className="min-h-[300px] font-mono text-sm"
                  rows={12}
                />
              )}

              {/* Writing assistant suggestions */}
              {assistSuggestions.length > 0 && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    {t("editor.writingSuggestions")}
                  </h4>
                  <ul className="space-y-1.5">
                    {assistSuggestions.map((suggestion, i) => (
                      <li
                        key={i}
                        className="text-sm text-blue-800 flex items-start gap-2"
                      >
                        <span className="text-blue-400 mt-0.5">-</span>
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                {t("editor.tagsLabel")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder={t("editor.tagsPlaceholder")}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addTag}
                  disabled={!tagInput.trim()}
                >
                  {t("editor.tagsAdd")}
                </Button>
              </div>

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 text-blue-500 hover:text-blue-700 focus:outline-none"
                      >
                        x
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Submit */}
          <Card>
            <CardFooter>
              <div className="flex items-center justify-between w-full">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.back()}
                >
                  {t("editor.cancel")}
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  <Save className="w-4 h-4 mr-1.5" />
                  {t("editor.create")}
                </Button>
              </div>
            </CardFooter>
          </Card>
        </form>
      </div>
    </div>
  );
}
