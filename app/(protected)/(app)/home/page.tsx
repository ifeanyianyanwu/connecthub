"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  UserPlus,
  Users,
  Sparkles,
  Check,
  Filter,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import Loading from "./loading";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Profile } from "@/lib/types";

type UserProfile = Omit<
  Profile,
  | "community_alerts"
  | "created_at"
  | "email"
  | "email_notifications"
  | "is_admin"
  | "profile_visible"
  | "push_notifications"
  | "read_receipts_enabled"
  | "show_online_status"
  | "updated_at"
  | "hobby_embedding"
> & {
  hobbies: string[];
  mutualConnections: number;
  sharedInterests: string[];
  matchScore: number;
  exact_match_score: number;
  ai_match_score: number;
};

type ConnectionStatus =
  | "connected"
  | "pending_sent"
  | "pending_received"
  | "none";

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("recommended");
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [connectionMap, setConnectionMap] = useState<
    Map<string, ConnectionStatus>
  >(new Map());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createClient();
  const { user } = useCurrentUser();

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        setLoading(true);

        const [recResult, connectionsResult] = await Promise.all([
          supabase.rpc("get_weighted_recommendations", {
            query_user_id: user.id,
          }),
          supabase
            .from("connections")
            .select("*")
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        ]);

        if (recResult.error) throw recResult.error;
        if (connectionsResult.error) throw connectionsResult.error;

        const newConnectionMap = new Map<string, ConnectionStatus>();
        connectionsResult.data?.forEach((conn) => {
          const isSender = conn.user1_id === user.id;
          const otherUserId = isSender ? conn.user2_id : conn.user1_id;

          if (conn.status === "accepted") {
            newConnectionMap.set(otherUserId, "connected");
          } else if (conn.status === "pending") {
            newConnectionMap.set(
              otherUserId,
              isSender ? "pending_sent" : "pending_received",
            );
          }
        });
        setConnectionMap(newConnectionMap);

        const enrichedUsers = (recResult.data || []).map((u) => ({
          ...u,
          hobbies: u.hobbies || [],
          sharedInterests: u.shared_interests || [],
          mutualConnections: u.mutual_count || 0,
          matchScore: Math.round((u.total_score || 0) * 100),
          exact_match_score: u.exact_match_score || 0,
          ai_match_score: u.ai_match_score || 0,
        }));

        setAllUsers(enrichedUsers);
      } catch (error) {
        console.error("Error in Discover discovery flow:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, supabase]);

  const handleConnect = async (targetUserId: string) => {
    if (!user) return;
    try {
      setActionLoading(targetUserId);
      setConnectionMap((prev) =>
        new Map(prev).set(targetUserId, "pending_sent"),
      );
      const { error } = await supabase.from("connections").insert({
        user1_id: user.id,
        user2_id: targetUserId,
        status: "pending",
      });
      if (error) throw error;
    } catch (error) {
      console.error("Error sending request:", error);
      setConnectionMap((prev) => {
        const newMap = new Map(prev);
        newMap.delete(targetUserId);
        return newMap;
      });
    } finally {
      setActionLoading(null);
    }
  };

  const filterList = useCallback(
    (list: UserProfile[]) => {
      return list.filter((u) => {
        const matchesSearch =
          (u.display_name || "")
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (u.username || "").toLowerCase().includes(searchQuery.toLowerCase());
        const matchesInterests =
          selectedInterests.length === 0 ||
          u.hobbies.some((h) => selectedInterests.includes(h));
        return matchesSearch && matchesInterests;
      });
    },
    [searchQuery, selectedInterests],
  );

  const filteredAllUsers = useMemo(
    () => filterList(allUsers),
    [allUsers, filterList],
  );

  const filteredRecommended = useMemo(() => {
    const recommendations = allUsers.filter((u) => {
      const status = connectionMap.get(u.id);

      const isNew = status !== "connected" && status !== "pending_sent";
      const isHighQuality = u.matchScore >= 15;

      return isNew && isHighQuality;
    });

    return filterList(recommendations);
  }, [allUsers, filterList, connectionMap]);

  const availableInterests = useMemo(() => {
    const interestSet = new Set<string>();
    allUsers.forEach((u) => u.hobbies.forEach((h) => interestSet.add(h)));
    return Array.from(interestSet).slice(0, 10);
  }, [allUsers]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest],
    );
  };

  const getMatchReason = (u: UserProfile) => {
    if (u.exact_match_score > 0.5) {
      return `Strong overlap in ${u.sharedInterests.slice(0, 2).join(" & ")}.`;
    }
    if (u.ai_match_score > 0.6 && u.sharedInterests.length === 0) {
      return "AI found deep similarities in your hobby profiles despite different keywords.";
    }
    return "Matched based on overall social compatibility.";
  };

  const renderActionButton = (userId: string) => {
    const status = connectionMap.get(userId);
    const isLoading = actionLoading === userId;

    if (status === "connected")
      return (
        <Button
          variant="outline"
          disabled
          size="sm"
          className="w-full sm:w-auto"
        >
          <Check className="mr-2 h-4 w-4" />
          Connected
        </Button>
      );
    if (status === "pending_sent")
      return (
        <Button
          variant="outline"
          disabled
          size="sm"
          className="w-full sm:w-auto"
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Pending
        </Button>
      );
    if (status === "pending_received")
      return (
        <Button
          variant="secondary"
          disabled
          size="sm"
          className="w-full sm:w-auto"
        >
          Request Received
        </Button>
      );

    return (
      <Button
        onClick={() => handleConnect(userId)}
        disabled={isLoading}
        size="sm"
        className="w-full sm:w-auto"
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        Connect
      </Button>
    );
  };

  if (loading) return <Loading />;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-20 lg:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Discover</h1>
        <p className="text-muted-foreground">
          Find and connect with like-minded people
        </p>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter by interests</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableInterests.map((interest) => (
            <button
              key={interest}
              onClick={() => toggleInterest(interest)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm transition-colors",
                selectedInterests.includes(interest)
                  ? "border-foreground bg-foreground text-background"
                  : "border-border hover:border-foreground/50",
              )}
            >
              {interest}
            </button>
          ))}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="recommended">
            <Sparkles className="mr-2 h-4 w-4" />
            Recommended
          </TabsTrigger>
          <TabsTrigger value="all">
            <Users className="mr-2 h-4 w-4" />
            All Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="recommended">
          <div className="space-y-4">
            {filteredRecommended.length > 0 ? (
              filteredRecommended.map((user) => (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <Link
                        href={`/profile/${user.id}`}
                        className="flex items-start gap-4"
                      >
                        <Avatar className="h-16 w-16">
                          <AvatarImage
                            src={user.profile_picture || "/placeholder.svg"}
                            alt={user.display_name || "User"}
                          />
                          <AvatarFallback className="text-xl">
                            {(user.display_name ||
                              user.username ||
                              "U")[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold hover:underline">
                              {user.display_name ||
                                user.username ||
                                "Anonymous"}
                            </h3>
                            {/* MATCH SCORE BADGE */}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Badge
                                  className={cn(
                                    "border-none",
                                    user.matchScore > 80
                                      ? "bg-green-100 text-green-700"
                                      : user.matchScore > 50
                                        ? "bg-blue-100 text-blue-700"
                                        : "bg-gray-100 text-gray-700",
                                  )}
                                >
                                  {user.matchScore}% Match
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent className="w-64 p-3 shadow-xl">
                                <div className="space-y-2">
                                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Match Breakdown
                                  </p>

                                  {/* Exact Match Section */}
                                  <div className="flex justify-between text-sm">
                                    <span>Shared Interests (60%)</span>
                                    <span className="font-mono">
                                      {Math.round(user.exact_match_score * 100)}
                                      %
                                    </span>
                                  </div>

                                  {/* AI Match Section */}
                                  <div className="flex justify-between text-sm">
                                    <span>AI Semantic Match (40%)</span>
                                    <span className="font-mono">
                                      {Math.round(user.ai_match_score * 100)}%
                                    </span>
                                  </div>

                                  <div className="my-2 border-t border-border" />

                                  {/* Contextual Narrative */}
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {getMatchReason(user)}
                                  </p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            @{user.username || "unknown"}
                          </p>
                          <p className="mt-1 text-sm line-clamp-2">
                            {user.bio}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.sharedInterests.map((interest) => (
                              <Badge
                                key={interest}
                                variant="outline"
                                className="text-xs border-primary/50 text-primary"
                              >
                                {interest}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </Link>
                      <div className="flex gap-2 sm:flex-col shrink-0">
                        {renderActionButton(user.id)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-center py-10 text-muted-foreground">
                No new recommendations found.
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="all">
          {/* Same logic as above, just showing everyone */}
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredAllUsers.map((user) => (
              <Card key={user.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <Link
                      href={`/profile/${user.id}`}
                      className="flex items-start gap-3"
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={user.profile_picture || "/placeholder.svg"}
                          alt={user.display_name || "User"}
                        />

                        <AvatarFallback>
                          {(user.display_name ||
                            user.username ||
                            "U")[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div>
                        <h3 className="font-medium hover:underline">
                          {user.display_name || user.username || "Anonymous"}
                        </h3>

                        <p className="text-sm text-muted-foreground">
                          @{user.username || "unknown"}
                        </p>

                        <p className="mt-1 line-clamp-2 text-sm">{user.bio}</p>
                      </div>
                    </Link>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-1">
                    {user.hobbies.slice(0, 3).map((hobby) => (
                      <Badge key={hobby} variant="outline" className="text-xs">
                        {hobby}
                      </Badge>
                    ))}

                    {user.hobbies.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{user.hobbies.length - 3}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4">{renderActionButton(user.id)}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
