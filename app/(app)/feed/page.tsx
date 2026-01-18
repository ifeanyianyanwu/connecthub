"use client";

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  ImageIcon,
  Send,
  Bookmark,
  Flag,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/components/providers/auth-provider';
import { usePostStore } from '@/lib/store';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function FeedPage() {
  const { user } = useAuth();
  const { posts, createPost, likePost, deletePost } = usePostStore();
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    await new Promise((resolve) => setTimeout(resolve, 500));
    createPost({ content: newPostContent });
    setNewPostContent('');
    setIsPosting(false);
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-20 lg:pb-6">
      {/* Create Post */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Avatar className="h-10 w-10">
              <AvatarImage src={user?.avatar || "/placeholder.svg"} alt={user?.name} />
              <AvatarFallback>{user?.name?.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-3">
              <Textarea
                placeholder="What's on your mind?"
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
                  {isPosting ? 'Posting...' : (
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

      {/* Posts Feed */}
      <div className="space-y-4">
        {posts.map((post) => (
          <Card key={post.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <Link href={`/profile/${post.authorId}`} className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={post.author?.avatar || "/placeholder.svg"} alt={post.author?.name} />
                    <AvatarFallback>{post.author?.name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium hover:underline">{post.author?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      @{post.author?.username} · {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">More options</span>
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
                    {post.authorId === user?.id && (
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => deletePost(post.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="whitespace-pre-wrap">{post.content}</p>
              
              {post.images && post.images.length > 0 && (
                <div className={cn(
                  'grid gap-2',
                  post.images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                )}>
                  {post.images.map((image, idx) => (
                    <div
                      key={idx}
                      className={cn(
                        'relative overflow-hidden rounded-lg',
                        post.images?.length === 1 ? 'aspect-video' : 'aspect-square'
                      )}
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

              {/* Post Actions */}
              <div className="flex items-center gap-4 border-t border-border pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(post.isLiked && 'text-red-500')}
                  onClick={() => likePost(post.id)}
                >
                  <Heart className={cn('mr-1 h-4 w-4', post.isLiked && 'fill-current')} />
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
        ))}
      </div>
    </div>
  );
}
