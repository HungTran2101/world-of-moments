import Image from "next/image";
import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_BRAND_IMAGE_SIZE_PX = 34;

interface BrandProps {
  className?: string;
  style?: CSSProperties;
  imageSize?: number;
}

export function Brand({
  className,
  style,
  imageSize = DEFAULT_BRAND_IMAGE_SIZE_PX,
}: BrandProps) {
  return (
    <div className={cn("cms-brand", className)} style={style}>
      <Image
        src="/favicon/android-chrome-192x192.png"
        width={imageSize}
        height={imageSize}
        alt=""
      />
      <span>
        World of Moments<small>CMS</small>
      </span>
    </div>
  );
}
