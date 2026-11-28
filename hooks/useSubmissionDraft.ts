"use client";

import { useEffect, useRef, useState } from "react";
import { createStore } from "zustand/vanilla";
import { constants } from "@/app/api/constant";
import { useSubmissionMapStore } from "@/store/useSubmissionMapStore";

const DRAFT_DELAY_MS = 500;

interface SavedDraft {
  revision: string;
  text: string;
}

interface SubmissionDraft {
  key: string;
  text: string;
  revision: string | null;
  dirty: boolean;
  timer?: number;
}

interface DraftView {
  key?: string;
  text: string;
  storageUnavailable: boolean;
}

export type SubmissionDraftControls = ReturnType<typeof useSubmissionDraft>;

function readDraft(key: string): SavedDraft | null {
  const value = window.localStorage.getItem(key);
  if (!value) return null;
  let saved: unknown;
  try {
    saved = JSON.parse(value);
  } catch {
    return null;
  }
  return saved && typeof saved === "object" &&
    "revision" in saved && typeof saved.revision === "string" &&
    "text" in saved && typeof saved.text === "string" && saved.text.length <= constants.MAX_DESCRIPTION_LENGTH
    ? { revision: saved.revision, text: saved.text }
    : null;
}

function removeDraft(key: string, revision: string | null) {
  // Tab khác có thể đã ghi nội dung mới trong lúc yêu cầu gửi đang chạy.
  if (revision && readDraft(key)?.revision === revision) window.localStorage.removeItem(key);
}

function flushDraft(draft: SubmissionDraft) {
  window.clearTimeout(draft.timer);
  if (!draft.dirty) return;

  if (draft.text) {
    const revision = window.crypto.getRandomValues(new Uint32Array(4)).join("-");
    window.localStorage.setItem(draft.key, JSON.stringify({ revision, text: draft.text } satisfies SavedDraft));
    draft.revision = revision;
  } else {
    removeDraft(draft.key, draft.revision);
    draft.revision = null;
  }
  draft.dirty = false;
}

export function useSubmissionDraft(userId: string | undefined, formOpen: boolean) {
  const key = userId ? `wom:submission-draft:v1:${userId}` : undefined;
  const draftRef = useRef<SubmissionDraft | null>(null);
  // Giữ bản nháp theo vòng đời sidebar, chỉ cập nhật các phần UI đọc nội dung hoặc trạng thái lưu.
  const [view] = useState(() => createStore<DraftView>(() => ({ text: "", storageUnavailable: false })));

  useEffect(() => {
    if (!key) return;
    const draft: SubmissionDraft = { key, text: "", revision: null, dirty: false };
    draftRef.current = draft;
    return () => {
      draftRef.current = null;
      try {
        flushDraft(draft);
      } catch {
        // Phiên soạn đã đóng, không cập nhật giao diện của tài khoản tiếp theo.
      }
    };
  }, [key]);

  useEffect(() => {
    const current = draftRef.current;
    if (!formOpen || !current || current.key !== key) return;
    const draft = current;

    // Không đổi nội dung đang được gửi nếu sidebar vừa mở lại giữa yêu cầu.
    if (!useSubmissionMapStore.getState().isSubmitting) {
      try {
        // Ưu tiên nội dung chỉ còn trong tab nếu lần ghi trước bị trình duyệt từ chối.
        if (draft.dirty) flushDraft(draft);
        const saved = readDraft(key);
        draft.text = saved?.text ?? "";
        draft.revision = saved?.revision ?? null;
        view.setState({ key, text: draft.text, storageUnavailable: false });
      } catch {
        view.setState({ key, text: draft.text, storageUnavailable: true });
      }
    }

    function flushOnExit() {
      try {
        flushDraft(draft);
      } catch {
        if (draftRef.current === draft) {
          view.setState({ key: draft.key, text: draft.text, storageUnavailable: true });
        }
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") flushOnExit();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", flushOnExit);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", flushOnExit);
      flushOnExit();
    };
  }, [formOpen, key, view]);

  function save(draft: SubmissionDraft) {
    let storageUnavailable = false;
    try {
      flushDraft(draft);
    } catch {
      storageUnavailable = true;
    }
    if (draftRef.current === draft) {
      view.setState((previous) => previous.key === draft.key && previous.storageUnavailable === storageUnavailable
        ? previous
        : { key: draft.key, text: draft.text, storageUnavailable });
    }
  }

  function changeDescription(text: string) {
    const draft = draftRef.current;
    if (!draft || draft.key !== key) return;
    draft.text = text;
    draft.dirty = true;
    window.clearTimeout(draft.timer);
    draft.timer = window.setTimeout(() => save(draft), DRAFT_DELAY_MS);
    view.setState((previous) => ({ key, text, storageUnavailable: previous.key === key && previous.storageUnavailable }));
  }

  function prepareSubmission() {
    const draft = draftRef.current;
    if (!draft || draft.key !== key) return () => {};
    save(draft);
    const { revision, text } = draft;

    return () => {
      if (draft.revision === revision && draft.text === text) {
        window.clearTimeout(draft.timer);
        draft.dirty = false;
        draft.text = "";
        draft.revision = null;
        if (draftRef.current === draft) view.setState({ key: draft.key, text: "", storageUnavailable: false });
      }
      try {
        removeDraft(draft.key, revision);
      } catch {
        // Việc dọn bộ nhớ trình duyệt không thay đổi kết quả lưu trên server.
      }
    };
  }

  return {
    key,
    view,
    changeDescription,
    prepareSubmission,
  };
}
