"use client";

import { SUBMISSION_ERROR_CODES, RUNTIME_ERROR_STATUS, submissionHistoryKey } from "@/services/constant";
import { useError } from "@/components/shared/ErrorProvider";
import { getVisitorCacheKey } from "@/lib/visitorIdentity";
import thoughtBubbleImg from "@/public/assets/thought-note.webp";
import { ApiError, type ErrorMessageKey } from "@/services/shared/errors";
import { createSubmission } from "@/services/submissions";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSystemStore } from "@/store/systemStore";
import { usePinStore } from "@/store/usePinStore";
import { useSubmissionMapStore, type ScreenPoint, type SubmissionMap } from "@/store/useSubmissionMapStore";
import Image from "next/image";
import { useTranslations } from "next-intl";
import React, { useEffect, useRef, useState } from "react";
import { GlassButton } from "../ui/glass-button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import SubmissionAnimation from "./SubmissionAnimation";
import { constants } from "@/app/api/constant";

interface SubmissionFormProps {
  onSuccess?: () => void;
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
  identityKey: string;
  submissionId: string | null;
}

function submissionErrorKey(error: unknown, stage: SubmissionStage): ErrorMessageKey {
  if (stage === "map") return "mapUnavailable";
  if (stage === "refresh") return "refreshFailed";
  if (stage !== "create") return "unexpected";
  if (error instanceof ApiError) {
    if (error.status === 403 && typeof error.data === "object" && error.data !== null && "code" in error.data && error.data.code === SUBMISSION_ERROR_CODES.BROWSER_BLOCKED) return "browserBlocked";
    if (typeof error.data === "object" && error.data !== null && "code" in error.data) {
      if (error.data.code === SUBMISSION_ERROR_CODES.NETWORK_BANNED) return "networkBanned";
      if (error.data.code === SUBMISSION_ERROR_CODES.IDENTITY_REQUIRED) return "cookiesRequired";
    }
    if (error.status === 429) return "rateLimited";
    if (error.status === 400 || error.status === 422) return "invalidSubmission";
    if (error.status === RUNTIME_ERROR_STATUS.NETWORK) return "network";
  }
  return "submissionFailed";
}

