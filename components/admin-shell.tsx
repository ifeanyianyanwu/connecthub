"use client";

import { useState, useMemo, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  MessageSquare,
  Flag,
  TrendingUp,
  CheckCircle,
  XCircle,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  AlertTriangle,
  Loader2,
  FileText,
  Image as ImageIcon,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import {
  resolveReport,
  dismissReport,
  deleteCommunity,
  adminDeletePost,
} from "@/app/actions/admin-actions";
import { createClient } from "@/lib/supabase/client";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  profile_picture: string | null;
  email: string | null;
  is_admin: boolean | null;
  created_at: string | null;
};

type Community = {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  image_url: string | null;
  created_at: string | null;
  community_members?: { count: number }[];
};

type Report = {
  id: string;
  reported_content_type: string;
  reported_content_id: string;
  reason: string;
  description: string | null;
  status: string | null;
  created_at: string | null;
  reporter: Pick<
    Profile,
    "id" | "username" | "display_name" | "profile_picture"
  > | null;
};

type Post = {
  id: string;
  content: string;
  image_url: string | null;
  created_at: string | null;
  community_id: string;
  user_id: string;
  profiles: Pick<
    Profile,
    "id" | "username" | "display_name" | "profile_picture"
  > | null;
  communities: { id: string; name: string } | null;
};

type Stats = {
  totalUsers: number;
  totalCommunities: number;
  pendingReports: number;
  resolvedReports: number;
};

export type AdminInitialData = {
  stats: Stats;
  reports: Report[];
  users: Profile[];
  communities: Community[];
  posts: Post[];
};

interface Props {
  initialData: AdminInitialData;
}

// ─── Shell ────────────────────────────────────────────────────────────────────

