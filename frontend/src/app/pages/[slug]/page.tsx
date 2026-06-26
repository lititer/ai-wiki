"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Clock,
  Calendar,
  Tag as TagIcon,
  FileText,
  ExternalLink,
} from "lucide-react";
import { api, type Page } from "@/lib/api";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  TagGroup,
  LoadingPage,
  EmptyState,
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useLanguage } from "@/components/providers/language-provider";

export default function PageDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const slug = params.slug as string;

  const [page, setPage] = useState<Page | null>(null);
  const [relatedPages, setRelatedPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadPage = useCallback(async () => {
    try {
      const data = await api.getPage(slug);
      setPage(data);

      // Load related pages after main page loads
      try {
        const related = await api.getRelatedPages(slug, 5);
        setRelatedPages(related);
      } catch {
        // Related pages are optional, don't fail the whole page
        setRelatedPages([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("page.loadError"));
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  useEffect(() => {
    void Promise.resolve().then(loadPage);
  }, [loadPage]);

  async function handleDelete() {
    if (!page) return;
    try {
      setDeleting(true);
      await api.deletePage(page.slug);
      router.push("/pages");
    } catch (err) {
      alert(err instanceof Error ? err.message : t("page.deleteError"));
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  }

  if (loading) {
    return <LoadingPage message={t("page.loading")} />;
  }

  if (error || !page) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <EmptyState
          icon={<FileText className="w-full h-full" />}
          title={t("page.notFound")}
          description={error || t("page.notFoundDescription")}
          action={
            <Link href="/pages">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                {t("page.back")}
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Navigation and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <Link
          href="/pages"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("page.back")}
        </Link>

        <div className="flex items-center gap-2">
          <Link href={`/pages/${page.slug}/edit`}>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Edit className="w-4 h-4" />
              {t("page.edit")}
            </Button>
          </Link>
          <Button
            variant="danger"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4" />
            {t("page.delete")}
          </Button>
        </div>
      </div>

      {/* Page Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="text-2xl sm:text-3xl">
                {page.title}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {t("page.created")} {formatDate(page.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {t("page.updated")} {formatDate(page.updated_at)}
                </span>
              </div>
            </div>
            <Badge
              variant={page.status === "published" ? "success" : "warning"}
              size="md"
            >
              {page.status === "published" ? t("pages.status.published") : t("pages.status.draft")}
            </Badge>
          </div>
        </CardHeader>

        {/* Summary */}
        {page.summary && (
          <div className="px-6 pb-4">
            <div className="bg-primary-50 border border-primary-100 rounded-lg p-4">
              <p className="text-sm text-primary-800 leading-relaxed">
                {page.summary}
              </p>
            </div>
          </div>
        )}

        {/* Tags */}
        {page.tags.length > 0 && (
          <div className="px-6 pb-4 flex items-start gap-2">
            <TagIcon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <TagGroup tags={page.tags} variant="primary" size="sm" />
          </div>
        )}
      </Card>

      {/* Page Content */}
      <Card className="mb-8">
        <CardContent className="p-6 sm:p-8">
          <article className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-gray-900 prose-pre:text-gray-100">
            <ReactMarkdown>{page.content}</ReactMarkdown>
          </article>
        </CardContent>
      </Card>

      {/* Related Pages */}
      {relatedPages.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {t("page.related")}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedPages.map((related) => (
              <Link key={related.id} href={`/pages/${related.slug}`}>
                <Card variant="hover" className="h-full cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">
                        {related.title}
                      </h3>
                      <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
                    </div>
                    {related.summary && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">
                        {related.summary}
                      </p>
                    )}
                    {related.tags.length > 0 && (
                      <TagGroup
                        tags={related.tags.slice(0, 2)}
                        size="sm"
                      />
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {t("page.deleteConfirm.title")}
              </h3>
              <p className="text-sm text-gray-600 mb-6">
                {t("page.deleteConfirm.description", { title: page.title })}
              </p>
              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  loading={deleting}
                  onClick={handleDelete}
                >
                  {t("page.delete")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
