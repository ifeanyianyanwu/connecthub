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
  Sparkles,
  MapPin,
  Check,
  X,
  Filter,
} from 'lucide-react';
import { mockRecommendedUsers, mockUsers, interestOptions } from '@/lib/mock-data';
import { useConnectionStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Loading from './loading';

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('recommended');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const { sendRequest, connections, pendingRequests } = useConnectionStore();
  const searchParams = useSearchParams();

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesInterests =
      selectedInterests.length === 0 ||
      user.interests.some((i) => selectedInterests.includes(i));
    return matchesSearch && matchesInterests;
  });

  const isConnected = (userId: string) =>
    connections.some((c) => c.connectedUserId === userId || c.userId === userId);
  const isPending = (userId: string) =>
    pendingRequests.some((c) => c.connectedUserId === userId || c.userId === userId);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest)
        ? prev.filter((i) => i !== interest)
        : [...prev, interest]
    );
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="mx-auto max-w-4xl px-4 py-6 pb-20 lg:pb-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Discover</h1>
          <p className="text-muted-foreground">Find and connect with like-minded people</p>
        </div>

        {/* Search */}
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

        {/* Interest Filters */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter by interests</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {interestOptions.slice(0, 10).map((interest) => (
              <button
                key={interest}
                onClick={() => toggleInterest(interest)}
                className={cn(
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  selectedInterests.includes(interest)
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:border-foreground/50'
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
              {mockRecommendedUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <Link href={`/profile/${user.id}`} className="flex items-start gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback className="text-xl">{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold hover:underline">{user.name}</h3>
                            <Badge variant="secondary">{user.matchScore}% match</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                          <p className="mt-1 text-sm">{user.bio}</p>
                          {user.location && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {user.location}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {user.sharedInterests.map((interest) => (
                              <Badge key={interest} variant="outline" className="text-xs">
                                {interest}
                              </Badge>
                            ))}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground">
                            {user.mutualConnections} mutual connections
                          </p>
                        </div>
                      </Link>
                      <div className="flex gap-2 sm:flex-col">
                        {isConnected(user.id) ? (
                          <Button variant="outline" disabled>
                            <Check className="mr-2 h-4 w-4" />
                            Connected
                          </Button>
                        ) : isPending(user.id) ? (
                          <Button variant="outline" disabled>
                            Pending
                          </Button>
                        ) : (
                          <Button onClick={() => sendRequest(user.id)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Connect
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="all">
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredUsers.map((user) => (
                <Card key={user.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-4">
                      <Link href={`/profile/${user.id}`} className="flex items-start gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.avatar || "/placeholder.svg"} alt={user.name} />
                          <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-medium hover:underline">{user.name}</h3>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                          <p className="mt-1 line-clamp-2 text-sm">{user.bio}</p>
                        </div>
                      </Link>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {user.interests.slice(0, 3).map((interest) => (
                        <Badge key={interest} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                      {user.interests.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{user.interests.length - 3}
                        </Badge>
                      )}
                    </div>
                    <div className="mt-4">
                      {isConnected(user.id) ? (
                        <Button variant="outline" size="sm" className="w-full bg-transparent" disabled>
                          <Check className="mr-2 h-4 w-4" />
                          Connected
                        </Button>
                      ) : isPending(user.id) ? (
                        <Button variant="outline" size="sm" className="w-full bg-transparent" disabled>
                          Pending
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full" onClick={() => sendRequest(user.id)}>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Connect
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Suspense>
  );
}
