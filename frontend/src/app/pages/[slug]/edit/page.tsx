"use client";

import { useState, useEffect, use, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Eye, Tag, X } from "lucide-react";
import { api, type Page } from "@/lib/api";
import { Button, Input, Textarea, Card, CardContent, LoadingPage } from "@/components/ui";
import { useLanguage } from "@/components/providers/language-provider";

interface EditPageProps {
  params: Promise<{ slug: string }>;
}

export default function EditPage({ params }: EditPageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const { t } = useLanguage();
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const loadPage = useCallback(async () => {
    try {
      const data = await api.getPage(slug);
      setPage(data);
      setTitle(data.title);
      setContent(data.content);
      setTags(data.tags);
    } catch (error) {
      console.error("Failed to load page:", error);
      alert(t("editor.loadError"));
      router.push("/pages");
    } finally {
      setLoading(false);
    }
  }, [router, slug, t]);

  useEffect(() => {
    void Promise.resolve().then(loadPage);
  }, [loadPage]);

  async function handleSave() {
    if (!title.trim()) {
      alert(t("editor.titleRequired"));
      return;
    }

    try {
      setSaving(true);
      await api.updatePage(slug, {
        title: title.trim(),
        content,
        tags,
      });
      router.push(`/pages/${slug}`);
    } catch (error) {
      console.error("Failed to save page:", error);
      alert(t("editor.saveError"));
    } finally {
      setSaving(false);
    }
  }

  function addTag() {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag("");
    }
  }

  function removeTag(index: number) {
    setTags(tags.filter((_, i) => i !== index));
  }

  if (loading) {
    return <LoadingPage message={t("page.loading")} />;
  }

  if (!page) {
    return null;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Link
          href={`/pages/${slug}`}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("editor.backToPage")}
        </Link>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="gap-2"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? t("editor.edit") : t("editor.preview")}
          </Button>
          <Button onClick={handleSave} loading={saving} className="gap-2">
            <Save className="w-4 h-4" />
            {t("editor.saveChanges")}
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="grid gap-6">
        {/* Title */}
        <Input
          label={t("editor.titleLabel")}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("editor.titlePlaceholder")}
          className="text-lg font-semibold"
        />

        {/* Tags */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t("editor.tagsLabel")}
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm"
              >
                {tag}
                <button
                  onClick={() => removeTag(index)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder={t("editor.addTagPlaceholder")}
              onKeyDown={(e) => e.key === "Enter" && addTag()}
              icon={<Tag className="w-4 h-4" />}
            />
            <Button variant="outline" onClick={addTag}>
              {t("editor.tagsAdd")}
            </Button>
          </div>
        </div>

        {/* Content */}
        {showPreview ? (
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">{t("editor.preview")}</h3>
              <div className="prose max-w-none">
                {content || <p className="text-gray-400 italic">{t("editor.noContent")}</p>}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Textarea
            label={t("editor.contentMarkdown")}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("editor.contentMarkdownPlaceholder")}
            className="min-h-[500px] font-mono"
          />
        )}
      </div>
    </div>
  );
}
