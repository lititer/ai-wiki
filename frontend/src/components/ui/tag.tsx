"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface TagProps {
  label: string;
  onRemove?: () => void;
  variant?: "default" | "primary" | "success" | "warning";
  size?: "sm" | "md";
  className?: string;
}

export function Tag({
  label,
  onRemove,
  variant = "default",
  size = "sm",
  className,
}: TagProps) {
  const variants = {
    default: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    primary: "bg-primary-100 text-primary-700 hover:bg-primary-200",
    success: "bg-success/10 text-success hover:bg-success/20",
    warning: "bg-warning/10 text-warning hover:bg-warning/20",
  };

  const sizes = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium transition-colors",
        variants[variant],
        sizes[size],
        className
      )}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:text-red-500 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

interface TagGroupProps {
  tags: string[];
  onRemove?: (index: number) => void;
  variant?: "default" | "primary" | "success" | "warning";
  size?: "sm" | "md";
  className?: string;
}

export function TagGroup({
  tags,
  onRemove,
  variant = "default",
  size = "sm",
  className,
}: TagGroupProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {tags.map((tag, index) => (
        <Tag
          key={index}
          label={tag}
          variant={variant}
          size={size}
          onRemove={onRemove ? () => onRemove(index) : undefined}
        />
      ))}
    </div>
  );
}
