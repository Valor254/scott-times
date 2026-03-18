import { useState } from "react";
import { ImagePlus, Send, Loader2, Lock } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

interface PostComposerProps {
  onPost: (content: string) => void;
  placeholder?: string;
}

const MAX_LENGTH = 500;

export function PostComposer({ onPost, placeholder = "What's happening on campus?" }: PostComposerProps) {
  const { isLoggedIn, user } = useAuth();
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const initials = user?.fullName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  if (!isLoggedIn) {
    return (
      <div className="bg-card rounded-xl border border-border p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="text-sm text-muted-foreground">
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>{" "}
              to share what's happening on campus.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsPosting(true);
    await new Promise((r) => setTimeout(r, 400));
    onPost(content.trim());
    setContent("");
    setIsPosting(false);
    toast.success("Post published!");
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex gap-3">
        <Avatar className="w-10 h-10 flex-shrink-0">
          <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <Textarea
            placeholder={placeholder}
            value={content}
            onChange={(e) =>
              setContent(e.target.value.slice(0, MAX_LENGTH))
            }
            className="min-h-[80px] resize-none border-none bg-transparent p-0 text-sm focus-visible:ring-0 placeholder:text-muted-foreground"
          />

          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={() => toast.info("Image uploads coming soon")}
              >
                <ImagePlus className="w-4 h-4" />
              </Button>
              <span className="text-xs text-muted-foreground">
                {content.length}/{MAX_LENGTH}
              </span>
            </div>

            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!content.trim() || isPosting}
              className="gap-1.5"
            >
              {isPosting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isPosting ? "Posting..." : "Post"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
