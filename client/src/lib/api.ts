/**
 * API client for Scott Times Node.js + MySQL backend.
 * Stable integration contract:
 * - API base: http://127.0.0.1:5000
 * - All endpoints include /api/...
 * - Auth token key: scott_times_token
 */

const API_BASE =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:5000";

const TOKEN_KEY = "scott_times_token";

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  // Only set JSON content-type when sending a body
  if (!headers["Content-Type"] && options.body) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(
      body?.message || `Request failed (${res.status})`,
      res.status,
      body
    );
  }

  if (res.status === 204) return undefined as T;

  return body as T;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/* ───────────────────────── Auth ───────────────────────── */

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  role: "STUDENT" | "PARENT";
  studentId?: string;
  verificationCode?: string;
}

export interface AuthUser {
  id: number;
  full_name?: string;
  fullName?: string;
  email: string;
  role: "STUDENT" | "PARENT" | "ADMIN";
  avatarUrl?: string;
}

export interface AuthResponse {
  status?: string;
  message?: string;
  token: string;
  user: AuthUser;
}

export const authApi = {
  login: (data: LoginPayload) =>
    request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  register: (data: RegisterPayload) =>
    request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({
        full_name: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
      }),
    }),

  me: () => request<any>("/api/profile"),
};

/* ───────────────────────── Posts ───────────────────────── */

export interface PostData {
  id: number;
  content: string;
  audience: "STUDENTS" | "PARENTS";
  created_at?: string;
  updated_at?: string;

  author_id?: number;
  author_name?: string;
  author_role?: string;
  author_is_verified?: number;
  is_pinned?: number;

  // Optional UI compatibility fields
  author?: string;
  username?: string;
  createdAt?: string;
  likes?: number;
  comments?: number;
  isLiked?: boolean;
  isPinned?: boolean;
  isOwn?: boolean;
  isHidden?: boolean;
}

export type PostsListResponse = {
  status: "ok";
  audience: "STUDENTS" | "PARENTS";
  count: number;
  posts: PostData[];
};

export type PostCreateResponse = {
  status: "ok";
  message: string;
  post: {
    id: number;
    author_user_id: number;
    audience: "STUDENTS" | "PARENTS";
    content: string;
  };
};

