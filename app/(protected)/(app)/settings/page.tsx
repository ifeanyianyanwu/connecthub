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
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUserHobbies } from "@/hooks/use-current-user-hobbies";
import { useHandleAvatarUpload } from "@/hooks/use-handle-avatar-upload";
import { Hobby } from "@/lib/types";

type ProfileData = {
  name: string;
  username: string;
  email: string;
  bio: string;
  location: string;
  profilePicture: string;
};

export default function SettingsPage() {
  const { user, loading } = useCurrentUser();
  const { handleAvatarUpload, isUploadingAvatar } = useHandleAvatarUpload();
  const { hobbies: userHobbies } = useCurrentUserHobbies();
  const [activeTab, setActiveTab] = useState("profile");
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [userHobbiesState, setUserHobbiesState] = useState<string[]>([]);
  const [hobbiesState, setHobbiesState] = useState<Hobby[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<
    "profile" | "notifications" | null
  >(null);

  const [profileData, setProfileData] = useState<ProfileData>(
    {} as ProfileData,
  );
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
  });
  const supabase = createClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;

    const fetchHobbies = async () => {
      const { data: hobbies } = await supabase.from("hobbies").select("*");
      setHobbiesState(hobbies || []);

      setIsLoading(false);
    };

    const updateLocalState = () => {
      setProfileData(() => ({
        profilePicture: user?.profile?.profile_picture || "",
        name: user?.profile?.display_name || "",
        username: user?.profile?.username || "",
        email: user?.profile?.email || "",
        bio: user?.profile?.bio || "",
        location: user?.profile?.location || "",
      }));
      setUserHobbiesState(userHobbies.map((h) => h.id));
      setNotificationSettings({
        pushNotifications: user?.profile?.push_notifications ?? true,
      });
    };

    updateLocalState();
    fetchHobbies();
  }, [user, userHobbies, supabase]);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleSaveProfile = async () => {
    setActionLoading("profile");
    try {
      const hobbyInserts = userHobbiesState.map((hobbyId) => ({
        user_id: user!.id,
        hobby_id: hobbyId,
      }));

      let uploadedAvatarUrl = profileData.profilePicture; // Keep existing URL if no new file

      // Upload new avatar if one was selected
      if (selectedAvatarFile) {
        uploadedAvatarUrl = (await handleAvatarUpload(
          selectedAvatarFile,
        )) as string;

        // Clean up the preview blob
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview);
          setAvatarPreview(null);
        }
      }

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

      if (deleteRes.error) {
        console.error("Error updating hobbies", deleteRes.error);
        throw deleteRes.error;
      }

      if (profileRes.error) {
        console.error("Error updating profile", profileRes.error);
        throw profileRes.error;
      }

      const hobbiesRes = await supabase
        .from("user_hobbies")
        .insert(hobbyInserts);

      if (hobbiesRes.error) {
        console.error("Error updating hobbies", hobbiesRes.error);
        throw hobbiesRes.error;
      }

      setProfileData((prev) => ({
        ...prev,
        name: profileRes.data![0].display_name!,
        username: profileRes.data![0].username!,
        bio: profileRes.data![0].bio!,
        location: profileRes.data![0].location!,
      }));

      if (userHobbiesState.sort().toString() !== userHobbies.sort().toString())
        fetch("/api/update-profile-embedding", { method: "POST" });
    } catch (error) {
      console.error("Error updating profile", error);
    } finally {
      setActionLoading(null);
    }
  };

  const togglePushNotifications = async (value: boolean) => {
    setActionLoading("notifications");
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          push_notifications: value,
        })
        .eq("id", user!.id);

      if (error) {
        console.error("Error updating notification settings", error);
        throw error;
      } else {
        setNotificationSettings((prev) => ({
          ...prev,
          pushNotifications: value,
        }));
      }
    } catch (error) {
      console.error("Error updating notification settings", error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAvatarInputChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];

    if (file) {
      setSelectedAvatarFile(file);

      const blobUrl = URL.createObjectURL(file);
      setAvatarPreview(blobUrl);

      setProfileData((prev) => ({
        ...prev,
        profilePicture: blobUrl,
      }));
    }

    e.target.value = "";
  };

  const toggleHobby = (interest: string) => {
    setUserHobbiesState((prev) => {
      if (prev.includes(interest)) {
        return prev.filter((i) => i !== interest);
      }
      return [...prev, interest];
    });
  };
  if (loading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 pb-20 lg:pb-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6 w-full justify-start overflow-x-auto">
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

        <TabsContent value="profile" className="space-y-6">
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
                    alt={profileData.name || "User Avatar"}
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
                    JPG, PNG or GIF. Max size 2MB.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                      className="rounded-l-none"
                      value={profileData.username}
                      onChange={(e) =>
                        setProfileData({
                          ...profileData,
                          username: e.target.value,
                        })
                      }
                    />
                  </div>
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
                  {profileData.bio.length}/160 characters
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

          <div className="flex justify-end gap-2">
            <Button variant="outline">Cancel</Button>
            <Button
              onClick={handleSaveProfile}
              disabled={actionLoading === "profile"}
            >
              {actionLoading === "profile" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </TabsContent>

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
                <Switch
                  checked={notificationSettings.pushNotifications}
                  onCheckedChange={(checked) =>
                    togglePushNotifications(checked)
                  }
                  disabled={actionLoading === "notifications"}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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
                <button className="flex flex-col items-center gap-2 rounded-lg border-2 border-foreground p-4">
                  <div className="h-12 w-12 rounded-full bg-background border border-border" />
                  <span className="text-sm font-medium">Light</span>
                </button>
                <button className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:border-foreground/50">
                  <div className="h-12 w-12 rounded-full bg-neutral-900" />
                  <span className="text-sm">Dark</span>
                </button>
                <button className="flex flex-col items-center gap-2 rounded-lg border border-border p-4 hover:border-foreground/50">
                  <div className="h-12 w-12 rounded-full bg-linear-to-br from-background to-neutral-900" />
                  <span className="text-sm">System</span>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>
                Irreversible actions for your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full sm:w-auto">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Account
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      Are you absolutely sure?
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      your account and remove your data from our servers.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        /* Handle account deletion */
                      }}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete Account
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
