import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type AllowedRole = "STUDENT" | "PARENT" | "ADMIN";

interface RouteGuardProps {
  allowed: AllowedRole[];
  children: React.ReactNode;
}

/**
 * Enforces authentication + RBAC:
 * - If NOT logged in → redirect to /login
 * - If logged in but role not allowed → redirect to /feed (or /admin if ADMIN)
 */
export function RouteGuard({ allowed, children }: RouteGuardProps) {
  const { user, isLoggedIn, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const userRole = user?.role as AllowedRole | undefined;

  useEffect(() => {
    // Wait until auth has finished restoring session
    if (isLoading) return;

    // 1) Not logged in → go login
    if (!isLoggedIn) {
      toast.info("Please sign in", {
        description: "Sign in to access that page.",
      });

      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }

    // 2) Logged in but not allowed
    if (userRole && !allowed.includes(userRole)) {
      toast.error("Access denied", {
        description: "You don't have permission to view that page.",
      });

      // Nice UX: ADMINs go to /admin, others go /feed
      if (userRole === "ADMIN") navigate("/admin", { replace: true });
      else navigate("/feed", { replace: true });
    }
  }, [isLoading, isLoggedIn, userRole, allowed, navigate, location.pathname]);

  // While checking session, render nothing (or you can render a loader)
  if (isLoading) return null;

  // If not logged in, don't render protected content
  if (!isLoggedIn) return null;

  // If role not allowed, don't render protected content
  if (userRole && !allowed.includes(userRole)) return null;

  return <>{children}</>;
}