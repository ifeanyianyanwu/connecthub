// "use client";

// import { useState } from "react";
// import { useStore } from "@/lib/store";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Badge } from "@/components/ui/badge";
// import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogTrigger,
// } from "@/components/ui/dialog";
// import {
//   Users,
//   MessageSquare,
//   Flag,
//   TrendingUp,
//   Shield,
//   Ban,
//   CheckCircle,
//   XCircle,
//   Search,
//   MoreHorizontal,
//   Eye,
//   Trash2,
//   AlertTriangle,
// } from "lucide-react";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";
// import { useSearchParams } from "next/navigation";
// import { Suspense } from "react";
// import Loading from "./loading";

// export default function AdminPage() {
//   const { currentUser, users, reports, communities, adminActions } = useStore();
//   const [searchTerm, setSearchTerm] = useState("");
//   const [userFilter, setUserFilter] = useState("all");
//   const [reportFilter, setReportFilter] = useState("all");
//   const searchParams = useSearchParams();

//   if (!currentUser || currentUser.role !== "admin") {
//     return (
//       <div className="flex items-center justify-center min-h-[60vh]">
//         <Card className="w-full max-w-md">
//           <CardContent className="pt-6 text-center">
//             <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
//             <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
//             <p className="text-muted-foreground">
//               You do not have permission to access the admin dashboard.
//             </p>
//           </CardContent>
//         </Card>
//       </div>
//     );
//   }

//   const filteredUsers = users.filter((user) => {
//     const matchesSearch =
//       user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
//       user.email.toLowerCase().includes(searchTerm.toLowerCase());
//     const matchesFilter =
//       userFilter === "all" ||
//       (userFilter === "active" && user.status === "active") ||
//       (userFilter === "suspended" && user.status === "suspended") ||
//       (userFilter === "banned" && user.status === "banned");
//     return matchesSearch && matchesFilter;
//   });

//   const filteredReports = reports.filter((report) => {
//     return reportFilter === "all" || report.status === reportFilter;
//   });

//   const stats = {
//     totalUsers: users.length,
//     activeUsers: users.filter((u) => u.status === "active").length,
//     totalCommunities: communities.length,
//     pendingReports: reports.filter((r) => r.status === "pending").length,
//   };

//   return (
//     <Suspense fallback={<Loading />}>
//       <div className="space-y-6">
//         <div>
//           <h1 className="text-2xl font-bold">Admin Dashboard</h1>
//           <p className="text-muted-foreground">
//             Manage users, content, and platform settings
//           </p>
//         </div>

//         {/* Stats Overview */}
//         <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-muted rounded-lg">
//                   <Users className="h-5 w-5" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold">{stats.totalUsers}</p>
//                   <p className="text-sm text-muted-foreground">Total Users</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-muted rounded-lg">
//                   <TrendingUp className="h-5 w-5" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold">{stats.activeUsers}</p>
//                   <p className="text-sm text-muted-foreground">Active Users</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-muted rounded-lg">
//                   <MessageSquare className="h-5 w-5" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold">{stats.totalCommunities}</p>
//                   <p className="text-sm text-muted-foreground">Communities</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//           <Card>
//             <CardContent className="pt-6">
//               <div className="flex items-center gap-3">
//                 <div className="p-2 bg-muted rounded-lg">
//                   <Flag className="h-5 w-5" />
//                 </div>
//                 <div>
//                   <p className="text-2xl font-bold">{stats.pendingReports}</p>
//                   <p className="text-sm text-muted-foreground">Pending Reports</p>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         </div>

//         <Tabs defaultValue="users" className="space-y-4">
//           <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
//             <TabsTrigger value="users">Users</TabsTrigger>
//             <TabsTrigger value="reports">Reports</TabsTrigger>
//             <TabsTrigger value="communities">Communities</TabsTrigger>
//             <TabsTrigger value="actions">Actions Log</TabsTrigger>
//           </TabsList>

