"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import {
  Search,
  Plus,
  Users,
  TrendingUp,
  Loader2,
  ImageIcon,
  X,
  Bot,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Suspense } from "react";
import Loading from "./loading";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/database.types";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { useHandleMediaUpload } from "@/hooks/use-handle-media-upload";
import { useCommunityRecommendations } from "@/hooks/use-community-recommendations";
import { CommunityRecommendationCard } from "@/components/community-recommendation-card";
import { SectionLoader } from "@/components/page-loader";
import { toast } from "sonner";

type Community = Tables<"communities"> & {
  isMember: boolean;
  community_members?: { count: number }[];
};

type Hobby = Tables<"hobbies">;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunitiesPage() {
  const { user } = useCurrentUser();
  const {
    handleMediaUpload,
    isUploadingMedia,
    error: mediaError,
  } = useHandleMediaUpload();
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [allCommunities, setAllCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("recommended");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);

  // Hobbies available for tagging
  const [allHobbies, setAllHobbies] = useState<Hobby[]>([]);

  const [categories, setCategories] = useState<string[]>(["All"]);

  const [newCommunity, setNewCommunity] = useState({
    name: "",
    description: "",
    category: "",
    selectedHobbies: [] as string[], // hobby ids
    imageFile: null as File | null,
    imagePreview: null as string | null,
  });

  // ── Recommendations ────────────────────────────────────────────────────────
  const { recommendations, loading: loadingRecs } =
    useCommunityRecommendations();

  // ── Fetch hobbies for the tag picker ──────────────────────────────────────

  useEffect(() => {
    const fetch = async () => {
      const supabase = createClient();
      const { data } = await supabase.from("hobbies").select("*").order("name");
      setAllHobbies(data ?? []);
    };
    fetch();
  }, []);

  // ── Fetch categories from Supabase ────────────────────────────────────────

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("communities")
        .select("category")
        .not("category", "is", null);

      if (data) {
        const dbCategories = [
          ...new Set(
            data
              .map((c) => c.category)
              .filter((c): c is string => !!c && c.trim() !== ""),
          ),
        ];
        const merged = ["All", ...new Set(dbCategories)].sort((a, b) => {
          if (a === "All") return -1;
          if (b === "All") return 1;
          return a.localeCompare(b);
        });
        setCategories(merged);
      }
    };
    fetchCategories();
  }, []);

  // ── Fetch communities ─────────────────────────────────────────────────────

  const fetchCommunities = useCallback(async () => {
    if (!user?.id) return;
    const supabase = createClient();

    const [communitiesResult, membersResult] = await Promise.all([
      supabase.from("communities").select("*, community_members(count)"),
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
      })),
    );
  }, [user]);

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

  // ── Join / Leave ──────────────────────────────────────────────────────────

  const joinCommunity = useCallback(
    async (communityId: string, communityName: string) => {
      if (!user?.id) return;
      setJoiningId(communityId);
      const supabase = createClient();
      const { error } = await supabase
        .from("community_members")
        .insert({ community_id: communityId, user_id: user.id });

      if (error) {
        toast.error("Failed to join community. Please try again.");
        setJoiningId(null);
        return;
      }
      setAllCommunities((prev) =>
        prev.map((c) => (c.id === communityId ? { ...c, isMember: true } : c)),
      );
      toast.success(`Joined ${communityName}!`);
      setJoiningId(null);
    },
    [user],
  );

  const leaveCommunity = useCallback(
    async (communityId: string, communityName: string) => {
      if (!user?.id) return;
      const supabase = createClient();
      const { error } = await supabase
        .from("community_members")
        .delete()
        .match({ community_id: communityId, user_id: user.id });

      if (error) {
        toast.error("Failed to leave community. Please try again.");
        return;
      }
      setAllCommunities((prev) =>
        prev.map((c) => (c.id === communityId ? { ...c, isMember: false } : c)),
      );
      toast.success(`Left ${communityName}.`);
    },
    [user],
  );

  // ── Image selection ───────────────────────────────────────────────────────

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1024 * 1024) return;
    const preview = URL.createObjectURL(file);
    setNewCommunity((prev) => ({
      ...prev,
      imageFile: file,
      imagePreview: preview,
    }));
    e.target.value = "";
  };

  const handleRemoveImage = () => {
    if (newCommunity.imagePreview)
      URL.revokeObjectURL(newCommunity.imagePreview);
    setNewCommunity((prev) => ({
      ...prev,
      imageFile: null,
      imagePreview: null,
    }));
  };

  const toggleHobbyTag = (hobbyId: string) => {
    setNewCommunity((prev) => ({
      ...prev,
      selectedHobbies: prev.selectedHobbies.includes(hobbyId)
        ? prev.selectedHobbies.filter((id) => id !== hobbyId)
        : [...prev.selectedHobbies, hobbyId],
    }));
  };

  // ── Create community ──────────────────────────────────────────────────────

  const handleCreateCommunity = async () => {
    if (!newCommunity.name.trim() || !user?.id) return;
    setIsCreating(true);
    const supabase = createClient();

    // 1. Upload cover image
    let imageUrl: string | null = null;
    if (newCommunity.imageFile) {
      const uploaded = await handleMediaUpload(newCommunity.imageFile);
      if (uploaded) imageUrl = uploaded;
    }

    // 2. Insert community row
    const { data, error } = await supabase
      .from("communities")
      .insert({
        name: newCommunity.name,
        description: newCommunity.description,
        category: newCommunity.category,
        created_by: user.id,
        image_url: imageUrl,
      })
      .select()
      .single();

    if (error || !data) {
      console.error("Error creating community:", error);
      toast.error("Failed to create community. Please try again.");
      setIsCreating(false);
      return;
    }

    // 3. Insert creator as admin member
    await supabase.from("community_members").insert({
      community_id: data.id,
      user_id: user.id,
      role: "admin",
    });

    // 4. Save hobby tags
    if (newCommunity.selectedHobbies.length > 0) {
      await supabase.from("community_hobbies").insert(
        newCommunity.selectedHobbies.map((hobbyId) => ({
          community_id: data.id,
          hobby_id: hobbyId,
        })),
      );
    }

    // 5. Generate embedding asynchronously (fire-and-forget — non-blocking)
    fetch(`/api/communities/${data.id}/update-embedding`, {
      method: "POST",
    }).catch(console.error);

    // 6. Update local state
    if (newCommunity.category && !categories.includes(newCommunity.category)) {
      setCategories((prev) =>
        [
          "All",
          ...new Set([
            ...prev.filter((c) => c !== "All"),
            newCommunity.category,
          ]),
        ].sort((a, b) => {
          if (a === "All") return -1;
          if (b === "All") return 1;
          return a.localeCompare(b);
        }),
      );
    }

    if (newCommunity.imagePreview)
      URL.revokeObjectURL(newCommunity.imagePreview);

    setAllCommunities((prev) => [{ ...data, isMember: true }, ...prev]);
    setNewCommunity({
      name: "",
      description: "",
      category: "",
      selectedHobbies: [],
      imageFile: null,
      imagePreview: null,
    });
    setIsCreating(false);
    setCreateDialogOpen(false);
    setActiveTab("my");
    toast.success(`Community "${data.name}" created!`);
  };

  const handleCloseDialog = (open: boolean) => {
    if (!open && newCommunity.imagePreview) {
      URL.revokeObjectURL(newCommunity.imagePreview);
      setNewCommunity((prev) => ({
        ...prev,
        imageFile: null,
        imagePreview: null,
      }));
    }
    setCreateDialogOpen(open);
  };

  // ── Derived state ─────────────────────────────────────────────────────────

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

  // Filter recommendations to only those not already shown as joined
  const filteredRecommendations = useMemo(
    () =>
      recommendations.filter(
        (r) => !allCommunities.find((c) => c.id === r.id && c.isMember),
      ),
    [recommendations, allCommunities],
  );

  if (loading) return <Loading />;

  // ─── Render ───────────────────────────────────────────────────────────────

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

          <Dialog open={createDialogOpen} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Community
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create a Community</DialogTitle>
                <DialogDescription>
                  Start a new community and bring people together around shared
                  interests.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-4">
                {/* Cover image */}
                <div className="space-y-2">
                  <Label>Community Image</Label>
                  {newCommunity.imagePreview ? (
                    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border">
                      <Image
                        src={newCommunity.imagePreview}
                        alt="Community preview"
                        fill
                        className="object-cover"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="icon"
                        className="absolute right-2 top-2 h-7 w-7 rounded-full bg-background/80 backdrop-blur-sm"
                        onClick={handleRemoveImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label
                      htmlFor="community-image-upload"
                      className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/40 py-6 transition-colors hover:bg-muted/60"
                    >
                      {isUploadingMedia ? (
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                      ) : (
                        <ImageIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                      <span className="text-sm text-muted-foreground">
                        {isUploadingMedia
                          ? "Uploading…"
                          : "Click to upload an image"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        JPG, PNG or GIF · Max 1 MB
                      </span>
                    </label>
                  )}
                  <input
                    ref={imageInputRef}
                    id="community-image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                    disabled={isUploadingMedia}
                  />
                  {mediaError && (
                    <p className="text-xs text-destructive">{mediaError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="com-name">Community Name *</Label>
                  <Input
                    id="com-name"
                    placeholder="e.g., Weekend Hikers"
                    value={newCommunity.name}
                    onChange={(e) =>
                      setNewCommunity({ ...newCommunity, name: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="com-description">Description</Label>
                  <Textarea
                    id="com-description"
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
                  <Label htmlFor="com-category">Category</Label>
                  <Select
                    value={newCommunity.category}
                    onValueChange={(value) =>
                      setNewCommunity({ ...newCommunity, category: value })
                    }
                  >
                    <SelectTrigger id="com-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories
                        .filter((c) => c !== "All")
                        .map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hobby tags — used for exact matching in recommendations */}
                <div className="space-y-2">
                  <div>
                    <Label>Related Interests</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Tag your community with hobbies to improve recommendations
                      for other users.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto rounded-md border border-border p-3">
                    {allHobbies.map((hobby) => {
                      const selected = newCommunity.selectedHobbies.includes(
                        hobby.id,
                      );
                      return (
                        <button
                          key={hobby.id}
                          type="button"
                          onClick={() => toggleHobbyTag(hobby.id)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors",
                            selected
                              ? "border-foreground bg-foreground text-background"
                              : "border-border hover:border-foreground/50",
                          )}
                        >
                          {selected && <Check className="h-2.5 w-2.5" />}
                          {hobby.name}
                        </button>
                      );
                    })}
                  </div>
                  {newCommunity.selectedHobbies.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {newCommunity.selectedHobbies.length} interest
                      {newCommunity.selectedHobbies.length > 1 ? "s" : ""}{" "}
                      selected
                    </p>
                  )}
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => handleCloseDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateCommunity}
                  disabled={
                    !newCommunity.name.trim() || isCreating || isUploadingMedia
                  }
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating…
                    </>
                  ) : (
                    "Create Community"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search + category filters */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search communities…"
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
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          defaultValue="recommended"
        >
          <TabsList className="mb-6">
            <TabsTrigger value="recommended">
              <Bot className="mr-2 h-4 w-4" />
              For You
            </TabsTrigger>
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

          {/* ── Recommended tab ── */}
          <TabsContent value="recommended">
            {loadingRecs ? (
              <SectionLoader />
            ) : filteredRecommendations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Bot className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="font-medium">No recommendations yet</p>
                  <p className="mt-1 text-sm text-muted-foreground text-center max-w-xs">
                    Add more interests to your profile so we can find
                    communities that match.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div>
                {/* Section header */}
                <div className="mb-4 flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <p className="text-sm text-muted-foreground">
                    {filteredRecommendations.length} communit
                    {filteredRecommendations.length === 1 ? "y" : "ies"}{" "}
                    recommended based on your interests and AI matching
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredRecommendations.map((rec) => (
                    <CommunityRecommendationCard
                      key={rec.id}
                      community={rec}
                      onJoin={(id, name) => joinCommunity(id, name)}
                      isJoining={joiningId === rec.id}
                    />
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Discover + My tabs ── */}
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
                      onJoin={() => joinCommunity(community.id, community.name)}
                      onLeave={() =>
                        leaveCommunity(community.id, community.name)
                      }
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

// ─── Community Card (existing browse cards) ───────────────────────────────────

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
            {(
              community.community_members?.[0]?.count ?? 0
            ).toLocaleString()}{" "}
            members
          </span>
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