export const postsApi = {
  list: (audience: "STUDENTS" | "PARENTS" = "STUDENTS") =>
    request<PostsListResponse>(`/api/posts?audience=${audience}`),

  create: (content: string, audience: "STUDENTS" | "PARENTS" = "STUDENTS") =>
    request<PostCreateResponse>("/api/posts", {
      method: "POST",
      body: JSON.stringify({ content, audience }),
    }),

  report: (id: number, reason: string, details?: string) =>
    request<any>(`/api/posts/${id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason, details }),
    }),
};

/* ─────────────────────── Confessions ───────────────────── */

export interface ConfessionData {
  id: number;
  content: string;
  created_at?: string;
}

export type ConfessionsListResponse = {
  status: "ok";
  count: number;
  confessions: ConfessionData[];
};

export type ConfessionCreateResponse = {
  status: "ok";
  message: string;
  confession: { id: number; content: string };
};

export const confessionsApi = {
  list: () => request<ConfessionsListResponse>("/api/confessions"),

  create: (content: string) =>
    request<ConfessionCreateResponse>("/api/confessions", {
      method: "POST",
      body: JSON.stringify({ content }),
    }),

  report: (id: number, reason: string, details?: string) =>
    request<any>(`/api/confessions/${id}/report`, {
      method: "POST",
      body: JSON.stringify({ reason, details }),
    }),
};

/* ───────────────────────── Clubs ───────────────────────── */

export interface ClubData {
  id: number;
  name: string;
  description?: string;
  category?: string;
  is_active?: number;
  created_at?: string;
  created_by_name?: string;
  members_count?: number;
  membership_status?: "NONE" | "REQUESTED" | "MEMBER" | "ADMIN";
  meeting_schedule?: string;
}

export interface ClubMemberRow {
  user_id: number;
  full_name: string;
  role: string;
  status: string;
  joined_at?: string;
}

export interface ClubPost {
  id: number;
  content: string;
  author?: string;
  created_at?: string;
}

export const clubsApi = {
  list: () =>
    request<{ status: string; count: number; clubs: ClubData[] }>("/api/clubs"),

  joinRequest: (id: number) =>
    request<any>(`/api/clubs/${id}/join-request`, { method: "POST" }),

  cancelJoinRequest: (id: number) =>
    request<any>(`/api/clubs/${id}/join-request/cancel`, { method: "POST" }),

  leave: (id: number) =>
    request<any>(`/api/clubs/${id}/leave`, { method: "POST" }),

  members: (id: number) =>
    request<{ status: string; count: number; members: ClubMemberRow[] }>(
      `/api/clubs/${id}/members`
    ),

  posts: (id: number) => request<any>(`/api/clubs/${id}/posts`),

  createPost: (id: number, content: string) =>
    request<any>(`/api/clubs/${id}/posts`, {
      method: "POST",
      body: JSON.stringify({ content }),
    }),
};

/* ───────────────────────── Admin ───────────────────────── */

export const adminApi = {
  reports: () => request<any>("/api/admin/reports"),

  confessionReports: () => request<any>("/api/admin/confession-reports"),

  stats: () =>
    request<{ users: number; posts: number; reports: number; clubs: number }>(
      "/api/admin/stats"
    ),

  resolveReport: (id: number) =>
    request<any>(`/api/admin/reports/${id}/resolve`, { method: "POST" }),

  resolveConfessionReport: (id: number) =>
    request<any>(`/api/admin/confession-reports/${id}/resolve`, {
      method: "POST",
    }),

  clubJoinRequests: (
    status: "PENDING" | "APPROVED" | "REJECTED" = "PENDING"
  ) => request<any>(`/api/admin/club-join-requests?status=${status}`),

  approveJoinRequest: (requestId: number) =>
    request<any>(`/api/admin/club-join-requests/${requestId}/approve`, {
      method: "POST",
    }),

  rejectJoinRequest: (requestId: number) =>
    request<any>(`/api/admin/club-join-requests/${requestId}/reject`, {
      method: "POST",
    }),

  pinParentsPost: (postId: number) =>
    request<any>(`/api/admin/posts/${postId}/pin`, { method: "POST" }),

  unpinParentsPost: (postId: number) =>
    request<any>(`/api/admin/posts/${postId}/unpin`, { method: "POST" }),

  hidePost: (id: number) =>
    request<any>(`/api/admin/posts/${id}/hide`, { method: "POST" }),

  unhidePost: (id: number) =>
    request<any>(`/api/admin/posts/${id}/unhide`, { method: "POST" }),

  hideConfession: (id: number) =>
    request<any>(`/api/admin/confessions/${id}/hide`, { method: "POST" }),

  unhideConfession: (id: number) =>
    request<any>(`/api/admin/confessions/${id}/unhide`, { method: "POST" }),
};

/* ───────────────────────── Alerts ──────────────────────── */

export interface CampusAlert {
  id: number;
  message: string;
  level: "INFO" | "WARNING" | "URGENT";
  created_at: string;
}

export const alertsApi = {
  getActive: () =>
    request<{ status: string; active: boolean; alert: CampusAlert | null }>(
      "/api/alerts/active"
    ),

  create: (
    message: string,
    level: "INFO" | "WARNING" | "URGENT" = "INFO"
  ) =>
    request<any>("/api/admin/alerts", {
      method: "POST",
      body: JSON.stringify({ message, level }),
    }),

  clear: () =>
    request<any>("/api/admin/alerts/clear", {
      method: "POST",
    }),
};