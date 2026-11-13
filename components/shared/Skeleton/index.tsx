import { cn } from "@/lib/utils";

interface SkeletonProps {
  row?: number;
  className?: string;
}

export function Skeleton({ row = 3, className }: SkeletonProps) {
  return (
    <span className={cn("skeleton", className)} aria-hidden="true">
      {Array.from({ length: row }, (_, index) => (
        <span key={index} className="skeleton-row" />
      ))}
    </span>
  );
}
