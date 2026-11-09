import { create } from 'zustand';
import { RouteDetailData, StopItem, LiveBusItem } from '../types/transjakarta';
import { SemarangCorridor, SemarangLiveBus, CityType } from '../types/semarang';

interface TransitState {
  activeCity: CityType;
  setActiveCity: (city: CityType) => void;

  selectedRouteId: string | null;
  selectedDirection: 'outbound' | 'inbound';
  selectedStop: StopItem | null;
  activeCategory: string;
  searchQuery: string;
  isSidebarOpen: boolean;
  currentRouteDetail: RouteDetailData | null;
  isLoadingRoute: boolean;
  flyToCoord: [number, number] | null;
  liveBuses: LiveBusItem[];

  setSelectedRouteId: (id: string | null) => void;
  setSelectedDirection: (dir: 'outbound' | 'inbound') => void;
  setSelectedStop: (stop: StopItem | null) => void;
  setActiveCategory: (cat: string) => void;
  setSearchQuery: (query: string) => void;
  setIsSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCurrentRouteDetail: (detail: RouteDetailData | null) => void;
  setIsLoadingRoute: (loading: boolean) => void;
  setFlyToCoord: (coord: [number, number] | null) => void;
  setLiveBuses: (buses: LiveBusItem[]) => void;

  selectedSemarangCorridor: SemarangCorridor | null;
  selectedSemarangDirection: 'A' | 'B';
  semarangCorridors: SemarangCorridor[];
  semarangLiveBuses: SemarangLiveBus[];
  activeSemarangCategory: string;
  isLoadingSemarang: boolean;

  setSelectedSemarangCorridor: (c: SemarangCorridor | null) => void;
  setSelectedSemarangDirection: (dir: 'A' | 'B') => void;
  setSemarangCorridors: (list: SemarangCorridor[]) => void;
  setSemarangLiveBuses: (buses: SemarangLiveBus[]) => void;
  setActiveSemarangCategory: (cat: string) => void;
  setIsLoadingSemarang: (loading: boolean) => void;
}

export const useTransitStore = create<TransitState>((set) => ({
  activeCity: 'jakarta',
  setActiveCity: (city) =>
    set({
      activeCity: city,
      searchQuery: '',
      selectedRouteId: null,
      selectedStop: null,
      currentRouteDetail: null,
      selectedSemarangCorridor: null,
      liveBuses: [],
      semarangLiveBuses: []
    }),

  selectedRouteId: null,
  selectedDirection: 'outbound',
  selectedStop: null,
  activeCategory: 'Semua',
  searchQuery: '',
  isSidebarOpen: true,
  currentRouteDetail: null,
  isLoadingRoute: false,
  flyToCoord: null,
  liveBuses: [],

  setSelectedRouteId: (id) => set({ selectedRouteId: id, liveBuses: [] }),
  setSelectedDirection: (dir) => set({ selectedDirection: dir }),
  setSelectedStop: (stop) => set({ selectedStop: stop }),
  setActiveCategory: (cat) => set({ activeCategory: cat }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setCurrentRouteDetail: (detail) => set({ currentRouteDetail: detail }),
  setIsLoadingRoute: (loading) => set({ isLoadingRoute: loading }),
  setFlyToCoord: (coord) => set({ flyToCoord: coord }),
  setLiveBuses: (buses) => set({ liveBuses: buses }),

  selectedSemarangCorridor: null,
  selectedSemarangDirection: 'A',
  semarangCorridors: [],
  semarangLiveBuses: [],
  activeSemarangCategory: 'Semua',
  isLoadingSemarang: false,

  setSelectedSemarangCorridor: (c) => set({ selectedSemarangCorridor: c }),
  setSelectedSemarangDirection: (dir) => set({ selectedSemarangDirection: dir }),
  setSemarangCorridors: (list) => set({ semarangCorridors: list }),
  setSemarangLiveBuses: (buses) => set({ semarangLiveBuses: buses }),
  setActiveSemarangCategory: (cat) => set({ activeSemarangCategory: cat }),
  setIsLoadingSemarang: (loading) => set({ isLoadingSemarang: loading }),
}));
