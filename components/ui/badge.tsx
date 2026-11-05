import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

const BADGE_PRESET_CLASSES = {
  magenta: "border-pink-200 bg-pink-50 text-pink-700 dark:border-pink-800 dark:bg-pink-950 dark:text-pink-300",
  red: "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300",
  volcano: "border-orange-200 bg-orange-50 text-orange-800 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  orange: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300",
  gold: "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  lime: "border-lime-200 bg-lime-50 text-lime-800 dark:border-lime-800 dark:bg-lime-950 dark:text-lime-300",
  green: "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-300",
  cyan: "border-cyan-200 bg-cyan-50 text-cyan-800 dark:border-cyan-800 dark:bg-cyan-950 dark:text-cyan-300",
  blue: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300",
  geekblue: "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-300",
  purple: "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-950 dark:text-purple-300",
  default: "border-border bg-muted text-muted-foreground",
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
        default: "bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        outline: "border-border text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        ghost: "[a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
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
  };

function isPresetColor(color: BadgeColor): color is keyof typeof BADGE_COLOR_CLASSES {
  return Object.hasOwn(BADGE_COLOR_CLASSES, color);
}

function Badge({ className, variant = "default", asChild = false, color, style, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";
  const presetColor = color && isPresetColor(color) ? BADGE_COLOR_CLASSES[color] : undefined;
  // Màu chỉ định ưu tiên hơn variant; màu CSS tùy chỉnh dùng nền đặc như Tag của Ant Design.
  const customStyle = color && !presetColor
    ? { backgroundColor: color, borderColor: "transparent", color: "#fff", ...style }
    : style;

  return (
    <Comp
      {...props}
      data-slot="badge"
      data-variant={variant}
      data-color={color}
      className={cn(badgeVariants({ variant: color ? "outline" : variant }), presetColor, className)}
      style={customStyle}
    />
  );
}

export { Badge, badgeVariants };