export default function SubmissionForm({
  onSuccess,
  inputRef
}: SubmissionFormProps) {
  const t = useTranslations("submission");
  const queryClient = useQueryClient();
  const [description, setDescription] = useState("");
  const [hasDescriptionError, setHasDescriptionError] = useState(false);
  const [isDescriptionFlashing, setIsDescriptionFlashing] = useState(false);
  const [flight, setFlight] = useState<{
    origin: ScreenPoint;
    getDestination: () => ScreenPoint;
    subscribeToResize: (listener: () => void) => () => void;
    onArrival: () => void;
  } | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const localDescriptionRef = useRef<HTMLTextAreaElement>(null);
  const descriptionRef = inputRef ?? localDescriptionRef;
  const suffixRef = useRef<HTMLSpanElement>(null);
  const hasPlacedPinRef = useRef(false);
  const activeRunRef = useRef<SubmissionRun | null>(null);
  const setSidebarOpen = useSystemStore(state => state.setSidebarOpen);
  const sidebarOpen = useSystemStore(state => state.sidebarOpen);
  const {
    showError
  } = useError();
  const submissionMap = useSubmissionMapStore(state => state.map);
  const isSubmitting = useSubmissionMapStore(state => state.isSubmitting);
  const {
    lat,
    lng
  } = usePinStore();
  const isPlaced = usePinStore(state => state.isPlaced);
  const isSubmitDisabled = isSubmitting || !isPlaced || !submissionMap;
  const canShowLocationTooltip = sidebarOpen && !isSubmitting && !isPlaced;
  useEffect(() => {
    // Xóa yêu cầu mở cũ để tooltip không hiện lại khi gửi xong và ghim được bỏ đi.
    if (!canShowLocationTooltip) setIsTooltipOpen(false);
  }, [canShowLocationTooltip]);
  useEffect(() => usePinStore.subscribe(state => {
    if (!state.isPlaced || useSubmissionMapStore.getState().isSubmitting) return;
    const isFirstPlacement = !hasPlacedPinRef.current;
    hasPlacedPinRef.current = true;
    if (!useSystemStore.getState().sidebarOpen) {
      // Chỉ tự mở ở lần đặt ghim đầu tiên; những lần sau tôn trọng việc người dùng đóng panel.
      if (isFirstPlacement) setSidebarOpen(true);
      return;
    }

    // Focus ngay khi đặt hoặc di chuyển ghim, kể cả khi chọn lại cùng tọa độ.
    descriptionRef.current?.focus({
      preventScroll: true
    });
  }), [descriptionRef, setSidebarOpen]);
  useEffect(() => () => {
    // Hủy request và mở lại bản đồ khi form bị tháo giữa lúc gửi.
    const run = activeRunRef.current;
    activeRunRef.current = null;
    if (!run) return;
    run.controller.abort();
    run.resolveAnimation();
    run.finish(run.saved);
    useSubmissionMapStore.getState().setIsSubmitting(false);
  }, []);
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
      lng
    }: {
      run: SubmissionRun;
      description: string;
      lat: number;
      lng: number;
    }) => {
      run.controller.signal.throwIfAborted();
      run.stage = "create";
      return createSubmission({
        description,
        lat,
        lng
      }, {
        reportGlobalError: false,
        signal: run.controller.signal
      }).then(submission => {
        run.identityKey = getVisitorCacheKey() ?? "";
        return submission;
      });
    },
    onMutate: ({
      run
    }) => {
      run.controller.signal.throwIfAborted();
      run.finish = run.map.beginSubmission();
      const rect = suffixRef.current?.getBoundingClientRect();
      if (!rect) throw new Error("Map is not ready");
      setIsWaiting(false);
      setFlight({
        origin: {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        },
        getDestination: run.map.getPinPosition,
        subscribeToResize: run.map.subscribeToResize,
        onArrival: () => {
          setIsWaiting(!run.refreshReady);
          run.resolveAnimation();
        }
      });
    },
    onSuccess: async (submission, {
      run
    }) => {
      run.submissionId = submission.id;
      run.saved = true;
      // Làm mới lịch sử ngay khi đã lưu, kể cả khi refresh marker phía sau thất bại.
      void queryClient.invalidateQueries({
        queryKey: [...submissionHistoryKey, run.identityKey]
      });
      setSidebarOpen(false);
      const signal = run.controller.signal;
      signal.throwIfAborted();
      run.stage = "refresh";
      // Bài đã lưu thì xóa bản nháp để tránh gửi trùng nếu tải marker bị lỗi.
      setDescription("");
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
    onError: (error, {
      run
    }) => {
      if (!run.controller.signal.aborted) {
        showError(error, {
          messageKey: submissionErrorKey(error, run.stage)
        });
      }
    },
    onSettled: (_data, _error, {
      run
    }) => finishRun(run)
  });
  function handleSubmit(e: React.SubmitEvent) {
    e.preventDefault();
    if (!isPlaced || useSubmissionMapStore.getState().isSubmitting) return;
    if (!description.trim()) {
      setHasDescriptionError(true);
      setIsDescriptionFlashing(false);
      descriptionRef.current?.focus();
      window.requestAnimationFrame(() => setIsDescriptionFlashing(true));
      return;
    }
    if (!submissionMap) {
      showError(new Error("Map is not ready"), {
        messageKey: "mapUnavailable"
      });
      return;
    }
    let resolveAnimation = () => { };
    const animationDone = new Promise<void>(resolve => {
      resolveAnimation = resolve;
    });
    const run: SubmissionRun = {
      controller: new AbortController(),
      map: submissionMap,
      finish: () => { },
      saved: false,
      resolveAnimation,
      animationDone,
      refreshReady: false,
      stage: "map",
      identityKey: "",
      submissionId: null
    };
    activeRunRef.current = run;
    // Khóa đồng bộ trước khi mutation chạy để chặn hai lần gửi trong cùng một nhịp render.
    useSubmissionMapStore.getState().setIsSubmitting(true);
    creation.mutate({
      run,
      description: description.trim(),
      lat,
      lng
    });
  }
  return (
    <form
      className="submissionForm"
      onSubmit={handleSubmit}
      aria-busy={isSubmitting}
    >
      <label className="submissionForm-label">
        <span id="description-label">
          {t("descriptionLabel")}
        </span>
        <span
          className={`submissionForm-textarea-wrapper${isDescriptionFlashing ? " submissionForm-textarea--flash-error" : ""}`}
          onAnimationEnd={() => setIsDescriptionFlashing(false)}
        >
          <textarea
            ref={descriptionRef}
            className="submissionForm-textarea"
            value={description}
            onChange={e => {
              const nextDescription = e.target.value;
              setDescription(nextDescription);
              if (nextDescription.trim()) setHasDescriptionError(false);
            }}
            placeholder={t("descriptionPlaceholder")}
            maxLength={constants.MAX_DESCRIPTION_LENGTH}
            rows={4}
            readOnly={isSubmitting}
            aria-labelledby="description-label"
            aria-invalid={hasDescriptionError}
            aria-describedby={`description-count${hasDescriptionError ? " description-error" : ""}`}
          />
          <span
            id="description-count"
            className="submissionForm-character-count"
          >
            {description.length}
            {" / "}
            {constants.MAX_DESCRIPTION_LENGTH}
          </span>
        </span>
        {hasDescriptionError && (
          <div
            id="description-error"
            className="submissionForm-validation-error"
            role="alert"
          >
            {t("descriptionRequired")}
          </div>
        )}
      </label>
      <Tooltip
        open={canShowLocationTooltip && isTooltipOpen}
        onOpenChange={open => setIsTooltipOpen(canShowLocationTooltip && open)}
      >
        <TooltipTrigger asChild>
          <div className="w-full">
            <GlassButton
              type="submit"
              disabled={isSubmitDisabled}
              primaryColor="purple"
              className="w-full"
              suffix={(
                <span
                  ref={suffixRef}
                  className="submissionForm-suffix"
                  style={{
                    visibility: isSubmitting ? "hidden" : "visible"
                  }}
                >
                  <Image
                    src={thoughtBubbleImg}
                    alt=""
                    width={20}
                    height={20}
                  />
                </span>
              )}
            >
              <div className="ml-2">
                {!isPlaced ? t("clickMapToSubmit") : t("submit")}
              </div>
            </GlassButton>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {t("clickMapToSubmitTooltip")}
          </p>
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
