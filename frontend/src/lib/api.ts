const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function formatErrorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    return detail
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object" && "msg" in item) {
          return String((item as { msg: unknown }).msg);
        }
        return JSON.stringify(item);
      })
      .join("; ");
  }
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return fallback;
}

export class ApiError extends Error {
  status: number;
  endpoint: string;
  detail: unknown;

  constructor(message: string, status: number, endpoint: string, detail: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.endpoint = endpoint;
    this.detail = detail;
  }
}

export interface Page {
  id: number;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  tags: string[];
  status: string;
  created_at: string;
  updated_at: string;
}

export interface PageListResponse {
  pages: Page[];
  total: number;
}

export interface SearchResult {
  page_id: number;
  title: string;
  slug: string;
  snippet: string;
  score: number;
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
}

export interface QAResponse {
  answer: string;
  sources: { page_id: number; title: string; slug: string }[];
  confidence: number;
}

export interface CompileResponse {
  summary: string;
  concepts: { name: string; description: string; related_pages?: number[] }[];
  cross_references: {
    page_id: number;
    title: string;
    slug: string;
    relationship: string;
  }[];
  tags: string[];
}

export interface WritingAssistResponse {
  result: string;
  suggestions: string[];
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    let response: Response;

    try {
      response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options?.headers,
        },
      });
    } catch (error) {
      throw new ApiError(
        error instanceof Error ? error.message : "Network request failed",
        0,
        endpoint,
        error
      );
    }

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const detail = (errorBody as { detail?: unknown }).detail ?? errorBody;
      throw new ApiError(
        formatErrorMessage(detail, `API error: ${response.status}`),
        response.status,
        endpoint,
        detail
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  }

  // Pages API
  async getPages(params?: {
    skip?: number;
    limit?: number;
    status?: string;
    tag?: string;
    search?: string;
  }): Promise<PageListResponse> {
    const searchParams = new URLSearchParams();
    if (params?.skip) searchParams.set("skip", params.skip.toString());
    if (params?.limit) searchParams.set("limit", params.limit.toString());
    if (params?.status) searchParams.set("status", params.status);
    if (params?.tag) searchParams.set("tag", params.tag);
    if (params?.search) searchParams.set("search", params.search);

    const query = searchParams.toString();
    return this.request(`/api/pages/${query ? `?${query}` : ""}`);
  }

  async getPage(slug: string): Promise<Page> {
    return this.request(`/api/pages/${slug}`);
  }

  async createPage(data: {
    title: string;
    content: string;
    tags?: string[];
  }): Promise<Page> {
    return this.request("/api/pages/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updatePage(
    slug: string,
    data: {
      title?: string;
      content?: string;
      tags?: string[];
      status?: string;
    }
  ): Promise<Page> {
    return this.request(`/api/pages/${slug}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deletePage(slug: string): Promise<void> {
    return this.request(`/api/pages/${slug}`, {
      method: "DELETE",
    });
  }

  async getRelatedPages(slug: string, limit?: number): Promise<Page[]> {
    return this.request(
      `/api/pages/${slug}/related${limit ? `?limit=${limit}` : ""}`
    );
  }

  // AI API
  async askQuestion(
    question: string,
    maxResults?: number
  ): Promise<QAResponse> {
    return this.request("/api/ai/ask", {
      method: "POST",
      body: JSON.stringify({
        question,
        max_results: maxResults || 5,
      }),
    });
  }

  async compileKnowledge(data: {
    content: string;
    title?: string;
    extract_concepts?: boolean;
    generate_summary?: boolean;
    find_references?: boolean;
  }): Promise<CompileResponse> {
    return this.request("/api/ai/compile", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async writingAssist(data: {
    content: string;
    task: string;
    context?: string;
  }): Promise<WritingAssistResponse> {
    return this.request("/api/ai/write", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async summarize(content: string): Promise<{ summary: string }> {
    return this.request("/api/ai/summarize", {
      method: "POST",
      body: JSON.stringify({ content }),
    });
  }

  // Search API
  async search(
    query: string,
    options?: {
      limit?: number;
      searchType?: "semantic" | "keyword" | "hybrid";
    }
  ): Promise<SearchResponse> {
    return this.request("/api/search/", {
      method: "POST",
      body: JSON.stringify({
        query,
        limit: options?.limit || 10,
        search_type: options?.searchType || "hybrid",
      }),
    });
  }

  async getSearchSuggestions(query: string): Promise<{ suggestions: string[] }> {
    return this.request(`/api/search/suggest?q=${encodeURIComponent(query)}`);
  }

  async getPopularTags(
    limit?: number
  ): Promise<{ tags: { tag: string; count: number }[] }> {
    return this.request(`/api/search/tags${limit ? `?limit=${limit}` : ""}`);
  }
}

export const api = new ApiClient(API_BASE);
