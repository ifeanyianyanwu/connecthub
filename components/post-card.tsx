"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bookmark,
  Flag,
  Heart,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Send,
  Share2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/database.types";
import {
  sendNewCommentNotification,
  sendPostLikedNotification,
} from "@/app/actions/notify";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = Pick<
  Tables<"profiles">,
  "id" | "username" | "display_name" | "profile_picture"
>;

type Comment = Tables<"comments"> & {
  profiles: Profile;
};

export type Post = Tables<"posts"> & {
  profiles: Profile;
  likes: { count: number }[];
  comments: { count: number }[];
  isLiked: boolean;
};

// ─── Report reasons ───────────────────────────────────────────────────────────

const REPORT_REASONS = [
  "Spam or misleading",
  "Hate speech or discrimination",
  "Harassment or bullying",
  "Violence or dangerous content",
  "Misinformation",
  "Nudity or sexual content",
  "Other",
] as const;

// ─── PostCard ─────────────────────────────────────────────────────────────────

export function PostCard({
  post,
  currentUserId,
  currentUserProfile,
  onDelete,
}: {
  post: Post;
  currentUserId?: string;
  currentUserProfile?: Profile | null;
  /** Called after the post is successfully deleted so the parent can remove it from the list. */
  onDelete?: (postId: string) => void;
}) {
  const isOwnPost = post.user_id === currentUserId;

  // ── Local like state (self-contained, initialised from prop) ─────────────
  const [likeCount, setLikeCount] = useState(() => post.likes[0]?.count ?? 0);
  const [isLiked, setIsLiked] = useState(() => post.isLiked);

  // ── Comment state ─────────────────────────────────────────────────────────
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentsFetched, setCommentsFetched] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(
    post.comments[0]?.count ?? 0,
  );

  // ── Delete state ──────────────────────────────────────────────────────────
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // ── Report state ──────────────────────────────────────────────────────────
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);

  // Refs so the realtime handler can always see the latest values without
  // needing to be recreated when state changes.
  const commentsFetchedRef = useRef(false);
  const commentsRef = useRef<Comment[]>([]);

  useEffect(() => {
    commentsFetchedRef.current = commentsFetched;
  }, [commentsFetched]);

  useEffect(() => {
    commentsRef.current = comments;
  }, [comments]);

  // ── Real-time subscriptions for likes and comments ────────────────────────
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`post-rt-${post.id}`)
      // ── Likes: INSERT ────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          // Ignore own actions — already handled by optimistic update
          if (payload.new.user_id === currentUserId) return;
          setLikeCount((n) => n + 1);
        },
      )
      // ── Likes: DELETE ────────────────────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "likes",
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          if (payload.old.user_id === currentUserId) return;
          setLikeCount((n) => Math.max(0, n - 1));
        },
      )
      // ── Comments: INSERT ─────────────────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${post.id}`,
        },
        async (payload) => {
          if (payload.new.user_id === currentUserId) return;
          setCommentCount((n) => n + 1);

          // If the comments panel has been opened, fetch and append the comment
          if (commentsFetchedRef.current) {
            const supabase = createClient();
            const { data } = await supabase
              .from("comments")
              .select(
                "*, profiles:user_id(id, username, display_name, profile_picture)",
              )
              .eq("id", payload.new.id)
              .single();

            if (data) {
              setComments((prev) => [...prev, data as Comment]);
            }
          }
        },
      )
      // ── Comments: DELETE ─────────────────────────────────────────────────
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "comments",
          filter: `post_id=eq.${post.id}`,
        },
        (payload) => {
          if (payload.old.user_id === currentUserId) return;
          setCommentCount((n) => Math.max(0, n - 1));
          setComments((prev) => prev.filter((c) => c.id !== payload.old.id));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post.id, currentUserId]);

  // ── Toggle like (self-contained) ─────────────────────────────────────────
  const handleToggleLike = async () => {
    if (!currentUserId) return;

    // Optimistic update
    const willLike = !isLiked;
    setIsLiked(willLike);
    setLikeCount((n) => (willLike ? n + 1 : Math.max(0, n - 1)));

    const supabase = createClient();

    if (willLike) {
      const { error } = await supabase
        .from("likes")
        .insert({ post_id: post.id, user_id: currentUserId });

      if (error) {
        // Revert on failure
        setIsLiked(false);
        setLikeCount((n) => Math.max(0, n - 1));
        return;
      }

      // Send notification (fire-and-forget)
      sendPostLikedNotification(
        post.user_id,
        currentUserId,
        currentUserProfile?.display_name || "",
        post.community_id,
      ).catch(console.error);
    } else {
      const { error } = await supabase
        .from("likes")
        .delete()
        .match({ post_id: post.id, user_id: currentUserId });

      if (error) {
        // Revert on failure
        setIsLiked(true);
        setLikeCount((n) => n + 1);
      }
    }
  };

  // ── Fetch comments ────────────────────────────────────────────────────────

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("comments")
      .select(
        "*, profiles:user_id(id, username, display_name, profile_picture)",
      )
      .eq("post_id", post.id)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(data as Comment[]);
      setCommentsFetched(true);
    }
    setLoadingComments(false);
  }, [post.id]);

  const handleToggleComments = () => {
    const next = !showComments;
    setShowComments(next);
    if (next && !commentsFetched) fetchComments();
  };

  // ── Submit comment ────────────────────────────────────────────────────────

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !currentUserId || submittingComment) return;
    setSubmittingComment(true);

    const supabase = createClient();

    const { data, error } = await supabase
      .from("comments")
      .insert({
        post_id: post.id,
        user_id: currentUserId,
        content: newComment.trim(),
      })
      .select(
        "*, profiles:user_id(id, username, display_name, profile_picture)",
      )
      .single();

    if (!error && data) {
      setComments((prev) => [...prev, data as Comment]);
      setCommentCount((n) => n + 1);
      setNewComment("");

      sendNewCommentNotification(
        post.user_id,
        currentUserId,
        currentUserProfile?.display_name || "",
        post.community_id,
      ).catch(console.error);
    }
    setSubmittingComment(false);
  };

  const handleCommentKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  // ── Delete own comment ────────────────────────────────────────────────────

  const handleDeleteComment = async (commentId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", currentUserId!);

    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      setCommentCount((n) => Math.max(0, n - 1));
    }
  };

  // ── Delete post ───────────────────────────────────────────────────────────

  const handleDeletePost = async () => {
    if (!currentUserId || deletingPost) return;
    setDeletingPost(true);
    setDeleteError(null);

    const supabase = createClient();

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("user_id", currentUserId);

    if (error) {
      setDeleteError("Failed to delete post. Please try again.");
      setDeletingPost(false);
      return;
    }

    setDeleteOpen(false);
    onDelete?.(post.id);
  };

  const handleCloseDelete = () => {
    if (deletingPost) return;
    setDeleteOpen(false);
    setDeleteError(null);
  };

  // ── Submit report ─────────────────────────────────────────────────────────

  const handleSubmitReport = async () => {
    if (!reportReason || !currentUserId || submittingReport) return;
    setSubmittingReport(true);

    const supabase = createClient();

    const { error } = await supabase.from("reports").insert({
      reported_content_type: "post",
      reported_content_id: post.id,
      reporter_id: currentUserId,
      reason: reportReason,
      description: reportDescription.trim() || null,
      status: "pending",
    });

    if (!error) setReportSubmitted(true);
    setSubmittingReport(false);
  };

  const handleCloseReport = () => {
    setReportOpen(false);
    setTimeout(() => {
      setReportReason("");
      setReportDescription("");
      setReportSubmitted(false);
    }, 300);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <Card>
        {/* Header */}
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
                {isOwnPost && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete post
                  </DropdownMenuItem>
                )}

                {!isOwnPost && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setReportOpen(true)}
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      Report
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        {/* Body */}
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

          {/* Action bar */}
          <div className="flex items-center gap-4 border-t border-border pt-4">
            <Button
              variant="ghost"
              size="sm"
              className={cn(isLiked && "text-red-500")}
              onClick={handleToggleLike}
            >
              <Heart
                className={cn("mr-1 h-4 w-4", isLiked && "fill-current")}
              />
              {likeCount}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleComments}
              className={cn(showComments && "text-foreground")}
            >
              <MessageCircle className="mr-1 h-4 w-4" />
              {commentCount}
            </Button>

            <Button variant="ghost" size="sm">
              <Share2 className="mr-1 h-4 w-4" />
              Share
            </Button>
          </div>

          {/* Comments section */}
          {showComments && (
            <div className="space-y-4 border-t border-border pt-4">
              {loadingComments ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : comments.length === 0 ? (
                <p className="py-2 text-center text-sm text-muted-foreground">
                  No comments yet. Be the first!
                </p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <CommentRow
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      onDelete={() => handleDeleteComment(comment.id)}
                    />
                  ))}
                </div>
              )}

              {currentUserId && (
                <div className="flex items-start gap-3">
                  <Avatar className="mt-0.5 h-8 w-8 shrink-0">
                    <AvatarImage
                      src={
                        currentUserProfile?.profile_picture ||
                        "/placeholder.svg"
                      }
                      alt={currentUserProfile?.display_name || ""}
                    />
                    <AvatarFallback>
                      {(
                        currentUserProfile?.display_name ||
                        currentUserProfile?.username ||
                        "?"
                      ).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-1 items-end gap-2">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={handleCommentKeyDown}
                      rows={1}
                      className="min-h-9 flex-1 resize-none"
                      disabled={submittingComment}
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || submittingComment}
                    >
                      {submittingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Delete confirmation dialog ── */}
      <Dialog open={deleteOpen} onOpenChange={handleCloseDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete post</DialogTitle>
            <DialogDescription>
              This will permanently delete your post along with all its likes
              and comments. This cannot be undone.
            </DialogDescription>
          </DialogHeader>

          {deleteError && (
            <p className="text-sm text-destructive">{deleteError}</p>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={handleCloseDelete}
              disabled={deletingPost}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeletePost}
              disabled={deletingPost}
            >
              {deletingPost ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Report dialog ── */}
      <Dialog open={reportOpen} onOpenChange={handleCloseReport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report Post</DialogTitle>
            <DialogDescription>
              Help us understand what&apos;s wrong with this post. Reports are
              anonymous and reviewed by our moderation team.
            </DialogDescription>
          </DialogHeader>

          {reportSubmitted ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <Flag className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <p className="font-medium">Report submitted</p>
              <p className="text-sm text-muted-foreground">
                Thank you for helping keep the community safe. We&apos;ll review
                this shortly.
              </p>
              <Button onClick={handleCloseReport} className="mt-2">
                Done
              </Button>
            </div>
          ) : (
            <>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="report-reason">
                    Reason <span className="text-destructive">*</span>
                  </Label>
                  <Select value={reportReason} onValueChange={setReportReason}>
                    <SelectTrigger id="report-reason">
                      <SelectValue placeholder="Select a reason..." />
                    </SelectTrigger>
                    <SelectContent>
                      {REPORT_REASONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="report-description">
                    Additional details{" "}
                    <span className="text-xs text-muted-foreground">
                      (optional)
                    </span>
                  </Label>
                  <Textarea
                    id="report-description"
                    placeholder="Provide any extra context that might help our team..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleCloseReport}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleSubmitReport}
                  disabled={!reportReason || submittingReport}
                >
                  {submittingReport ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Flag className="mr-2 h-4 w-4" />
                  )}
                  Submit Report
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Comment Row ──────────────────────────────────────────────────────────────

function CommentRow({
  comment,
  currentUserId,
  onDelete,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: () => void;
}) {
  const isOwn = comment.user_id === currentUserId;

  return (
    <div className="group flex items-start gap-3">
      <Link href={`/user/${comment.profiles.id}`} className="shrink-0">
        <Avatar className="h-7 w-7">
          <AvatarImage
            src={comment.profiles.profile_picture || "/placeholder.svg"}
            alt={comment.profiles.display_name || ""}
          />
          <AvatarFallback className="text-xs">
            {(
              comment.profiles.display_name ||
              comment.profiles.username ||
              "?"
            ).charAt(0)}
          </AvatarFallback>
        </Avatar>
      </Link>

      <div className="min-w-0 flex-1">
        <div className="rounded-2xl bg-muted px-3 py-2">
          <Link href={`/user/${comment.profiles.id}`}>
            <span className="text-sm font-medium hover:underline">
              {comment.profiles.display_name || comment.profiles.username}
            </span>
          </Link>
          <p className="mt-0.5 whitespace-pre-wrap wrap-break-word text-sm">
            {comment.content}
          </p>
        </div>
        <p className="mt-1 pl-3 text-xs text-muted-foreground">
          {comment.created_at &&
            formatDistanceToNow(new Date(comment.created_at), {
              addSuffix: true,
            })}
        </p>
      </div>

      {isOwn && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}
