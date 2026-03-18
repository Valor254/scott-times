import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Eye, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ConfessionComposerProps {
  onSubmit: (content: string, category: string) => void;
}

const MAX_LENGTH = 500;
const categories = ["Funny", "Academics", "Relationships", "Serious"];

export function ConfessionComposer({ onSubmit }: ConfessionComposerProps) {
  const { isLoggedIn } = useAuth();
  const [content, setContent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Funny");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
              to share an anonymous confession.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 400));
    onSubmit(content.trim(), selectedCategory);
    setContent("");
    setIsSubmitting(false);
    toast.success("Confession posted anonymously");
  };

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">
          Your identity will be hidden from other users
        </span>
      </div>
      <Textarea
        placeholder="Share your confession anonymously..."
        value={content}
        onChange={(e) => setContent(e.target.value.slice(0, MAX_LENGTH))}
        className="min-h-[80px] resize-none mb-3"
      />

      {/* Category selector */}
      <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              selectedCategory === cat
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {content.length}/{MAX_LENGTH}
        </span>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="gap-1.5"
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {isSubmitting ? "Posting..." : "Confess"}
        </Button>
      </div>
    </div>
  );
}
