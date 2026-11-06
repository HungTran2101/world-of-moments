"use client";

import { cn } from "@/lib/utils";
import { Dialog as DialogPrimitive } from "radix-ui";
import {
  createContext,
  useContext,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react";

import { DialogOriginSnapshotContext, useDialogActivationOrigin, type DialogAnimationOrigin } from "./motion";

export { DialogMotionProvider } from "./motion";

const DialogOriginContext = createContext<DialogAnimationOrigin | null>(null);

function DialogRoot({ open, defaultOpen = false, onOpenChange, ...props }: ComponentProps<typeof DialogPrimitive.Root>) {
  const getClickOrigin = useDialogActivationOrigin();
  const originSnapshot = useContext(DialogOriginSnapshotContext);
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isOpen = open ?? uncontrolledOpen;
  const [motion, setMotion] = useState(() => ({
    open: isOpen,
    origin: isOpen ? (originSnapshot === undefined ? getClickOrigin() : originSnapshot) : null,
  }));

  if (motion.open !== isOpen) {
    // Chốt điểm mở trước khi render nội dung và giữ nguyên suốt lúc đóng,
    // tránh lấy nhầm vị trí nút đóng hoặc click khác trong modal.
    setMotion({
      open: isOpen,
      origin: isOpen ? (originSnapshot === undefined ? getClickOrigin() : originSnapshot) : motion.origin,
    });
  }

  return (
    <DialogOriginContext.Provider value={motion.origin}>
      <DialogPrimitive.Root
        {...props}
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (open === undefined) setUncontrolledOpen(nextOpen);
          onOpenChange?.(nextOpen);
        }}
      />
    </DialogOriginContext.Provider>
  );
}

function DialogContent({ className, style, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  const origin = useContext(DialogOriginContext);

  return (
    <DialogPrimitive.Content
      {...props}
      className={cn("dialog-content", className)}
      style={{
        ...style,
        "--dialog-origin-x": origin ? `${origin.x}px` : "50vw",
        "--dialog-origin-y": origin ? `${origin.y}px` : "50dvh",
      } as CSSProperties}
    />
  );
}

function DialogOverlay({ className, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return <DialogPrimitive.Overlay {...props} className={cn("dialog-overlay", className)} />;
}

// Mọi modal dùng chung cổng này để giữ chuyển động và hành vi Radix nhất quán.
export const Dialog = {
  Root: DialogRoot,
  Content: DialogContent,
  Overlay: DialogOverlay,
  Portal: DialogPrimitive.Portal,
  Trigger: DialogPrimitive.Trigger,
  Close: DialogPrimitive.Close,
  Title: DialogPrimitive.Title,
  Description: DialogPrimitive.Description,
};
