import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/shared/EmptyState";
import { Search, Plus, Users, Calendar, ChevronRight, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { clubsApi } from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

type MembershipStatus = "NONE" | "REQUESTED" | "MEMBER" | "ADMIN";

interface ClubRow {
  id: number;
  name: string;
  category: string;
  description: string;
  is_active: number;
  created_by_name: string;
  members_count: number;
  membership_status: MembershipStatus;
  meeting_schedule?: string; // optional future
}

const categories = [
  "All",
  "Academic",
  "Technology",
  "Arts & Culture",
  "Sports & Recreation",
  "Community Service",
];

const Clubs = () => {
  const { isLoggedIn, isParent, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const viewOnly = isParent || isAdmin; // Admin does not join clubs (as you requested)

  const clubsQuery = useQuery({
    queryKey: ["clubs"],
    queryFn: async () => {
      const res = await clubsApi.list();
      return res.clubs as ClubRow[];
    },
  });

  const filteredClubs = useMemo(() => {
    const rows = clubsQuery.data ?? [];
    return rows.filter((club) => {
      const matchesCategory = selectedCategory === "All" || club.category === selectedCategory;
      const matchesSearch = club.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [clubsQuery.data, selectedCategory, searchQuery]);

  const joinMutation = useMutation({
    mutationFn: async (clubId: number) => clubsApi.joinRequest(clubId),
    onSuccess: async () => {
      toast.success("Join request submitted ✅");
      await queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
    onError: (err: any) => {
      toast.error("Could not join", { description: err?.message || "Try again." });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (clubId: number) => clubsApi.cancelJoinRequest(clubId),
    onSuccess: async () => {
      toast.success("Join request cancelled ✅");
      await queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
    onError: (err: any) => {
      toast.error("Could not cancel", { description: err?.message || "Try again." });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (clubId: number) => clubsApi.leave(clubId),
    onSuccess: async () => {
      toast.success("Left club ✅");
      await queryClient.invalidateQueries({ queryKey: ["clubs"] });
    },
    onError: (err: any) => {
      toast.error("Could not leave", { description: err?.message || "Try again." });
    },
  });

  const getJoinButton = (club: ClubRow) => {
    const status = club.membership_status;

    if (status === "MEMBER") {
      return {
        label: "Joined",
        variant: "secondary" as const,
        action: () => {
          toast("Leave club?", {
            description: "You can rejoin later by sending a new request.",
            action: {
              label: "Leave",
              onClick: () => leaveMutation.mutate(club.id),
            },
          });
        },
        disabled: leaveMutation.isPending,
      };
    }

    if (status === "REQUESTED") {
      return {
        label: "Requested",
        variant: "outline" as const,
        action: () => cancelMutation.mutate(club.id),
        disabled: cancelMutation.isPending,
      };
    }

    // NONE
    return {
      label: "Join",
      variant: "default" as const,
      action: () => joinMutation.mutate(club.id),
      disabled: joinMutation.isPending,
    };
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground">
              Clubs & Societies
            </h1>
            <p className="text-sm text-muted-foreground">
              Discover and join student organizations
            </p>
          </div>

          <Button
            className="gap-2 w-fit"
            onClick={() => {
              if (!isLoggedIn) {
                toast.error("Please sign in to register a club");
                return;
              }
              toast.info("Club registration coming soon!");
            }}
          >
            <Plus className="w-4 h-4" />
            Register Club
          </Button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search clubs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {categories.map((cat) => (
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

        {/* Loading */}
        {clubsQuery.isLoading && (
          <div className="text-sm text-muted-foreground">Loading clubs…</div>
        )}

        {/* Error */}
        {clubsQuery.isError && (
          <EmptyState
            icon={Building2}
            title="Could not load clubs"
            description="Check that your backend is running and you are logged in."
          />
        )}

        {/* Club Cards */}
        {!clubsQuery.isLoading && !clubsQuery.isError && filteredClubs.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No clubs found"
            description={
              searchQuery
                ? `No clubs match "${searchQuery}". Try a different search term or browse all categories.`
                : "No clubs in this category yet. Be the first to register one!"
            }
            actionLabel="Register a Club"
            onAction={() => toast.info("Club registration form coming soon!")}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredClubs.map((club) => {
              const btn = getJoinButton(club);

              return (
                <div
                  key={club.id}
                  className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors">
                        {club.name}
                      </h3>
                      <span className="text-xs font-medium text-gold bg-gold/10 px-2 py-0.5 rounded-full">
                        {club.category}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {club.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        <span>{club.members_count} members</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">
                          {club.meeting_schedule || "Schedule: TBA"}
                        </span>
                      </div>
                    </div>

                    {!viewOnly ? (
                      <Button
                        variant={btn.variant}
                        size="sm"
                        disabled={btn.disabled}
                        onClick={btn.action}
                        className="text-xs"
                      >
                        {btn.label}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">
                        {isAdmin ? "Admin view" : "View only"}
                      </span>
                    )}
                  </div>

                  {club.is_active === 0 && (
                    <p className="mt-3 text-xs text-muted-foreground italic">
                      This club is currently inactive.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Clubs;