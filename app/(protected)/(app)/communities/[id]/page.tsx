"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Globe,
  ArrowLeft,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Bookmark,
  Flag,
  ImageIcon,
  Loader2,
  UserPlus,
  UserCheck,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/database.types";
import { useCurrentUser } from "@/hooks/use-current-user";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = Pick<
  Tables<"profiles">,
  "id" | "username" | "display_name" | "profile_picture" | "bio"
>;

type Post = Tables<"posts"> & {
  profiles: Profile;
  likes: { count: number }[];
  comments: { count: number }[];
  isLiked: boolean;
};

type Community = Tables<"communities"> & {
  isMember: boolean;
  admins: string[];
};

type Member = Profile & {
  role: string | null;
  joined_at: string | null;
  connectionStatus: "none" | "pending" | "accepted" | "connecting";
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CommunityDetailPage() {
  const params = useParams();
  const { user } = useCurrentUser();

  const supabase = useMemo(() => createClient(), []);

  const communityId = params.id as string;

  const [community, setCommunity] = useState<Community | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  // ── Fetch community + posts ──────────────────────────────────────────────

  const fetchCommunityData = useCallback(async () => {
    if (!communityId) return;

    // Community + membership check
    const [communityResult, membershipResult] = await Promise.all([
      supabase.from("communities").select("*").eq("id", communityId).single(),
      user?.id
        ? supabase
            .from("community_members")
            .select("user_id")
            .eq("community_id", communityId)
            .eq("user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (communityResult.error || !communityResult.data) {
      console.error("Error fetching community:", communityResult.error);
      return;
    }

    setCommunity({
      ...communityResult.data,
      isMember: !!membershipResult.data,
      admins: [communityResult.data.created_by],
    });

    // Posts
    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select(
        "*, profiles:user_id(id, username, display_name, profile_picture, bio), likes(count), comments(count)",
      )
      .eq("community_id", communityId)
      .order("created_at", { ascending: false });

    if (postsError) {
      console.error("Error fetching posts:", postsError);
      return;
    }

    // Fetch which posts the current user has liked
    if (user?.id && postsData.length > 0) {
      const { data: userLikes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", user.id)
        .in(
          "post_id",
          postsData.map((p) => p.id),
        );

      const likedIds = new Set(userLikes?.map((l) => l.post_id));
      setPosts(
        postsData.map((p) => ({ ...p, isLiked: likedIds.has(p.id) }) as Post),
      );
    } else {
      setPosts(postsData.map((p) => ({ ...p, isLiked: false }) as Post));
    }
  }, [communityId, user, supabase]);

  // ✅ Loading state lives in the effect, not in the callback
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      await fetchCommunityData();
      if (!cancelled) setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchCommunityData]);

  // ── Fetch members (lazy — only when tab is opened) ───────────────────────

  const fetchMembers = useCallback(async () => {
    if (!communityId || !user?.id) return;

    const { data: membersData, error } = await supabase
      .from("community_members")
      .select(
        "role, joined_at, profiles:user_id(id, username, display_name, profile_picture, bio)",
      )
      .eq("community_id", communityId)
      .order("joined_at", { ascending: true });

    if (error || !membersData) {
      console.error("Error fetching members:", error);
      return;
    }

    // Fetch existing connections between current user and all members
    const memberIds = membersData
      .map((m) => (m.profiles as unknown as Profile)?.id)
      .filter((id) => id && id !== user.id);

    const connectionMap = new Map<string, "pending" | "accepted">();

    if (memberIds.length > 0) {
      const { data: connections } = await supabase
        .from("connections")
        .select("user1_id, user2_id, status")
        .or(
          `and(user1_id.eq.${user.id},user2_id.in.(${memberIds.join(",")})),` +
            `and(user2_id.eq.${user.id},user1_id.in.(${memberIds.join(",")}))`,
        );

      connections?.forEach((c) => {
        const partnerId = c.user1_id === user.id ? c.user2_id : c.user1_id;
        connectionMap.set(partnerId, c.status as "pending" | "accepted");
      });
    }

    setMembers(
      membersData
        .filter((m) => m.profiles) // guard against deleted profiles
        .map((m) => {
          const profile = m.profiles as unknown as Profile;
          const status = connectionMap.get(profile.id) ?? "none";
          return {
            ...profile,
            role: m.role,
            joined_at: m.joined_at,
            connectionStatus: profile.id === user.id ? "accepted" : status, // treat self as already "connected"
          } as Member;
        }),
    );
  }, [communityId, user, supabase]);

  useEffect(() => {
    if (activeTab !== "members") return;
    let cancelled = false;

    const load = async () => {
      setLoadingMembers(true);
      await fetchMembers();
      if (!cancelled) setLoadingMembers(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, fetchMembers]);

  // ── Join / Leave community ───────────────────────────────────────────────

  const handleJoin = async () => {
    if (!user?.id || !community) return;
    setIsJoining(true);

    const { error } = await supabase
      .from("community_members")
      .insert({ community_id: community.id, user_id: user.id, role: "member" });

    if (!error) {
      setCommunity((prev) =>
        prev
          ? {
              ...prev,
              isMember: true,
              member_count: (prev.member_count ?? 0) + 1,
            }
          : prev,
      );
    }
    setIsJoining(false);
  };

  const handleLeave = async () => {
    if (!user?.id || !community) return;

    const { error } = await supabase
      .from("community_members")
      .delete()
      .match({ community_id: community.id, user_id: user.id });

    if (!error) {
      setCommunity((prev) =>
        prev
          ? {
              ...prev,
              isMember: false,
              member_count: Math.max(0, (prev.member_count ?? 0) - 1),
            }
          : prev,
      );
    }
  };

  // ── Create post ──────────────────────────────────────────────────────────

  const handleCreatePost = async () => {
    if (!newPostContent.trim() || !user?.id || !community) return;
    setIsPosting(true);

    const { data, error } = await supabase
      .from("posts")
      .insert({
        content: newPostContent,
        community_id: community.id,
        user_id: user.id,
      })
      .select(
        "*, profiles:user_id(id, username, display_name, profile_picture, bio), likes(count), comments(count)",
      )
      .single();

    if (!error && data) {
      setPosts((prev) => [{ ...data, isLiked: false } as Post, ...prev]);
      setNewPostContent("");
    } else {
      console.error("Error creating post:", error);
    }
    setIsPosting(false);
  };

  // ── Toggle like ──────────────────────────────────────────────────────────

  const toggleLike = async (post: Post) => {
    if (!user?.id) return;

    // Optimistic update
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? {
              ...p,
              isLiked: !p.isLiked,
              likes: [
                {
                  count: p.isLiked
                    ? p.likes[0].count - 1
                    : p.likes[0].count + 1,
                },
              ],
            }
          : p,
      ),
    );

    if (post.isLiked) {
      await supabase
        .from("likes")
        .delete()
        .match({ post_id: post.id, user_id: user.id });
    } else {
      await supabase
        .from("likes")
        .insert({ post_id: post.id, user_id: user.id });
    }
  };

  // ── Send connection request ──────────────────────────────────────────────

  const handleConnect = async (memberId: string) => {
    if (!user?.id) return;

    // Optimistic update
    setMembers((prev) =>
      prev.map((m) =>
        m.id === memberId ? { ...m, connectionStatus: "connecting" } : m,
      ),
    );

    const { error } = await supabase.from("connections").insert({
      user1_id: user.id,
      user2_id: memberId,
      status: "pending",
    });

    if (error) {
      console.error("Error sending connection request:", error);
      // Revert on failure
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, connectionStatus: "none" } : m,
        ),
      );
    } else {
      setMembers((prev) =>
        prev.map((m) =>
          m.id === memberId ? { ...m, connectionStatus: "pending" } : m,
        ),
      );
    }
  };

  // ─── Loading / Not found states ──────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!community) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center px-4">
        <h1 className="text-2xl font-bold">Community not found</h1>
        <Button className="mt-4" asChild>
          <Link href="/communities">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Communities
          </Link>
        </Button>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="pb-20 lg:pb-0">
      {/* Cover Image */}
      <div className="relative h-32 sm:h-48 lg:h-64">
        <Image
          src={community.image_url || "/placeholder.svg"}
          alt={community.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
        <Button
          variant="ghost"
          size="icon"
          className="absolute left-4 top-4 bg-background/50 backdrop-blur-sm"
          asChild
        >
          <Link href="/communities">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </div>

      {/* Community Header */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="relative -mt-12 sm:-mt-16">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-6">
            <Avatar className="h-24 w-24 border-4 border-background sm:h-32 sm:w-32">
              <AvatarImage
                src={community.image_url || "/placeholder.svg"}
                alt={community.name}
              />
              <AvatarFallback className="text-3xl">
                {community.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 sm:pb-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{community.name}</h1>
                <Badge variant="secondary" className="gap-1">
                  <Globe className="h-3 w-3" />
                  Public
                </Badge>
              </div>
              {community.category && (
                <Badge variant="outline" className="mt-2">
                  {community.category}
                </Badge>
              )}
            </div>

            {/* Join / Leave */}
            <div className="flex gap-2 sm:pb-2">
              {user &&
                (community.isMember ? (
                  <Button variant="outline" onClick={handleLeave}>
                    Leave Community
                  </Button>
                ) : (
                  <Button onClick={handleJoin} disabled={isJoining}>
                    {isJoining ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="mr-2 h-4 w-4" />
                    )}
                    Join Community
                  </Button>
                ))}
            </div>
          </div>
        </div>

        {/* Description & Stats */}
        <div className="mt-6 space-y-2">
          {community.description && (
            <p className="text-foreground">{community.description}</p>
          )}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {(community.member_count ?? 0).toLocaleString()} members
            </span>
            <span>{posts.length.toLocaleString()} posts</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="w-full justify-start border-b border-border bg-transparent p-0">
            {["posts", "members", "about"].map((tab) => (
              <TabsTrigger
                key={tab}
                value={tab}
                className="rounded-none border-b-2 border-transparent px-4 py-3 capitalize data-[state=active]:border-foreground data-[state=active]:bg-transparent"
              >
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Posts tab ── */}
          <TabsContent value="posts" className="mt-6 space-y-4">
            {community.isMember && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage
                        src={
                          user?.user_metadata?.avatar_url || "/placeholder.svg"
                        }
                        alt={user?.user_metadata?.name}
                      />
                      <AvatarFallback>
                        {user?.user_metadata?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        placeholder={`Share something with ${community.name}...`}
                        value={newPostContent}
                        onChange={(e) => setNewPostContent(e.target.value)}
                        rows={3}
                        className="resize-none"
                      />
                      <div className="flex items-center justify-between">
                        <Button variant="ghost" size="sm" disabled>
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Add Image
                        </Button>
                        <Button
                          onClick={handleCreatePost}
                          disabled={!newPostContent.trim() || isPosting}
                        >
                          {isPosting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="mr-2 h-4 w-4" />
                          )}
                          Post
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {posts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No posts in this community yet
                  </p>
                  {community.isMember && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Be the first to post!
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              posts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  currentUserId={user?.id}
                  onToggleLike={() => toggleLike(post)}
                />
              ))
            )}
          </TabsContent>

          {/* ── Members tab ── */}
          <TabsContent value="members" className="mt-6">
            {loadingMembers ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : members.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No members found</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <MemberCard
                    key={member.id}
                    member={member}
                    isCurrentUser={member.id === user?.id}
                    communityAdminId={community.admins[0]}
                    onConnect={() => handleConnect(member.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── About tab ── */}
          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">About this community</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-muted-foreground">
                  {community.description || "No description provided."}
                </p>
                <div className="space-y-2 border-t border-border pt-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Category</span>
                    <span className="font-medium">
                      {community.category || "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Members</span>
                    <span className="font-medium">
                      {(community.member_count ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Posts</span>
                    <span className="font-medium">
                      {posts.length.toLocaleString()}
                    </span>
                  </div>
                  {community.created_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">
                        {formatDistanceToNow(new Date(community.created_at), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Post Card ────────────────────────────────────────────────────────────────

function PostCard({
  post,
  currentUserId,
  onToggleLike,
}: {
  post: Post;
  currentUserId?: string;
  onToggleLike: () => void;
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <Link
            href={`/user/${post.profiles.id}`}
            className="flex items-center gap-3"
          >
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={post.profiles.profile_picture || "/placeholder.svg"}
                alt={post.profiles.display_name || ""}
              />
              <AvatarFallback>
                {post.profiles.display_name?.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium hover:underline">
                {post.profiles.display_name || post.profiles.username}
              </p>
              <p className="text-xs text-muted-foreground">
                {post.created_at &&
                  formatDistanceToNow(new Date(post.created_at), {
                    addSuffix: true,
                  })}
              </p>
            </div>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Bookmark className="mr-2 h-4 w-4" />
                Save post
              </DropdownMenuItem>
              {post.user_id !== currentUserId && (
                <DropdownMenuItem className="text-destructive">
                  <Flag className="mr-2 h-4 w-4" />
                  Report
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="whitespace-pre-wrap">{post.content}</p>

        {post.image_url && (
          <div className="relative aspect-video overflow-hidden rounded-lg">
            <Image
              src={post.image_url}
              alt="Post image"
              fill
              className="object-cover"
            />
          </div>
        )}

        <div className="flex items-center gap-4 border-t border-border pt-4">
          <Button
            variant="ghost"
            size="sm"
            className={cn(post.isLiked && "text-red-500")}
            onClick={onToggleLike}
          >
            <Heart
              className={cn("mr-1 h-4 w-4", post.isLiked && "fill-current")}
            />
            {post.likes[0]?.count ?? 0}
          </Button>
          <Button variant="ghost" size="sm">
            <MessageCircle className="mr-1 h-4 w-4" />
            {post.comments[0]?.count ?? 0}
          </Button>
          <Button variant="ghost" size="sm">
            <Share2 className="mr-1 h-4 w-4" />
            Share
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Member Card ──────────────────────────────────────────────────────────────

function MemberCard({
  member,
  isCurrentUser,
  communityAdminId,
  onConnect,
}: {
  member: Member;
  isCurrentUser: boolean;
  communityAdminId: string;
  onConnect: () => void;
}) {
  const isAdmin = member.id === communityAdminId;

  const connectionButton = () => {
    if (isCurrentUser) return null;

    switch (member.connectionStatus) {
      case "accepted":
        return (
          <Button variant="outline" size="sm" disabled>
            <UserCheck className="mr-2 h-4 w-4" />
            Connected
          </Button>
        );
      case "pending":
      case "connecting":
        return (
          <Button variant="outline" size="sm" disabled>
            <Clock className="mr-2 h-4 w-4" />
            Pending
          </Button>
        );
      default:
        return (
          <Button size="sm" onClick={onConnect}>
            <UserPlus className="mr-2 h-4 w-4" />
            Connect
          </Button>
        );
    }
  };

  return (
    <Card>
      <CardContent className="flex items-center gap-4 py-4">
        <Link href={`/user/${member.id}`}>
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={member.profile_picture || "/placeholder.svg"}
              alt={member.display_name || ""}
            />
            <AvatarFallback>
              {(member.display_name || member.username || "?").charAt(0)}
            </AvatarFallback>
          </Avatar>
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/user/${member.id}`}>
              <p className="font-medium hover:underline truncate">
                {member.display_name || member.username}
                {isCurrentUser && (
                  <span className="ml-1 text-muted-foreground text-sm font-normal">
                    (you)
                  </span>
                )}
              </p>
            </Link>
            {isAdmin && (
              <Badge variant="secondary" className="text-xs">
                Admin
              </Badge>
            )}
            {member.role && member.role !== "member" && !isAdmin && (
              <Badge variant="outline" className="text-xs capitalize">
                {member.role}
              </Badge>
            )}
          </div>
          {member.username && (
            <p className="text-sm text-muted-foreground truncate">
              @{member.username}
            </p>
          )}
          {member.bio && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {member.bio}
            </p>
          )}
          {member.joined_at && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              Joined{" "}
              {formatDistanceToNow(new Date(member.joined_at), {
                addSuffix: true,
              })}
            </p>
          )}
        </div>

        <div className="shrink-0">{connectionButton()}</div>
      </CardContent>
    </Card>
  );
}
