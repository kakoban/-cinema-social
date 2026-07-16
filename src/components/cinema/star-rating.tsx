"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  max?: number;
  size?: number;
  className?: string;
}

export function StarRating({ value, max = 10, size = 16, className }: StarRatingProps) {
  // Show 5 stars representing value/2 out of 10
  const stars = 5;
  const filled = (value / max) * stars;
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: stars }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, filled - i));
        return (
          <div key={i} className="relative" style={{ width: size, height: size }}>
            <Star
              size={size}
              className="absolute inset-0 text-muted-foreground/30"
            />
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${fill * 100}%` }}
            >
              <Star
                size={size}
                className="fill-yellow-400 text-yellow-400"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface RatingInputProps {
  value: number;
  onChange: (v: number) => void;
  max?: number;
  size?: number;
  className?: string;
}

export function RatingInput({ value, onChange, max = 10, size = 28, className }: RatingInputProps) {
  const stars = 5;
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: stars }).map((_, i) => {
        const starValue = ((i + 1) / stars) * max;
        const active = value >= starValue - max / (stars * 2);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(Math.round(starValue))}
            className="transition-transform hover:scale-110"
            aria-label={`Rate ${Math.round(starValue)} out of ${max}`}
          >
            <Star
              size={size}
              className={cn(
                active
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground/40"
              )}
            />
          </button>
        );
      })}
      <span className="ms-2 text-sm font-medium text-muted-foreground">
        {value ? value.toFixed(0) : "-"}
      </span>
    </div>
  );
}
