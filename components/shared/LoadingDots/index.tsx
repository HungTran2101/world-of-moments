import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

interface LoadingDotsProps {
  color?: CSSProperties["color"];
  className?: string;
}

export function LoadingDots({ color, className }: LoadingDotsProps) {
  return (
    <span className={cn("loadingDots", className)} style={{ color }} aria-hidden="true">
      <span className="loadingDots-dot" />
      <span className="loadingDots-dot" />
      <span className="loadingDots-dot" />
    </span>
  );
}
