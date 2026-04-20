import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  /** Fill the full viewport height — use for top-level page skeletons */
  fullPage?: boolean;
  className?: string;
}

/**
 * Standard full-page loading indicator used by every Next.js loading.tsx.
 * Matches the app's design system and works in both light and dark mode.
 */
export function PageLoader({ fullPage = true, className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullPage ? "min-h-[calc(100vh-4rem)] w-full" : "py-16 w-full",
        className,
      )}
    >
      {/* Animated logo mark */}
      <div className="relative flex h-12 w-12 items-center justify-center">
        {/* Outer ring pulse */}
        <span className="absolute inset-0 rounded-full border-2 border-foreground/10 animate-ping" />
        {/* Inner logo */}
        {/* <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-foreground shadow-sm">
          <span className="text-sm font-bold tracking-tight text-background select-none">
            CH
          </span>
        </div> */}
      </div>

      {/* Spinner beneath logo */}

      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

/**
 * Inline section loader — for loading states within an already-mounted page
 * (e.g., lazy-loaded tabs, paginated lists).
 */
export function SectionLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center justify-center py-12 w-full", className)}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
