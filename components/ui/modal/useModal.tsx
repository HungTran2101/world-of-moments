"use client";

import { Button } from "@/components/ui/button";
import { CircleAlert, CircleCheck, CircleX, Info, TriangleAlert } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import { Modal, type ModalProps } from "./Modal";

export interface ModalConfig extends Omit<ModalProps, "open" | "children" | "onOk" | "onCancel"> {
  content?: ReactNode;
  icon?: ReactNode;
  onOk?: (close: () => void) => void | Promise<unknown>;
  onCancel?: (close: () => void) => void | Promise<unknown>;
  onError?: (error: unknown) => void;
}

export type ModalUpdate = Partial<ModalConfig> | ((config: ModalConfig) => Partial<ModalConfig>);

export interface ModalInstance extends PromiseLike<boolean> {
  update: (update: ModalUpdate) => void;
  destroy: () => void;
}

type ModalKind = "confirm" | "info" | "success" | "error" | "warning";

export type ModalApi = Record<ModalKind, (config: ModalConfig) => ModalInstance> & {
  destroyAll: () => void;
};

interface ModalEntry {
  id: number;
  kind: ModalKind;
  config: ModalConfig;
  open: boolean;
}

const MODAL_KINDS = {
  confirm: { title: "Confirm", Icon: CircleAlert },
  info: { title: "Information", Icon: Info },
  success: { title: "Success", Icon: CircleCheck },
  error: { title: "Error", Icon: CircleX },
  warning: { title: "Warning", Icon: TriangleAlert },
};

