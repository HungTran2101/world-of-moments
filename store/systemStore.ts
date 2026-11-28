import { create } from 'zustand';
import type { MapTimeMode, MapTimeStage } from '@/components/MapView/timeStyle';

const MAP_TIME_MODE_KEY = 'pm_map_time_mode';

interface SystemState {
  mapReady: boolean;
  isSpaceView: boolean;
  mapTimeMode: MapTimeMode;
  mapTimeStage: MapTimeStage;
  feature: 'moment' | 'message'
  sidebarOpen: boolean;
  historyOpen: boolean;
  thoughtModalOpen: boolean;
  selectedThoughtId: string | null;
  publicPanelsNarrow: boolean;
  setSidebarOpen: (open: boolean) => void;
  setHistoryOpen: (open: boolean) => void;
  openThoughtModal: (id: string) => void;
  closeThoughtModal: () => void;
  setPublicPanelsNarrow: (narrow: boolean) => void;
  setMapReady: (ready: boolean) => void;
  setIsSpaceView: (isSpaceView: boolean) => void;
  setMapTimeMode: (mode: MapTimeMode) => void;
  setMapTimeStage: (stage: MapTimeStage) => void;
  restoreMapTimeMode: () => void;
  setFeature: (feature: 'moment' | 'message') => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  mapReady: false,
  isSpaceView: false,
  mapTimeMode: 'auto',
  mapTimeStage: 'daytime',
  feature: 'moment',
  sidebarOpen: false,
  historyOpen: false,
  thoughtModalOpen: false,
  selectedThoughtId: null,
  publicPanelsNarrow: false,
  // Chốt trạng thái các panel trong cùng một lần cập nhật để mọi cách mở dùng chung quy tắc.
  setSidebarOpen: (sidebarOpen) => set((state) => state.sidebarOpen === sidebarOpen ? state : {
    sidebarOpen,
    historyOpen: sidebarOpen && state.publicPanelsNarrow ? false : state.historyOpen,
    thoughtModalOpen: sidebarOpen && state.publicPanelsNarrow ? false : state.thoughtModalOpen,
  }),
  setHistoryOpen: (historyOpen) => set((state) => state.historyOpen === historyOpen ? state : {
    historyOpen,
    sidebarOpen: historyOpen && state.publicPanelsNarrow ? false : state.sidebarOpen,
    thoughtModalOpen: historyOpen && state.publicPanelsNarrow ? false : state.thoughtModalOpen,
  }),
  openThoughtModal: (selectedThoughtId) => set((state) => {
    if (state.thoughtModalOpen && state.selectedThoughtId === selectedThoughtId) return state;
    return {
      selectedThoughtId,
      thoughtModalOpen: true,
      sidebarOpen: state.publicPanelsNarrow ? false : state.sidebarOpen,
      historyOpen: state.publicPanelsNarrow ? false : state.historyOpen,
    };
  }),
  closeThoughtModal: () => set((state) => state.thoughtModalOpen ? { thoughtModalOpen: false } : state),
  setPublicPanelsNarrow: (publicPanelsNarrow) => set((state) => state.publicPanelsNarrow === publicPanelsNarrow ? state : {
    publicPanelsNarrow,
    sidebarOpen: publicPanelsNarrow && state.thoughtModalOpen ? false : state.sidebarOpen,
    historyOpen: publicPanelsNarrow && (state.sidebarOpen || state.thoughtModalOpen) ? false : state.historyOpen,
  }),
  setMapReady: (ready: boolean) => set({ mapReady: ready }),
  setIsSpaceView: (isSpaceView: boolean) => set((state) => state.isSpaceView === isSpaceView ? state : { isSpaceView }),
  setMapTimeStage: (mapTimeStage) => set({ mapTimeStage }),
  setMapTimeMode: (mapTimeMode) => {
    set({ mapTimeMode });
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(MAP_TIME_MODE_KEY, mapTimeMode);
    } catch {
      // Nếu trình duyệt chặn lưu trữ, vẫn giữ lựa chọn trong phiên hiện tại.
    }
  },
  restoreMapTimeMode: () => {
    if (typeof window === 'undefined') return;
    try {
      const savedMode = window.localStorage.getItem(MAP_TIME_MODE_KEY);
      if (savedMode === 'auto' || savedMode === 'daytime' || savedMode === 'evening' || savedMode === 'nighttime') {
        set({ mapTimeMode: savedMode });
      }
    } catch {
      // Không đọc được lựa chọn đã lưu thì giữ mặc định Auto khi mở trang.
    }
  },
  setFeature: (feature: 'moment' | 'message') => set({ feature })
}));
