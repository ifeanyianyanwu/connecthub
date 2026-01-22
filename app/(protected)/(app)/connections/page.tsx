"use client";

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  UserPlus,
  Users,
  Check,
  X,
  MessageCircle,
  UserMinus,
  Clock,
} from 'lucide-react';
import { useConnectionStore, useMessageStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

export default function ConnectionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams?.get('query') || '');
  const [activeTab, setActiveTab] = useState('connections');
  const {
    connections,
    pendingRequests,
    acceptRequest,
    rejectRequest,
    removeConnection,
  } = useConnectionStore();
  const { startConversation } = useMessageStore();

  const filteredConnections = connections.filter(
    (conn) =>
      conn.user?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conn.user?.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleMessage = (userId: string) => {
    const conversationId = startConversation(userId);
    if (conversationId) {
      router.push(`/messages?conversation=${conversationId}`);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-20 lg:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Connections</h1>
        <p className="text-muted-foreground">Manage your network</p>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="connections">
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
              <Badge className="ml-2">{pendingRequests.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="connections">
          {filteredConnections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No connections match your search' : 'No connections yet'}
                </p>
                <Button className="mt-4" asChild>
                  <Link href="/home">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Find people to connect with
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredConnections.map((connection) => (
                <Card key={connection.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Link href={`/profile/${connection.user?.id}`}>
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={connection.user?.avatar || "/placeholder.svg"} alt={connection.user?.name} />
                          <AvatarFallback>{connection.user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1">
                        <Link href={`/profile/${connection.user?.id}`}>
                          <h3 className="font-medium hover:underline">{connection.user?.name}</h3>
                        </Link>
                        <p className="text-sm text-muted-foreground">@{connection.user?.username}</p>
                        <p className="mt-1 line-clamp-2 text-sm">{connection.user?.bio}</p>
                        <div className="mt-3 flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleMessage(connection.user?.id || '')}
                          >
                            <MessageCircle className="mr-1 h-4 w-4" />
                            Message
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removeConnection(connection.id)}
                          >
                            <UserMinus className="mr-1 h-4 w-4" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests">
          {pendingRequests.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">No pending connection requests</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <Link href={`/profile/${request.user?.id}`} className="flex items-start gap-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.user?.avatar || "/placeholder.svg"} alt={request.user?.name} />
                          <AvatarFallback>{request.user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium hover:underline">{request.user?.name}</h3>
                          <p className="text-sm text-muted-foreground">@{request.user?.username}</p>
                          <p className="mt-1 text-sm">{request.user?.bio}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Requested {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                      </Link>
                      <div className="flex gap-2 sm:flex-col">
                        <Button onClick={() => acceptRequest(request.id)}>
                          <Check className="mr-2 h-4 w-4" />
                          Accept
                        </Button>
                        <Button variant="outline" onClick={() => rejectRequest(request.id)}>
                          <X className="mr-2 h-4 w-4" />
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export const dynamic = 'force-dynamic';
