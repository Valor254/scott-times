import { useState } from "react";
import { Heart, MessageCircle, Flag, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ReportModal } from "@/components/feed/ReportModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import type { Confession } from "@/pages/Confessions";

interface ConfessionCardProps {
  confession: Confession;
  onDelete?: (id: string) => void;
  onReport?: (id: string, reason: string, details: string) => void;
}

export function ConfessionCard({ confession, onDelete, onReport }: ConfessionCardProps) {
  const { isLoggedIn } = useAuth();
  const [liked, setLiked] = useState(confession.isLiked);
  const [likeCount, setLikeCount] = useState(confession.likes);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Hidden content placeholder
  if (confession.isHidden) {
    return (
      <div className="bg-card rounded-xl border border-border p-4 flex items-center gap-3">
        <EyeOff className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <p className="text-sm text-muted-foreground italic">
          This content has been hidden due to reports.
        </p>
      </div>
    );
  }

  const handleLike = () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to like confessions");
      return;
    }
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(confession.id);
    toast("Confession deleted", {
      action: {
        label: "Undo",
        onClick: () => toast.success("Confession restored"),
      },
      duration: 5000,
    });
  };

  const handleReport = (reason: string, details: string) => {
    onReport?.(confession.id, reason, details);
  };

  const handleComment = () => {
    if (!isLoggedIn) {
      toast.error("Please sign in to comment");
      return;
    }
    toast.info("Comments coming soon", {
      description: "Threaded comments will be available in the next update.",
    });
  };

  return (
    <>
      <div className="bg-card rounded-xl border border-border p-4 animate-fade-in">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <span className="text-sm font-medium text-foreground">Anonymous</span>
            <span className="text-xs text-muted-foreground ml-2">
              · {confession.timestamp}
            </span>
          </div>
          <span className="ml-auto text-xs font-medium text-gold bg-gold/10 px-2 py-0.5 rounded-full">
            {confession.category}
          </span>
        </div>

        <p className="text-sm text-foreground leading-relaxed mb-3">
          {confession.content}
        </p>

        <div className="flex items-center gap-1 -ml-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLike}
            className={cn(
              "gap-1.5 text-muted-foreground hover:text-destructive transition-all",
              liked && "text-destructive"
            )}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition-transform",
                liked && "fill-current scale-110"
              )}
            />
            <span className="text-xs">{likeCount}</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleComment}
            className="gap-1.5 text-muted-foreground hover:text-primary"
          >
            <MessageCircle className="w-4 h-4" />
            <span className="text-xs">{confession.comments}</span>
          </Button>

          {confession.isOwn && onDelete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="gap-1.5 text-muted-foreground hover:text-destructive ml-auto"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!isLoggedIn) {
                toast.error("Please sign in to report content");
                return;
              }
              setShowReportModal(true);
            }}
            className={cn(
              "gap-1.5 text-muted-foreground hover:text-destructive",
              !confession.isOwn && "ml-auto"
            )}
          >
            <Flag className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this confession?"
        description="This will permanently remove your confession. This action cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        onSubmit={handleReport}
        title="Report this confession"
      />
    </>
  );
}
