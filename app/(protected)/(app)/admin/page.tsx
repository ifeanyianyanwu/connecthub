"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
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
  Shield,
  CheckCircle,
  XCircle,
  Search,
  MoreHorizontal,
  Eye,
  Trash2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Tables } from "@/lib/database.types";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { Loading } from "@/components/loading";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = Tables<"profiles">;
type Community = Tables<"communities"> & {
  community_members?: { count: number }[];
};
type Report = Tables<"reports"> & {
  reporter: Pick<
    Profile,
    "id" | "username" | "display_name" | "profile_picture"
  > | null;
};

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

type Stats = {
  totalUsers: number;
  totalCommunities: number;
  pendingReports: number;
  resolvedReports: number;
};

// ─── Admin Guard ──────────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-center">
          <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to access the admin dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AdminContent() {
  const { user: authUser } = useCurrentUser();

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    totalCommunities: 0,
    pendingReports: 0,
    resolvedReports: 0,
  });

  const [users, setUsers] = useState<Profile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);

  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingReports, setLoadingReports] = useState(false);
  const [loadingCommunities, setLoadingCommunities] = useState(false);
  const [loadingStats, setLoadingStats] = useState(true);

  const [activeTab, setActiveTab] = useState("reports");
  const [userSearch, setUserSearch] = useState("");
  const [reportFilter, setReportFilter] = useState("pending");
  const [communitySearch, setCommunitySearch] = useState("");

  // ── Verify admin status ────────────────────────────────────────────────────

  useEffect(() => {
    if (!authUser?.id) return;

    const supabase = createClient();

    supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", authUser.id)
      .single()
      .then(({ data }) => {
        setIsAdmin(!!data?.is_admin);
      });
  }, [authUser?.id]);

  // ── Fetch stats ────────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    const supabase = createClient();

    const [usersCount, communitiesCount, pendingCount, resolvedCount] =
      await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("communities")
          .select("id", { count: "exact", head: true }),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending"),
        supabase
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "resolved"),
      ]);

    setStats({
      totalUsers: usersCount.count ?? 0,
      totalCommunities: communitiesCount.count ?? 0,
      pendingReports: pendingCount.count ?? 0,
      resolvedReports: resolvedCount.count ?? 0,
    });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoadingStats(true);
      await fetchStats();
      if (!cancelled) setLoadingStats(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, fetchStats]);

  // ── Fetch users ────────────────────────────────────────────────────────────

  const fetchUsers = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setUsers(data);
  }, []);

  useEffect(() => {
    if (activeTab !== "users" || !isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoadingUsers(true);
      await fetchUsers();
      if (!cancelled) setLoadingUsers(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isAdmin, fetchUsers]);

  // ── Fetch reports ──────────────────────────────────────────────────────────

  const fetchReports = useCallback(async () => {
    const supabase = createClient();

    const query = supabase
      .from("reports")
      .select(
        "*, reporter:profiles!reporter_id(id, username, display_name, profile_picture)",
      )
      .order("created_at", { ascending: false });

    if (reportFilter !== "all") {
      query.eq("status", reportFilter);
    }

    const { data, error } = await query;
    if (!error && data) setReports(data as Report[]);
  }, [reportFilter]);

  useEffect(() => {
    if (activeTab !== "reports" || !isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoadingReports(true);
      await fetchReports();
      if (!cancelled) setLoadingReports(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isAdmin, fetchReports]);

  // ── Fetch communities ──────────────────────────────────────────────────────

  const fetchCommunities = useCallback(async () => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("communities")
      .select("*, community_members(count)")
      .order("created_at", { ascending: false });

    if (!error && data) setCommunities(data);
  }, []);

  useEffect(() => {
    if (activeTab !== "communities" || !isAdmin) return;
    let cancelled = false;
    const load = async () => {
      setLoadingCommunities(true);
      await fetchCommunities();
      if (!cancelled) setLoadingCommunities(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [activeTab, isAdmin, fetchCommunities]);

  // ── Report actions ─────────────────────────────────────────────────────────

  const resolveReport = async (reportId: string) => {
    if (!authUser?.id) return;
    const supabase = createClient();

    const { error } = await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolved_by: authUser.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (!error) {
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: "resolved" } : r)),
      );
      setStats((prev) => ({
        ...prev,
        pendingReports: Math.max(0, prev.pendingReports - 1),
        resolvedReports: prev.resolvedReports + 1,
      }));
    }
  };

  const dismissReport = async (reportId: string) => {
    if (!authUser?.id) return;
    const supabase = createClient();

    const { error } = await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolved_by: authUser.id,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", reportId);

    if (!error) {
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      setStats((prev) => ({
        ...prev,
        pendingReports: Math.max(0, prev.pendingReports - 1),
      }));
    }
  };

  // ── Delete community ───────────────────────────────────────────────────────

  const deleteCommunity = async (communityId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from("communities")
      .delete()
      .eq("id", communityId);

    if (!error) {
      setCommunities((prev) => prev.filter((c) => c.id !== communityId));
      setStats((prev) => ({
        ...prev,
        totalCommunities: Math.max(0, prev.totalCommunities - 1),
      }));
    }
  };

  // ── Filtered derivations ───────────────────────────────────────────────────

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const name = (u.display_name || u.username || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        const term = userSearch.toLowerCase();
        return name.includes(term) || email.includes(term);
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

  // ─── Guard states ─────────────────────────────────────────────────────────

  if (isAdmin === null) {
    return <Loading />;
  }

  if (!isAdmin) return <AccessDenied />;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 pb-20 lg:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, content, and platform settings
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            icon: <Users className="h-5 w-5" />,
            value: loadingStats ? "—" : stats.totalUsers,
            label: "Total Users",
          },
          {
            icon: <TrendingUp className="h-5 w-5" />,
            value: loadingStats ? "—" : stats.totalCommunities,
            label: "Communities",
          },
          {
            icon: <Flag className="h-5 w-5" />,
            value: loadingStats ? "—" : stats.pendingReports,
            label: "Pending Reports",
          },
          {
            icon: <MessageSquare className="h-5 w-5" />,
            value: loadingStats ? "—" : stats.resolvedReports,
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

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full grid-cols-3 lg:inline-grid lg:w-auto">
          <TabsTrigger value="reports">
            Reports
            {stats.pendingReports > 0 && (
              <Badge variant="destructive" className="ml-2 h-5 px-1.5 text-xs">
                {stats.pendingReports}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="communities">Communities</TabsTrigger>
        </TabsList>

        {/* ── Reports Tab ── */}
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
              {loadingReports ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Flag className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p>No reports found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <ReportCard
                      key={report.id}
                      report={report}
                      onResolve={() => resolveReport(report.id)}
                      onDismiss={() => dismissReport(report.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Users Tab ── */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>User Management</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9 sm:w-64"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
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
                                    src={
                                      u.profile_picture || "/placeholder.svg"
                                    }
                                    alt={u.display_name || ""}
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
                            <TableCell className="text-muted-foreground text-sm">
                              {u.created_at
                                ? formatDistanceToNow(new Date(u.created_at), {
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
                                    <Link href={`/user/${u.id}`}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Profile
                                    </Link>
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Communities Tab ── */}
        <TabsContent value="communities" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle>Community Management</CardTitle>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search communities..."
                    className="pl-9 sm:w-64"
                    value={communitySearch}
                    onChange={(e) => setCommunitySearch(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingCommunities ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
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
                              <Badge variant="outline">
                                {c.category || "—"}
                              </Badge>
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
                                    onConfirm={() => deleteCommunity(c.id)}
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
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({
  report,
  onResolve,
  onDismiss,
}: {
  report: Report;
  onResolve: () => void;
  onDismiss: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [reportedPost, setReportedPost] = useState<ReportedPost | null>(null);
  const [loadingPost, setLoadingPost] = useState(false);
  const [deletePostOpen, setDeletePostOpen] = useState(false);
  const [deletingPost, setDeletingPost] = useState(false);
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

  const handleDeletePost = async () => {
    setDeletingPost(true);
    const supabase = createClient();
    await supabase.from("posts").delete().eq("id", report.reported_content_id);
    setDeletingPost(false);
    setDeletePostOpen(false);
    onResolve();
    setOpen(false);
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
                                        onClick={handleDeletePost}
                                        disabled={deletingPost}
                                      >
                                        {deletingPost ? (
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

// ─── Delete Community Confirmation ────────────────────────────────────────────

function DeleteCommunityItem({
  name,
  onConfirm,
}: {
  name: string;
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
            onClick={() => {
              onConfirm();
              setOpen(false);
            }}
          >
            <AlertTriangle className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────

export default function AdminPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminContent />
    </Suspense>
  );
}
