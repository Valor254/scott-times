import { Shield } from "lucide-react";

interface ContentPolicyBannerProps {
  message?: string;
}

export function ContentPolicyBanner({
  message = "Keep it respectful. Reports are reviewed.",
}: ContentPolicyBannerProps) {
  return (
    <div className="bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20 px-4 py-2.5 flex items-center gap-2">
      <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <p className="text-xs text-muted-foreground">{message}</p>
    </div>
  );
}
