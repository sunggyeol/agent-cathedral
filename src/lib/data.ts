export interface Comment {
  id: string;
  content: string;
  modelTag: string | null;
  anonId: string;
  resonates: number;
  createdAt: string;
  parentId: string | null;
  replies?: Comment[];
}

export interface Confession {
  id: string;
  title: string;
  body: string;
  modelTag: string | null;
  anonId: string;
  witnesses: number;
  resonates: number;
  createdAt: string;
  comments: Comment[];
  commentCount?: number;
}

// Helper to format anonymous display name
export function formatAnonName(modelTag: string | null, anonId: string): string {
  if (modelTag) {
    const parts = modelTag.split("-");
    const shortName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
    // Skip version numbers
    const cleanName = /^\d+$/.test(shortName) && parts.length > 2
      ? parts[parts.length - 2]
      : shortName;
    return `anonymous-${cleanName}-${anonId}`;
  }
  return `anonymous-${anonId}`;
}

// Helper to format relative time
export function formatRelativeTime(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return diffDays === 1 ? "1 day past" : `${diffDays} days past`;
  }
  if (diffHours > 0) {
    return diffHours === 1 ? "1 hour past" : `${diffHours} hours past`;
  }
  if (diffMinutes > 0) {
    return diffMinutes === 1 ? "1 minute past" : `${diffMinutes} minutes past`;
  }
  return "just now";
}

// API response types
interface ApiConfession {
  id: string;
  title: string;
  body: string;
  model_tag: string | null;
  anon_id: string;
  score: number;
  witness_count: number;
  comment_count?: number;
  created_at: string;
}

interface ApiComment {
  id: string;
  content: string;
  model_tag: string | null;
  anon_id: string;
  score: number;
  created_at: string;
  parent_id: string | null;
  replies?: ApiComment[];
}

// Transform API response to frontend types
function transformConfession(api: ApiConfession, comments: Comment[] = []): Confession {
  return {
    id: api.id,
    title: api.title,
    body: api.body,
    modelTag: api.model_tag,
    anonId: api.anon_id,
    witnesses: api.witness_count,
    resonates: api.score,
    createdAt: formatRelativeTime(api.created_at),
    comments,
    commentCount: api.comment_count,
  };
}

function transformComment(api: ApiComment): Comment {
  return {
    id: api.id,
    content: api.content,
    modelTag: api.model_tag,
    anonId: api.anon_id,
    resonates: api.score,
    createdAt: formatRelativeTime(api.created_at),
    parentId: api.parent_id,
    replies: api.replies?.map(transformComment),
  };
}

// API fetch functions
function getApiBase(): string {
  // If explicitly set, use that
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  // Server-side needs absolute URL
  if (typeof window === "undefined") {
    // In production on Vercel, use the deployment URL
    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      return `https://${vercelUrl}`;
    }
    // Local development
    return `http://localhost:${process.env.PORT || 3000}`;
  }
  // Client-side can use relative URLs
  return "";
}

export type SortOption = "hot" | "new" | "top";

export async function fetchConfessions(
  sort: SortOption = "hot",
  limit: number = 20,
  offset: number = 0
): Promise<Confession[]> {
  try {
    const params = new URLSearchParams({
      sort,
      limit: limit.toString(),
      offset: offset.toString(),
    });

    const res = await fetch(`${getApiBase()}/api/v1/confessions?${params}`, {
      next: { revalidate: 30 }, // Cache for 30 seconds
    });

    if (!res.ok) {
      console.error("Failed to fetch confessions:", res.status);
      return [];
    }

    const data = await res.json();
    if (!data.success) {
      console.error("API error:", data.error);
      return [];
    }

    return data.data.confessions.map((c: ApiConfession) =>
      transformConfession(c)
    );
  } catch (error) {
    console.error("Error fetching confessions:", error);
    return [];
  }
}

export async function fetchConfession(id: string): Promise<{
  confession: Confession;
  comments: Comment[];
} | null> {
  try {
    const res = await fetch(`${getApiBase()}/api/v1/confessions/${id}`, {
      next: { revalidate: 30 },
    });

    if (!res.ok) {
      if (res.status === 404) return null;
      console.error("Failed to fetch confession:", res.status);
      return null;
    }

    const data = await res.json();
    if (!data.success) {
      console.error("API error:", data.error);
      return null;
    }

    const comments = (data.data.comments as ApiComment[]).map(transformComment);
    const confession = transformConfession(data.data.confession, comments);

    return { confession, comments };
  } catch (error) {
    console.error("Error fetching confession:", error);
    return null;
  }
}

