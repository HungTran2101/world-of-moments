"use client";

import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useRef, type ComponentProps, type CSSProperties, type ReactNode } from "react";

const DEFAULT_MODAL_WIDTH_PX = 520;

type ModalButtonProps = Omit<ComponentProps<typeof Button>, "asChild" | "children" | "onClick">;
type ModalContentProps = Omit<
  ComponentProps<typeof Dialog.Content>,
  "asChild" | "children" | "className" | "style" | "title" | "forceMount" | "aria-describedby"
>;

export interface ModalProps {
  open: boolean;
  title?: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  onOk?: ComponentProps<typeof Button>["onClick"];
  onCancel?: () => void;
  okText?: ReactNode;
  cancelText?: ReactNode;
  closeLabel?: string;
  confirmLoading?: boolean;
  closable?: boolean;
  maskClosable?: boolean;
  keyboard?: boolean;
  /** undefined: nút mặc định; null: ẩn footer; ReactNode: footer tùy chỉnh. */
  footer?: ReactNode;
  width?: CSSProperties["width"];
  className?: string;
  style?: CSSProperties;
  okButtonProps?: ModalButtonProps;
  cancelButtonProps?: ModalButtonProps;
  contentProps?: ModalContentProps;
}

export function Modal({
  open,
  title,
  description,
  children,
  onOk,
  onCancel,
  okText = "OK",
  cancelText = "Cancel",
  closeLabel = "Close",
  confirmLoading = false,
  closable = true,
  maskClosable = true,
  keyboard = true,
  footer,
  width = DEFAULT_MODAL_WIDTH_PX,
  className,
  style,
  okButtonProps,
  cancelButtonProps,
  contentProps,
}: ModalProps) {
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const hasDescription = description !== undefined && description !== null;

  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onCancel?.(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="modal-overlay" />
        <Dialog.Content
          {...contentProps}
          aria-modal="true"
          className={cn("cms-popup", "modal", className)}
          style={{ width, ...style }}
          {...(hasDescription ? {} : { "aria-describedby": undefined })}
          onOpenAutoFocus={(event) => {
            // Modal điều khiển bằng prop không có Trigger; ghi nhớ phần tử mở để trả focus.
            returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            contentProps?.onOpenAutoFocus?.(event);
          }}
          onCloseAutoFocus={(event) => {
            contentProps?.onCloseAutoFocus?.(event);
            if (!event.defaultPrevented && returnFocusRef.current?.isConnected) {
              event.preventDefault();
              returnFocusRef.current.focus();
            }
          }}
          onEscapeKeyDown={(event) => {
            contentProps?.onEscapeKeyDown?.(event);
            if (!keyboard) event.preventDefault();
          }}
          onPointerDownOutside={(event) => {
            contentProps?.onPointerDownOutside?.(event);
            if (!maskClosable) event.preventDefault();
          }}
        >
          <header className="modal-header">
            <Dialog.Title className="modal-title">{title}</Dialog.Title>
            {closable && (
              <Dialog.Close asChild>
                <Button type="button" variant="outline" size="icon" aria-label={closeLabel}>
                  <X aria-hidden="true" />
                </Button>
              </Dialog.Close>
            )}
          </header>
          <div className="modal-body">
            {hasDescription && (
              <Dialog.Description className="modal-description" asChild>
                <div>{description}</div>
              </Dialog.Description>
            )}
            {children}
          </div>
          {footer !== null && (
            <footer className="modal-footer">
              {footer === undefined ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    aria-label={typeof cancelText === "string" ? cancelText : undefined}
                    {...cancelButtonProps}
                    onClick={onCancel}
                  >
                    {cancelText}
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    aria-label={typeof okText === "string" ? okText : undefined}
                    {...okButtonProps}
                    loading={confirmLoading || okButtonProps?.loading}
                    onClick={onOk}
                  >
                    {okText}
                  </Button>
                </>
              ) : footer}
            </footer>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
