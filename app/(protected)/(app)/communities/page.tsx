"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus, Users, TrendingUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import Loading from "./loading";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/database.types";
import { useCurrentUser } from "@/hooks/use-current-user";

const categories = [
  "All",
  "Technology",
  "Design",
  "Business",
  "Photography",
  "Lifestyle",
  "Science",
  "Entertainment",
];

type Community = Tables<"communities"> & {
  isMember: boolean;
  postCount: number;
};

export default function CommunitiesPage() {
  const { user } = useCurrentUser();

  const supabase = useMemo(() => createClient(), []);

  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("discover");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    category: "Technology",
  });

  // ── Fetch communities ────────────────────────────────────────────────────

  const fetchCommunities = useCallback(async () => {
    if (!user?.id) return;

    // Run both queries in parallel
    const [communitiesResult, membersResult] = await Promise.all([
      supabase.from("communities").select("*"),
      supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", user.id),
    ]);

    if (communitiesResult.error || membersResult.error) {
      console.error(
        "Error fetching communities:",
        communitiesResult.error || membersResult.error,
      );
      return;
    }

    const memberIds = new Set(membersResult.data.map((m) => m.community_id));

    setAllCommunities(
      communitiesResult.data.map((c) => ({
        ...c,
        isMember: memberIds.has(c.id),
        postCount: 0,
      })),
    );
  }, [user, supabase]);

  // ✅ No synchronous setState in the effect body — loading state is managed
  //    by the effect wrapper, fetch logic stays reusable via useCallback
  useEffect(() => {
    if (!user?.id) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await fetchCommunities();
      if (!cancelled) setLoading(false);
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [user?.id, fetchCommunities]);

  // ── Join / Leave ─────────────────────────────────────────────────────────

  const joinCommunity = useCallback(
    async (communityId: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from("community_members")
        .insert({ community_id: communityId, user_id: user.id });

      if (error) {
        console.error("Error joining community:", error);
        return;
      }

      // Optimistic update
      setAllCommunities((prev) =>
        prev.map((c) =>
          c.id === communityId
            ? { ...c, isMember: true, member_count: (c.member_count ?? 0) + 1 }
            : c,
        ),
      );
    },
    [user, supabase],
  );

  const leaveCommunity = useCallback(
    async (communityId: string) => {
      if (!user?.id) return;

      const { error } = await supabase
        .from("community_members")
        .delete()
        .match({ community_id: communityId, user_id: user.id });

      if (error) {
        console.error("Error leaving community:", error);
        return;
      }

      // Optimistic update
      setAllCommunities((prev) =>
        prev.map((c) =>
          c.id === communityId
            ? {
                ...c,
                isMember: false,
                member_count: Math.max(0, (c.member_count ?? 0) - 1),
              }
            : c,
        ),
      );
    },
    [user, supabase],
  );

  // ── Create community ─────────────────────────────────────────────────────

  const handleCreateCommunity = async () => {
    if (!newCommunity.name.trim() || !user?.id) return;
    setIsCreating(true);

    const { data, error } = await supabase
      .from("communities")
      .insert({
        name: newCommunity.name,
        description: newCommunity.description,
        category: newCommunity.category,
        created_by: user.id,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error creating community:", error);
      setIsCreating(false);
      return;
    }

    // Insert creator as a member with role 'admin'
    await supabase.from("community_members").insert({
      community_id: data.id,
      user_id: user.id,
      role: "admin",
    });

    // Add to local state directly — no need to re-fetch
    setAllCommunities((prev) => [
      { ...data, isMember: true, postCount: 0 },
      ...prev,
    ]);

    setNewCommunity({ name: "", description: "", category: "Technology" });
    setIsCreating(false);
    setCreateDialogOpen(false);
    setActiveTab("my");
  };

  // ── Derived state ────────────────────────────────────────────────────────

  const myCommunities = useMemo(
    () => allCommunities.filter((c) => c.isMember),
    [allCommunities],
  );

  const discoverCommunities = useMemo(
    () => allCommunities.filter((c) => !c.isMember),
    [allCommunities],
  );

  const filteredCommunities = useMemo(() => {
    const source = activeTab === "my" ? myCommunities : discoverCommunities;
    return source.filter((community) => {
      const matchesSearch =
        community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (community.description ?? "")
          .toLowerCase()
          .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "All" || community.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [
    activeTab,
    myCommunities,
    discoverCommunities,
    searchQuery,
    selectedCategory,
  ]);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) return <Loading />;

  return (
    <Suspense fallback={<Loading />}>
      <div className="mx-auto max-w-6xl px-4 py-6 pb-20 lg:pb-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Communities</h1>
            <p className="text-muted-foreground">
              Join communities that match your interests
            </p>
          </div>

          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Community
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a Community</DialogTitle>
                <DialogDescription>
                  Start a new community and bring people together around shared
                  interests.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Community Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., React Developers"
                    value={newCommunity.name}
                    onChange={(e) =>
                      setNewCommunity({ ...newCommunity, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="What is this community about?"
                    rows={3}
                    value={newCommunity.description}
                    onChange={(e) =>
                      setNewCommunity({
                        ...newCommunity,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newCommunity.category}
                    onValueChange={(value) =>
                      setNewCommunity({ ...newCommunity, category: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.slice(1).map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setCreateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCommunity}
                  disabled={!newCommunity.name.trim() || isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Community"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search communities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  selectedCategory === category
                    ? "border-foreground bg-foreground text-background"
                    : "border-border hover:border-foreground/50",
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="discover">
              <TrendingUp className="mr-2 h-4 w-4" />
              Discover
            </TabsTrigger>
            <TabsTrigger value="my">
              <Users className="mr-2 h-4 w-4" />
              My Communities
              {myCommunities.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {myCommunities.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {(["discover", "my"] as const).map((tab) => (
            <TabsContent key={tab} value={tab}>
              {filteredCommunities.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      {tab === "my" &&
                      !searchQuery &&
                      selectedCategory === "All"
                        ? "You haven't joined any communities yet"
                        : "No communities match your filters"}
                    </p>
                    {tab === "my" && (
                      <Button
                        className="mt-4"
                        onClick={() => setActiveTab("discover")}
                      >
                        Discover Communities
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCommunities.map((community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onJoin={() => joinCommunity(community.id)}
                      onLeave={() => leaveCommunity(community.id)}
                    />
                  ))}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </Suspense>
  );
}

// ─── Community Card ───────────────────────────────────────────────────────────

interface CommunityCardProps {
  community: Community;
  onJoin: () => void;
  onLeave: () => void;
}

function CommunityCard({ community, onJoin, onLeave }: CommunityCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-24">
        <Image
          src={community.image_url || "/placeholder.svg"}
          alt={community.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background/60 to-transparent" />
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 -mt-8 border-2 border-background">
            <AvatarImage
              src={community.image_url || "/placeholder.svg"}
              alt={community.name}
            />
            <AvatarFallback>{community.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 pt-1">
            <Link href={`/communities/${community.id}`}>
              <CardTitle className="text-base hover:underline">
                {community.name}
              </CardTitle>
            </Link>
            {community.category && (
              <Badge variant="outline" className="mt-1 text-xs">
                {community.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {community.description}
        </p>
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {(community.member_count ?? 0).toLocaleString()} members
          </span>
          <span>{community.postCount.toLocaleString()} posts</span>
        </div>
        {community.isMember ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" asChild>
              <Link href={`/communities/${community.id}`}>View</Link>
            </Button>
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onLeave}
            >
              Leave
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={onJoin}>
            Join Community
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
