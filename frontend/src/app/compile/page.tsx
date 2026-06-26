"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  FileText,
  Link as LinkIcon,
  Tag,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { api, type CompileResponse } from "@/lib/api";
import {
  Button,
  Textarea,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  TagGroup,
  LoadingSpinner,
} from "@/components/ui";
import { useLanguage } from "@/components/providers/language-provider";

export default function CompilePage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompileResponse | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [options, setOptions] = useState({
    extract_concepts: true,
    generate_summary: true,
    find_references: true,
  });

  function toggleOption(key: keyof typeof options) {
    setOptions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function handleCompile() {
    if (!content.trim()) {
      setError(t("compile.input.contentPlaceholder"));
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);

    try {
      const response = await api.compileKnowledge({
        content: content.trim(),
        title: title.trim() || undefined,
        ...options,
      });
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveAsPage() {
    if (!result) return;

    setSaving(true);
    try {
      const pageContent = [
        result.summary ? `## Summary\n\n${result.summary}\n\n` : "",
        content.trim(),
      ].join("");

      const page = await api.createPage({
        title: title.trim() || t("compile.title"),
        content: pageContent,
        tags: result.tags,
      });
      setSaved(true);
      setTimeout(() => {
        router.push(`/pages/${page.slug}`);
      }, 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary-600" />
          {t("compile.title")}
        </h1>
        <p className="text-gray-600 mt-2">
          {t("compile.description")}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-5">
        {/* Input Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-gray-500" />
                {t("compile.input.title")}
              </CardTitle>
              <CardDescription>
                {t("compile.input.description")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  {t("compile.input.titleLabel")}
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("compile.input.titlePlaceholder")}
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none transition-all duration-200"
                />
              </div>

              <Textarea
                label={t("compile.input.contentLabel")}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("compile.input.contentPlaceholder")}
                rows={12}
                helperText={t("compile.input.characters", { count: content.length })}
              />

              {/* Options */}
              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium text-gray-700">{t("compile.options.title")}</p>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.extract_concepts}
                    onChange={() => toggleOption("extract_concepts")}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex items-center gap-2 text-sm text-gray-700 group-hover:text-gray-900">
                    <BookOpen className="w-4 h-4 text-gray-400" />
                    {t("compile.options.extractConcepts")}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.generate_summary}
                    onChange={() => toggleOption("generate_summary")}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex items-center gap-2 text-sm text-gray-700 group-hover:text-gray-900">
                    <FileText className="w-4 h-4 text-gray-400" />
                    {t("compile.options.generateSummary")}
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={options.find_references}
                    onChange={() => toggleOption("find_references")}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="flex items-center gap-2 text-sm text-gray-700 group-hover:text-gray-900">
                    <LinkIcon className="w-4 h-4 text-gray-400" />
                    {t("compile.options.findReferences")}
                  </span>
                </label>
                {options.find_references && (
                  <p className="text-xs text-gray-400 pl-7">
                    {t("compile.options.findReferencesHint")}
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <Button
                onClick={handleCompile}
                loading={loading}
                disabled={!content.trim()}
                className="w-full gap-2"
                size="lg"
              >
                <Sparkles className="w-4 h-4" />
                {t("compile.button")}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        <div className="lg:col-span-3 space-y-6">
          {loading && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-sm text-gray-500">
                  {t("compile.loading")}
                </p>
              </CardContent>
            </Card>
          )}

          {!loading && !result && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {t("compile.ready.title")}
                </h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  {t("compile.ready.description")}
                </p>
              </CardContent>
            </Card>
          )}

          {result && (
            <>
              {/* Summary */}
              {result.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      {t("compile.results.summary")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {result.summary}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Concepts Grid */}
              {result.concepts.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                    {t("compile.results.concepts")}
                    <Badge variant="secondary" size="sm">
                      {t("compile.results.concepts.count", { count: result.concepts.length })}
                    </Badge>
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {result.concepts.map((concept, index) => (
                      <Card key={index} variant="hover">
                        <CardContent className="p-5">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {concept.name}
                          </h3>
                          <p className="text-sm text-gray-600 leading-relaxed mb-3">
                            {concept.description}
                          </p>
                          {concept.related_pages && concept.related_pages.length > 0 && (
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <LinkIcon className="w-3 h-3" />
                              <span>
                                {concept.related_pages.length === 1
                                  ? t("compile.results.concept.relatedPage", { count: concept.related_pages.length })
                                  : t("compile.results.concept.relatedPages", { count: concept.related_pages.length })}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Cross References */}
              {result.cross_references.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <LinkIcon className="w-5 h-5 text-blue-600" />
                      {t("compile.results.references")}
                      <Badge variant="secondary" size="sm">
                        {t("compile.results.references.count", { count: result.cross_references.length })}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {t("compile.results.references.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {result.cross_references.map((ref, index) => (
                        <Link
                          key={index}
                          href={`/pages/${ref.slug}`}
                          className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center transition-colors">
                              <BookOpen className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                                {ref.title}
                              </p>
                              <p className="text-xs text-gray-500">{ref.relationship}</p>
                            </div>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" />
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Tags */}
              {result.tags.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Tag className="w-5 h-5 text-blue-600" />
                      {t("compile.results.tags")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TagGroup tags={result.tags} variant="primary" size="md" />
                  </CardContent>
                </Card>
              )}

              {/* Save Action */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {t("compile.results.save.title")}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {t("compile.results.save.description")}
                      </p>
                    </div>
                    {saved ? (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="text-sm font-medium">{t("compile.results.save.saved")}</span>
                      </div>
                    ) : (
                      <Button
                        onClick={handleSaveAsPage}
                        loading={saving}
                        className="gap-2"
                      >
                        {t("compile.results.save.button")}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
