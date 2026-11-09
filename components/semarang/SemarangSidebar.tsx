'use client';

import { useEffect } from 'react';
import { useTransitStore } from '@/lib/store';
import { SemarangCorridor, SemarangLiveBus } from '@/types/semarang';
import { fetchSemarangCorridors, fetchSemarangLiveBuses } from '@/lib/api';
import {
  Bus,
  ArrowLeft,
  ChevronRight,
  Radio,
  Clock,
  Navigation2,
  Search,
  X,
  PanelLeftClose
} from 'lucide-react';

const SEMARANG_CATEGORIES = [
  'Semua',
  'Koridor Utama',
  'Feeder',
  'Bandara & Pelabuhan'
];

export default function SemarangSidebar() {
  const {
    activeCity,
    setActiveCity,
    semarangCorridors,
    setSemarangCorridors,
    semarangLiveBuses,
    setSemarangLiveBuses,
    selectedSemarangCorridor,
    setSelectedSemarangCorridor,
    selectedSemarangDirection,
    setSelectedSemarangDirection,
    activeSemarangCategory,
    setActiveSemarangCategory,
    searchQuery,
    setSearchQuery,
    setFlyToCoord,
    isLoadingSemarang,
    setIsLoadingSemarang,
    toggleSidebar
  } = useTransitStore();

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      if (semarangCorridors.length === 0) {
        setIsLoadingSemarang(true);
        const list = await fetchSemarangCorridors(true);
        if (isMounted) {
          setSemarangCorridors(list);
          setIsLoadingSemarang(false);
        }
      }
    }
    loadData();
    return () => {
      isMounted = false;
    };
  }, [semarangCorridors.length, setSemarangCorridors, setIsLoadingSemarang]);

  useEffect(() => {
    let isMounted = true;
    async function pollBuses() {
      const buses = await fetchSemarangLiveBuses();
      if (isMounted) {
        setSemarangLiveBuses(buses);
      }
    }

    pollBuses();
    const interval = setInterval(pollBuses, 12000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [setSemarangLiveBuses]);

  const filteredCorridors = semarangCorridors.filter((c) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      const matchTrayek = c.trayek && c.trayek.toLowerCase().includes(q);
      const matchKor = c.kor && c.kor.toLowerCase().includes(q);
      const matchOrigin = c.origin && c.origin.toLowerCase().includes(q);
      const matchToward = c.toward && c.toward.toLowerCase().includes(q);
      if (!matchTrayek && !matchKor && !matchOrigin && !matchToward) return false;
    }

    if (activeSemarangCategory === 'Koridor Utama') {
      return /^[0-9]+[A-Za-z]?$/.test(c.kor) && !c.kor.startsWith('F');
    }
    if (activeSemarangCategory === 'Feeder') {
      return c.kor.startsWith('F');
    }
    if (activeSemarangCategory === 'Bandara & Pelabuhan') {
      return c.kor.includes('PC') || c.kor.includes('LM');
    }
    return true;
  });

  const getCorridorLiveBusCount = (kor: string) => {
    const cleanKor = kor.toLowerCase().trim();
    return semarangLiveBuses.filter(
      (b) => b.kor && b.kor.toLowerCase().trim() === cleanKor
    ).length;
  };

  if (selectedSemarangCorridor) {
    const c = selectedSemarangCorridor;
    const busesInCorridor = semarangLiveBuses.filter(
      (b) => b.kor && b.kor.toLowerCase().trim() === c.kor.toLowerCase().trim()
    );

    return (
      <div className="flex flex-col h-full overflow-hidden bg-white">
        <div className="px-5 pt-4 pb-3 border-b border-neutral-100 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setSelectedSemarangCorridor(null)}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition-colors py-1.5 -ml-1 pr-2 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-neutral-500 group-hover:text-neutral-900" />
              <span>Semua Koridor</span>
            </button>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>{busesInCorridor.length} bus aktif</span>
              </span>

              <button
                onClick={toggleSidebar}
                className="hidden md:flex p-1 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Tutup panel"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div
              className="px-2.5 py-1 rounded-lg text-sm font-black text-white shrink-0 tracking-tight shadow-sm min-w-[2.75rem] text-center"
              style={{ backgroundColor: c.color || '#005fa5' }}
            >
              {c.kor}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-extrabold text-sm text-neutral-900 leading-snug truncate">
                {c.origin} ⇄ {c.toward}
              </h2>
              <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3 text-neutral-400" />
                  {c.jam_operasional || '05:30 - 17:30'}
                </span>
                <span>•</span>
                <span>{c.jumlah_halte || '0'} Halte</span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 grid grid-cols-2 gap-1.5 p-1 bg-neutral-100/80 rounded-xl border border-neutral-200/50">
            <button
              type="button"
              onClick={() => setSelectedSemarangDirection('A')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold truncate transition-all ${
                selectedSemarangDirection === 'A'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Ke {c.toward}
            </button>
            <button
              type="button"
              onClick={() => setSelectedSemarangDirection('B')}
              className={`py-1.5 px-2 rounded-lg text-xs font-bold truncate transition-all ${
                selectedSemarangDirection === 'B'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-neutral-500 hover:text-neutral-900'
              }`}
            >
              Ke {c.origin}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider mb-1">
            <span className="flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-blue-500 animate-pulse" />
              Armada Bus Aktif ({busesInCorridor.length})
            </span>
            <span className="text-[10px] text-neutral-400 font-normal">Real-time GPS</span>
          </div>

          {busesInCorridor.length === 0 ? (
            <div className="text-center py-8 text-xs text-neutral-400 bg-neutral-50 rounded-xl border border-dashed border-neutral-200">
              Belum ada armada bus yang online di koridor ini saat ini.
            </div>
          ) : (
            busesInCorridor.map((b) => (
              <div
                key={b.id || b.imei}
                onClick={() => {
                  if (typeof b.lat === 'number' && typeof b.lng === 'number') {
                    setFlyToCoord([b.lng, b.lat]);
                  }
                }}
                className="p-3 bg-neutral-50 hover:bg-blue-50/60 border border-neutral-200/80 hover:border-blue-300 rounded-xl transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center font-bold text-xs">
                      <Bus className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-neutral-900 group-hover:text-blue-600">
                        {b.name || 'Bus'}
                      </span>
                      <span className="ml-2 text-[11px] font-semibold text-neutral-500">
                        {b.plate_number}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      b.speed > 0
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {b.speed > 0 ? `${Math.round(b.speed)} km/h` : 'Berhenti'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-neutral-500 mt-2 pt-2 border-t border-neutral-200/60">
                  <span className="flex items-center gap-1">
                    <Navigation2 className="w-3 h-3 text-neutral-400" />
                    Arah: <strong className="text-neutral-800">{b.toward || '-'}</strong>
                  </span>
                  <span>
                    Jarak Halte: {b.dist_shel ? `${(Number(b.dist_shel) * 1000).toFixed(0)}m` : '-'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-white">
      <div className="px-5 pt-4 pb-3 border-b border-neutral-100 shrink-0">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs shrink-0">
              <Bus className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-[14px] tracking-tight text-neutral-900 leading-none">
                  Transsemarang
                </h1>
                <span className="text-[9px] font-black tracking-tight px-1.5 py-0.5 rounded bg-neutral-900 text-white uppercase">
                  Beta
                </span>
              </div>
              <span className="text-[10px] text-neutral-400 font-semibold tracking-tight mt-0.5">
                Unofficial Web Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
              {semarangCorridors.length || 19} Koridor
            </span>
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
              title="Tutup panel"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex items-center bg-neutral-100 p-0.5 rounded-xl mb-3 border border-neutral-200/80">
          <button
            type="button"
            onClick={() => setActiveCity('jakarta')}
            className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-bold transition-all text-neutral-500 hover:text-neutral-800"
          >
            <span>Jakarta</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCity('semarang')}
            className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-bold transition-all bg-white text-blue-600 shadow-xs"
          >
            <span>Semarang</span>
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Cari rute, koridor, atau halte..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-medium bg-neutral-100/80 hover:bg-neutral-100 focus:bg-white border border-transparent focus:border-neutral-300 rounded-xl text-neutral-900 placeholder-neutral-400 focus:outline-none transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-600 rounded-full"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 mt-3 overflow-x-auto no-scrollbar pb-0.5">
          {SEMARANG_CATEGORIES.map((cat) => {
            const isActive = activeSemarangCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveSemarangCategory(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-neutral-900 text-white shadow-xs'
                    : 'bg-neutral-100/80 text-neutral-600 hover:bg-neutral-200/70 hover:text-neutral-900'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-2.5 bg-neutral-50/50 border-b border-neutral-100 flex items-center justify-between text-xs text-neutral-500 shrink-0">
        <span className="font-semibold text-neutral-700">Daftar Trayek Koridor</span>
        <span>{filteredCorridors.length} ditemukan</span>
      </div>

      <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
        {isLoadingSemarang && semarangCorridors.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-neutral-400">
            <div className="w-6 h-6 rounded-full border-2 border-neutral-300 border-t-neutral-800 animate-spin mb-2" />
            <span>Memuat koridor Transsemarang...</span>
          </div>
        ) : filteredCorridors.length === 0 ? (
          <div className="p-8 text-center text-xs text-neutral-400">
            Tidak ada koridor yang cocok dengan filter pencarian.
          </div>
        ) : (
          filteredCorridors.map((c) => {
            const activeBusCount = getCorridorLiveBusCount(c.kor);
            return (
              <button
                key={c.id || c.kor}
                onClick={() => setSelectedSemarangCorridor(c)}
                className="w-full px-5 py-3.5 flex items-center gap-3.5 text-left hover:bg-neutral-50/80 transition-colors group"
              >
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 shadow-xs text-white"
                  style={{ backgroundColor: c.color || '#005fa5' }}
                >
                  {c.kor}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-xs text-neutral-900 truncate leading-snug">
                    {c.origin} - {c.toward}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold border bg-blue-50 text-blue-700 border-blue-200">
                      {c.trayek}
                    </span>
                    <span className="text-[10px] font-semibold text-neutral-500">
                      {c.jam_operasional || '05:30 - 17:30'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                    {activeBusCount} bus
                  </span>
                  <ChevronRight className="w-4 h-4 text-neutral-300 group-hover:text-neutral-600 transition-colors" />
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="px-5 py-2.5 bg-neutral-50/80 border-t border-neutral-100 text-[10px] text-neutral-400 shrink-0">
        <span className="font-semibold text-neutral-600">RuteTrans Platform</span>
        <span> · Integrasi Transjakarta & Trans Semarang (Data Live Transit).</span>
      </div>
    </div>
  );
}
