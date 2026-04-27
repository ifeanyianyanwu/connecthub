"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Users, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommunityRecommendation } from "@/hooks/use-community-recommendations";

interface Props {
  community: CommunityRecommendation;
  onJoin: (id: string, name: string) => void;
  isJoining?: boolean;
}

export function CommunityRecommendationCard({
  community,
  onJoin,
  isJoining,
}: Props) {
  const scorePercent = Math.round(community.total_score * 100);

  // Determine the primary reason for the recommendation
  const reason =
    community.shared_hobby_count > 0
      ? `Shares ${community.shared_hobby_count} of your interest${community.shared_hobby_count > 1 ? "s" : ""}`
      : community.ai_match_score > 0.4
        ? "AI found related interests"
        : community.category
          ? `Matches your ${community.category.toLowerCase()} interests`
          : "Recommended for you";

  const isAiOnly =
    community.shared_hobby_count === 0 && community.ai_match_score > 0;

  return (
    <Card className="overflow-hidden">
      {/* Cover */}
      <div className="relative h-20">
        <Image
          src={community.image_url || "/placeholder.svg"}
          alt={community.name}
          fill
          className="object-cover"
        />
        <div className="absolute inset-0 bg-linear-to-t from-background/70 to-transparent" />

        {/* Score badge */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                scorePercent >= 60
                  ? "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300"
                  : scorePercent >= 30
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {isAiOnly && <Sparkles className="h-3 w-3" />}
              {scorePercent}% match
            </div>
          </TooltipTrigger>
          <TooltipContent className="w-60 p-3">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Match Breakdown
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Shared interests (60 %)</span>
                <span className="font-mono">
                  {Math.round(community.exact_match_score * 100)} %
                </span>
              </div>
              <div className="flex justify-between">
                <span>AI semantic match (40 %)</span>
                <span className="font-mono">
                  {Math.round(community.ai_match_score * 100)} %
                </span>
              </div>
            </div>
            {isAiOnly && (
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                AI detected related interests even though the hobbies don&apos;t
                overlap exactly.
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </div>

      <CardHeader className="pb-1.5">
        <div className="flex items-start gap-2.5">
          <Avatar className="h-10 w-10 -mt-7 border-2 border-background shrink-0">
            <AvatarImage
              src={community.image_url || "/placeholder.svg"}
              alt={community.name}
            />
            <AvatarFallback>{community.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 pt-0.5">
            <Link href={`/communities/${community.id}`}>
              <CardTitle className="text-sm hover:underline line-clamp-1">
                {community.name}
              </CardTitle>
            </Link>
            {community.category && (
              <Badge variant="outline" className="mt-0.5 text-xs">
                {community.category}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Why it was recommended */}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          {isAiOnly ? (
            <Sparkles className="h-3 w-3 shrink-0 text-primary" />
          ) : (
            <Users className="h-3 w-3 shrink-0" />
          )}
          {reason}
        </p>

        {/* Shared hobby chips */}
        {community.shared_hobbies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {community.shared_hobbies.slice(0, 3).map((h) => (
              <Badge
                key={h}
                variant="secondary"
                className="text-xs border-primary/30 bg-primary/5 text-primary dark:bg-primary/10"
              >
                {h}
              </Badge>
            ))}
            {community.shared_hobbies.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{community.shared_hobbies.length - 3} more
              </Badge>
            )}
          </div>
        )}

        {/* Members */}
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Users className="h-3 w-3" />
          {community.member_count.toLocaleString()} member
          {community.member_count !== 1 ? "s" : ""}
        </p>

        <Button
          className="w-full"
          size="sm"
          onClick={() => onJoin(community.id, community.name)}
          disabled={isJoining}
        >
          Join Community
        </Button>
      </CardContent>
    </Card>
  );
}
