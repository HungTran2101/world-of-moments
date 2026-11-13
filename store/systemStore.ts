import { create } from 'zustand';
import type { MapTimeMode, MapTimeStage } from '@/components/MapView/timeStyle';

const MAP_TIME_MODE_KEY = 'pm_map_time_mode';

interface SystemState {
  sidebarWidth: number;
  mapReady: boolean;
  isSpaceView: boolean;
  mapTimeMode: MapTimeMode;
  mapTimeStage: MapTimeStage;
  feature: 'moment' | 'message'
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  setMapReady: (ready: boolean) => void;
  setIsSpaceView: (isSpaceView: boolean) => void;
  setMapTimeMode: (mode: MapTimeMode) => void;
  setMapTimeStage: (stage: MapTimeStage) => void;
  restoreMapTimeMode: () => void;
  setFeature: (feature: 'moment' | 'message') => void;
}

export const useSystemStore = create<SystemState>((set) => ({
  sidebarWidth: 320,
  mapReady: false,
  isSpaceView: false,
  mapTimeMode: 'auto',
  mapTimeStage: 'daytime',
  feature: 'moment',
  sidebarOpen: false,
  setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
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
