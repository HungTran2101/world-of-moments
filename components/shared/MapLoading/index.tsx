import { cn } from "@/lib/utils";
import Image from "next/image";
import { CSSProperties } from "react";

const clouds = [
  {
    top: "8%",
    left: "14%",
    size: 0.8,
    depth: "far",
    duration: "7.6s",
    delay: "-6.2s",
    drift: "-4vw",
    opacity: 0.48,
  },
  {
    top: "16%",
    left: "72%",
    size: 0.95,
    depth: "mid",
    duration: "6.8s",
    delay: "-2.8s",
    drift: "3vw",
    opacity: 0.56,
  },
  {
    top: "24%",
    left: "38%",
    size: 1.1,
    depth: "far",
    duration: "8.2s",
    delay: "-7.6s",
    drift: "2vw",
    opacity: 0.44,
  },
  {
    top: "34%",
    left: "84%",
    size: 0.88,
    depth: "near",
    duration: "5.1s",
    delay: "-3.4s",
    drift: "-6vw",
    opacity: 0.62,
  },
  {
    top: "43%",
    left: "18%",
    size: 1.35,
    depth: "mid",
    duration: "6.2s",
    delay: "-5.1s",
    drift: "5vw",
    opacity: 0.52,
  },
  {
    top: "51%",
    left: "62%",
    size: 1.55,
    depth: "near",
    duration: "4.8s",
    delay: "-1.7s",
    drift: "-3vw",
    opacity: 0.68,
  },
  {
    top: "63%",
    left: "8%",
    size: 1.2,
    depth: "mid",
    duration: "5.9s",
    delay: "-4.6s",
    drift: "4vw",
    opacity: 0.5,
  },
  {
    top: "70%",
    left: "46%",
    size: 1.4,
    depth: "near",
    duration: "4.4s",
    delay: "-0.8s",
    drift: "1vw",
    opacity: 0.72,
  },
  {
    top: "78%",
    left: "88%",
    size: 1,
    depth: "far",
    duration: "7.9s",
    delay: "-6.9s",
    drift: "-2vw",
    opacity: 0.42,
  },
  {
    top: "84%",
    left: "28%",
    size: 1.18,
    depth: "mid",
    duration: "6.5s",
    delay: "-2.1s",
    drift: "6vw",
    opacity: 0.54,
  },
];

const cloudAssets = [
  "/assets/clouds/cloud_1.webp",
  "/assets/clouds/cloud_2.webp",
  "/assets/clouds/cloud_3.webp",
  "/assets/clouds/cloud_4.webp",
  "/assets/clouds/cloud_5.webp",
  "/assets/clouds/cloud_6.webp",
  "/assets/clouds/cloud_7.webp",
  "/assets/clouds/cloud_8.webp",
  "/assets/clouds/cloud_9.webp",
  "/assets/clouds/cloud_10.webp",
];

interface MapLoadingProps {
  children?: React.ReactNode;
  isExiting?: boolean;
}

const MapLoading = ({ children, isExiting = false }: MapLoadingProps) => {
  return (
    <div
      className={cn("mapLoading", isExiting && "is-exiting")}
      aria-hidden={isExiting}
    >
      {children ? <div className="mapLoading-content">{children}</div> : null}
      <div className="mapLoading-sky" />
      {clouds.map((cloud, index) => {
        const cloudStyle = {
          top: cloud.top,
          left: cloud.left,
          "--cloud-scale": cloud.size,
          "--cloud-duration": cloud.duration,
          "--cloud-delay": cloud.delay,
          "--cloud-drift": cloud.drift,
          "--cloud-opacity": cloud.opacity,
        } as CSSProperties;

        return (
          <Image
            key={index}
            // Thứ tự mây cố định để nền SSR và lần hydrate đầu tiên luôn khớp nhau.
            src={cloudAssets[index]}
            alt=""
            aria-hidden="true"
            width={500}
            height={500}
            className={`mapLoading-cloud mapLoading-cloud--${cloud.depth}`}
            style={cloudStyle}
            loading="eager"
          />
        );
      })}
    </div>
  );
};

export default MapLoading;
