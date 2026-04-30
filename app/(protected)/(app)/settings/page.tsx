"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  User,
  Bell,
  Palette,
  Camera,
  Loader2,
  Check,
  Trash2,
  Pencil,
  X,
  MapPin,
  AtSign,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/components/providers/current-user-provider";
import { createClient } from "@/lib/supabase/client";
import { useHandleAvatarUpload } from "@/hooks/use-handle-avatar-upload";
import { Hobby } from "@/lib/types";
import { useTheme } from "next-themes";
import { PushNotificationToggle } from "@/components/push-notification-toggle";
import { useCurrentUserHobbies } from "@/hooks/use-current-user-hobbies";
import { useUsernameCheck } from "@/hooks/use-username-check";
import { toast } from "sonner";

type ProfileData = {
  name: string;
  username: string;
  email: string;
  bio: string;
  location: string;
  profilePicture: string;
};

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const { user, loading } = useCurrentUser();
  const { handleAvatarUpload, isUploadingAvatar } = useHandleAvatarUpload();
  const { hobbies: userHobbies } = useCurrentUserHobbies();

  const [activeTab, setActiveTab] = useState("profile");
  const [isEditing, setIsEditing] = useState(false);

  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [userHobbiesState, setUserHobbiesState] = useState<string[]>([]);
  const [hobbiesState, setHobbiesState] = useState<Hobby[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [profileData, setProfileData] = useState<ProfileData>(
    {} as ProfileData,
  );
  // Snapshot saved when entering edit mode so Cancel can fully restore
  const [profileSnapshot, setProfileSnapshot] = useState<ProfileData>(
    {} as ProfileData,
  );
  const [hobbiesSnapshot, setHobbiesSnapshot] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const usernameCheck = useUsernameCheck(profileData.username ?? "", user?.id);

  useEffect(() => {
    if (!user) return;

    const fetchHobbies = async () => {
      const supabase = createClient();
      const { data: hobbies } = await supabase.from("hobbies").select("*");
      setHobbiesState(hobbies || []);
      setIsLoading(false);
    };

    setProfileData({
      profilePicture: user?.profile?.profile_picture || "",
      name: user?.profile?.display_name || "",
      username: user?.profile?.username || "",
      email: user?.profile?.email || "",
      bio: user?.profile?.bio || "",
      location: user?.profile?.location || "",
    });
    setUserHobbiesState(userHobbies.map((h) => h.id));
    fetchHobbies();
  }, [user, userHobbies]);

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // ── Enter / exit edit mode ────────────────────────────────────────────────

  const handleStartEditing = () => {
    setProfileSnapshot({ ...profileData });
    setHobbiesSnapshot([...userHobbiesState]);
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    // Restore the snapshot
    setProfileData({ ...profileSnapshot });
    setUserHobbiesState([...hobbiesSnapshot]);
    // Discard any unsaved avatar preview
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview);
      setAvatarPreview(null);
    }
    setSelectedAvatarFile(null);
    setIsEditing(false);
  };

  // ── Save profile ──────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    if (usernameCheck.isTaken) {
      toast.error("That username is already taken.");
      return;
    }
    if (usernameCheck.checking) {
      toast.error("Please wait while we check username availability.");
      return;
    }

    setActionLoading(true);
    const supabase = createClient();

    try {
      let uploadedAvatarUrl = profileData.profilePicture;

      if (selectedAvatarFile) {
        uploadedAvatarUrl = (await handleAvatarUpload(
          selectedAvatarFile,
        )) as string;
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(null);
        }
        setSelectedAvatarFile(null);
      }

      const hobbyInserts = userHobbiesState.map((hobbyId) => ({
        user_id: user!.id,
        hobby_id: hobbyId,
      }));

      const [deleteRes, profileRes] = await Promise.all([
        supabase.from("user_hobbies").delete().eq("user_id", user!.id),
        supabase
          .from("profiles")
          .update({
            profile_picture: uploadedAvatarUrl,
            display_name: profileData.name,
            username: profileData.username,
            bio: profileData.bio,
            location: profileData.location,
          })
          .eq("id", user!.id)
          .select(),
      ]);

      if (deleteRes.error) throw deleteRes.error;
      if (profileRes.error) throw profileRes.error;

      const hobbiesRes = await supabase
        .from("user_hobbies")
        .insert(hobbyInserts);
      if (hobbiesRes.error) throw hobbiesRes.error;

      // Sync local state with saved values
      setProfileData((prev) => ({
        ...prev,
        profilePicture: uploadedAvatarUrl,
        name: profileRes.data![0].display_name!,
        username: profileRes.data![0].username!,
        bio: profileRes.data![0].bio || "",
        location: profileRes.data![0].location || "",
      }));

      if (
        userHobbiesState.sort().toString() !==
        userHobbies
          .map((h) => h.id)
          .sort()
          .toString()
      ) {
        fetch("/api/update-profile-embedding", { method: "POST" });
      }

      toast.success("Profile saved successfully.");
      setIsEditing(false);
    } catch (error) {
      console.error("Error updating profile", error);
      toast.error("Failed to save profile. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleAvatarInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedAvatarFile(file);
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      const blobUrl = URL.createObjectURL(file);
      setAvatarPreview(blobUrl);
      setProfileData((prev) => ({ ...prev, profilePicture: blobUrl }));
    }
    e.target.value = "";
  };

  const toggleHobby = (id: string) => {
    setUserHobbiesState((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  if (loading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  const showUsernameCheck = (profileData.username?.length ?? 0) >= 3;
  const saveDisabled =
    actionLoading || usernameCheck.isTaken || usernameCheck.checking;

  // ── View mode component ───────────────────────────────────────────────────

  const ProfileViewCard = () => (
    <div className="space-y-6">
      {/* Avatar + name */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 shrink-0">
              <AvatarImage
                src={profileData.profilePicture || "/placeholder.svg"}
                alt={profileData.name || "User"}
              />
              <AvatarFallback className="text-2xl">
                {profileData.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-xl font-semibold truncate">
                {profileData.name || "—"}
              </p>
              {profileData.username && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <AtSign className="h-3.5 w-3.5" />
                  {profileData.username}
                </p>
              )}
              {profileData.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {profileData.location}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bio */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Bio</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {profileData.bio || "No bio added yet."}
          </p>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{profileData.email || "—"}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Username</span>
            <span className="font-medium">
              {profileData.username ? `@${profileData.username}` : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Interests</CardTitle>
        </CardHeader>
        <CardContent>
          {userHobbiesState.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No interests added yet.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {hobbiesState
                .filter((h) => userHobbiesState.includes(h.id))
                .map((h) => (
                  <Badge key={h.id} variant="secondary">
                    {h.name}
                  </Badge>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  // ── Edit mode component ───────────────────────────────────────────────────

  const ProfileEditForm = () => (
    <div className="space-y-6">
      {/* Avatar */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>Update your profile picture</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage
                src={profileData.profilePicture || "/placeholder.svg"}
                alt={profileData.name || "User"}
              />
              <AvatarFallback className="text-2xl">
                {profileData.name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="mr-2 h-4 w-4" />
                Change Photo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarInputChange}
                className="hidden"
                disabled={isUploadingAvatar}
              />
              <p className="text-xs text-muted-foreground">
                JPG, PNG or GIF. Max size 1 MB.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update your personal details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={profileData.name}
                onChange={(e) =>
                  setProfileData({ ...profileData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <div className="flex">
                <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                  @
                </span>
                <Input
                  id="username"
                  className={cn(
                    "rounded-l-none",
                    showUsernameCheck &&
                      usernameCheck.isTaken &&
                      "border-destructive focus-visible:border-destructive",
                    showUsernameCheck &&
                      usernameCheck.isAvailable &&
                      "border-green-500 focus-visible:border-green-500",
                  )}
                  value={profileData.username}
                  onChange={(e) =>
                    setProfileData({ ...profileData, username: e.target.value })
                  }
                />
              </div>
              {showUsernameCheck && (
                <div className="flex items-center gap-1.5 text-xs">
                  {usernameCheck.checking ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Checking…</span>
                    </>
                  ) : usernameCheck.isTaken ? (
                    <>
                      <XCircle className="h-3 w-3 text-destructive" />
                      <span className="text-destructive">
                        Username already taken
                      </span>
                    </>
                  ) : usernameCheck.isAvailable ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">Username available</span>
                    </>
                  ) : null}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              readOnly
              disabled
              id="email"
              type="email"
              value={profileData.email}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={3}
              value={profileData.bio}
              onChange={(e) =>
                setProfileData({ ...profileData, bio: e.target.value })
              }
            />
            <p className="text-xs text-muted-foreground">
              {(profileData.bio || "").length}/160 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={profileData.location}
              onChange={(e) =>
                setProfileData({ ...profileData, location: e.target.value })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Interests */}
      <Card>
        <CardHeader>
          <CardTitle>Interests</CardTitle>
          <CardDescription>
            Select hobbies you are interested in
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {hobbiesState.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => toggleHobby(h.id)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                  userHobbiesState.includes(h.id)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:bg-muted",
                )}
              >
                {userHobbiesState.includes(h.id) && (
                  <Check className="h-3 w-3" />
                )}
                {h.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Save / Cancel */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleCancelEditing}
          disabled={actionLoading}
        >
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button onClick={handleSaveProfile} disabled={saveDisabled}>
          {actionLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-20 lg:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full justify-start">
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Profile</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Appearance</span>
          </TabsTrigger>
        </TabsList>

        {/* ── Profile tab ── */}
        <TabsContent value="profile">
          {/* Edit / view toggle header */}
          {!isEditing && (
            <div className="flex justify-end mb-4">
              <Button onClick={handleStartEditing} variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Profile
              </Button>
            </div>
          )}
          {isEditing ? <ProfileEditForm /> : <ProfileViewCard />}
        </TabsContent>

        {/* ── Notifications tab ── */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose how you want to be notified
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive push notifications on your device
                  </p>
                </div>
                <PushNotificationToggle />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Appearance tab ── */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Theme</CardTitle>
              <CardDescription>
                Customize the appearance of the app
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                {(
                  [
                    {
                      value: "light",
                      label: "Light",
                      bg: "bg-white border border-border",
                    },
                    { value: "dark", label: "Dark", bg: "bg-neutral-900" },
                    {
                      value: "system",
                      label: "System",
                      bg: "bg-linear-to-br from-background to-neutral-900",
                    },
                  ] as const
                ).map(({ value, label, bg }) => (
                  <button
                    key={value}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-lg border border-border p-4 transition-colors hover:border-foreground/50",
                      theme === value && "border-2 border-foreground",
                    )}
                    onClick={() => setTheme(value)}
                  >
                    <div className={cn("h-12 w-12 rounded-full", bg)} />
                    <span className="text-sm font-medium">{label}</span>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
