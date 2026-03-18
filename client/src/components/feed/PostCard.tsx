import { useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Pin,
  MoreHorizontal,
  Pencil,
  Trash2,
  EyeOff,
} from "lucide-react";
import { VerifiedBadge } from "@/components/shared/VerifiedBadge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { ReportModal } from "@/components/feed/ReportModal";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Post {
  id: string;
  author: string;
  username: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  isLiked: boolean;
  isPinned?: boolean;
  isOwn?: boolean;
  isHidden?: boolean;
  isVerified?: boolean;
}

interface PostCardProps {
  post: Post;
  onDelete?: (id: string) => void;
  onEdit?: (id: string, content: string) => void;
  onReport?: (id: string, reason: string, details: string) => void;
}

export function PostCard({ post, onDelete, onEdit, onReport }: PostCardProps) {
  const { isLoggedIn } = useAuth();
  const [liked, setLiked] = useState(post.isLiked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Hidden content placeholder
  if (post.isHidden) {
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
      toast.error("Please sign in to like posts");
      return;
    }
    setLiked(!liked);
    setLikeCount(liked ? likeCount - 1 : likeCount + 1);
  };

  const handleDelete = () => {
    setShowDeleteConfirm(false);
    onDelete?.(post.id);
    toast("Post deleted", {
      action: {
        label: "Undo",
        onClick: () => {
          toast.success("Post restored");
        },
      },
      duration: 5000,
    });
  };

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent.trim() !== post.content) {
      onEdit?.(post.id, editContent.trim());
      toast.success("Changes saved");
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditContent(post.content);
    setIsEditing(false);
  };

  const handleReport = (reason: string, details: string) => {
    onReport?.(post.id, reason, details);
    toast.success("Thank you for helping keep the community safe", {
      description: "We'll review this content shortly.",
    });
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

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    toast.success("Link copied to clipboard");
  };

  const initials = post.author
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  return (
    <>
      <article
        className={cn(
          "bg-card rounded-xl border border-border p-4 transition-all duration-200 hover:shadow-md animate-fade-in",
          post.isPinned && "border-gold/30 bg-gold/5 dark:bg-gold/5"
        )}
      >
        {post.isPinned && (
          <div className="flex items-center gap-1.5 text-gold mb-2 text-xs font-medium">
            <Pin className="w-3 h-3" />
            <span>Pinned</span>
          </div>
        )}

        <div className="flex gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-sm text-foreground">
                {post.author}
              </span>
              {post.isVerified && <VerifiedBadge />}
              <span className="text-sm text-muted-foreground">
                @{post.username}
              </span>
              <span className="text-sm text-muted-foreground">·</span>
              <span className="text-sm text-muted-foreground">
                {post.timestamp}
              </span>

              {/* Actions Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {post.isOwn && (
                    <>
                      <DropdownMenuItem onClick={() => setIsEditing(true)}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit post
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete post
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      if (!isLoggedIn) {
                        toast.error("Please sign in to report content");
                        return;
                      }
                      setShowReportModal(true);
                    }}
                  >
                    <Flag className="w-4 h-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <Textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="min-h-[80px] text-sm"
                  maxLength={500}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {editContent.length}/500
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleSaveEdit}
                      disabled={!editContent.trim()}
                    >
                      Save changes
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mt-1.5 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {post.content}
              </p>
            )}

            <div className="flex items-center gap-1 mt-3 -ml-2">
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
                <span className="text-xs">{post.comments}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleShare}
                className="gap-1.5 text-muted-foreground hover:text-primary"
              >
                <Share2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </article>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Delete this post?"
        description="This action cannot be undone. The post will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      <ReportModal
        open={showReportModal}
        onOpenChange={setShowReportModal}
        onSubmit={handleReport}
        title="Report this post"
      />
    </>
  );
}
