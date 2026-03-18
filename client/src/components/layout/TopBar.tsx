import { useState } from "react";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationsDrawer } from "./NotificationsDrawer";
import { SearchModal } from "./SearchModal";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";
import { GraduationCap } from "lucide-react";

interface TopBarProps {
  onToggleSidebar: () => void;
}

export function TopBar({ onToggleSidebar }: TopBarProps) {
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 h-16 backdrop-blur-xl bg-card/95 border-b border-border flex items-center px-4 gap-4">
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            className="flex-shrink-0"
          >
            <Menu className="w-5 h-5" />
          </Button>
        )}

        {isMobile && (
          <Link to="/" className="flex items-center gap-2 flex-shrink-0">
            <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-heading font-bold text-foreground">Scott Times</span>
          </Link>
        )}

        <div className="flex-1 max-w-md">
          <div
            className="relative cursor-pointer"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search posts, clubs, people..."
              className="pl-10 bg-secondary border-none cursor-pointer"
              readOnly
              onClick={() => setSearchOpen(true)}
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <NotificationsDrawer />
        </div>
      </header>

      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}
