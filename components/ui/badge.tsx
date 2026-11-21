import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const BADGE_PRESET_CLASSES = {
  magenta: "border-pink-200 bg-pink-50/[var(--badge-opacity,100%)] text-pink-700 dark:border-pink-800 dark:bg-pink-950/[var(--badge-opacity,100%)] dark:text-pink-300",
  red: "border-red-200 bg-red-50/[var(--badge-opacity,100%)] text-red-700 dark:border-red-800 dark:bg-red-950/[var(--badge-opacity,100%)] dark:text-red-300",
  volcano: "border-orange-200 bg-orange-50/[var(--badge-opacity,100%)] text-orange-800 dark:border-orange-800 dark:bg-orange-950/[var(--badge-opacity,100%)] dark:text-orange-300",
  orange: "border-orange-200 bg-orange-50/[var(--badge-opacity,100%)] text-orange-700 dark:border-(color:--color-badge-orange-surface) dark:bg-(--color-badge-orange-surface)/[var(--badge-opacity,100%)] dark:text-(color:--color-badge-orange-text)",
  gold: "border-amber-200 bg-amber-50/[var(--badge-opacity,100%)] text-amber-800 dark:border-amber-800 dark:bg-amber-950/[var(--badge-opacity,100%)] dark:text-amber-300",
  lime: "border-lime-200 bg-lime-50/[var(--badge-opacity,100%)] text-lime-800 dark:border-lime-800 dark:bg-lime-950/[var(--badge-opacity,100%)] dark:text-lime-300",
  green: "border-green-200 bg-green-50/[var(--badge-opacity,100%)] text-green-700 dark:border-green-800 dark:bg-green-950/[var(--badge-opacity,100%)] dark:text-green-300",
  cyan: "border-cyan-200 bg-cyan-50/[var(--badge-opacity,100%)] text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950/[var(--badge-opacity,100%)] dark:text-cyan-300",
  blue: "border-blue-200 bg-blue-50/[var(--badge-opacity,100%)] text-blue-700 dark:border-blue-800 dark:bg-blue-950/[var(--badge-opacity,100%)] dark:text-blue-300",
  geekblue: "border-indigo-200 bg-indigo-50/[var(--badge-opacity,100%)] text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/[var(--badge-opacity,100%)] dark:text-indigo-300",
  purple: "border-purple-200 bg-purple-50/[var(--badge-opacity,100%)] text-purple-700 dark:border-purple-800 dark:bg-purple-950/[var(--badge-opacity,100%)] dark:text-purple-300",
  default: "border-border bg-muted/[var(--badge-opacity,100%)] text-muted-foreground",
};

const BADGE_COLOR_CLASSES = {
  ...BADGE_PRESET_CLASSES,
  success: BADGE_PRESET_CLASSES.green,
  processing: BADGE_PRESET_CLASSES.blue,
  error: BADGE_PRESET_CLASSES.red,
  warning: BADGE_PRESET_CLASSES.gold,
};

export type BadgeColor = keyof typeof BADGE_COLOR_CLASSES | NonNullable<React.CSSProperties["color"]>;

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "bg-primary/[var(--badge-opacity,100%)] text-primary-foreground [a&]:hover:bg-primary/[calc(var(--badge-opacity,100%)*0.9)]",
        secondary: "bg-secondary/[var(--badge-opacity,100%)] text-secondary-foreground [a&]:hover:bg-secondary/[calc(var(--badge-opacity,100%)*0.9)]",
        destructive: "bg-destructive/[var(--badge-opacity,100%)] text-white focus-visible:ring-destructive/20 dark:bg-destructive/[calc(var(--badge-opacity,100%)*0.6)] dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/[calc(var(--badge-opacity,100%)*0.9)]",
        outline: "border-border text-foreground [a&]:hover:bg-accent/[var(--badge-opacity,100%)] [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent/[var(--badge-opacity,100%)] [a&]:hover:text-accent-foreground",
        link: "text-primary underline-offset-4 [a&]:hover:underline",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export type BadgeProps = Omit<React.ComponentProps<"span">, "color"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
    color?: BadgeColor;
    /** Dùng prop rút gọn cho nền 75%, hoặc truyền số từ 0 đến 1. Khi bỏ qua, nền là 100%. */
    opacity?: true | number;
  };

function isPresetColor(color: BadgeColor): color is keyof typeof BADGE_COLOR_CLASSES {
  return Object.hasOwn(BADGE_COLOR_CLASSES, color);
}

function Badge({ className, variant = "default", asChild = false, color, opacity = 1, style, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";
  const presetColor = color && isPresetColor(color) ? BADGE_COLOR_CLASSES[color] : undefined;
  const requestedOpacity = opacity === true ? 0.75 : opacity;
  const backgroundOpacity = Number.isFinite(requestedOpacity)
    ? Math.min(1, Math.max(0, requestedOpacity))
    : 1;
  const badgeStyle: React.CSSProperties & { "--badge-opacity": string } = {
    "--badge-opacity": `${backgroundOpacity * 100}%`,
    ...(color && !presetColor && {
      backgroundColor: `color-mix(in oklab, ${color} var(--badge-opacity), transparent)`,
      borderColor: "transparent",
      color: "#fff",
    }),
    ...style,
  };

  return (
    <Comp
      {...props}
      data-slot="badge"
      data-variant={variant}
      data-color={color}
      className={cn(badgeVariants({ variant: color ? "outline" : variant }), presetColor, className)}
      style={badgeStyle}
    />
  );
}

export { Badge, badgeVariants, BADGE_COLOR_CLASSES };
