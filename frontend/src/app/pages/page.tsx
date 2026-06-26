"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpen,
  Plus,
  Search,
  Tag,
  Clock,
  FileText,
} from "lucide-react";
import { api, type Page } from "@/lib/api";
import {
  Button,
  Input,
  Card,
  CardContent,
  Badge,
  TagGroup,
  EmptyState,
  LoadingPage,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

export default function PagesPage() {
  const { t } = useLanguage();
  const [pages, setPages] = useState<Page[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);

  const loadPages = useCallback(async () => {
    try {
      const result = await api.getPages({
        limit: 50,
        search: searchQuery || undefined,
        tag: selectedTag || undefined,
      });
      setPages(result.pages);
      setTotal(result.total);
    } catch (error) {
      console.error("Failed to load pages:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedTag]);

  const loadTags = useCallback(async () => {
    try {
      const result = await api.getPopularTags(10);
      setPopularTags(result.tags);
    } catch (error) {
      console.error("Failed to load tags:", error);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadPages);
  }, [loadPages]);

  useEffect(() => {
    void Promise.resolve().then(loadTags);
  }, [loadTags]);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t("pages.title")}</h1>
          <p className="text-gray-600 mt-1">
            {t("pages.count", { count: total })}
          </p>
        </div>
        <Link href="/pages/new">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            {t("pages.new")}
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-8 space-y-4">
        <Input
          placeholder={t("pages.search")}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          icon={<Search className="w-4 h-4" />}
        />

        {popularTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500 py-1">{t("pages.tags")}</span>
            {popularTags.map(({ tag, count }) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm transition-colors ${
                  selectedTag === tag
                    ? "bg-primary-100 text-primary-700"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Tag className="w-3 h-3" />
                {tag}
                <span className="text-xs opacity-75">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pages List */}
      {loading ? (
        <LoadingPage message={t("common.loading")} />
      ) : pages.length === 0 ? (
        <EmptyState
          icon={<FileText className="w-full h-full" />}
          title={searchQuery ? t("pages.empty.searchTitle") : t("pages.empty.title")}
          description={
            searchQuery
              ? t("pages.empty.searchDescription", { query: searchQuery })
              : t("pages.empty.description")
          }
          action={
            !searchQuery && (
              <Link href="/pages/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  {t("pages.empty.create")}
                </Button>
              </Link>
            )
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <Link key={page.id} href={`/pages/${page.slug}`}>
              <Card variant="hover" className="h-full cursor-pointer">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {page.title}
                    </h3>
                    <Badge
                      variant={page.status === "published" ? "success" : "warning"}
                      size="sm"
                    >
                      {page.status === "published" ? t("pages.status.published") : t("pages.status.draft")}
                    </Badge>
                  </div>

                  {page.summary && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                      {page.summary}
                    </p>
                  )}

                  {page.tags.length > 0 && (
                    <div className="mb-4">
                      <TagGroup tags={page.tags.slice(0, 3)} size="sm" />
                      {page.tags.length > 3 && (
                        <span className="text-xs text-gray-400 ml-1">
                          +{page.tags.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(page.updated_at)}
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      {page.content.length} chars
                    </span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
