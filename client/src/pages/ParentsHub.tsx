import { useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard, type Post } from "@/components/feed/PostCard";
import { PostSkeleton } from "@/components/feed/PostSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { Newspaper } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { postsApi, adminApi } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// safe timestamp formatter
function formatTimestamp(iso?: string) {
  if (!iso) return "Just now";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Just now";
  return d.toLocaleString();
}

export default function ParentsHub() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const audience: "PARENTS" = "PARENTS";

  const postsQuery = useQuery({
    queryKey: ["posts", audience],
    queryFn: async () => {
      const res = await postsApi.list(audience);
      return res.posts || [];
    },
  });

  const mappedPosts: Post[] = useMemo(() => {
    const rows = postsQuery.data ?? [];

    return rows.map((p: any) => {
      const idStr = String(p.id);

      const authorName = p.author_name || p.author || "Unknown";

      const username =
        (p.author_name
          ? String(p.author_name).toLowerCase().replace(/\s+/g, "_")
          : null) || "user";

      return {
        id: idStr,
        author: authorName,
        username,
        content: p.content,
        timestamp: formatTimestamp(p.created_at),
        likes: 0,
        comments: 0,
        isLiked: false,
        isPinned: !!p.is_pinned, // if backend sends it
        isVerified: !!p.author_is_verified,
        isOwn: user ? Number(p.author_id) === Number(user.id) : false,
      } as Post;
    });
  }, [postsQuery.data, user]);

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => postsApi.create(content, audience),
    onSuccess: async () => {
      toast.success("Posted to Parents Hub ✅");
      await queryClient.invalidateQueries({ queryKey: ["posts", audience] });
    },
    onError: (err: any) => {
      toast.error("Post failed", { description: err?.message || "Could not post." });
    },
  });

  const handleNewPost = (content: string) => {
    createPostMutation.mutate(content);
  };

  // Optional: pin/unpin (Admin only) — only works if your backend has the routes
  const pinMutation = useMutation({
    mutationFn: async (postId: number) => adminApi.pinParentsPost(postId),
    onSuccess: async () => {
      toast.success("Pinned ✅");
      await queryClient.invalidateQueries({ queryKey: ["posts", audience] });
    },
    onError: (err: any) => toast.error("Pin failed", { description: err?.message }),
  });

  const unpinMutation = useMutation({
    mutationFn: async (postId: number) => adminApi.unpinParentsPost(postId),
    onSuccess: async () => {
      toast.success("Unpinned ✅");
      await queryClient.invalidateQueries({ queryKey: ["posts", audience] });
    },
    onError: (err: any) => toast.error("Unpin failed", { description: err?.message }),
  });

  return (
    <AppLayout>
      <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground mb-1">
            Parents Hub
          </h1>
          <p className="text-sm text-muted-foreground">
            Official updates and parent engagement — moderated environment
          </p>
        </div>

        {/* Allow parents + admins to post (matches your requirement) */}
        <PostComposer onPost={handleNewPost} />

        {/* Loading */}
        {postsQuery.isLoading && (
          <div className="space-y-3">
            <PostSkeleton />
            <PostSkeleton />
            <PostSkeleton />
          </div>
        )}

        {/* Error */}
        {postsQuery.isError && (
          <EmptyState
            icon={Newspaper}
            title="Could not load Parents Hub posts"
            description="Confirm backend is running and you are logged in."
          />
        )}

        {/* Empty */}
        {!postsQuery.isLoading && !postsQuery.isError && mappedPosts.length === 0 && (
          <EmptyState
            icon={Newspaper}
            title="No Parents Hub posts yet"
            description="Admins and parents can post updates and concerns here."
          />
        )}

        {/* Posts */}
        {!postsQuery.isLoading && !postsQuery.isError && mappedPosts.length > 0 && (
          <div className="space-y-3">
            {mappedPosts.map((post) => (
              <div key={post.id} className="space-y-2">
                <PostCard post={post} onDelete={() => toast.info("Coming soon")} onEdit={() => toast.info("Coming soon")} />

                {/* Admin Pin Controls (optional) */}
                {isAdmin && (
                  <div className="flex gap-2 justify-end">
                    <button
                      className="text-xs text-primary hover:underline"
                      onClick={() => pinMutation.mutate(Number(post.id))}
                    >
                      Pin
                    </button>
                    <button
                      className="text-xs text-muted-foreground hover:underline"
                      onClick={() => unpinMutation.mutate(Number(post.id))}
                    >
                      Unpin
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}