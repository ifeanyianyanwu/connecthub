"use client";

import { useState } from "react";
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
  Lock,
  Globe,
  ArrowLeft,
  Settings,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Share2,
  Send,
  Bookmark,
  Flag,
  ImageIcon,
} from "lucide-react";
import { useCommunityStore, usePostStore } from "@/lib/store";
import { useAuth } from "@/components/providers/auth-provider";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

export default function CommunityDetailPage() {
  const params = useParams();
  const { user } = useAuth();
  const { communities, joinCommunity, leaveCommunity } = useCommunityStore();
  const { posts, createPost, likePost } = usePostStore();
  const [activeTab, setActiveTab] = useState("posts");
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);

  const community = communities.find((c) => c.id === params.id);
  const communityPosts = posts.filter((p) => p.communityId === params.id);

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

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    createPost({ content: newPostContent, communityId: community.id });
    setNewPostContent("");
    setIsPosting(false);
  };

  return (
    <div className="pb-20 lg:pb-0">
      {/* Cover Image */}
      <div className="relative h-32 sm:h-48 lg:h-64">
        <ImageIcon
          src={community.coverImage || "/placeholder.svg"}
          alt={community.name}
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
                src={community.avatar || "/placeholder.svg"}
                alt={community.name}
              />
              <AvatarFallback className="text-3xl">
                {community.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 sm:pb-2">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{community.name}</h1>
                {community.isPrivate ? (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Private
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <Globe className="h-3 w-3" />
                    Public
                  </Badge>
                )}
              </div>
              <Badge variant="outline" className="mt-2">
                {community.category}
              </Badge>
            </div>

            <div className="flex gap-2 sm:pb-2">
              {community.isMember ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => leaveCommunity(community.id)}
                  >
                    Leave
                  </Button>
                  {community.admins.includes(user?.id || "") && (
                    <Button variant="outline" size="icon">
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                </>
              ) : (
                <Button onClick={() => joinCommunity(community.id)}>
                  {community.isPrivate ? "Request to Join" : "Join Community"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Description & Stats */}
        <div className="mt-6 space-y-4">
          <p className="text-foreground">{community.description}</p>

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {community.memberCount.toLocaleString()} members
            </span>
            <span>{community.postCount.toLocaleString()} posts</span>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="w-full justify-start border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="posts"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              Posts
            </TabsTrigger>
            <TabsTrigger
              value="members"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              Members
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6 space-y-4">
            {/* Create Post */}
            {community.isMember && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={user?.avatar || "/placeholder.svg"}
                        alt={user?.name}
                      />
                      <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
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
                        <Button variant="ghost" size="sm">
                          <ImageIcon className="mr-2 h-4 w-4" />
                          Add Image
                        </Button>
                        <Button
                          onClick={handleCreatePost}
                          disabled={!newPostContent.trim() || isPosting}
                        >
                          {isPosting ? (
                            "Posting..."
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Post
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Posts */}
            {communityPosts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    No posts in this community yet
                  </p>
                  {community.isMember && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Be the first to share something!
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              communityPosts.map((post) => (
                <Card key={post.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <Link
                        href={`/profile/${post.authorId}`}
                        className="flex items-center gap-3"
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage
                            src={post.author?.avatar || "/placeholder.svg"}
                            alt={post.author?.name}
                          />
                          <AvatarFallback>
                            {post.author?.name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium hover:underline">
                            {post.author?.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(post.createdAt), {
                              addSuffix: true,
                            })}
                          </p>
                        </div>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Bookmark className="mr-2 h-4 w-4" />
                            Save post
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Flag className="mr-2 h-4 w-4" />
                            Report
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="whitespace-pre-wrap">{post.content}</p>

                    {post.images && post.images.length > 0 && (
                      <div className="grid gap-2">
                        {post.images.map((image, idx) => (
                          <div
                            key={idx}
                            className="relative aspect-video overflow-hidden rounded-lg"
                          >
                            <ImageIcon
                              src={image || "/placeholder.svg"}
                              alt="Post image"
                              className="object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center gap-4 border-t border-border pt-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(post.isLiked && "text-red-500")}
                        onClick={() => likePost(post.id)}
                      >
                        <Heart
                          className={cn(
                            "mr-1 h-4 w-4",
                            post.isLiked && "fill-current",
                          )}
                        />
                        {post.likesCount}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <MessageCircle className="mr-1 h-4 w-4" />
                        {post.commentsCount}
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Share2 className="mr-1 h-4 w-4" />
                        Share
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="members" className="mt-6">
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  {community.memberCount.toLocaleString()} members
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <Card>
              <CardHeader>
                <h3 className="font-semibold">About this community</h3>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>{community.description}</p>

                {community.rules.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium">Community Rules</h4>
                    <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                      {community.rules.map((rule, idx) => (
                        <li key={idx}>{rule}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
