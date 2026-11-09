'use client';

import { useEffect } from 'react';
import { useTransitStore } from '@/lib/store';
import { Bus, Search, Layers, MapPin } from 'lucide-react';
import { CityType } from '@/types/semarang';

const JAKARTA_CATEGORIES = [
  'Semua',
  'BRT',
  'Mikrotrans',
  'Angkutan Umum Integrasi',
  'Royaltrans',
  'Transjabodetabek',
  'Bus Wisata',
];

const SEMARANG_CATEGORIES = [
  'Semua',
  'Koridor Utama',
  'Feeder',
  'Bandara & Pelabuhan',
];

export default function Navbar() {
  const {
    activeCity,
    setActiveCity,
    activeCategory,
    setActiveCategory,
    activeSemarangCategory,
    setActiveSemarangCategory,
    searchQuery,
    setSearchQuery,
    semarangCorridors,
    semarangLiveBuses
  } = useTransitStore();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const cityParam = urlParams.get('city') as CityType | null;
      if (cityParam === 'semarang' || cityParam === 'jakarta') {
        setActiveCity(cityParam);
      }
    }
  }, [setActiveCity]);

  const handleCityChange = (city: CityType) => {
    setActiveCity(city);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('city', city);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const isJakarta = activeCity === 'jakarta';

  return (
    <header className="w-full bg-white border-b border-slate-200 text-slate-800 z-30 shrink-0 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm font-black transition-all ${
              isJakarta ? 'bg-red-600' : 'bg-blue-600'
            }`}
          >
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-slate-900">
                RuteTrans
              </h1>
              <span
                className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border transition-colors ${
                  isJakarta
                    ? 'bg-red-50 text-red-600 border-red-200'
                    : 'bg-blue-50 text-blue-600 border-blue-200'
                }`}
              >
                {isJakarta ? 'Transjakarta' : 'Trans Semarang'}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Integrasi Transjakarta & Trans Semarang
            </p>
          </div>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
          <button
            type="button"
            onClick={() => handleCityChange('jakarta')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              isJakarta
                ? 'bg-white text-red-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-red-500" />
            <span>DKI Jakarta</span>
          </button>
          <button
            type="button"
            onClick={() => handleCityChange('semarang')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              !isJakarta
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-500" />
            <span>Semarang</span>
          </button>
        </div>

        <div className="flex-1 max-w-md relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder={
              isJakarta
                ? 'Cari rute (contoh: 1, 6A, JAK.01) atau halte...'
                : 'Cari koridor (contoh: 1, 3A, F1A, Mangkang)...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 transition-all ${
              isJakarta
                ? 'focus:ring-red-500/20 focus:border-red-500'
                : 'focus:ring-blue-500/20 focus:border-blue-500'
            }`}
          />
        </div>

        <div className="hidden lg:flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
          {isJakarta
            ? '238 Rute Terhubung'
            : `${semarangCorridors.length || 19} Koridor • ${semarangLiveBuses.length || 240}+ Bus Live`}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 py-2.5 overflow-x-auto border-t border-slate-100 flex items-center gap-2 bg-slate-50/70 no-scrollbar">
        <div className="flex items-center gap-1.5 text-slate-400 text-xs font-semibold mr-1 shrink-0">
          <Layers className="w-3.5 h-3.5" />
          <span>Kategori:</span>
        </div>

        {isJakarta
          ? JAKARTA_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  {cat}
                </button>
              );
            })
          : SEMARANG_CATEGORIES.map((cat) => {
              const isActive = activeSemarangCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveSemarangCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300 hover:bg-slate-100/60'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
      </div>
    </header>
  );
}
