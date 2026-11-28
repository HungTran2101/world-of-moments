"use client";

import { RUNTIME_ERROR_STATUS, submissionHistoryKey } from "@/services/constant";
import { useError } from "@/components/shared/ErrorProvider";
import { useClientSession } from "@/components/ClientSession";
import type { SubmissionDraftControls } from "@/hooks/useSubmissionDraft";
import thoughtBubbleImg from "@/public/assets/thought-note.webp";
import { ApiError, type ErrorMessageKey } from "@/services/shared/errors";
import { createSubmission, getSubmissionLimit } from "@/services/submissions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystemStore } from "@/store/systemStore";
import { usePinStore } from "@/store/usePinStore";
import {
  useSubmissionMapStore,
  type ScreenPoint,
  type SubmissionMap,
} from "@/store/useSubmissionMapStore";
import Image from "next/image";
import { useTranslations } from "next-intl";
import React, { useEffect, useImperativeHandle, useRef, useState } from "react";
import { useStore } from "zustand";
import { GlassButton } from "../ui/glass-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import SubmissionAnimation from "./SubmissionAnimation";
import { constants } from "@/app/api/constant";
import { CLIENT_SESSION_KEY } from "@/app/api/client/constant";
import type { ClientSessionResponse } from "@/services/client-auth/types";

interface SubmissionFormProps {
  onSuccess?: () => void;
  userId: string;
  draft: SubmissionDraftControls;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
}

type SubmissionStage = "map" | "create" | "refresh" | "complete";

interface SubmissionRun {
  controller: AbortController;
  map: SubmissionMap;
  finish: (saved: boolean) => void;
  saved: boolean;
  resolveAnimation: () => void;
  animationDone: Promise<void>;
  refreshReady: boolean;
  stage: SubmissionStage;
  userId: string;
  clearDraft: () => void;
  submissionId: string | null;
}

function submissionErrorKey(error: unknown, stage: SubmissionStage): ErrorMessageKey {
  if (stage === "map") return "mapUnavailable";
  if (stage === "refresh") return "refreshFailed";
  if (stage !== "create") return "unexpected";
  if (error instanceof ApiError) {
    if (error.status === 400 || error.status === 422) return "invalidSubmission";
    if (error.status === RUNTIME_ERROR_STATUS.NETWORK) return "network";
  }
  return "submissionFailed";
}

interface SubmissionDescriptionHandle {
  showRequiredError: () => void;
}

function SubmissionDescription({ draft, inputRef, readOnly, validationRef }: {
  draft: SubmissionDraftControls;
  inputRef?: SubmissionFormProps["inputRef"];
  readOnly: boolean;
  validationRef: React.Ref<SubmissionDescriptionHandle>;
}) {
  const t = useTranslations("submission");
  const description = useStore(draft.view, (view) => view.key === draft.key ? view.text : "");
  const [hasError, setHasError] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const localRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = inputRef ?? localRef;
  const flashFrame = useRef<number | null>(null);

  useImperativeHandle(validationRef, () => ({
    showRequiredError() {
      setHasError(true);
      setIsFlashing(false);
      descriptionRef.current?.focus();
      if (flashFrame.current !== null) window.cancelAnimationFrame(flashFrame.current);
      flashFrame.current = window.requestAnimationFrame(() => {
        flashFrame.current = null;
        setIsFlashing(true);
      });
    },
  }), [descriptionRef]);

  useEffect(() => () => {
    if (flashFrame.current !== null) window.cancelAnimationFrame(flashFrame.current);
  }, []);

  return (
    <label className="submissionForm-label">
      <span id="description-label">{t("descriptionLabel")}</span>
      <span
        className={`submissionForm-textarea-wrapper${isFlashing ? " submissionForm-textarea--flash-error" : ""}`}
        onAnimationEnd={() => setIsFlashing(false)}
      >
        <textarea
          ref={descriptionRef}
          className="submissionForm-textarea"
          value={description}
          onChange={(event) => {
            const text = event.target.value;
            draft.changeDescription(text);
            if (hasError && text.trim()) setHasError(false);
          }}
          placeholder={t("descriptionPlaceholder")}
          maxLength={constants.MAX_DESCRIPTION_LENGTH}
          rows={4}
          readOnly={readOnly}
          aria-labelledby="description-label"
          aria-invalid={hasError}
          aria-describedby={`description-count${hasError ? " description-error" : ""}`}
        />
        <span id="description-count" className="submissionForm-character-count">
          {description.length}
          {" / "}
          {constants.MAX_DESCRIPTION_LENGTH}
        </span>
      </span>
      {hasError && (
        <div id="description-error" className="submissionForm-validation-error" role="alert">
          {t("descriptionRequired")}
        </div>
      )}
    </label>
  );
}

