"use client";
import { WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
      <WifiOff className="h-16 w-16 text-muted-foreground" />
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-muted-foreground max-w-sm">
        It looks like you&apos;ve lost your internet connection. Pages
        you&apos;ve already visited are still available.
      </p>
      <Button onClick={() => window.location.reload()}>Try again</Button>
    </div>
  );
}
