"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  MapPin,
  Calendar,
  CheckCircle,
  Grid,
  BookOpen,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useCurrentUserHobbies } from "@/hooks/use-current-user-hobbies";

type Post = {
  id: string;
  content: string;
  images: string[] | null;
  likesCount: number;
  commentsCount: number;
  createdAt: string;
};

export default function ProfilePage() {
  const { user: authUser } = useCurrentUser();
  const { hobbies } = useCurrentUserHobbies();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    if (!authUser) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch posts
      const { data, error } = await supabase
        .from("posts")
        .select(
          `id,
          content,
          image_url,
          created_at,
          likes(id),
          comments(id)`,
        )
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false });

      // Transform to add counts
      const postsWithCounts = data?.map((post) => ({
        id: post.id,
        content: post.content,
        images: post.image_url ? [post.image_url] : [],
        createdAt: post.created_at || new Date().toISOString(),
        likesCount: post.likes?.length || 0,
        commentsCount: post.comments?.length || 0,
      }));

      if (error) {
        console.error("Error fetching posts", error);
      } else {
        setPosts(postsWithCounts || []);
      }

      setLoading(false);
    };

    fetchData();
  }, [authUser, supabase]);

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  const user = {
    id: authUser?.profile?.id,
    name:
      authUser?.profile?.display_name ||
      authUser?.profile?.username ||
      "Anonymous",
    username: authUser?.profile?.username || "anonymous",
    avatar: authUser?.profile?.profile_picture,
    isVerified: authUser?.profile?.is_admin,
    bio: authUser?.profile?.bio,
    location: authUser?.profile?.location,
    joinedAt: authUser?.profile?.created_at || new Date().toISOString(),
    interests: hobbies.map((h) => h.name),
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Cover Image */}
      <div className="relative h-32 bg-linear-to-r from-neutral-800 to-neutral-600 sm:h-48">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
      </div>

      {/* Profile Header */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="relative -mt-16 sm:-mt-20">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            <Avatar className="h-32 w-32 border-4 border-background sm:h-40 sm:w-40">
              <AvatarImage
                src={user.avatar || "/placeholder.svg"}
                alt={user.name}
              />
              <AvatarFallback className="text-4xl">
                {user.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="mt-4 flex-1 text-center sm:mt-0 sm:pb-4 sm:text-left">
              <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
                <h1 className="text-2xl font-bold">{user.name}</h1>
                {user.isVerified && (
                  <CheckCircle className="h-5 w-5 fill-foreground text-background" />
                )}
              </div>
              <p className="text-muted-foreground">@{user.username}</p>
            </div>
          </div>
        </div>

        {/* Bio & Info */}
        <div className="mt-6 space-y-4">
          <p className="text-foreground">{user.bio}</p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {user.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {user.location}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Joined {format(new Date(user.joinedAt), "MMMM yyyy")}
            </span>
          </div>

          {/* Interests */}
          <div className="flex flex-wrap gap-2">
            {user.interests.map((interest) => (
              <Badge key={interest} variant="secondary">
                {interest}
              </Badge>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="posts" className="mt-8">
          <TabsList className="w-full justify-start border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="posts"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              <Grid className="mr-2 h-4 w-4" />
              Posts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {posts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No posts yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="pt-6">
                      <p className="whitespace-pre-wrap">{post.content}</p>
                      {post.images && post.images.length > 0 && (
                        <div className="mt-4 grid gap-2">
                          {post.images.map((image, idx) => (
                            <div
                              key={idx}
                              className="relative aspect-video overflow-hidden rounded-lg"
                            >
                              <Image
                                src={image || "/placeholder.svg"}
                                alt="Post image"
                                fill
                                className="object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{post.likesCount} likes</span>
                        <span>{post.commentsCount} comments</span>
                        <span>
                          {formatDistanceToNow(new Date(post.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
