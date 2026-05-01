import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageLoaderProps {
  fullPage?: boolean;
  className?: string;
}

export function PageLoader({ fullPage = true, className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        fullPage ? "min-h-[calc(100vh-4rem)] w-full" : "py-16 w-full",
        className,
      )}
    >
      <div className="relative flex h-12 w-12 items-center justify-center"></div>

      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

export function SectionLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex items-center justify-center py-12 w-full", className)}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}