export function AdminShell({ initialData }: Props) {
  const [isPending, startTransition] = useTransition();

  // Local copies that mutate optimistically while server action runs
  const [stats, setStats] = useState<Stats>(initialData.stats);
  const [reports, setReports] = useState<Report[]>(initialData.reports);
  const [users] = useState<Profile[]>(initialData.users);
  const [communities, setCommunities] = useState<Community[]>(
    initialData.communities,
  );
  const [posts, setPosts] = useState<Post[]>(initialData.posts);

  const [activeTab, setActiveTab] = useState("reports");
  const [reportFilter, setReportFilter] = useState("pending");
  const [userSearch, setUserSearch] = useState("");
  const [communitySearch, setCommunitySearch] = useState("");
  const [postSearch, setPostSearch] = useState("");

  // ── Report actions ─────────────────────────────────────────────────────────

  const handleResolveReport = (reportId: string) => {
    // Optimistic
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)),
    );
    setStats((prev) => ({
      ...prev,
      pendingReports: Math.max(0, prev.pendingReports - 1),
      resolvedReports: prev.resolvedReports + 1,
    }));

    startTransition(async () => {
      try {
        await resolveReport(reportId);
        toast.success("Report resolved.");
      } catch {
        toast.error("Failed to resolve report.");
        // Revert
        setReports(initialData.reports);
        setStats(initialData.stats);
      }
    });
  };

  const handleDismissReport = (reportId: string) => {
    setReports((prev) => prev.filter((r) => r.id !== reportId));
    setStats((prev) => ({
      ...prev,
      pendingReports: Math.max(0, prev.pendingReports - 1),
    }));

    startTransition(async () => {
      try {
        await dismissReport(reportId);
        toast.success("Report dismissed.");
      } catch {
        toast.error("Failed to dismiss report.");
        setReports(initialData.reports);
        setStats(initialData.stats);
      }
    });
  };

  // ── Delete post ────────────────────────────────────────────────────────────

  const handleDeletePost = (postId: string, reportId?: string) => {
    // Optimistic — remove post from list
    setPosts((prev) => prev.filter((p) => p.id !== postId));

    // If called from the reports panel, also resolve that report
    if (reportId) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)),
      );
      setStats((prev) => ({
        ...prev,
        pendingReports: Math.max(0, prev.pendingReports - 1),
        resolvedReports: prev.resolvedReports + 1,
      }));
    }

    startTransition(async () => {
      try {
        await adminDeletePost(postId, reportId);
        toast.success("Post deleted.");
      } catch {
        toast.error("Failed to delete post.");
        setPosts(initialData.posts);
        if (reportId) {
          setReports(initialData.reports);
          setStats(initialData.stats);
        }
      }
    });
  };

  // ── Delete community ───────────────────────────────────────────────────────

  const handleDeleteCommunity = (communityId: string) => {
    setCommunities((prev) => prev.filter((c) => c.id !== communityId));
    setStats((prev) => ({
      ...prev,
      totalCommunities: Math.max(0, prev.totalCommunities - 1),
    }));

    startTransition(async () => {
      try {
        await deleteCommunity(communityId);
        toast.success("Community deleted.");
      } catch {
        toast.error("Failed to delete community.");
        setCommunities(initialData.communities);
        setStats(initialData.stats);
      }
    });
  };

  // ── Filtered derived state ─────────────────────────────────────────────────

  const filteredReports = useMemo(() => {
    if (reportFilter === "all") return reports;
    return reports.filter((r) => r.status === reportFilter);
  }, [reports, reportFilter]);

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const term = userSearch.toLowerCase();
        return (
          (u.display_name || "").toLowerCase().includes(term) ||
          (u.username || "").toLowerCase().includes(term) ||
          (u.email || "").toLowerCase().includes(term)
        );
      }),
    [users, userSearch],
  );

  const filteredCommunities = useMemo(
    () =>
      communities.filter((c) =>
        c.name.toLowerCase().includes(communitySearch.toLowerCase()),
      ),
    [communities, communitySearch],
  );

  const filteredPosts = useMemo(
    () =>
      posts.filter(
        (p) =>
          p.content.toLowerCase().includes(postSearch.toLowerCase()) ||
          (p.profiles?.display_name || "")
            .toLowerCase()
            .includes(postSearch.toLowerCase()) ||
          (p.communities?.name || "")
            .toLowerCase()
            .includes(postSearch.toLowerCase()),
      ),
    [posts, postSearch],
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, content, and platform settings
        </p>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            icon: <Users className="h-5 w-5" />,
            value: stats.totalUsers,
            label: "Total Users",
          },
          {
            icon: <TrendingUp className="h-5 w-5" />,
            value: stats.totalCommunities,
            label: "Communities",
          },
          {
            icon: <Flag className="h-5 w-5" />,
            value: stats.pendingReports,
            label: "Pending Reports",
          },
          {
            icon: <MessageSquare className="h-5 w-5" />,
            value: stats.resolvedReports,
            label: "Resolved Reports",
          },
        ].map(({ icon, value, label }) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-muted p-2">{icon}</div>
                <div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-4 lg:inline-grid lg:w-auto">
          <TabsTrigger value="reports">
            Reports
            {stats.pendingReports > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {stats.pendingReports}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="posts">
            <FileText className="mr-1.5 h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="communities">Communities</TabsTrigger>
        </TabsList>

        {/* ────────────────── Reports ────────────────── */}
        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Content Reports</CardTitle>
                <Select value={reportFilter} onValueChange={setReportFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {filteredReports.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Flag className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p>No reports found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredReports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      isPending={isPending}
                      onResolve={() => handleResolveReport(report.id)}
                      onDismiss={() => handleDismissReport(report.id)}
                      onDeletePost={(postId) =>
                        handleDeletePost(postId, report.id)
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────────────────── Posts ────────────────── */}
        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle>Post Moderation</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {posts.length} most recent posts
                  </p>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search posts, authors, communities…"
                    className="pl-9 sm:w-72"
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {filteredPosts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <FileText className="mx-auto mb-3 h-10 w-10 opacity-40" />
                    <p>No posts found</p>
                  </div>
                ) : (
                  filteredPosts.map((post) => (
                    <PostModerationRow
                      key={post.id}
                      post={post}
                      isPending={isPending}
                      onDelete={() => handleDeletePost(post.id)}
                    />
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────────────────── Users ────────────────── */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users…"
                    className="pl-9 sm:w-64"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No users found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={u.profile_picture || "/placeholder.svg"}
                                />
                                <AvatarFallback>
                                  {(u.display_name || u.username || "?")
                                    .charAt(0)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {u.display_name || u.username}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {u.email}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={u.is_admin ? "default" : "secondary"}
                            >
                              {u.is_admin ? "Admin" : "Member"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {u.created_at
                              ? formatDistanceToNow(new Date(u.created_at), {
                                  addSuffix: true,
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="icon" asChild>
                              <Link href={`/user/${u.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ────────────────── Communities ────────────────── */}
        <TabsContent value="communities" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Community Management</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search communities…"
                    className="pl-9 sm:w-64"
                    value={communitySearch}
                    onChange={(e) => setCommunitySearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Community</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCommunities.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={5}
                          className="py-8 text-center text-muted-foreground"
                        >
                          No communities found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCommunities.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage
                                  src={c.image_url || "/placeholder.svg"}
                                  alt={c.name}
                                />
                                <AvatarFallback>
                                  {c.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{c.name}</p>
                                <p className="max-w-48 truncate text-sm text-muted-foreground">
                                  {c.description}
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{c.category || "—"}</Badge>
                          </TableCell>
                          <TableCell>
                            {c.community_members?.[0]?.count ?? 0}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.created_at
                              ? formatDistanceToNow(new Date(c.created_at), {
                                  addSuffix: true,
                                })
                              : "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/communities/${c.id}`}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Community
                                  </Link>
                                </DropdownMenuItem>
                                <DeleteCommunityItem
                                  name={c.name}
                                  isPending={isPending}
                                  onConfirm={() => handleDeleteCommunity(c.id)}
                                />
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Post Moderation Row ──────────────────────────────────────────────────────

function PostModerationRow({
  post,
  isPending,
  onDelete,
}: {
  post: Post;
  isPending: boolean;
  onDelete: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <Card>
      <CardContent className="py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          {/* Author + meta */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <Avatar className="h-8 w-8 shrink-0 mt-0.5">
              <AvatarImage
                src={post.profiles?.profile_picture || "/placeholder.svg"}
              />
              <AvatarFallback>
                {(
                  post.profiles?.display_name ||
                  post.profiles?.username ||
                  "?"
                ).charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium">
                  {post.profiles?.display_name ||
                    post.profiles?.username ||
                    "Unknown"}
                </span>
                <span className="text-muted-foreground">in</span>
                {post.communities ? (
                  <Link
                    href={`/communities/${post.communities.id}`}
                    className="text-primary hover:underline"
                  >
                    {post.communities.name}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">
                    Unknown community
                  </span>
                )}
                {post.created_at && (
                  <span className="text-muted-foreground text-xs">
                    ·{" "}
                    {formatDistanceToNow(new Date(post.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>

              {/* Post content preview */}
              <p className="text-sm leading-relaxed line-clamp-3">
                {post.content}
              </p>

              {/* Image thumbnail */}
              {post.image_url && (
                <div className="relative mt-2 h-20 w-32 overflow-hidden rounded-md border border-border">
                  <Image
                    src={post.image_url}
                    alt="Post image"
                    fill
                    className="object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <ImageIcon className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/communities/${post.community_id}`} target="_blank">
                <Eye className="mr-1.5 h-3.5 w-3.5" />
                View
              </Link>
            </Button>

            <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
              <DialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isPending}>
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Delete Post</DialogTitle>
                  <DialogDescription>
                    This will permanently delete the post, its likes, and
                    comments. Any open reports referencing this post will be
                    automatically resolved. This cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                  <p className="line-clamp-4">{post.content}</p>
                </div>
                <DialogFooter className="gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setConfirmOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => {
                      onDelete();
                      setConfirmOpen(false);
                    }}
                  >
                    {isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete Post
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

type ReportedPost = {
  content: string;
  image_url: string | null;
  created_at: string | null;
  community_id: string;
  profiles: {
    display_name: string | null;
    username: string | null;
    profile_picture: string | null;
  } | null;
};

function ReportCard({
  report,
  onResolve,
  onDismiss,
  isPending,
  onDeletePost,
}: {
  // report: Report;
  // onResolve: () => void;
  // onDismiss: () => void;
  report: Report;
  isPending: boolean;
  onResolve: () => void;
  onDismiss: () => void;
  onDeletePost: (postId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [reportedPost, setReportedPost] = useState<ReportedPost | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [deletePostOpen, setDeletePostOpen] = useState(false);

  const isResolved = report.status === "resolved";

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && report.reported_content_type === "post" && !reportedPost) {
      setLoadingPost(true);
      const supabase = createClient();
      const { data } = await supabase
        .from("posts")
        .select(
          "content, image_url, created_at, community_id, profiles:user_id(display_name, username, profile_picture)",
        )
        .eq("id", report.reported_content_id)
        .maybeSingle();
      setReportedPost(data as ReportedPost | null);
      setLoadingPost(false);
    }
  };

  return (
    <Card className={isResolved ? "opacity-60" : ""}>
      <CardContent className="pt-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={isResolved ? "outline" : "secondary"}>
                {report.status}
              </Badge>
              <Badge variant="outline" className="capitalize">
                {report.reported_content_type}
              </Badge>
            </div>
            <p className="font-medium">{report.reason}</p>
            {report.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {report.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Reported by{" "}
              <span className="font-medium">
                {report.reporter?.display_name ||
                  report.reporter?.username ||
                  "Unknown"}
              </span>{" "}
              {report.created_at &&
                formatDistanceToNow(new Date(report.created_at), {
                  addSuffix: true,
                })}
            </p>
          </div>

          {!isResolved && (
            <div className="flex shrink-0 gap-2">
              {/* Review dialog */}
              <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    Review
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Review Report</DialogTitle>
                    <DialogDescription>
                      Inspect the reported content and decide how to handle it.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto pr-1">
                    {/* ── Report metadata ── */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                          Content Type
                        </Label>
                        <p className="mt-1 capitalize text-sm">
                          {report.reported_content_type}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                          Reporter
                        </Label>
                        <p className="mt-1 text-sm">
                          {report.reporter?.display_name ||
                            report.reporter?.username ||
                            "Unknown"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                        Reason
                      </Label>
                      <p className="mt-1 text-sm font-medium">
                        {report.reason}
                      </p>
                    </div>

                    {report.description && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                          Additional Details
                        </Label>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {report.description}
                        </p>
                      </div>
                    )}

                    {/* ── Reported post content ── */}
                    {report.reported_content_type === "post" && (
                      <div>
                        <Label className="text-xs text-muted-foreground uppercase tracking-wide">
                          Reported Post
                        </Label>
                        <div className="mt-2 rounded-lg border border-border bg-muted/40 p-3">
                          {loadingPost ? (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : reportedPost ? (
                            <div className="space-y-2">
                              {/* Author row */}
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage
                                    src={
                                      reportedPost.profiles?.profile_picture ||
                                      "/placeholder.svg"
                                    }
                                  />
                                  <AvatarFallback className="text-xs">
                                    {(
                                      reportedPost.profiles?.display_name ||
                                      reportedPost.profiles?.username ||
                                      "?"
                                    ).charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">
                                  {reportedPost.profiles?.display_name ||
                                    reportedPost.profiles?.username ||
                                    "Unknown user"}
                                </span>
                                {reportedPost.created_at && (
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {formatDistanceToNow(
                                      new Date(reportedPost.created_at),
                                      { addSuffix: true },
                                    )}
                                  </span>
                                )}
                              </div>

                              {/* Post text */}
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                {reportedPost.content}
                              </p>

                              {/* Post image */}
                              {reportedPost.image_url && (
                                <div className="relative mt-2 aspect-video overflow-hidden rounded-md border border-border">
                                  <Image
                                    src={reportedPost.image_url}
                                    alt="Post image"
                                    className="h-full w-full object-cover"
                                    fill
                                  />
                                </div>
                              )}

                              {/* Quick actions */}
                              <div className="flex gap-2 pt-2 border-t border-border mt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs"
                                  asChild
                                >
                                  <a
                                    href={`/communities/${reportedPost.community_id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Eye className="mr-1.5 h-3 w-3" />
                                    View in Community
                                  </a>
                                </Button>

                                <Dialog
                                  open={deletePostOpen}
                                  onOpenChange={setDeletePostOpen}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="destructive"
                                      size="sm"
                                      className="text-xs"
                                    >
                                      <Trash2 className="mr-1.5 h-3 w-3" />
                                      Delete Post
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Delete Post</DialogTitle>
                                      <DialogDescription>
                                        This will permanently delete the
                                        reported post and automatically resolve
                                        the report. This action cannot be
                                        undone.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter className="gap-2">
                                      <Button
                                        variant="outline"
                                        onClick={() => setDeletePostOpen(false)}
                                      >
                                        Cancel
                                      </Button>
                                      <Button
                                        variant="destructive"
                                        onClick={() => {
                                          onDeletePost(
                                            report.reported_content_id,
                                          );
                                          setDeletePostOpen(false);
                                        }}
                                        disabled={isPending}
                                      >
                                        {isPending ? (
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        ) : (
                                          <Trash2 className="mr-2 h-4 w-4" />
                                        )}
                                        Delete &amp; Resolve
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                              </div>
                            </div>
                          ) : (
                            <p className="py-2 text-sm text-muted-foreground italic">
                              Post not found — it may have already been deleted.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 bg-transparent"
                      onClick={() => {
                        onDismiss();
                        setOpen(false);
                      }}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Dismiss
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        onResolve();
                        setOpen(false);
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Mark Resolved
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
                variant="ghost"
                size="sm"
                onClick={onDismiss}
                className="text-muted-foreground"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Delete Community Item ────────────────────────────────────────────────────

function DeleteCommunityItem({
  name,
  isPending,
  onConfirm,
}: {
  name: string;
  isPending: boolean;
  onConfirm: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onSelect={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Community
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Community</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{name}</strong>? This action
            cannot be undone and will remove all posts and memberships.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <AlertTriangle className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
