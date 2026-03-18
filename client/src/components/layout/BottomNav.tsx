import { Link, useLocation } from "react-router-dom";
import {
  Newspaper,
  Users,
  Building2,
  MessageCircleHeart,
  User,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function BottomNav() {
  const location = useLocation();
  const { isLoggedIn, isAdmin, isParent, user } = useAuth();

  const role = user?.role;

  // Build nav items based on role
  const navItems: { title: string; path: string; icon: typeof Newspaper }[] = [
    { title: "Feed", path: "/feed", icon: Newspaper },
  ];

  // PARENT gets Parents Hub; STUDENT does not
  if (!role || role === "PARENT" || role === "ADMIN") {
    navItems.push({ title: "Parents", path: "/parents", icon: Users });
  }

  // STUDENT + ADMIN get Clubs; PARENT gets view-only (still visible)
  if (!role || role === "STUDENT" || role === "ADMIN") {
    navItems.push({ title: "Clubs", path: "/clubs", icon: Building2 });
  }

  // STUDENT + ADMIN get Confessions; PARENT does not
  if (!role || role === "STUDENT" || role === "ADMIN") {
    navItems.push({ title: "Confess", path: "/confessions", icon: MessageCircleHeart });
  }

  // Last item: Admin for admins, Sign In for guests
  if (isAdmin) {
    navItems.push({ title: "Admin", path: "/admin", icon: Shield });
  } else if (!isLoggedIn) {
    navItems.push({ title: "Sign In", path: "/login", icon: User });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border backdrop-blur-xl bg-card/95">
      <div className="flex items-center justify-around px-2 py-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center gap-0.5 py-2 px-3 rounded-lg transition-all duration-200 min-w-0",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "drop-shadow-sm")} />
              <span className="text-[10px] font-medium truncate">{item.title}</span>
              {isActive && (
                <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
