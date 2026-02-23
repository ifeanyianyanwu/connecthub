"use client";

import { use, useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Calendar,
  UserPlus,
  UserMinus,
  MessageSquare,
  MoreHorizontal,
  Flag,
  Ban,
  Users,
  Heart,
  Clock,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/database.types";
import { formatDistanceToNow } from "date-fns";
import { useCurrentUser } from "@/hooks/use-current-user";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = Tables<"profiles">;
type Hobby = Tables<"hobbies">;
type ConnectionStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted";

type ProfileWithHobbies = Profile & {
  hobbies: Hobby[];
  connectionCount: number;
  communityCount: number;
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { user: authUser } = useCurrentUser();

  // ✅ Stable supabase reference
  const supabase = useMemo(() => createClient(), []);

  const [profile, setProfile] = useState<ProfileWithHobbies | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("none");
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const isOwnProfile = authUser?.id === id;

  // ── Fetch profile + hobbies + connection status ──────────────────────────

  const fetchProfile = useCallback(async () => {
    if (!id) return;

    // Run queries in parallel where possible
    const [profileResult, hobbiesResult] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", id).single(),
      supabase.from("user_hobbies").select("hobbies(*)").eq("user_id", id),
    ]);

    if (profileResult.error || !profileResult.data) {
      setNotFound(true);
      return;
    }

    // Connection count and community count
    const [connectionsResult, communitiesResult] = await Promise.all([
      supabase
        .from("connections")
        .select("id", { count: "exact", head: true })
        .or(`user1_id.eq.${id},user2_id.eq.${id}`)
        .eq("status", "accepted"),
      supabase
        .from("community_members")
        .select("id", { count: "exact", head: true })
        .eq("user_id", id),
    ]);

    const hobbies = (hobbiesResult.data ?? [])
      .map((h) => h.hobbies)
      .flat()
      .filter(Boolean) as Hobby[];

    setProfile({
      ...profileResult.data,
      hobbies,
      connectionCount: connectionsResult.count ?? 0,
      communityCount: communitiesResult.count ?? 0,
    });

    // Fetch connection status between current user and this profile
    if (authUser?.id && !isOwnProfile) {
      const { data: conn } = await supabase
        .from("connections")
        .select("id, status, user1_id, user2_id")
        .or(
          `and(user1_id.eq.${authUser.id},user2_id.eq.${id}),` +
            `and(user1_id.eq.${id},user2_id.eq.${authUser.id})`,
        )
        .maybeSingle();

      if (conn) {
        setConnectionId(conn.id);
        if (conn.status === "accepted") {
          setConnectionStatus("accepted");
        } else if (conn.status === "pending") {
          // Determine direction: did we send it or receive it?
          setConnectionStatus(
            conn.user1_id === authUser.id ? "pending_sent" : "pending_received",
          );
        }
      }
    }
  }, [id, authUser, isOwnProfile, supabase]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await fetchProfile();
      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchProfile]);

  // ── Connection actions ───────────────────────────────────────────────────

  const handleConnect = async () => {
    if (!authUser?.id) return;
    setActionLoading(true);

    const { data, error } = await supabase
      .from("connections")
      .insert({ user1_id: authUser.id, user2_id: id, status: "pending" })
      .select("id")
      .single();

    if (!error && data) {
      setConnectionId(data.id);
      setConnectionStatus("pending_sent");
    } else {
      console.error("Error sending connection request:", error);
    }
    setActionLoading(false);
  };

  const handleAccept = async () => {
    if (!connectionId) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("connections")
      .update({ status: "accepted" })
      .eq("id", connectionId);

    if (!error) {
      setConnectionStatus("accepted");
      setProfile((prev) =>
        prev ? { ...prev, connectionCount: prev.connectionCount + 1 } : prev,
      );
    }
    setActionLoading(false);
  };

  const handleDisconnect = async () => {
    if (!connectionId) return;
    setActionLoading(true);

    const { error } = await supabase
      .from("connections")
      .delete()
      .eq("id", connectionId);

    if (!error) {
      setConnectionId(null);
      setConnectionStatus("none");
      setProfile((prev) =>
        prev
          ? { ...prev, connectionCount: Math.max(0, prev.connectionCount - 1) }
          : prev,
      );
    }
    setActionLoading(false);
  };

  // ─── Loading / Not found ──────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">User Not Found</h2>
            <p className="text-muted-foreground">
              The user you are looking for does not exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const displayName = profile.display_name || profile.username || "Unknown";
  const initials = displayName.charAt(0).toUpperCase();

  // ─── Connection button ────────────────────────────────────────────────────

  const renderConnectionButton = () => {
    if (isOwnProfile) return null;

    if (actionLoading) {
      return (
        <Button disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading...
        </Button>
      );
    }

    switch (connectionStatus) {
      case "accepted":
        return (
          <>
            <Button variant="outline" className="gap-2 bg-transparent" asChild>
              <Link href={`/messages?conversation=${profile.id}`}>
                <MessageSquare className="h-4 w-4" />
                Message
              </Link>
            </Button>
            <Button
              variant="outline"
              className="gap-2 bg-transparent"
              onClick={handleDisconnect}
            >
              <UserMinus className="h-4 w-4" />
              Connected
            </Button>
          </>
        );
      case "pending_sent":
        return (
          <Button variant="outline" disabled>
            <Clock className="mr-2 h-4 w-4" />
            Request Sent
          </Button>
        );
      case "pending_received":
        return (
          <>
            <Button onClick={handleAccept} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Accept Request
            </Button>
            <Button
              variant="outline"
              className="bg-transparent"
              onClick={handleDisconnect}
            >
              Decline
            </Button>
          </>
        );
      default:
        return (
          <Button onClick={handleConnect} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Connect
          </Button>
        );
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 pb-20 lg:pb-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-6 md:flex-row">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage
                src={profile.profile_picture || "/placeholder.svg"}
                alt={displayName}
              />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h1 className="text-2xl font-bold">{displayName}</h1>
                  {profile.username && (
                    <p className="text-muted-foreground">@{profile.username}</p>
                  )}
                </div>

                {/* Actions */}
                {!isOwnProfile && (
                  <div className="flex flex-wrap items-center gap-2">
                    {renderConnectionButton()}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Flag className="mr-2 h-4 w-4" />
                          Report User
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Ban className="mr-2 h-4 w-4" />
                          Block User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}

                {/* {isOwnProfile && (
                  <Button variant="outline" asChild>
                    <Link href="/profile">Edit Profile</Link>
                  </Button>
                )} */}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {profile.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </span>
                )}
                {profile.created_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Joined{" "}
                    {formatDistanceToNow(new Date(profile.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-6 text-sm">
                <span>
                  <strong>{profile.connectionCount}</strong>{" "}
                  <span className="text-muted-foreground">connections</span>
                </span>
                <span>
                  <strong>{profile.communityCount}</strong>{" "}
                  <span className="text-muted-foreground">communities</span>
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="about" className="space-y-4">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="interests">Interests</TabsTrigger>
        </TabsList>

        {/* About */}
        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {profile.bio || "No bio provided yet."}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interests / Hobbies */}
        <TabsContent value="interests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Interests & Hobbies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {profile.hobbies.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.hobbies.map((hobby) => (
                    <Badge key={hobby.id} variant="secondary">
                      {hobby.name}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">No interests added yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Hobby categories breakdown */}
          {profile.hobbies.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(
                  profile.hobbies.reduce<Record<string, Hobby[]>>((acc, h) => {
                    const cat = h.category ?? "Other";
                    if (!acc[cat]) acc[cat] = [];
                    acc[cat].push(h);
                    return acc;
                  }, {}),
                ).map(([category, hobbies]) => (
                  <div key={category}>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">
                      {category}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {hobbies.map((h) => (
                        <Badge key={h.id} variant="outline" className="text-xs">
                          {h.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
