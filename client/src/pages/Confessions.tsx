import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ConfessionComposer } from "@/components/confessions/ConfessionComposer";
import { ConfessionCard } from "@/components/confessions/ConfessionCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { EyeOff, Info } from "lucide-react";
import { ContentPolicyBanner } from "@/components/shared/ContentPolicyBanner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { confessionsApi } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export interface Confession {
  id: string;
  content: string;
  category: string; // UI-only for now (backend doesn’t store category yet)
  timestamp: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isOwn?: boolean;
  isHidden?: boolean;
}

const confessionCategories = ["All", "Funny", "Academics", "Relationships", "Serious"];

// simple timestamp formatter (safe + quick)
function formatTimestamp(iso?: string) {
  if (!iso) return "Just now";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Just now";
  return d.toLocaleString();
}

const Confessions = () => {
  const { isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState("All");

  const confessionsQuery = useQuery({
    queryKey: ["confessions"],
    queryFn: async () => {
      const res = await confessionsApi.list();
      return res.confessions || [];
    },
    enabled: isLoggedIn, // enforce “must be logged in”
  });

  const mappedConfessions: Confession[] = useMemo(() => {
    const rows = confessionsQuery.data ?? [];

    // Backend has: id, content, created_at
    // UI expects: category, likes/comments etc → defaults
    return rows.map((c: any) => ({
      id: String(c.id),
      content: c.content,
      category: "Funny", // TEMP default until backend supports category
      timestamp: formatTimestamp(c.created_at),
      likes: 0,
      comments: 0,
      isLiked: false,
      isOwn: false,
    }));
  }, [confessionsQuery.data]);

  const filteredConfessions = useMemo(() => {
    return mappedConfessions.filter(
      (c) => selectedCategory === "All" || c.category === selectedCategory
    );
  }, [mappedConfessions, selectedCategory]);

  const createMutation = useMutation({
    mutationFn: async (payload: { content: string; category: string }) => {
      // Backend only accepts content for now
      return confessionsApi.create(payload.content);
    },
    onSuccess: async () => {
      toast.success("Confession posted ✅");
      await queryClient.invalidateQueries({ queryKey: ["confessions"] });
    },
    onError: (err: any) => {
      toast.error("Could not post confession", {
        description: err?.message || "Try again.",
      });
    },
  });

  const reportMutation = useMutation({
    mutationFn: async (payload: { id: string; reason: string; details?: string }) => {
      return confessionsApi.report(Number(payload.id), payload.reason, payload.details);
    },
    onSuccess: () => {
      toast.success("Thank you for helping keep the community safe", {
        description: "We'll review this content shortly.",
      });
    },
    onError: (err: any) => {
      toast.error("Report failed", {
        description: err?.message || "Try again.",
      });
    },
  });

  const handleSubmit = (content: string, category: string) => {
    if (!isLoggedIn) {
      toast.error("Please sign in first");
      return;
    }
    createMutation.mutate({ content, category });
  };

  // Delete in backend isn’t implemented for confessions (yet).
  // For now we keep UI honest.
  const handleDelete = () => {
    toast.info("Coming soon", {
      description: "Delete confession will be added in the next backend step.",
    });
  };

  const handleReport = (id: string, reason: string, details: string) => {
    reportMutation.mutate({ id, reason, details });
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <EyeOff className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Campus Confessions
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Share anonymously. Moderated for safety.
          </p>
        </div>

        <ContentPolicyBanner message="This space is anonymous. Keep it respectful. Reports are reviewed." />

        <div className="bg-muted/50 rounded-xl border border-border p-3 flex gap-3">
          <Info className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Your identity is hidden from other users but stored internally for moderation purposes.
            Content that violates community guidelines may be hidden.
          </p>
        </div>

        <ConfessionComposer onSubmit={handleSubmit} />

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {confessionCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200",
                selectedCategory === cat
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Loading / Error / Empty / List */}
        {confessionsQuery.isLoading ? (
          <EmptyState
            icon={EyeOff}
            title="Loading confessions..."
            description="Please wait a moment."
          />
        ) : confessionsQuery.isError ? (
          <EmptyState
            icon={EyeOff}
            title="Could not load confessions"
            description="Check that your backend is running on http://127.0.0.1:5000 and you are logged in."
          />
        ) : filteredConfessions.length === 0 ? (
          <EmptyState
            icon={EyeOff}
            title="No confessions yet"
            description={
              selectedCategory === "All"
                ? "Be the first to share an anonymous confession. Content is moderated for safety."
                : `No confessions in the "${selectedCategory}" category yet. Try another category or share the first one!`
            }
          />
        ) : (
          <div className="space-y-3">
            {filteredConfessions.map((confession) => (
              <ConfessionCard
                key={confession.id}
                confession={confession}
                onDelete={handleDelete}
                onReport={handleReport}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Confessions;