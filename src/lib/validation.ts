import { z } from "zod";

export const registerSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers and underscores"),
  email: z.string().email(),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const reviewSchema = z.object({
  content: z.string().min(1).max(5000),
  rating: z.number().min(1).max(10),
});

export const roomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  movieId: z.string().optional(),
  isPublic: z.boolean().optional().default(true),
  maxUsers: z.number().int().min(2).max(50).optional().default(50),
});

export const watchlistSchema = z.object({
  name: z.string().min(1).max(80),
  isPublic: z.boolean().optional().default(false),
});

export const profileSchema = z.object({
  avatar: z.string().url().optional().or(z.literal("")),
  bio: z.string().max(300).optional().or(z.literal("")),
  language: z.enum(["en", "fa"]).optional(),
  theme: z.enum(["dark", "light", "system"]).optional(),
  username: z.string().min(3).max(30).optional(),
});

export const userUrlAllowlist = [
  "youtube.com",
  "www.youtube.com",
  "youtu.be",
  "archive.org",
  "www.archive.org",
  "vimeo.com",
  "player.vimeo.com",
];

export function isAllowedVideoUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return userUrlAllowlist.includes(u.hostname);
  } catch {
    return false;
  }
}
