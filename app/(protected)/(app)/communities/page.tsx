"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Users,
  Lock,
  Globe,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { useCommunityStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Loading from './loading';

const categories = [
  'All',
  'Technology',
  'Design',
  'Business',
  'Photography',
  'Lifestyle',
  'Science',
  'Entertainment',
];

export default function CommunitiesPage() {
  const { communities, joinCommunity, leaveCommunity, createCommunity } = useCommunityStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('discover');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isCreating, setIsCreating] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCommunity, setNewCommunity] = useState({
    name: '',
    description: '',
    category: 'Technology',
    isPrivate: false,
  });

  const myCommunities = communities.filter((c) => c.isMember);
  const discoverCommunities = communities.filter((c) => !c.isMember);

  const filteredCommunities = (activeTab === 'my' ? myCommunities : discoverCommunities).filter(
    (community) => {
      const matchesSearch =
        community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        community.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === 'All' || community.category === selectedCategory;
      return matchesSearch && matchesCategory;
    }
  );

  const handleCreateCommunity = async () => {
    if (!newCommunity.name.trim()) return;
    setIsCreating(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    createCommunity(newCommunity);
    setNewCommunity({ name: '', description: '', category: 'Technology', isPrivate: false });
    setIsCreating(false);
    setCreateDialogOpen(false);
    setActiveTab('my');
  };

  return (
    <Suspense fallback={<Loading />}>
      <div className="mx-auto max-w-6xl px-4 py-6 pb-20 lg:pb-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Communities</h1>
            <p className="text-muted-foreground">Join communities that match your interests</p>
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
                  Start a new community and bring people together around shared interests.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Community Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., React Developers"
                    value={newCommunity.name}
                    onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
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
                      setNewCommunity({ ...newCommunity, description: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={newCommunity.category}
                    onValueChange={(value) => setNewCommunity({ ...newCommunity, category: value })}
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
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Private Community</Label>
                    <p className="text-sm text-muted-foreground">
                      Only approved members can join
                    </p>
                  </div>
                  <Switch
                    checked={newCommunity.isPrivate}
                    onCheckedChange={(checked) =>
                      setNewCommunity({ ...newCommunity, isPrivate: checked })
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateCommunity} disabled={!newCommunity.name.trim() || isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Community'
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
                  'rounded-full border px-3 py-1 text-sm transition-colors',
                  selectedCategory === category
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:border-foreground/50'
                )}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

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

          <TabsContent value="discover">
            {filteredCommunities.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">No communities found</p>
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

          <TabsContent value="my">
            {filteredCommunities.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {searchQuery || selectedCategory !== 'All'
                      ? 'No communities match your filters'
                      : "You haven't joined any communities yet"}
                  </p>
                  <Button className="mt-4" onClick={() => setActiveTab('discover')}>
                    Discover Communities
                  </Button>
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
        </Tabs>
      </div>
    </Suspense>
  );
}

interface CommunityCardProps {
  community: {
    id: string;
    name: string;
    description: string;
    category: string;
    avatar: string;
    coverImage: string;
    memberCount: number;
    postCount: number;
    isPrivate: boolean;
    isMember?: boolean;
  };
  onJoin: () => void;
  onLeave: () => void;
}

function CommunityCard({ community, onJoin, onLeave }: CommunityCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-24">
        <Image
          src={community.coverImage || "/placeholder.svg"}
          alt={community.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 to-transparent" />
        <div className="absolute bottom-2 right-2">
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
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start gap-3">
          <Avatar className="h-12 w-12 border-2 border-background -mt-8">
            <AvatarImage src={community.avatar || "/placeholder.svg"} alt={community.name} />
            <AvatarFallback>{community.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 pt-1">
            <Link href={`/communities/${community.id}`}>
              <CardTitle className="text-base hover:underline">{community.name}</CardTitle>
            </Link>
            <Badge variant="outline" className="mt-1 text-xs">
              {community.category}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">{community.description}</p>
        <div className="mb-4 flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {community.memberCount.toLocaleString()} members
          </span>
          <span>{community.postCount.toLocaleString()} posts</span>
        </div>
        {community.isMember ? (
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 bg-transparent" asChild>
              <Link href={`/communities/${community.id}`}>View</Link>
            </Button>
            <Button variant="ghost" className="text-destructive" onClick={onLeave}>
              Leave
            </Button>
          </div>
        ) : (
          <Button className="w-full" onClick={onJoin}>
            {community.isPrivate ? 'Request to Join' : 'Join Community'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