//           {/* Users Tab */}
//           <TabsContent value="users" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <div className="flex flex-col sm:flex-row gap-4 justify-between">
//                   <CardTitle>User Management</CardTitle>
//                   <div className="flex gap-2">
//                     <div className="relative">
//                       <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
//                       <Input
//                         placeholder="Search users..."
//                         className="pl-9 w-full sm:w-64"
//                         value={searchTerm}
//                         onChange={(e) => setSearchTerm(e.target.value)}
//                       />
//                     </div>
//                     <Select value={userFilter} onValueChange={setUserFilter}>
//                       <SelectTrigger className="w-32">
//                         <SelectValue />
//                       </SelectTrigger>
//                       <SelectContent>
//                         <SelectItem value="all">All</SelectItem>
//                         <SelectItem value="active">Active</SelectItem>
//                         <SelectItem value="suspended">Suspended</SelectItem>
//                         <SelectItem value="banned">Banned</SelectItem>
//                       </SelectContent>
//                     </Select>
//                   </div>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <div className="overflow-x-auto">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>User</TableHead>
//                         <TableHead>Role</TableHead>
//                         <TableHead>Status</TableHead>
//                         <TableHead>Joined</TableHead>
//                         <TableHead className="text-right">Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {filteredUsers.map((user) => (
//                         <TableRow key={user.id}>
//                           <TableCell>
//                             <div className="flex items-center gap-3">
//                               <Avatar className="h-8 w-8">
//                                 <AvatarImage src={user.avatar || "/placeholder.svg"} />
//                                 <AvatarFallback>
//                                   {user.name
//                                     .split(" ")
//                                     .map((n) => n[0])
//                                     .join("")}
//                                 </AvatarFallback>
//                               </Avatar>
//                               <div>
//                                 <p className="font-medium">{user.name}</p>
//                                 <p className="text-sm text-muted-foreground">
//                                   {user.email}
//                                 </p>
//                               </div>
//                             </div>
//                           </TableCell>
//                           <TableCell>
//                             <Badge
//                               variant={
//                                 user.role === "admin" ? "default" : "secondary"
//                               }
//                             >
//                               {user.role}
//                             </Badge>
//                           </TableCell>
//                           <TableCell>
//                             <Badge
//                               variant={
//                                 user.status === "active"
//                                   ? "default"
//                                   : user.status === "suspended"
//                                     ? "secondary"
//                                     : "destructive"
//                               }
//                               className={
//                                 user.status === "active"
//                                   ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
//                                   : ""
//                               }
//                             >
//                               {user.status}
//                             </Badge>
//                           </TableCell>
//                           <TableCell>
//                             {new Date(user.createdAt).toLocaleDateString()}
//                           </TableCell>
//                           <TableCell className="text-right">
//                             <DropdownMenu>
//                               <DropdownMenuTrigger asChild>
//                                 <Button variant="ghost" size="icon">
//                                   <MoreHorizontal className="h-4 w-4" />
//                                 </Button>
//                               </DropdownMenuTrigger>
//                               <DropdownMenuContent align="end">
//                                 <DropdownMenuItem>
//                                   <Eye className="h-4 w-4 mr-2" />
//                                   View Profile
//                                 </DropdownMenuItem>
//                                 <DropdownMenuItem>
//                                   <AlertTriangle className="h-4 w-4 mr-2" />
//                                   Suspend User
//                                 </DropdownMenuItem>
//                                 <DropdownMenuItem className="text-destructive">
//                                   <Ban className="h-4 w-4 mr-2" />
//                                   Ban User
//                                 </DropdownMenuItem>
//                               </DropdownMenuContent>
//                             </DropdownMenu>
//                           </TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Reports Tab */}
//           <TabsContent value="reports" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <div className="flex flex-col sm:flex-row gap-4 justify-between">
//                   <CardTitle>Content Reports</CardTitle>
//                   <Select value={reportFilter} onValueChange={setReportFilter}>
//                     <SelectTrigger className="w-32">
//                       <SelectValue />
//                     </SelectTrigger>
//                     <SelectContent>
//                       <SelectItem value="all">All</SelectItem>
//                       <SelectItem value="pending">Pending</SelectItem>
//                       <SelectItem value="reviewed">Reviewed</SelectItem>
//                       <SelectItem value="resolved">Resolved</SelectItem>
//                     </SelectContent>
//                   </Select>
//                 </div>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   {filteredReports.map((report) => {
//                     const reporter = users.find((u) => u.id === report.reporterId);
//                     return (
//                       <Card key={report.id}>
//                         <CardContent className="pt-4">
//                           <div className="flex flex-col sm:flex-row justify-between gap-4">
//                             <div className="space-y-2">
//                               <div className="flex items-center gap-2">
//                                 <Badge
//                                   variant={
//                                     report.status === "pending"
//                                       ? "secondary"
//                                       : report.status === "reviewed"
//                                         ? "outline"
//                                         : "default"
//                                   }
//                                 >
//                                   {report.status}
//                                 </Badge>
//                                 <Badge variant="outline">{report.type}</Badge>
//                               </div>
//                               <p className="font-medium">{report.reason}</p>
//                               <p className="text-sm text-muted-foreground">
//                                 Reported by {reporter?.name || "Unknown"} on{" "}
//                                 {new Date(report.createdAt).toLocaleDateString()}
//                               </p>
//                             </div>
//                             <div className="flex gap-2">
//                               <Dialog>
//                                 <DialogTrigger asChild>
//                                   <Button variant="outline" size="sm">
//                                     <Eye className="h-4 w-4 mr-2" />
//                                     Review
//                                   </Button>
//                                 </DialogTrigger>
//                                 <DialogContent>
//                                   <DialogHeader>
//                                     <DialogTitle>Review Report</DialogTitle>
//                                   </DialogHeader>
//                                   <div className="space-y-4">
//                                     <div>
//                                       <Label>Report Type</Label>
//                                       <p className="text-sm text-muted-foreground">
//                                         {report.type}
//                                       </p>
//                                     </div>
//                                     <div>
//                                       <Label>Reason</Label>
//                                       <p className="text-sm text-muted-foreground">
//                                         {report.reason}
//                                       </p>
//                                     </div>
//                                     <div className="flex gap-2">
//                                       <Button className="flex-1">
//                                         <CheckCircle className="h-4 w-4 mr-2" />
//                                         Approve
//                                       </Button>
//                                       <Button variant="outline" className="flex-1 bg-transparent">
//                                         <XCircle className="h-4 w-4 mr-2" />
//                                         Dismiss
//                                       </Button>
//                                     </div>
//                                   </div>
//                                 </DialogContent>
//                               </Dialog>
//                               <Button variant="ghost" size="sm">
//                                 <Trash2 className="h-4 w-4" />
//                               </Button>
//                             </div>
//                           </div>
//                         </CardContent>
//                       </Card>
//                     );
//                   })}
//                   {filteredReports.length === 0 && (
//                     <div className="text-center py-8 text-muted-foreground">
//                       No reports found
//                     </div>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Communities Tab */}
//           <TabsContent value="communities" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Community Management</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="overflow-x-auto">
//                   <Table>
//                     <TableHeader>
//                       <TableRow>
//                         <TableHead>Community</TableHead>
//                         <TableHead>Members</TableHead>
//                         <TableHead>Privacy</TableHead>
//                         <TableHead>Created</TableHead>
//                         <TableHead className="text-right">Actions</TableHead>
//                       </TableRow>
//                     </TableHeader>
//                     <TableBody>
//                       {communities.map((community) => (
//                         <TableRow key={community.id}>
//                           <TableCell>
//                             <div className="flex items-center gap-3">
//                               <Avatar className="h-8 w-8">
//                                 <AvatarImage src={community.image || "/placeholder.svg"} />
//                                 <AvatarFallback>
//                                   {community.name.charAt(0)}
//                                 </AvatarFallback>
//                               </Avatar>
//                               <div>
//                                 <p className="font-medium">{community.name}</p>
//                                 <p className="text-sm text-muted-foreground truncate max-w-48">
//                                   {community.description}
//                                 </p>
//                               </div>
//                             </div>
//                           </TableCell>
//                           <TableCell>{community.memberCount}</TableCell>
//                           <TableCell>
//                             <Badge variant="outline">{community.privacy}</Badge>
//                           </TableCell>
//                           <TableCell>
//                             {new Date(community.createdAt).toLocaleDateString()}
//                           </TableCell>
//                           <TableCell className="text-right">
//                             <DropdownMenu>
//                               <DropdownMenuTrigger asChild>
//                                 <Button variant="ghost" size="icon">
//                                   <MoreHorizontal className="h-4 w-4" />
//                                 </Button>
//                               </DropdownMenuTrigger>
//                               <DropdownMenuContent align="end">
//                                 <DropdownMenuItem>
//                                   <Eye className="h-4 w-4 mr-2" />
//                                   View Community
//                                 </DropdownMenuItem>
//                                 <DropdownMenuItem className="text-destructive">
//                                   <Trash2 className="h-4 w-4 mr-2" />
//                                   Delete Community
//                                 </DropdownMenuItem>
//                               </DropdownMenuContent>
//                             </DropdownMenu>
//                           </TableCell>
//                         </TableRow>
//                       ))}
//                     </TableBody>
//                   </Table>
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>

