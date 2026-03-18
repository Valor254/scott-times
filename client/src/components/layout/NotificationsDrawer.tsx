import { Bell, CheckCircle2, Users, Flag, MessageCircle, Info } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

const placeholderNotifications = [
  {
    id: 1,
    icon: Users,
    title: "Your club request was received",
    description: "Tech Innovation Club is reviewing your membership request.",
    time: "2h ago",
    read: false,
  },
  {
    id: 2,
    icon: Flag,
    title: "Report under review",
    description: "A report you submitted is being reviewed by our moderation team.",
    time: "5h ago",
    read: false,
  },
  {
    id: 3,
    icon: CheckCircle2,
    title: "Welcome to Scott Times!",
    description: "Your account has been set up successfully. Start exploring campus life.",
    time: "1d ago",
    read: true,
  },
  {
    id: 4,
    icon: MessageCircle,
    title: "New comment on your post",
    description: "Someone replied to your recent campus feed post.",
    time: "3d ago",
    read: true,
  },
];

export function NotificationsDrawer() {
  const { isLoggedIn } = useAuth();
  const unreadCount = placeholderNotifications.filter((n) => !n.read).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-sm">
        <SheetHeader>
          <SheetTitle className="font-heading">Notifications</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-1">
          {!isLoggedIn ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-3">
                <Bell className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Sign in to view notifications</p>
              <p className="text-xs text-muted-foreground">
                You'll see updates about your posts, clubs, and reports here.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-1 pb-3 border-b border-border">
                <Info className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">
                  Real-time notifications coming soon. Here's a preview.
                </span>
              </div>
              {placeholderNotifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex gap-3 p-3 rounded-lg transition-colors ${
                    !notif.read ? "bg-primary/5" : "hover:bg-muted/50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <notif.icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{notif.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{notif.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{notif.time}</p>
                  </div>
                  {!notif.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
