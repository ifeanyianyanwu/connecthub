"use client";

import { use, useState } from "react";
import { useStore } from "@/lib/store";
import { useAuth } from "@/components/providers/auth-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin,
  Calendar,
  Link as LinkIcon,
  UserPlus,
  UserMinus,
  MessageSquare,
  MoreHorizontal,
  Flag,
  Ban,
  Users,
  Heart,
  Clock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

export default function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { currentUser } = useAuth();
  const { users, connections, sendConnectionRequest, removeConnection } =
    useStore();
  const [isRequesting, setIsRequesting] = useState(false);

  const user = users.find((u) => u.id === id);

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">User Not Found</h2>
            <p className="text-muted-foreground">
              The user you are looking for does not exist.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const connection = connections.find(
    (c) =>
      (c.senderId === currentUser?.id && c.receiverId === user.id) ||
      (c.senderId === user.id && c.receiverId === currentUser?.id)
  );

  const isConnected = connection?.status === "accepted";
  const isPending = connection?.status === "pending";
  const isOwnProfile = currentUser?.id === user.id;

  const handleConnect = async () => {
    if (!currentUser) return;
    setIsRequesting(true);
    await sendConnectionRequest(currentUser.id, user.id);
    setIsRequesting(false);
  };

  const handleDisconnect = () => {
    if (connection) {
      removeConnection(connection.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <Avatar className="h-24 w-24 md:h-32 md:w-32">
              <AvatarImage src={user.avatar || "/placeholder.svg"} />
              <AvatarFallback className="text-2xl">
                {user.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    {user.isVerified && (
                      <Badge variant="secondary">Verified</Badge>
                    )}
                  </div>
                  {user.headline && (
                    <p className="text-muted-foreground">{user.headline}</p>
                  )}
                </div>
                {!isOwnProfile && (
                  <div className="flex gap-2">
                    {isConnected ? (
                      <>
                        <Link href={`/messages?user=${user.id}`}>
                          <Button variant="outline" className="gap-2 bg-transparent">
                            <MessageSquare className="h-4 w-4" />
                            Message
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          className="gap-2 bg-transparent"
                          onClick={handleDisconnect}
                        >
                          <UserMinus className="h-4 w-4" />
                          Connected
                        </Button>
                      </>
                    ) : isPending ? (
                      <Button variant="outline" disabled>
                        <Clock className="h-4 w-4 mr-2" />
                        Pending
                      </Button>
                    ) : (
                      <Button
                        className="gap-2"
                        onClick={handleConnect}
                        disabled={isRequesting}
                      >
                        <UserPlus className="h-4 w-4" />
                        Connect
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Flag className="h-4 w-4 mr-2" />
                          Report User
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          <Ban className="h-4 w-4 mr-2" />
                          Block User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                {user.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-4 w-4" />
                    {user.location}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  Joined {new Date(user.createdAt).toLocaleDateString()}
                </span>
                {user.website && (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 hover:text-foreground transition-colors"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
              <div className="flex gap-6 text-sm">
                <span>
                  <strong>{user.connectionCount || 0}</strong> connections
                </span>
                <span>
                  <strong>{user.communityCount || 0}</strong> communities
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Profile Content */}
      <Tabs defaultValue="about" className="space-y-4">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="interests">Interests</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="about" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bio</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {user.bio || "No bio provided yet."}
              </p>
            </CardContent>
          </Card>

          {user.goals && user.goals.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="h-5 w-5" />
                  Goals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {user.goals.map((goal, index) => (
                    <Badge key={index} variant="outline">
                      {goal}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="interests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Interests</CardTitle>
            </CardHeader>
            <CardContent>
              {user.interests && user.interests.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {user.interests.map((interest, index) => (
                    <Badge key={index} variant="secondary">
                      {interest}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground">
                  No interests added yet.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Activity feed coming soon</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