//           {/* Actions Log Tab */}
//           <TabsContent value="actions" className="space-y-4">
//             <Card>
//               <CardHeader>
//                 <CardTitle>Admin Actions Log</CardTitle>
//               </CardHeader>
//               <CardContent>
//                 <div className="space-y-4">
//                   {adminActions.map((action) => {
//                     const admin = users.find((u) => u.id === action.adminId);
//                     return (
//                       <div
//                         key={action.id}
//                         className="flex items-start gap-4 p-4 border rounded-lg"
//                       >
//                         <div
//                           className={`p-2 rounded-lg ${
//                             action.actionType === "ban"
//                               ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-100"
//                               : action.actionType === "suspend"
//                                 ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-100"
//                                 : "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-100"
//                           }`}
//                         >
//                           {action.actionType === "ban" ? (
//                             <Ban className="h-4 w-4" />
//                           ) : action.actionType === "suspend" ? (
//                             <AlertTriangle className="h-4 w-4" />
//                           ) : (
//                             <CheckCircle className="h-4 w-4" />
//                           )}
//                         </div>
//                         <div className="flex-1">
//                           <p className="font-medium capitalize">
//                             {action.actionType} - {action.targetType}
//                           </p>
//                           <p className="text-sm text-muted-foreground">
//                             {action.reason}
//                           </p>
//                           <p className="text-xs text-muted-foreground mt-1">
//                             By {admin?.name || "Unknown"} on{" "}
//                             {new Date(action.createdAt).toLocaleString()}
//                           </p>
//                         </div>
//                       </div>
//                     );
//                   })}
//                   {adminActions.length === 0 && (
//                     <div className="text-center py-8 text-muted-foreground">
//                       No admin actions recorded
//                     </div>
//                   )}
//                 </div>
//               </CardContent>
//             </Card>
//           </TabsContent>
//         </Tabs>
//       </div>
//     </Suspense>
//   );
// }
