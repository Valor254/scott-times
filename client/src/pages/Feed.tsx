import { AppLayout } from "@/components/layout/AppLayout";
import { PostComposer } from "@/components/feed/PostComposer";
import { PostCard, type Post } from "@/components/feed/PostCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { TrendingUp, Hash, Users, Newspaper } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useClubMembership } from "@/hooks/useClubMembership";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { postsApi, type PostData } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const trendingTopics = [
  { tag: "#SCUExams", posts: "234 posts" },
  { tag: "#ChessTournament", posts: "89 posts" },
  { tag: "#SCULibrary", posts: "156 posts" },
  { tag: "#CampusLife", posts: "412 posts" },
  { tag: "#SCUWorship", posts: "67 posts" },
];

const suggestedClubs = [
  { id: "1", name: "Debate Society", members: "120 members" },
  { id: "2", name: "Tech Club", members: "89 members" },
  { id: "3", name: "Music Ministry", members: "156 members" },
];

// Map backend row -> UI PostCard format
function mapBackendPostToUi(p: PostData, currentUserEmail?: string): Post {
  const created = p.created_at ? new Date(p.created_at) : new Date();
  const authorName = p.author_name || p.author || "Unknown";
  const username =
    (p.author_name ? p.author_name.toLowerCase().replace(/\s+/g, "_") : "") ||
    (p.username ?? "user");

  const isOwn =
    !!currentUserEmail &&
    (p as any).author_email &&
    (p as any).author_email === currentUserEmail;

  return {
    id: String(p.id),
    author: authorName,
    username,
    content: p.content,
    timestamp: `${formatDistanceToNow(created, { addSuffix: true })}`,
    likes: p.likes ?? 0,
    comments: p.comments ?? 0,
    isLiked: p.isLiked ?? false,
    isPinned: p.isPinned ?? false,
    isOwn: p.isOwn ?? isOwn,
    isVerified: p.author_role === "ADMIN" || p.author_is_verified === 1,
  };
}

const Feed = () => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { getButtonProps, handleAction } = useClubMembership();
  const qc = useQueryClient();

  // Global feed: we use STUDENTS posts for everyone (students + parents + admin)
  const audience: "STUDENTS" | "PARENTS" = "STUDENTS";

  const postsQuery = useQuery({
    queryKey: ["posts", audience],
    queryFn: async () => {
      const res = await postsApi.list(audience);
      return res.posts;
    },
  });

  const createPostMutation = useMutation({
    mutationFn: async (content: string) => {
      await postsApi.create(content, audience);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["posts", audience] });
    },
  });

  const uiPosts: Post[] =
    (postsQuery.data || []).map((p) => mapBackendPostToUi(p, user?.email)) || [];

  const handleNewPost = async (content: string) => {
    await createPostMutation.mutateAsync(content);
  };

  // NOTE: Delete/Edit not wired yet (we’ll do next). For now we hide buttons by leaving handlers.
  const handleDeletePost = (_id: string) => {};
  const handleEditPost = (_id: string, _content: string) => {};

  return (
    <AppLayout>
      <div className="flex gap-6 p-4 md:p-6 max-w-7xl mx-auto">
        {/* Main Feed */}
        <div className="flex-1 max-w-2xl mx-auto space-y-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground mb-1">
              Student Feed
            </h1>
            <p className="text-sm text-muted-foreground">
              What's happening on campus
            </p>
          </div>

          <PostComposer onPost={handleNewPost} />

          {postsQuery.isLoading ? (
            <div className="space-y-3">
              {/* If you have skeleton component you can use it here */}
              <p className="text-sm text-muted-foreground">Loading posts…</p>
            </div>
          ) : postsQuery.isError ? (
            <EmptyState
              icon={Newspaper}
              title="Could not load posts"
              description="Check that your backend is running on http://127.0.0.1:5000 and you are logged in."
            />
          ) : uiPosts.length === 0 ? (
            <EmptyState
              icon={Newspaper}
              title="No posts yet"
              description="Be the first to share what's happening on campus! Write a post above to get the conversation started."
            />
          ) : (
            <div className="space-y-3">
              {uiPosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  onDelete={handleDeletePost}
                  onEdit={handleEditPost}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Sidebar - Desktop Only */}
        {!isMobile && (
          <aside className="w-72 flex-shrink-0 space-y-4 hidden lg:block">
            {/* Trending */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-gold" />
                <h3 className="font-heading font-semibold text-foreground">
                  Trending
                </h3>
              </div>
              <div className="space-y-3">
                {trendingTopics.map((topic) => (
                  <div key={topic.tag} className="group cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Hash className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                        {topic.tag}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground ml-5.5">
                      {topic.posts}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Suggested Clubs */}
            <div className="bg-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-primary" />
                <h3 className="font-heading font-semibold text-foreground">
                  Suggested Clubs
                </h3>
              </div>
              <div className="space-y-3">
                {suggestedClubs.map((club) => {
                  const btnProps = getButtonProps(club.id);
                  return (
                    <div
                      key={club.name}
                      className="flex items-center justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {club.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {club.members}
                        </p>
                      </div>
                      <Button
                        variant={btnProps.variant}
                        size="sm"
                        disabled={btnProps.disabled}
                        onClick={() => handleAction(club.id)}
                        className="text-xs"
                      >
                        {btnProps.label}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        )}
      </div>
    </AppLayout>
  );
};

export default Feed;