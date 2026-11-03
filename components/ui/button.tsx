import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"
import { LoadingDots } from "@/components/shared/LoadingDots"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg text-sm font-medium whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-70 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-background hover:bg-background/60",
        primary: "bg-primary text-primary-foreground hover:bg-primary/60",
        outline:
          "border-border border-1 bg-background hover:bg-background/60 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "border-border border-1 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
      cursor: {
        default: "cursor-pointer",
        disabled: "cursor-not-allowed",
        pointer: "cursor-pointer",
        'not-allowed': "cursor-not-allowed",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      cursor: "pointer",
    },
  }
)

function Button({
  className,
  variant = "outline",
  size = "default",
  asChild = false,
  loading = false,
  disabled,
  children,
  "aria-busy": ariaBusy,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    loading?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"
  let content = children

  if (loading) {
    const child = asChild && React.isValidElement<{ children?: React.ReactNode }>(children)
      ? children
      : null
    const loadingContent = (
      <>
        <span className="sr-only">{child ? child.props.children : children}</span>
        <LoadingDots color="currentColor" />
      </>
    )

    // Giữ phần tử gốc khi dùng asChild để Slot vẫn truyền props/ref vào liên kết.
    content = child ? React.cloneElement(child, undefined, loadingContent) : loadingContent
  }

  return (
    <Comp
      {...props}
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }), loading && "pointer-events-none")}
      disabled={disabled || loading}
      aria-busy={loading || ariaBusy}
      aria-disabled={loading && asChild ? true : props["aria-disabled"]}
      tabIndex={loading && asChild ? -1 : props.tabIndex}
    >
      {content}
    </Comp>
  )
}

export { Button, buttonVariants }
