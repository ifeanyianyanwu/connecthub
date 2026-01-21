"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useAuthStore } from "@/lib/store";
import { interestOptions } from "@/lib/mock-data";
import { ArrowLeft, ArrowRight, Camera, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  {
    id: "profile",
    title: "Your Profile",
    description: "Tell us about yourself",
  },
  {
    id: "interests",
    title: "Your Interests",
    description: "Select topics you are passionate about",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateUser } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || "",
    bio: user?.bio || "",
    location: user?.location || "",
    interests: user?.interests || [],
  });

  const progress = ((currentStep + 1) / steps.length) * 100;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    updateUser({
      username: formData.username,
      bio: formData.bio,
      location: formData.location,
      interests: formData.interests,
    });
    setIsLoading(false);
    router.push("/feed");
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0:
        return formData.username.length >= 3;
      case 1:
        return formData.interests.length >= 3;
      default:
        return false;
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-foreground">
              <span className="text-sm font-bold text-background">CH</span>
            </div>
            <span className="text-lg font-semibold">ConnectHub</span>
          </div>
          <span className="text-sm text-muted-foreground">
            Step {currentStep + 1} of {steps.length}
          </span>
        </div>
      </header>

      {/* Progress */}
      <div className="mx-auto w-full max-w-2xl px-4 pt-4">
        <Progress value={progress} className="h-1" />
      </div>

      {/* Content */}
      <main className="flex flex-1 items-center justify-center px-4 py-8">
        <Card className="w-full max-w-2xl border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {steps[currentStep].title}
            </CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {currentStep === 0 && (
              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage
                        src={user?.avatar || "/placeholder.svg"}
                        alt={user?.name}
                      />
                      <AvatarFallback className="text-2xl">
                        {user?.name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <Button
                      size="icon"
                      variant="outline"
                      className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-transparent"
                    >
                      <Camera className="h-4 w-4" />
                      <span className="sr-only">Change avatar</span>
                    </Button>
                  </div>
                </div>

                {/* Username */}
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="flex items-center">
                    <span className="flex h-10 items-center rounded-l-md border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                      @
                    </span>
                    <Input
                      id="username"
                      placeholder="johndoe"
                      className="rounded-l-none"
                      value={formData.username}
                      onChange={(e) =>
                        setFormData({ ...formData, username: e.target.value })
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is how others will find and mention you
                  </p>
                </div>

                {/* Bio */}
                <div className="space-y-2">
                  <Label htmlFor="bio">Bio</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell us a bit about yourself..."
                    rows={3}
                    value={formData.bio}
                    onChange={(e) =>
                      setFormData({ ...formData, bio: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.bio.length}/160 characters
                  </p>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="San Francisco, CA"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Select at least 3 interests to help us connect you with
                  like-minded people
                </p>
                <div className="flex flex-wrap gap-2">
                  {interestOptions.map((interest) => (
                    <button
                      key={interest}
                      onClick={() => toggleInterest(interest)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-sm transition-colors",
                        formData.interests.includes(interest)
                          ? "border-foreground bg-foreground text-background"
                          : "border-border bg-background text-foreground hover:bg-muted",
                      )}
                    >
                      {formData.interests.includes(interest) && (
                        <Check className="h-3 w-3" />
                      )}
                      {interest}
                    </button>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Selected: {formData.interests.length} / 3 minimum
                </p>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {currentStep < steps.length - 1 ? (
                <Button onClick={handleNext} disabled={!canProceed()}>
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleComplete}
                  disabled={!canProceed() || isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Completing...
                    </>
                  ) : (
                    <>
                      Complete Setup
                      <Check className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
