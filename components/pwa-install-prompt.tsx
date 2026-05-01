"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, X } from "lucide-react";
import Image from "next/image";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed or installed previously
    if (localStorage.getItem("pwa-install-dismissed")) return;

    const handler = (e: Event) => {
      // Prevent the browser's default mini-infobar
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // When the user installs, hide the prompt
    window.addEventListener("appinstalled", () => setInstallEvent(null));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installEvent) return;
    // Show the native browser install dialog
    await installEvent.prompt();
    const { outcome } = await installEvent.userChoice;
    if (outcome === "accepted") {
      setInstallEvent(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setInstallEvent(null);
    // Don't show again this session
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  // Only render on mobile (the address bar icon handles desktop)
  // and only when the browser has signalled the app is installable
  if (!installEvent || dismissed) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 md:hidden">
      <Card className="border-border shadow-lg">
        <CardContent className="flex items-center gap-3 py-4">
          <Image
            src="/icon1.png"
            alt="ConnectHub"
            className="h-12 w-12 rounded-xl shrink-0"
            width={100}
            height={100}
          />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm">Add to Home Screen</p>
            <p className="text-xs text-muted-foreground">
              Install ConnectHub for a faster, app-like experience
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button size="sm" onClick={handleInstall}>
              <Download className="h-4 w-4 mr-1" />
              Install
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