export default function SubmissionForm({
  onSuccess,
  userId,
  inputRef,
  draft,
}: SubmissionFormProps) {
  const t = useTranslations("submission");
  const queryClient = useQueryClient();
  const { user, refresh: refreshSession } = useClientSession();
  const [flight, setFlight] = useState<{
    origin: ScreenPoint;
    getDestination: () => ScreenPoint;
    subscribeToResize: (listener: () => void) => () => void;
    onArrival: () => void;
  } | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const validationRef = useRef<SubmissionDescriptionHandle>(null);
  const suffixRef = useRef<HTMLSpanElement>(null);
  const activeRunRef = useRef<SubmissionRun | null>(null);
  const setSidebarOpen = useSystemStore((state) => state.setSidebarOpen);
  const { showError } = useError();
  const submissionMap = useSubmissionMapStore((state) => state.map);
  const isSubmitting = useSubmissionMapStore((state) => state.isSubmitting);
  const isPlaced = usePinStore((state) => state.isPlaced);
  const isSubmitDisabled = isSubmitting || !isPlaced || !submissionMap;
  const canShowLocationTooltip = useSystemStore((state) => state.sidebarOpen && !isSubmitting && !isPlaced);
  useEffect(() => {
    // Xóa yêu cầu mở cũ để tooltip không hiện lại khi gửi xong và ghim được bỏ đi.
    if (!canShowLocationTooltip) setIsTooltipOpen(false);
  }, [canShowLocationTooltip]);
  useEffect(
    () => () => {
      // Hủy request và mở lại bản đồ khi form bị tháo giữa lúc gửi.
      const run = activeRunRef.current;
      activeRunRef.current = null;
      if (!run) return;
      run.controller.abort();
      run.resolveAnimation();
      run.finish(run.saved);
      useSubmissionMapStore.getState().setIsSubmitting(false);
    },
    [],
  );
  function finishRun(run: SubmissionRun) {
    if (activeRunRef.current !== run) return;
    activeRunRef.current = null;
    run.resolveAnimation();
    run.finish(run.saved);
    useSubmissionMapStore.getState().setIsSubmitting(false);
    setFlight(null);
    setIsWaiting(false);
    // Chỉ trả focus sau khi bubble bay, marker tải xong, zoom kết thúc và bản đồ đã mở khóa.
    if (run.stage === "complete") {
      run.map.focus();
      if (run.submissionId) run.map.openThought(run.submissionId);
    }
  }
  const creation = useMutation({
    mutationFn: ({
      run,
      description,
      lat,
      lng,
    }: {
      run: SubmissionRun;
      description: string;
      lat: number;
      lng: number;
    }) => {
      run.controller.signal.throwIfAborted();
      run.stage = "create";
      return createSubmission(
        {
          description,
          lat,
          lng,
        },
        {
          reportGlobalError: false,
          signal: run.controller.signal,
        },
      );
    },
    onMutate: ({ run }) => {
      run.controller.signal.throwIfAborted();
      run.finish = run.map.beginSubmission();
      const rect = suffixRef.current?.getBoundingClientRect();
      if (!rect) throw new Error("Map is not ready");
      setIsWaiting(false);
      setFlight({
        origin: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        },
        getDestination: run.map.getPinPosition,
        subscribeToResize: run.map.subscribeToResize,
        onArrival: () => {
          setIsWaiting(!run.refreshReady);
          run.resolveAnimation();
        },
      });
    },
    onSuccess: async (submission, { run }) => {
      run.submissionId = submission.id;
      run.saved = true;
      // Xóa đúng bản đã lưu ngay cả khi bước tải lại marker bị hủy hoặc thất bại.
      run.clearDraft();
      // Làm mới lịch sử ngay khi đã lưu, kể cả khi refresh marker phía sau thất bại.
      void queryClient.invalidateQueries({
        queryKey: [...submissionHistoryKey, run.userId],
      });
      const signal = run.controller.signal;
      signal.throwIfAborted();
      setSidebarOpen(false);
      run.stage = "refresh";
      const revealMarkers = await run.map.prepareMarkerRefresh(signal);
      run.refreshReady = true;
      await run.animationDone;
      signal.throwIfAborted();
      await revealMarkers();
      setFlight(null);
      setIsWaiting(false);
      await run.map.zoomToPin(signal);
      await run.map.waitForMarkerAnimations(signal);
      run.stage = "complete";
      onSuccess?.();
    },
    onError: (error, { run }) => {
      const accountError = error instanceof ApiError && [401, 403, 429].includes(error.status);
      if (!run.controller.signal.aborted && !accountError) {
        showError(error, {
          messageKey: submissionErrorKey(error, run.stage),
        });
      }
    },
    onSettled: (_data, error, { run }) => {
      finishRun(run);
      if (run.controller.signal.aborted) return;
      const limit = getSubmissionLimit(error);
      if (limit && run.stage === "create") {
        // Đổi sidebar sau khi trả lại ghim và mở khóa bản đồ, rồi xác nhận lại phiên.
        queryClient.setQueryData<ClientSessionResponse>(CLIENT_SESSION_KEY, (session) =>
          session?.user?.id === run.userId && session.user.status === "verified"
            ? { user: { ...session.user, ...limit } }
            : session,
        );
      }
      void refreshSession();
    },
  });
  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    const pin = usePinStore.getState();
    const { map, isSubmitting, setIsSubmitting } = useSubmissionMapStore.getState();
    if (!pin.isPlaced || user?.id !== userId || user.status !== "verified" || user.availability !== "ready" ||
      isSubmitting) return;
    const view = draft.view.getState();
    const description = view.key === draft.key ? view.text.trim() : "";
    if (!description) {
      validationRef.current?.showRequiredError();
      return;
    }
    if (!map) {
      showError(new Error("Map is not ready"), {
        messageKey: "mapUnavailable",
      });
      return;
    }
    let resolveAnimation = () => {};
    const animationDone = new Promise<void>((resolve) => {
      resolveAnimation = resolve;
    });
    const run: SubmissionRun = {
      controller: new AbortController(),
      map,
      finish: () => {},
      saved: false,
      resolveAnimation,
      animationDone,
      refreshReady: false,
      stage: "map",
      userId,
      clearDraft: draft.prepareSubmission(),
      submissionId: null,
    };
    activeRunRef.current = run;
    // Khóa đồng bộ trước khi mutation chạy để chặn hai lần gửi trong cùng một nhịp render.
    setIsSubmitting(true);
    creation.mutate({
      run,
      description,
      lat: pin.lat,
      lng: pin.lng,
    });
  }
  return (
    <form
      className="submissionForm"
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
    >
      <SubmissionDescription draft={draft} inputRef={inputRef} readOnly={isSubmitting} validationRef={validationRef} />
      <Tooltip
        open={canShowLocationTooltip && isTooltipOpen}
        onOpenChange={(open) => setIsTooltipOpen(canShowLocationTooltip && open)}
      >
        <TooltipTrigger asChild>
          <div className="w-full">
            <GlassButton
              type="submit"
              disabled={isSubmitDisabled}
              primaryColor="purple"
              className="w-full"
              suffix={
                <span
                  ref={suffixRef}
                  className="submissionForm-suffix"
                  style={{
                    visibility: isSubmitting ? "hidden" : "visible",
                  }}
                >
                  <Image
                    src={thoughtBubbleImg}
                    alt=""
                    width={20}
                    height={20}
                  />
                </span>
              }
            >
              <div className="ml-2">{!isPlaced ? t("clickMapToSubmit") : t("submit")}</div>
            </GlassButton>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t("clickMapToSubmitTooltip")}</p>
        </TooltipContent>
      </Tooltip>

      {flight && (
        <SubmissionAnimation
          {...flight}
          waiting={isWaiting}
        />
      )}
    </form>
  );
}
