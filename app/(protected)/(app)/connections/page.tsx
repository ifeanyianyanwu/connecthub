"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Search,
  Users,
  MessageCircle,
  UserMinus,
  Clock,
  Loader2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Connection, Profile } from "@/lib/types";

export default function ConnectionsPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("connections");
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchAllData = useCallback(async () => {
    if (!user) return;
    try {
      const [acceptedRes, pendingRes] = await Promise.all([
        supabase
          .from("connections")
          .select(
            `
            *,
            user1_profile:profiles!connections_user1_id_fkey(*),
            user2_profile:profiles!connections_user2_id_fkey(*)
          `,
          )
          .eq("status", "accepted")
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`),
        supabase
          .from("connections")
          .select(
            `
            *,
            user1_profile:profiles!connections_user1_id_fkey(*),
            user2_profile:profiles!connections_user2_id_fkey(*)
          `,
          )
          .eq("status", "pending")
          .eq("user2_id", user.id),
      ]);

      if (acceptedRes.error) throw acceptedRes.error;
      if (pendingRes.error) throw pendingRes.error;

      setConnections(acceptedRes.data || []);
      setPendingRequests(pendingRes.data || []);
    } catch (error) {
      console.error("Fetch Error:", error);
      toast.error("Failed to load network data");
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    fetchAllData();

    // REAL-TIME: Subscribing to changes involving the current user
    const channel = supabase
      .channel("connections_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connections" },
        (payload) => {
          const data = (payload.new || payload.old) as Connection;
          // Only refresh if the change belongs to the current user
          if (data.user1_id === user?.id || data.user2_id === user?.id) {
            fetchAllData();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchAllData, supabase]);

  const getOtherUser = (connection: Connection): Profile | null => {
    if (!user) return null;
    return connection.user1_id === user.id
      ? connection.user2_profile || null
      : connection.user1_profile || null;
  };

  const filteredConnections = connections.filter((conn) => {
    const otherUser = getOtherUser(conn);
    if (!otherUser) return false;
    const query = searchQuery.toLowerCase();
    return (
      otherUser.display_name?.toLowerCase().includes(query) ||
      otherUser.username?.toLowerCase().includes(query)
    );
  });

  const handleAcceptRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { data, error } = await supabase
        .from("connections")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", requestId)
        .select(
          `*, user1_profile:profiles!connections_user1_id_fkey(*), user2_profile:profiles!connections_user2_id_fkey(*)`,
        )
        .single();

      if (error) throw error;

      toast.success("Connection accepted!");

      // Move from pending to accepted in local state for immediate feedback
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      setConnections((prev) => [...prev, data]);
    } catch {
      toast.error("Could not accept request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", requestId);
      if (error) throw error;
      setPendingRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast.success("Request declined");
    } catch {
      toast.error("Error declining request");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!confirm("Remove this connection?")) return;
    setActionLoading(connectionId);
    try {
      const { error } = await supabase
        .from("connections")
        .delete()
        .eq("id", connectionId);
      if (error) throw error;
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      toast.success("Connection removed");
    } catch {
      toast.error("Error removing connection");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-20 lg:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Connections</h1>
        <p className="text-muted-foreground">Manage your network</p>
      </div>

      <div className="mb-6 relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search connectionsby name or username..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="connections" className="relative">
            <Users className="mr-2 h-4 w-4" />
            Connections
            {connections.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {connections.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Clock className="mr-2 h-4 w-4" />
            Requests
            {pendingRequests.length > 0 && (
              <Badge variant="default" className="ml-2">
                {pendingRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          {filteredConnections.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-muted-foreground opacity-20" />
                <p className="text-muted-foreground">
                  {searchQuery
                    ? "No connections match your search"
                    : "No connections yet"}
                </p>
                <Button className="mt-4" asChild variant="outline">
                  <Link href="/home">Find People</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredConnections.map((conn) => {
                const otherUser = getOtherUser(conn);
                if (!otherUser) return null;
                return (
                  <Card
                    key={conn.id}
                    className="overflow-hidden transition-all hover:shadow-md"
                  >
                    <CardContent className="p-5">
                      <div className="flex items-start gap-4">
                        <Avatar className="h-12 w-12 border">
                          <AvatarImage src={otherUser.profile_picture || ""} />
                          <AvatarFallback>
                            {(otherUser.display_name || "U")[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">
                            {otherUser.display_name || otherUser.username}
                          </h3>
                          <p className="text-xs text-muted-foreground truncate">
                            @{otherUser.username}
                          </p>
                          <div className="mt-4 flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() =>
                                router.push(`/messages?user=${otherUser.id}`)
                              }
                            >
                              <MessageCircle className="mr-2 h-3.5 w-3.5" />{" "}
                              Message
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-destructive"
                                  disabled={actionLoading === conn.id}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent size="sm">
                                <AlertDialogHeader>
                                  <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
                                    <UserMinus />
                                  </AlertDialogMedia>
                                  <AlertDialogTitle>
                                    Remove Connection
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove{" "}
                                    <span className="font-medium">
                                      {otherUser.display_name ||
                                        otherUser.username}
                                    </span>{" "}
                                    from your connections? This action cannot be
                                    undone.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel variant="outline">
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    variant="destructive"
                                    onClick={() =>
                                      handleRemoveConnection(conn.id)
                                    }
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-3">
            {pendingRequests.length === 0 ? (
              <p className="text-center py-10 text-muted-foreground">
                No pending requests.
              </p>
            ) : (
              pendingRequests.map((req) => (
                <Card key={req.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage
                          src={req.user1_profile?.profile_picture || ""}
                        />
                        <AvatarFallback>
                          {req.user1_profile?.display_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">
                          {req.user1_profile?.display_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Requested{" "}
                          {formatDistanceToNow(new Date(req.created_at!), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="default"
                        className="flex-1"
                        onClick={() => handleAcceptRequest(req.id)}
                        disabled={actionLoading === req.id}
                      >
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleRejectRequest(req.id)}
                        disabled={actionLoading === req.id}
                      >
                        Decline
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
