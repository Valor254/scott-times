import { BadgeCheck } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function VerifiedBadge() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <BadgeCheck className="w-4 h-4 text-primary flex-shrink-0 inline-block" />
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">Verified official account</p>
      </TooltipContent>
    </Tooltip>
  );
}
