"use client";

import { submissionHistoryKey } from "@/services/constant";
import { useClientSession } from "@/components/ClientSession";
import { useSystemStore } from "@/store/systemStore";
import { CLIENT_THOUGHT_EVENT } from "@/app/api/client/constant";
import { useError } from "@/components/shared/ErrorProvider";
import { deleteSubmission, getSubmissionHistory } from "@/services/submissions";
import type { SubmissionPin } from "@/services/submissions/types";
import { useSubmissionMapStore } from "@/store/useSubmissionMapStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, History, MapPin, Search, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LoadingDots } from "../shared/LoadingDots";
import { Dialog } from "../ui/dialog";
import { GlassButton } from "../ui/glass-button";
import { RefractiveGlass } from "../ui/refractive-glass";

interface HistoryPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReturnFocus: () => void;
}

function HistoryContents({
  open,
  onVisit,
  onLogin,
}: {
  open: boolean;
  onVisit: (submission: SubmissionPin) => void;
  onLogin: () => void;
}) {
  const t = useTranslations("history");
  const weather = useTranslations("weather");
  const locale = useLocale();
  const dateFormatter = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const { user, error: identityError, loading: identityLoading, refresh } = useClientSession();
  const identityKey = user?.id ?? null;
  const queryClient = useQueryClient();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deletion = useMutation({
    mutationFn: (id: string) => deleteSubmission(id),
    onSuccess: async () => {
      setConfirmDeleteId(null);
      window.dispatchEvent(new Event(CLIENT_THOUGHT_EVENT));
      await queryClient.invalidateQueries({ queryKey: submissionHistoryKey });
    },
    onError: () => void refresh(),
  });
  useEffect(() => {
    setConfirmDeleteId(null);
  }, [identityKey]);
  const map = useSubmissionMapStore((state) => state.map);
  const isSubmitting = useSubmissionMapStore((state) => state.isSubmitting);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pageSelection, setPageSelection] = useState({
    identityKey,
    search: "",
    page: 1,
  });
  // Từ khóa hoặc danh tính đổi thì dùng ngay trang 1, tránh gửi một request với số trang cũ.
  const page =
    pageSelection.identityKey === identityKey && pageSelection.search === debouncedSearch
      ? pageSelection.page
      : 1;
  const searching = search.trim() !== debouncedSearch;
  useEffect(() => {
    // Chỉ đổi khóa truy vấn khi người dùng ngừng gõ; bỏ timer của từ khóa cũ khi gõ tiếp.
    const timer = window.setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => window.clearTimeout(timer);
  }, [search]);
  const { data, isPending, isFetching, isPlaceholderData, isError, refetch } = useQuery({
    queryKey: [...submissionHistoryKey, identityKey, debouncedSearch, page],
    queryFn: ({ signal }) => {
      if (!identityKey) throw new Error("Client session is not available");
      return getSubmissionHistory(debouncedSearch, page, {
        signal,
      });
    },
    placeholderData: (previousData, previousQuery) => {
      // Chỉ giữ metadata giữa các trang cùng danh tính/từ khóa; danh sách vẫn hiện trạng thái tải.
      if (
        !previousData ||
        previousQuery?.queryKey[submissionHistoryKey.length] !== identityKey ||
        previousQuery?.queryKey[submissionHistoryKey.length + 1] !== debouncedSearch
      )
        return undefined;
      return {
        items: [],
        metadata: {
          ...previousData.metadata,
          page,
        },
      };
    },
    enabled: open && Boolean(identityKey) && !searching,
  });
  const items = data?.items ?? [];
  const loading = Boolean(identityKey) && (isPending || isPlaceholderData || searching);
  const currentPage = data?.metadata.page ?? page;
  const changePage = (nextPage: number) =>
    setPageSelection({
      identityKey,
      search: debouncedSearch,
      page: nextPage,
    });
  return (
    <>
      <header className="historyPanel-header">
        <div className="historyPanel-titleRow">
          <Dialog.Title className="historyPanel-heading">
            <History
              size={18}
              aria-hidden="true"
            />
            {t("title")}
          </Dialog.Title>
          <Dialog.Close asChild>
            <GlassButton
              size="icon-sm"
              primaryColor="darkBlue"
              aria-label={t("close")}
            >
              <X
                size={18}
                aria-hidden="true"
              />
            </GlassButton>
          </Dialog.Close>
        </div>
        <div className="historyPanel-search">
          <Search
            size={16}
            aria-hidden="true"
          />
          <label
            htmlFor="history-search"
            className="visually-hidden"
          >
            {t("search")}
          </label>
          <input
            id="history-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("search")}
            maxLength={600}
            disabled={!identityKey}
            autoComplete="off"
            aria-controls="history-list"
          />
        </div>
      </header>
      <div
        key={`${identityKey}:${debouncedSearch}:${page}`}
        className="historyPanel-scroll"
        role="region"
        aria-label={t("title")}
        aria-busy={loading || isFetching}
        tabIndex={0}
      >
        <div
          className="historyPanel-status"
          role="status"
        >
          {!identityKey ? (
            <div className="historyPanel-muted">
              {identityLoading ? (
                <LoadingDots />
              ) : (
                <>
                  <p className="mb-2 mt-0">{t(identityError ? "identityError" : "loginPrompt")}</p>
                  <GlassButton
                    onClick={() => {
                      if (identityError) void refresh();
                      else {
                        useSystemStore.getState().setSidebarOpen(true);
                        onLogin();
                      }
                    }}
                  >
                    {t(identityError ? "retry" : "login")}
                  </GlassButton>
                </>
              )}
            </div>
          ) : loading ? (
            <>
              <LoadingDots />
              <span className="visually-hidden">{t("loading")}</span>
            </>
          ) : !isError && items.length === 0 ? (
            <p className="historyPanel-muted">{t(debouncedSearch ? "noResults" : "sharePrompt")}</p>
          ) : null}
        </div>
        <ul
          id="history-list"
          className="historyPanel-list"
        >
          {identityKey &&
            !loading &&
            items.map((item) => {
              const code = item.weather_code == null ? "" : String(item.weather_code);
              const atmosphere = code && weather.has(code) ? weather(code) : item.weather_summary;
              const createdAt = item.created_at ? new Date(item.created_at) : null;
              return (
                <li
                  key={item.id}
                  className="historyPanel-item"
                >
                  <p className="historyPanel-itemThought">{item.description}</p>
                  {atmosphere && <p className="historyPanel-itemWeather">{atmosphere}</p>}
                  {createdAt && !Number.isNaN(createdAt.getTime()) && (
                    <time
                      className="historyPanel-itemDate"
                      dateTime={item.created_at}
                    >
                      {dateFormatter.format(createdAt)}
                    </time>
                  )}
                  <GlassButton
                    className="historyPanel-visit"
                    primaryColor="darkBlue"
                    disabled={!map || isSubmitting || item.status === "unpublished"}
                    onClick={() => onVisit(item)}
                  >
                    <MapPin
                      size={16}
                      aria-hidden="true"
                    />
                    {t("takeMeThere")}
                  </GlassButton>
                  <GlassButton
                    type="button"
                    primaryColor="darkBlue"
                    disabled={deletion.isPending || isSubmitting}
                    onClick={() => {
                      deletion.reset();
                      setConfirmDeleteId(item.id);
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                    {t("delete")}
                  </GlassButton>
                  {item.status === "unpublished" && (
                    <sub className="historyPanel-muted">{t("unpublished")}</sub>
                  )}
                </li>
              );
            })}
        </ul>
        {identityKey && !searching && isError && (
          <div
            className="historyPanel-feedback"
            role="alert"
          >
            <p>{t("loadError")}</p>
            <GlassButton onClick={() => void refetch()}>{t("retry")}</GlassButton>
          </div>
        )}
      </div>
      {identityKey && data && data.metadata.totalPages > 1 && (
        <nav
          className="historyPanel-pagination"
          aria-label={t("pagination")}
        >
          <GlassButton
            size="icon-sm"
            primaryColor="darkBlue"
            aria-label={t("previousPage")}
            aria-controls="history-list"
            disabled={currentPage <= 1 || isFetching || searching}
            onClick={() => changePage(currentPage - 1)}
          >
            <ChevronLeft
              size={18}
              aria-hidden="true"
            />
          </GlassButton>
          <span
            className="historyPanel-pageIndicator"
            role="status"
          >
            {data
              ? t("pageIndicator", {
                page: currentPage,
                totalPages: data.metadata.totalPages,
              })
              : t("pageNumber", {
                page: currentPage,
              })}
          </span>
          <GlassButton
            size="icon-sm"
            primaryColor="darkBlue"
            aria-label={t("nextPage")}
            aria-controls="history-list"
            disabled={
              !data || currentPage >= data.metadata.totalPages || isFetching || searching || isError
            }
            onClick={() => changePage(currentPage + 1)}
          >
            <ChevronRight
              size={18}
              aria-hidden="true"
            />
          </GlassButton>
        </nav>
      )}
      <Dialog.Root
        open={Boolean(confirmDeleteId)}
        onOpenChange={(value) => {
          if (!value && !deletion.isPending) setConfirmDeleteId(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay className="errorModal-overlay" />
          <RefractiveGlass>
            <Dialog.Content className="errorModal-content">
              <Dialog.Title>{t("deleteTitle")}</Dialog.Title>
              <Dialog.Description>{t("deleteConfirm")}</Dialog.Description>
              {deletion.isError && <p role="alert">{t("deleteError")}</p>}
              <div className="flex gap-3">
                <GlassButton
                  type="button"
                  disabled={deletion.isPending}
                  onClick={() => setConfirmDeleteId(null)}
                >
                  {t("cancel")}
                </GlassButton>
                <GlassButton
                  type="button"
                  disabled={deletion.isPending}
                  onClick={() => {
                    if (confirmDeleteId) deletion.mutate(confirmDeleteId);
                  }}
                >
                  {deletion.isPending ? <LoadingDots /> : t("delete")}
                </GlassButton>
              </div>
            </Dialog.Content>
          </RefractiveGlass>
        </Dialog.Portal>
      </Dialog.Root>
      <div className="historyPanel-attribution">
        <a
          href="https://open-meteo.com/"
          target="_blank"
          rel="noopener noreferrer"
        >
          {weather("attribution")}
        </a>
      </div>
    </>
  );
}

export default function HistoryPanel({ open, onOpenChange, onReturnFocus }: HistoryPanelProps) {
  const skipReturnFocusRef = useRef(false);
  const { showError } = useError();
  const visitThought = (submission: SubmissionPin) => {
    const { map, isSubmitting } = useSubmissionMapStore.getState();
    if (!map || isSubmitting) return;
    // Camera do MapView sở hữu nên vẫn chạy sau khi nội dung lịch sử đóng và được tháo.
    skipReturnFocusRef.current = true;
    onOpenChange(false);
    map.focus();
    void map.goToThought(submission).catch((error: unknown) => showError(error));
  };
  return (
    <Dialog.Root
      modal={false}
      open={open}
      onOpenChange={onOpenChange}
    >
      <Dialog.Portal>
        <RefractiveGlass
          blur={3}
          bezelWidth={24}
        >
          <Dialog.Content
            id="history-panel"
            className="historyPanel"
            aria-describedby={undefined}
            onInteractOutside={(event) => event.preventDefault()}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              // Không giành lại focus từ modal suy nghĩ khi camera đến nơi trước lúc panel đóng xong.
              if (!skipReturnFocusRef.current) onReturnFocus();
              skipReturnFocusRef.current = false;
            }}
          >
            <HistoryContents
              open={open}
              onVisit={visitThought}
              onLogin={() => onOpenChange(false)}
            />
          </Dialog.Content>
        </RefractiveGlass>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