function HookModal({ entry, onClose, onRemove, isActive }: {
  entry: ModalEntry;
  onClose: (id: number, confirmed: boolean) => void;
  onRemove: (id: number) => void;
  isActive: (id: number) => boolean;
}) {
  const { id, kind, config, open } = entry;
  const { content, icon, onOk, onCancel, onError, ...props } = config;
  const [pending, setPending] = useState<"ok" | "cancel" | null>(null);
  const pendingRef = useRef(false);
  const didOpenRef = useRef(false);
  const { Icon, title } = MODAL_KINDS[kind];
  const busy = pending !== null || props.confirmLoading;
  const okText = props.okText ?? "OK";
  const cancelText = props.cancelText ?? "Cancel";

  useEffect(() => {
    // Lệnh destroy có thể đến trước lần mount đầu nên không có sự kiện đóng từ Radix.
    if (!open && !didOpenRef.current) onRemove(id);
  }, [id, onRemove, open]);

  const run = async (action: "ok" | "cancel") => {
    if (!isActive(id) || pendingRef.current || props.confirmLoading) return;
    pendingRef.current = true;
    setPending(action);
    const close = () => onClose(id, action === "ok");

    try {
      const callback = action === "ok" ? onOk : onCancel;
      const result = callback?.(close);
      if (result) {
        await result;
        close();
      } else if (!callback?.length) {
        close();
      }
    } catch (error) {
      // Promise bị từ chối giữ modal mở; bên gọi quyết định cách hiển thị lỗi.
      if (isActive(id)) onError?.(error);
    } finally {
      pendingRef.current = false;
      if (isActive(id)) setPending(null);
    }
  };

  return (
    <Modal
      {...props}
      open={open}
      title={(
        <span className="modal-hookTitle">
          {icon === undefined ? <Icon className={`modal-statusIcon modal-statusIcon--${kind}`} aria-hidden="true" /> : icon}
          <span>{props.title ?? title}</span>
        </span>
      )}
      closable={!busy && (props.closable ?? false)}
      maskClosable={!busy && (props.maskClosable ?? false)}
      keyboard={!busy && (props.keyboard ?? true)}
      onCancel={() => { void run("cancel"); }}
      contentProps={{
        ...props.contentProps,
        onOpenAutoFocus: (event) => {
          didOpenRef.current = true;
          props.contentProps?.onOpenAutoFocus?.(event);
          const okButton = event.target instanceof HTMLElement
            ? event.target.querySelector<HTMLButtonElement>("[data-modal-ok]")
            : null;
          if (!event.defaultPrevented && okButton && !okButton.disabled) {
            event.preventDefault();
            okButton.focus();
          }
        },
        onCloseAutoFocus: (event) => {
          // Giữ entry đến khi kết thúc hiệu ứng thoát và trả focus, không dùng timer trùng CSS.
          onRemove(id);
          props.contentProps?.onCloseAutoFocus?.(event);
        },
      }}
      footer={props.footer === undefined ? (
        <>
          {kind === "confirm" && (
            <Button
              type="button"
              variant="outline"
              aria-label={typeof cancelText === "string" ? cancelText : undefined}
              {...props.cancelButtonProps}
              disabled={busy || props.cancelButtonProps?.disabled}
              loading={pending === "cancel" || props.cancelButtonProps?.loading}
              onClick={() => { void run("cancel"); }}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="button"
            variant="primary"
            aria-label={typeof okText === "string" ? okText : undefined}
            {...props.okButtonProps}
            data-modal-ok=""
            disabled={busy || props.okButtonProps?.disabled}
            loading={pending === "ok" || props.confirmLoading || props.okButtonProps?.loading}
            onClick={() => { void run("ok"); }}
          >
            {okText}
          </Button>
        </>
      ) : props.footer}
    >
      {content}
    </Modal>
  );
}

export function useModal(): readonly [ModalApi, ReactElement] {
  const [entries, setEntries] = useState<ModalEntry[]>([]);
  const nextIdRef = useRef(0);
  const resolversRef = useRef(new Map<number, (confirmed: boolean) => void>());
  const disposedRef = useRef(false);

  const close = useCallback((id: number, confirmed: boolean) => {
    const resolve = resolversRef.current.get(id);
    if (!resolve) return;
    resolversRef.current.delete(id);
    resolve(confirmed);
    setEntries((current) => current.map((entry) => entry.id === id ? { ...entry, open: false } : entry));
  }, []);

  const remove = useCallback((id: number) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const isActive = useCallback((id: number) => resolversRef.current.has(id), []);

  useLayoutEffect(() => {
    // Khôi phục vòng đời trước passive effect của component con khi Strict Mode chạy lại setup.
    disposedRef.current = false;
    const resolvers = resolversRef.current;
    return () => {
      // Hủy các lời chờ khi trang sở hữu hook bị tháo; tác vụ bất đồng bộ cũ không mở lại modal.
      disposedRef.current = true;
      resolvers.forEach((resolve) => resolve(false));
      resolvers.clear();
      // Strict Mode chạy lại effect; xóa cả entry của lần setup cũ để không để lại modal mồ côi.
      setEntries([]);
    };
  }, []);

  const api = useMemo<ModalApi>(() => {
    const create = (kind: ModalKind, config: ModalConfig): ModalInstance => {
      const id = nextIdRef.current++;
      const result = new Promise<boolean>((resolve) => {
        if (disposedRef.current) resolve(false);
        else resolversRef.current.set(id, resolve);
      });
      if (!disposedRef.current) setEntries((current) => [...current, { id, kind, config, open: true }]);

      return {
        then: result.then.bind(result),
        destroy: () => close(id, false),
        update: (update) => {
          if (!resolversRef.current.has(id)) return;
          setEntries((current) => current.map((entry) => entry.id === id ? {
            ...entry,
            config: { ...entry.config, ...(typeof update === "function" ? update(entry.config) : update) },
          } : entry));
        },
      };
    };

    return {
      confirm: (config) => create("confirm", config),
      info: (config) => create("info", config),
      success: (config) => create("success", config),
      error: (config) => create("error", config),
      warning: (config) => create("warning", config),
      destroyAll: () => { Array.from(resolversRef.current.keys()).forEach((id) => close(id, false)); },
    };
  }, [close]);

  return [api, <>{entries.map((entry) => (
    <HookModal key={entry.id} entry={entry} onClose={close} onRemove={remove} isActive={isActive} />
  ))}</>];
}
