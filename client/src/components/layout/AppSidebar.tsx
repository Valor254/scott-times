import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Newspaper,
  Users,
  Building2,
  MessageCircleHeart,
  Shield,
  GraduationCap,
  LogOut,
  LogIn,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface AppSidebarProps {
  isOpen: boolean;
}

export function AppSidebar({ isOpen }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isLoggedIn, isAdmin, logout } = useAuth();

  const role = user?.role;

  // Build nav items based on role (only show feature links when logged in)
  const navItems: { title: string; path: string; icon: typeof Newspaper }[] = [];

  if (isLoggedIn) {
    navItems.push({ title: "Feed", path: "/feed", icon: Newspaper });

    if (role === "PARENT" || role === "ADMIN") {
      navItems.push({ title: "Parents Hub", path: "/parents", icon: Users });
    }

    if (role === "STUDENT" || role === "ADMIN") {
      navItems.push({ title: "Clubs", path: "/clubs", icon: Building2 });
      navItems.push({ title: "Confessions", path: "/confessions", icon: MessageCircleHeart });
    }
  }

  const initials =
    user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "S";

  const handleLogout = () => {
    logout();
    navigate("/", { replace: true });
  };

  return (
    <aside
      className={cn(
        "sticky top-16 h-[calc(100vh-4rem)] bg-sidebar border-r border-sidebar-border transition-all duration-300 overflow-hidden flex flex-col",
        isOpen ? "w-64" : "w-16"
      )}
    >
      <div className="p-4 border-b border-sidebar-border">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {isOpen && (
            <span className="font-heading font-bold text-sidebar-foreground text-lg">
              Scott Times
            </span>
          )}
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto scrollbar-thin">
        <span
          className={cn(
            "text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2 block",
            !isOpen && "sr-only"
          )}
        >
          Main
        </span>

        {isLoggedIn ? (
          navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {isOpen && <span>{item.title}</span>}
              </Link>
            );
          })
        ) : (
          <div className={cn("px-3 py-2 text-xs text-sidebar-foreground/60", !isOpen && "sr-only")}>
            Sign in to access features
          </div>
        )}

        {/* Admin section - only visible to ADMIN users */}
        {isAdmin && isLoggedIn && (
          <div className="pt-4">
            <span
              className={cn(
                "text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider px-3 mb-2 block",
                !isOpen && "sr-only"
              )}
            >
              Management
            </span>
            <Link
              to="/admin"
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                location.pathname === "/admin"
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Shield className="w-5 h-5 flex-shrink-0" />
              {isOpen && <span>Admin</span>}
            </Link>
          </div>
        )}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        {isLoggedIn ? (
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-sm font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">
                  {user?.fullName}
                </p>
                <button
                  onClick={handleLogout}
                  className="text-xs text-sidebar-foreground/50 hover:text-destructive transition-colors flex items-center gap-1"
                >
                  <LogOut className="w-3 h-3" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link to="/login" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-sidebar-accent flex items-center justify-center flex-shrink-0">
              <LogIn className="w-4 h-4 text-sidebar-accent-foreground" />
            </div>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate group-hover:text-sidebar-primary transition-colors">
                  Sign In
                </p>
                <p className="text-xs text-sidebar-foreground/50 truncate">
                  Access your account
                </p>
              </div>
            )}
          </Link>
        )}
      </div>
    </aside>
  );
}

export default AppSidebar;