"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Plus, Link as LinkIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { api } from "@/lib/api-client";
import { useNavigate } from "@/stores/router";
import { useAuthStore } from "@/stores/auth-store";

export function AddCustomMovie() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [open, setOpen] = useState(false);
  
  const [title, setTitle] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [poster, setPoster] = useState("");
  const [description, setDescription] = useState("");

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post<{ id: string }>("/api/movies/custom", {
        title,
        videoUrl,
        poster: poster || undefined,
        description: description || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success("Movie added successfully");
      setOpen(false);
      setTitle("");
      setVideoUrl("");
      setPoster("");
      setDescription("");
      if (data?.id) {
        navigate(`/movie/${data.id}`);
      }
    },
    onError: (e: any) => {
      toast.error(e.error || "Failed to add movie");
    },
  });

  if (!user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoUrl.trim()) return;
    submitMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <LinkIcon className="size-4" />
          Add Custom Stream
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add Custom Stream</DialogTitle>
          <DialogDescription className="text-right mt-2 leading-relaxed" dir="rtl">
            لینک مستقیم فایل ویدیویی (mp4, m3u8) یا آدرس امبد (یوتیوب، ویمیو و...) را وارد کنید. مرورگرها از پخش فرمت MKV پشتیبانی نمی‌کنند.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input 
              id="title" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="Movie or Stream Title" 
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="videoUrl">Video or Embed URL *</Label>
            <Input 
              id="videoUrl" 
              type="url"
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)} 
              placeholder="https://example.com/video.mp4" 
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="poster">Poster URL (optional)</Label>
            <Input 
              id="poster" 
              type="url"
              value={poster} 
              onChange={(e) => setPoster(e.target.value)} 
              placeholder="https://example.com/poster.jpg" 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea 
              id="description" 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="What is this about?" 
              rows={3}
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full bg-red-600 hover:bg-red-700 mt-2"
            disabled={!title.trim() || !videoUrl.trim() || submitMutation.isPending}
          >
            {submitMutation.isPending && <Loader2 className="size-4 me-2 animate-spin" />}
            Add & Watch
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
