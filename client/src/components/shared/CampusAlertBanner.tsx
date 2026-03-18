import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface CampusAlertBannerProps {
  message?: string | null;
}

/**
 * Displays urgent campus-wide alerts. Shows "No active alerts" placeholder
 * when no alert is set. Only ADMIN can create/clear alerts (via backend).
 */
export function CampusAlertBanner({ message }: CampusAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  if (!message) {
    return (
      <div className="bg-muted/50 rounded-lg border border-border px-4 py-2.5 flex items-center gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
        <span>No active campus alerts</span>
      </div>
    );
  }

  return (
    <div className="bg-destructive/10 dark:bg-destructive/20 rounded-lg border border-destructive/30 px-4 py-2.5 flex items-center gap-3">
      <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0" />
      <p className="text-sm font-medium text-foreground flex-1">{message}</p>
      <Button
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        onClick={() => setDismissed(true)}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}
