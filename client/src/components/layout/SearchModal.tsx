import { useState, useMemo } from "react";
import { Search, X, Newspaper, Building2, MessageCircleHeart, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const searchableItems = [
  // Pages
  { type: "page", label: "Student Feed", path: "/feed", icon: Newspaper },
  { type: "page", label: "Parents Hub", path: "/parents", icon: Newspaper },
  { type: "page", label: "Clubs & Societies", path: "/clubs", icon: Building2 },
  { type: "page", label: "Campus Confessions", path: "/confessions", icon: MessageCircleHeart },
  // Clubs
  { type: "club", label: "SCU Debate Society", path: "/clubs", icon: Building2 },
  { type: "club", label: "Tech Innovation Club", path: "/clubs", icon: Building2 },
  { type: "club", label: "Music Ministry", path: "/clubs", icon: Building2 },
  { type: "club", label: "Environmental Conservation Club", path: "/clubs", icon: Building2 },
  { type: "club", label: "Chess Club", path: "/clubs", icon: Building2 },
  { type: "club", label: "Creative Writing Society", path: "/clubs", icon: Building2 },
];

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return searchableItems.filter((item) =>
      item.label.toLowerCase().includes(q)
    );
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="sr-only">Search</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search pages, clubs, topics..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-10"
              autoFocus
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div className="border-t border-border max-h-80 overflow-y-auto">
          {!query.trim() ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Start typing to search pages, clubs, and topics
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-sm text-muted-foreground">
                No results for "{query}". Try a different search term.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {results.map((item, i) => (
                <Link
                  key={i}
                  to={item.path}
                  onClick={() => {
                    onOpenChange(false);
                    setQuery("");
                  }}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-muted group-hover:bg-background flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
