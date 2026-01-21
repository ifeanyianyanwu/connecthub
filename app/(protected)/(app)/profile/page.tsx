"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  MapPin,
  Calendar,
  Users,
  Edit,
  Settings,
  CheckCircle,
  Grid,
  BookOpen,
  Heart,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { usePostStore, useConnectionStore, useCommunityStore } from '@/lib/store';
import { formatDistanceToNow, format } from 'date-fns';
import Link from 'next/link';

export default function ProfilePage() {
  const { user } = useAuth();
  const { posts } = usePostStore();
  const { connections } = useConnectionStore();
  const { communities } = useCommunityStore();
  const [activeTab, setActiveTab] = useState('posts');

  const userPosts = posts.filter((post) => post.authorId === user?.id);
  const userCommunities = communities.filter((c) => c.isMember);

  if (!user) return null;

  return (
    <div className="pb-20 lg:pb-0">
      {/* Cover Image */}
      <div className="relative h-32 bg-gradient-to-r from-neutral-800 to-neutral-600 sm:h-48">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,255,255,0.1),transparent)]" />
      </div>

      {/* Profile Header */}
      <div className="mx-auto max-w-4xl px-4">
        <div className="relative -mt-16 sm:-mt-20">
          <div className="flex flex-col items-center sm:flex-row sm:items-end sm:gap-6">
            <Avatar className="h-32 w-32 border-4 border-background sm:h-40 sm:w-40">
              <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
              <AvatarFallback className="text-4xl">{user.name.charAt(0)}</AvatarFallback>
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

            <div className="mt-4 flex gap-2 sm:mt-0 sm:pb-4">
              <Button variant="outline" asChild>
                <Link href="/settings">
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </Link>
              </Button>
              <Button asChild>
                <Link href="/settings/profile">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
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
              Joined {format(new Date(user.joinedAt), 'MMMM yyyy')}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-6">
            <Link href="/connections" className="group">
              <span className="font-semibold">{user.connectionsCount}</span>
              <span className="ml-1 text-muted-foreground group-hover:underline">Connections</span>
            </Link>
            <span>
              <span className="font-semibold">{user.communitiesCount}</span>
              <span className="ml-1 text-muted-foreground">Communities</span>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
          <TabsList className="w-full justify-start border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="posts"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              <Grid className="mr-2 h-4 w-4" />
              Posts
            </TabsTrigger>
            <TabsTrigger
              value="communities"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              <Users className="mr-2 h-4 w-4" />
              Communities
            </TabsTrigger>
            <TabsTrigger
              value="connections"
              className="rounded-none border-b-2 border-transparent px-4 py-3 data-[state=active]:border-foreground data-[state=active]:bg-transparent"
            >
              <Heart className="mr-2 h-4 w-4" />
              Connections
            </TabsTrigger>
          </TabsList>

          <TabsContent value="posts" className="mt-6">
            {userPosts.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No posts yet</p>
                  <Button className="mt-4" asChild>
                    <Link href="/feed">Create your first post</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {userPosts.map((post) => (
                  <Card key={post.id}>
                    <CardContent className="pt-6">
                      <p className="whitespace-pre-wrap">{post.content}</p>
                      {post.images && post.images.length > 0 && (
                        <div className="mt-4 grid gap-2">
                          {post.images.map((image, idx) => (
                            <div key={idx} className="relative aspect-video overflow-hidden rounded-lg">
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
                        <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="communities" className="mt-6">
            {userCommunities.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">Not a member of any communities yet</p>
                  <Button className="mt-4" asChild>
                    <Link href="/communities">Explore communities</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {userCommunities.map((community) => (
                  <Card key={community.id} className="overflow-hidden">
                    <Link href={`/communities/${community.id}`}>
                      <div className="relative h-24">
                        <Image
                          src={community.coverImage || "/placeholder.svg"}
                          alt={community.name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={community.avatar || "/placeholder.svg"} alt={community.name} />
                            <AvatarFallback>{community.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-base">{community.name}</CardTitle>
                            <p className="text-xs text-muted-foreground">
                              {community.memberCount.toLocaleString()} members
                            </p>
                          </div>
                        </div>
                      </CardHeader>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connections" className="mt-6">
            {connections.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No connections yet</p>
                  <Button className="mt-4" asChild>
                    <Link href="/discover">Find people to connect with</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {connections.slice(0, 6).map((connection) => (
                  <Card key={connection.id}>
                    <CardContent className="flex items-center gap-3 pt-6">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={connection.user?.avatar || "/placeholder.svg"} alt={connection.user?.name} />
                        <AvatarFallback>{connection.user?.name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 truncate">
                        <p className="font-medium truncate">{connection.user?.name}</p>
                        <p className="text-sm text-muted-foreground truncate">@{connection.user?.username}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {connections.length > 6 && (
              <div className="mt-4 text-center">
                <Button variant="outline" asChild>
                  <Link href="/connections">View all connections</Link>
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
