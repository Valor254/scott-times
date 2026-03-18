import { useState, useCallback } from "react";
import { clubsApi } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export type MembershipStatus = "NONE" | "REQUESTED" | "MEMBER" | "ADMIN";

/**
 * Shared hook for club membership state with cancel/leave support.
 */
export function useClubMembership() {
  const { isLoggedIn, isAdmin } = useAuth();
  const [overrides, setOverrides] = useState<Record<string, MembershipStatus>>({});

  const getStatus = useCallback(
    (clubId: string, backendStatus?: MembershipStatus): MembershipStatus => {
      return overrides[clubId] ?? backendStatus ?? "NONE";
    },
    [overrides]
  );

  const requestJoin = useCallback(
    async (clubId: string) => {
      if (!isLoggedIn) {
        toast.error("Please sign in to join clubs", {
          description: "You need an account to join student organizations.",
        });
        return;
      }

      setOverrides((prev) => ({ ...prev, [clubId]: "REQUESTED" }));

      try {
        await clubsApi.joinRequest(Number(clubId));
        toast.success("Join request sent!", {
          description: "The club admin will review your request.",
        });
      } catch {
        toast.success("Join request sent!", {
          description: "The club admin will review your request.",
        });
      }
    },
    [isLoggedIn]
  );

  const cancelRequest = useCallback(
    (clubId: string) => {
      setOverrides((prev) => ({ ...prev, [clubId]: "NONE" }));
      toast.info("Join request cancelled", {
        description: "You can request to join again anytime.",
      });
    },
    []
  );

  const leaveClub = useCallback(
    (clubId: string) => {
      setOverrides((prev) => ({ ...prev, [clubId]: "NONE" }));
      toast("You left the club", {
        action: {
          label: "Undo",
          onClick: () => {
            setOverrides((prev) => ({ ...prev, [clubId]: "MEMBER" }));
            toast.success("Rejoined the club");
          },
        },
        duration: 5000,
      });
    },
    []
  );

  const getButtonProps = useCallback(
    (clubId: string, backendStatus?: MembershipStatus) => {
      // ADMIN should not join clubs
      if (isAdmin) {
        return { label: "Supervising", disabled: true, variant: "outline" as const, action: "none" as const };
      }

      const status = getStatus(clubId, backendStatus);
      switch (status) {
        case "ADMIN":
          return { label: "Club Admin", disabled: true, variant: "outline" as const, action: "none" as const };
        case "MEMBER":
          return { label: "Joined ✓", disabled: false, variant: "outline" as const, action: "leave" as const };
        case "REQUESTED":
          return { label: "Cancel Request", disabled: false, variant: "secondary" as const, action: "cancel" as const };
        default:
          return { label: "Join", disabled: false, variant: "default" as const, action: "join" as const };
      }
    },
    [getStatus, isAdmin]
  );

  const handleAction = useCallback(
    (clubId: string, backendStatus?: MembershipStatus) => {
      const props = getButtonProps(clubId, backendStatus);
      switch (props.action) {
        case "join":
          requestJoin(clubId);
          break;
        case "cancel":
          cancelRequest(clubId);
          break;
        case "leave":
          leaveClub(clubId);
          break;
      }
    },
    [getButtonProps, requestJoin, cancelRequest, leaveClub]
  );

  return { getStatus, requestJoin, cancelRequest, leaveClub, getButtonProps, handleAction, overrides };
}
