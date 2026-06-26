"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { api, SearchResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading";
import { Search, Sparkles, Tag, FileText } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";

type SearchType = "semantic" | "keyword" | "hybrid";

const searchTypeIcons: Record<SearchType, React.ReactNode> = {
  semantic: <Sparkles className="w-4 h-4" />,
  keyword: <Search className="w-4 h-4" />,
  hybrid: <FileText className="w-4 h-4" />,
};

const searchTypeLabelKeys: Record<SearchType, string> = {
  semantic: "search.types.semantic",
  keyword: "search.types.keyword",
  hybrid: "search.types.hybrid",
};

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [searchType, setSearchType] = useState<SearchType>("hybrid");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(!!initialQuery);
  const [error, setError] = useState<string | null>(null);

  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const performSearch = useCallback(
    async (q: string, type: SearchType) => {
      if (!q.trim()) return;
      setLoading(true);
      setError(null);
      setSearched(true);
      setShowSuggestions(false);

      try {
        const res = await api.search(q, { searchType: type });
        setResults(res.results);
        setTotal(res.total);
        // Update URL without triggering navigation
        router.replace(`/search?q=${encodeURIComponent(q)}`, { scroll: false });
      } catch {
        setError(t("search.error"));
        setResults([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [router, t]
  );

  // Load popular tags on mount
  useEffect(() => {
    api
      .getPopularTags(20)
      .then((res) => setPopularTags(res.tags))
      .catch(() => {});
  }, []);

  // Perform initial search from URL params
  useEffect(() => {
    if (initialQuery) {
      void Promise.resolve().then(() => performSearch(initialQuery, searchType));
    }
  }, [initialQuery, performSearch, searchType]);

  // Close suggestions on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query, searchType);
  };

  const handleSearchTypeChange = (type: SearchType) => {
    setSearchType(type);
    if (searched && query.trim()) {
      performSearch(query, type);
    }
  };

  const handleTagClick = (tag: string) => {
    const newTag = selectedTag === tag ? null : tag;
    setSelectedTag(newTag);
    const q = newTag ? `${query} ${newTag}`.trim() : query.replace(tag, "").trim();
    setQuery(q);
    if (q) {
      performSearch(q, searchType);
    }
  };

  // Fetch suggestions on input change with debounce
  const handleInputChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.getSearchSuggestions(value);
        setSuggestions(res.suggestions);
        setShowSuggestions(res.suggestions.length > 0);
      } catch {
        setSuggestions([]);
      }
    }, 300);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion, searchType);
  };

  // Highlight matched text in snippet
  function highlightSnippet(snippet: string): React.ReactNode {
    if (!query.trim()) return snippet;
    const terms = query.trim().split(/\s+/).filter(Boolean);
    const pattern = terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
    if (!pattern) return snippet;
    const regex = new RegExp(`(${pattern})`, "gi");
    const parts = snippet.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-gray-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  }

  const scoreColor = (score: number) => {
    if (score >= 0.8) return "success";
    if (score >= 0.5) return "warning";
    return "secondary";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="w-full px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center justify-center gap-2">
            <Search className="w-8 h-8 text-primary-600" />
            {t("search.title")}
          </h1>
          <p className="mt-2 text-gray-500">{t("search.description")}</p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative" ref={suggestionsRef}>
            <Input
              value={query}
              onChange={(e) => handleInputChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={t("search.placeholder")}
              icon={<Search className="w-5 h-5" />}
              className="text-base py-3"
            />

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSuggestionClick(s);
                    }}
                  >
                    <Search className="w-3.5 h-3.5 text-gray-400" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search Type Selector */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-gray-500 mr-1">{t("search.types.label")}</span>
            {(Object.keys(searchTypeIcons) as SearchType[]).map((type) => (
              <Button
                key={type}
                type="button"
                variant={searchType === type ? "primary" : "outline"}
                size="sm"
                onClick={() => handleSearchTypeChange(type)}
                className="gap-1.5"
              >
                {searchTypeIcons[type]}
                {t(searchTypeLabelKeys[type])}
              </Button>
            ))}
            <Button type="submit" loading={loading} className="ml-auto">
              <Search className="w-4 h-4 mr-1.5" />
              {t("search.button")}
            </Button>
          </div>
        </form>

        {/* Popular Tags */}
        {popularTags.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1.5">
              <Tag className="w-4 h-4" />
              {t("search.popularTags")}
            </h3>
            <div className="flex flex-wrap gap-2">
              {popularTags.map((t) => (
                <button
                  key={t.tag}
                  onClick={() => handleTagClick(t.tag)}
                  className="transition-transform hover:scale-105"
                >
                  <Badge
                    variant={selectedTag === t.tag ? "default" : "secondary"}
                    size="md"
                    className="cursor-pointer"
                  >
                    {t.tag}
                    <span className="ml-1 opacity-60">{t.count}</span>
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results Section */}
        <div className="mt-8">
          {loading && (
            <div className="flex flex-col items-center py-16">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-sm text-gray-500">{t("search.loading")}</p>
            </div>
          )}

          {error && (
            <Card variant="default" className="border-red-200 bg-red-50">
              <div className="text-center py-8">
                <p className="text-red-600 font-medium">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => performSearch(query, searchType)}
                >
                  {t("search.retry")}
                </Button>
              </div>
            </Card>
          )}

          {!loading && !error && searched && results.length === 0 && (
            <EmptyState
              icon={<Search className="w-12 h-12" />}
              title={t("search.empty.title")}
              description={t("search.empty.description", { query })}
            />
          )}

          {!loading && !error && searched && results.length > 0 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                {t("search.results.count", { count: total })}
                <span className="mx-1.5 text-gray-300">|</span>
                {t("search.results.type", { type: t(searchTypeLabelKeys[searchType]) })}
              </p>

              {results.map((result) => (
                <Link key={result.page_id} href={`/pages/${result.slug}`}>
                  <Card variant="hover" className="mb-4 group cursor-pointer">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-primary-600 flex-shrink-0" />
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                            {result.title}
                          </h3>
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
                          {highlightSnippet(result.snippet)}
                        </p>
                        <p className="mt-2 text-xs text-gray-400">/pages/{result.slug}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge variant={scoreColor(result.score)} size="md">
                          {t("search.results.match", { score: Math.round(result.score * 100) })}
                        </Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}

          {/* Initial state - no search yet */}
          {!loading && !error && !searched && (
            <EmptyState
              icon={<Sparkles className="w-12 h-12" />}
              title={t("search.initial.title")}
              description={t("search.initial.description")}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  );
}
