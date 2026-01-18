"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  MessageSquare,
  Globe,
  Sparkles,
  ArrowRight,
  Shield,
  Zap,
  Heart,
} from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/feed");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 mx-auto">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
              <Users className="h-5 w-5 text-background" />
            </div>
            <span className="font-bold text-xl">ConnectHub</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container px-4 py-20 md:py-32 mx-auto">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-balance">
            Build Meaningful Connections That Last
          </h1>
          <p className="text-xl text-muted-foreground text-pretty max-w-2xl mx-auto">
            ConnectHub helps you discover and connect with people who share your
            interests, goals, and values. Build authentic relationships in a
            thoughtfully designed space.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link href="/register">
              <Button size="lg" className="w-full sm:w-auto gap-2">
                Start Connecting
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto bg-transparent"
              >
                Sign In to Your Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container px-4 py-16 mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">
            Everything You Need to Connect
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Powerful features designed to help you build and nurture meaningful
            relationships.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Smart Recommendations
              </h3>
              <p className="text-muted-foreground">
                Our intelligent matching system suggests connections based on
                shared interests, location, and compatibility.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Real-Time Messaging
              </h3>
              <p className="text-muted-foreground">
                Stay connected with instant messaging, media sharing, and typing
                indicators for seamless conversations.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                <Globe className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Vibrant Communities
              </h3>
              <p className="text-muted-foreground">
                Join or create communities around topics you love. Share ideas,
                events, and grow together.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Privacy First</h3>
              <p className="text-muted-foreground">
                Control who sees your profile, block unwanted contacts, and
                manage your privacy settings with ease.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Works Offline</h3>
              <p className="text-muted-foreground">
                Access your connections and messages even without internet.
                Install as an app on any device.
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card">
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mb-4">
                <Heart className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-lg mb-2">
                Authentic Connections
              </h3>
              <p className="text-muted-foreground">
                Focus on quality over quantity. Build genuine relationships with
                verified profiles and meaningful interactions.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container px-4 py-20 mx-auto">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to Start Connecting?</h2>
          <p className="text-muted-foreground">
            Join thousands of people building meaningful relationships on
            ConnectHub. It takes less than a minute to get started.
          </p>
          <Link href="/register">
            <Button size="lg" className="gap-2">
              Create Your Profile
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container px-4 py-8 mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-foreground flex items-center justify-center">
                <Users className="h-4 w-4 text-background" />
              </div>
              <span className="font-semibold">ConnectHub</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="#"
                className="hover:text-foreground transition-colors"
              >
                Contact
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              2026 ConnectHub. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
