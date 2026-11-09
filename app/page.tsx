'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import Sidebar from '@/components/layout/Sidebar';
import StopPanel from '@/components/panels/StopPanel';
import { fetchAllRoutes } from '@/lib/api';
import { RouteSummary } from '@/types/transjakarta';
import { useTransitStore } from '@/lib/store';
import { Map as MapIcon, Layers, Bus } from 'lucide-react';

const MapCanvas = dynamic(() => import('@/components/map/MapCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 text-slate-500 text-sm font-medium gap-3">
      <div className="w-9 h-9 rounded-full border-3 border-indigo-600 border-t-transparent animate-spin" />
      <div className="flex items-center gap-2 font-bold text-slate-700">
        <Bus className="w-4 h-4 text-indigo-600" />
        <span>Menyiapkan RuteTrans Platform...</span>
      </div>
      <span className="text-xs text-slate-400">Platform Integrasi Transportasi Publik · Transjakarta & Trans Semarang</span>
    </div>
  ),
});

export default function Home() {
  const [routes, setRoutes] = useState<RouteSummary[]>([]);
  const [mobileTab, setMobileTab] = useState<'map' | 'list'>('map');

  const {
    activeCity,
    isSidebarOpen,
    selectedRouteId,
    selectedSemarangCorridor,
    semarangCorridors,
  } = useTransitStore();

  useEffect(() => {
    async function init() {
      try {
        const data = await fetchAllRoutes();
        setRoutes(data);
      } catch (err) {
        console.error('Failed to load routes:', err);
      }
    }
    init();
  }, []);

  const handleMobileSelectRoute = () => {
    if (window.innerWidth < 768) {
      setMobileTab('map');
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white font-sans text-neutral-900 select-none">
      <div
        className={`h-full z-30 transition-all duration-300 ease-in-out overflow-hidden shrink-0 ${
          isSidebarOpen ? 'md:w-[410px]' : 'md:w-0'
        } ${mobileTab === 'list' ? 'w-full block' : 'max-md:hidden'}`}
      >
        <div className="w-full md:w-[410px] h-full overflow-hidden">
          <Sidebar routes={routes} />
        </div>
      </div>

      <main
        className={`flex-1 relative h-full overflow-hidden ${
          mobileTab === 'map' ? 'block' : 'hidden'
        } md:block`}
      >
        <MapCanvas allRoutes={routes} />
        <StopPanel />
      </main>

      <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-neutral-900/90 backdrop-blur-md p-1 rounded-full flex items-center gap-1 shadow-2xl">
        <button
          onClick={() => setMobileTab('map')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            mobileTab === 'map'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <MapIcon className="w-3.5 h-3.5" />
          <span>Peta</span>
        </button>
        <button
          onClick={() => setMobileTab('list')}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
            mobileTab === 'list'
              ? 'bg-white text-neutral-900 shadow-sm'
              : 'text-neutral-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>
            {activeCity === 'semarang'
              ? selectedSemarangCorridor
                ? `Koridor ${selectedSemarangCorridor.kor}`
                : `Koridor (${semarangCorridors.length || 19})`
              : selectedRouteId
              ? `Detail (${selectedRouteId})`
              : `Trayek (${routes.length})`}
          </span>
        </button>
      </div>
    </div>
  );
}
