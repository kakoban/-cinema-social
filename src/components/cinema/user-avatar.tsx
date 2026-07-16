"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  username: string;
  avatar?: string | null;
  size?: number;
  className?: string;
}

export function UserAvatar({ username, avatar, size = 40, className }: UserAvatarProps) {
  const initial = username?.charAt(0)?.toUpperCase() || "?";
  if (avatar) {
    return (
      <Image
        src={avatar}
        alt={username}
        width={size}
        height={size}
        unoptimized
        className={cn("rounded-full object-cover bg-muted", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className={cn(
        "rounded-full bg-red-600 text-white flex items-center justify-center font-semibold shrink-0",
        className
      )}
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
