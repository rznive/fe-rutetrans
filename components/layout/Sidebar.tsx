'use client';

import { useEffect } from 'react';
import { useTransitStore } from '@/lib/store';
import SemarangSidebar from '@/components/semarang/SemarangSidebar';
import { RouteSummary, StopItem } from '@/types/transjakarta';
import { getBusesForStop, formatEta } from '@/lib/etaUtils';
import { getCategoryColor, getRouteServiceMeta } from '@/lib/mapUtils';
import { fetchRouteDetail, fetchRouteTracking } from '@/lib/api';
import {
  Search,
  Bus,
  ArrowLeft,
  Accessibility,
  ChevronRight,
  Radio,
  X,
  Navigation,
  PanelLeftClose,
} from 'lucide-react';

const CATEGORIES = [
  'Semua',
  'BRT',
  'Mikrotrans',
  'Angkutan Umum Integrasi',
  'Royaltrans',
  'Transjabodetabek',
  'Rusun',
  'Bus Wisata',
];

interface SidebarProps {
  routes: RouteSummary[];
}

export default function Sidebar({ routes }: SidebarProps) {
  const {
    activeCity,
    setActiveCity,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    selectedRouteId,
    setSelectedRouteId,
    currentRouteDetail,
    setCurrentRouteDetail,
    selectedDirection,
    setSelectedDirection,
    selectedStop,
    setSelectedStop,
    isLoadingRoute,
    setIsLoadingRoute,
    setFlyToCoord,
    liveBuses,
    setLiveBuses,
    toggleSidebar,
  } = useTransitStore();

  useEffect(() => {
    if (!selectedRouteId) return;

    let isSubscribed = true;

    async function updateTracking() {
      try {
        const tracking = await fetchRouteTracking(selectedRouteId!, selectedDirection);
        if (!isSubscribed) return;
        const validBuses = (tracking.active_buses || []).filter(
          (b) => typeof b.latitude === 'number' && typeof b.longitude === 'number'
        );
        setLiveBuses(validBuses);
      } catch (err) {
        console.warn('Failed to poll tracking:', err);
      }
    }

    updateTracking();
    const interval = setInterval(updateTracking, 12000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
    };
  }, [selectedRouteId, selectedDirection, setLiveBuses]);

  const filteredRoutes = routes.filter((r) => {
    const matchesCategory =
      activeCategory === 'Semua' ||
      (r.route_desc && r.route_desc.toLowerCase() === activeCategory.toLowerCase());

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (r.route_short_name && r.route_short_name.toLowerCase().includes(q)) ||
      (r.route_long_name && r.route_long_name.toLowerCase().includes(q)) ||
      (r.route_id && r.route_id.toLowerCase().includes(q));

    return matchesCategory && matchesSearch;
  });

  const handleSelectRoute = async (routeId: string) => {
    setSelectedRouteId(routeId);
    setIsLoadingRoute(true);
    try {
      const detail = await fetchRouteDetail(routeId);
      setCurrentRouteDetail(detail);
      setSelectedStop(null);
    } catch (err) {
      console.error('Failed to load route detail:', err);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  const handleBackToRoutes = () => {
    setSelectedRouteId(null);
    setCurrentRouteDetail(null);
    setSelectedStop(null);
  };

  const activeRoute = currentRouteDetail?.route;
  const activeDir =
    currentRouteDetail?.[selectedDirection] ||
    currentRouteDetail?.outbound ||
    currentRouteDetail?.inbound;
  const stops = activeDir?.stops || [];
  const activeMeta = getRouteServiceMeta(
    activeRoute?.route_short_name,
    activeRoute?.route_desc,
    activeRoute?.route_color,
    activeRoute?.price
  );
  const routeColor = activeMeta.color;

  const outboundHeadsign =
    currentRouteDetail?.outbound?.headsign ||
    (currentRouteDetail?.outbound?.stops?.length
      ? currentRouteDetail.outbound.stops[currentRouteDetail.outbound.stops.length - 1]?.stop_name
      : 'Ke Tujuan 1');

  const inboundHeadsign =
    currentRouteDetail?.inbound?.headsign ||
    (currentRouteDetail?.inbound?.stops?.length
      ? currentRouteDetail.inbound.stops[currentRouteDetail.inbound.stops.length - 1]?.stop_name
      : 'Ke Tujuan 2');

  const hasBothDirections =
    Boolean(currentRouteDetail?.outbound?.stops?.length) &&
    Boolean(currentRouteDetail?.inbound?.stops?.length);

  return (
    <aside className="w-full md:w-[410px] bg-white border-r border-neutral-200/90 flex flex-col h-full shrink-0 z-30 select-none">
      {activeCity === 'semarang' ? (
        <SemarangSidebar />
      ) : selectedRouteId && (currentRouteDetail || isLoadingRoute) ? (
        <div className="flex flex-col h-full overflow-hidden bg-white">
          <div className="h-13 px-4 border-b border-neutral-100 flex items-center justify-between shrink-0 bg-white">
            <button
              onClick={handleBackToRoutes}
              className="group inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-950 transition-colors py-1.5 -ml-1 pr-2 rounded-lg"
            >
              <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-neutral-500 group-hover:text-neutral-900" />
              <span>Semua Trayek</span>
            </button>

            <div className="flex items-center gap-2">
              {liveBuses.length > 0 ? (
                <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50/80 px-2.5 py-1 rounded-full border border-emerald-200/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{liveBuses.length} bus</span>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-400 font-medium">GPS Siap</span>
              )}

              <button
                onClick={toggleSidebar}
                className="hidden md:flex p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                title="Tutup panel"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoadingRoute ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="w-7 h-7 rounded-full border-2 border-neutral-300 border-t-neutral-900 animate-spin mb-3" />
              <p className="text-xs font-medium text-neutral-500">Memuat detail rute...</p>
            </div>
          ) : (
            <>
              <div className="px-5 pt-4 pb-3.5 bg-white shrink-0 border-b border-neutral-100">
                <div className="flex items-start gap-3">
                  <div
                    className="px-2.5 py-1 rounded-lg text-sm font-black text-white shrink-0 tracking-tight shadow-sm min-w-[2.75rem] text-center"
                    style={{ backgroundColor: routeColor }}
                  >
                    {activeRoute?.route_short_name}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-bold text-[15px] text-neutral-900 leading-snug tracking-tight">
                      {activeRoute?.route_long_name}
                    </h2>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5 text-xs">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${activeMeta.tagClass}`}>
                        {activeMeta.categoryLabel}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                          activeMeta.isFree
                            ? 'text-emerald-700 font-bold bg-emerald-50 border-emerald-200'
                            : 'text-neutral-600 bg-neutral-100 border-neutral-200'
                        }`}
                      >
                        {activeMeta.priceLabel}
                      </span>
                      {activeRoute?.start_time && (
                        <span className="text-[11px] text-neutral-400 font-medium">
                          {activeRoute.start_time.slice(0, 5)} - {activeRoute.end_time?.slice(0, 5)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {hasBothDirections && (
                  <div className="mt-3.5 p-1 bg-neutral-100/90 rounded-xl flex gap-1">
                    <button
                      onClick={() => setSelectedDirection('outbound')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium truncate text-center transition-all ${
                        selectedDirection === 'outbound'
                          ? 'bg-white text-neutral-900 font-semibold shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                      title={outboundHeadsign}
                    >
                      Ke {outboundHeadsign}
                    </button>
                    <button
                      onClick={() => setSelectedDirection('inbound')}
                      className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-medium truncate text-center transition-all ${
                        selectedDirection === 'inbound'
                          ? 'bg-white text-neutral-900 font-semibold shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-800'
                      }`}
                      title={inboundHeadsign}
                    >
                      Ke {inboundHeadsign}
                    </button>
                  </div>
                )}
              </div>

              <div className="px-5 py-2 bg-neutral-50/70 border-b border-neutral-100 flex items-center justify-between text-xs text-neutral-500 font-medium shrink-0">
                <span>{stops.length} perhentian</span>
                <span className="text-[11px] text-neutral-400">Pilih halte untuk inspeksi</span>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-3">
                {stops.length === 0 ? (
                  <div className="py-12 text-center text-xs text-neutral-400">
                    Tidak ada jadwal halte pada arah lintasan ini.
                  </div>
                ) : (
                  <div className="relative">
                    <div
                      className="absolute left-[11px] top-3 bottom-5 w-[3px] rounded-full"
                      style={{ backgroundColor: routeColor }}
                    />

                    <div className="space-y-1.5">
                      {stops.map((stop: StopItem, idx: number) => {
                        const isFirst = idx === 0;
                        const isLast = idx === stops.length - 1;
                        const isSelected = selectedStop?.stop_id === stop.stop_id;
                        const stopBuses = getBusesForStop(stop, liveBuses);

                        return (
                          <div
                            key={`${stop.stop_id}-${idx}`}
                            onClick={() => {
                              setSelectedStop(stop);
                              setFlyToCoord([stop.stop_lon, stop.stop_lat]);
                            }}
                            className={`group relative flex items-start gap-3.5 py-2.5 px-2 rounded-xl transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-neutral-100 ring-1 ring-neutral-300/80 shadow-xs'
                                : isFirst
                                ? 'bg-emerald-50/40 hover:bg-emerald-50/70 border border-emerald-200/60'
                                : isLast
                                ? 'bg-rose-50/40 hover:bg-rose-50/70 border border-rose-200/60'
                                : 'hover:bg-neutral-50 border border-transparent'
                            }`}
                          >
                            <div className="relative z-10 flex items-center justify-center w-6 shrink-0 mt-0.5">
                              {isFirst ? (
                                <div
                                  className="w-4.5 h-4.5 rounded-full ring-3 ring-emerald-200 bg-emerald-600 flex items-center justify-center shadow-xs"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                </div>
                              ) : isLast ? (
                                <div
                                  className="w-4.5 h-4.5 rounded-full ring-3 ring-rose-200 bg-rose-600 flex items-center justify-center shadow-xs"
                                >
                                  <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                </div>
                              ) : (
                                <div
                                  className="w-3 h-3 rounded-full bg-white ring-2 ring-white border-[2.5px] transition-transform group-hover:scale-125"
                                  style={{ borderColor: routeColor }}
                                />
                              )}
                            </div>

                            <div className="flex-1 min-w-0 pr-1">
                              <div className="flex items-start justify-between gap-1.5">
                                <span
                                  className={`leading-tight truncate transition-colors ${
                                    isSelected
                                      ? 'text-[13px] font-bold text-neutral-950'
                                      : isFirst
                                      ? 'text-[13.5px] font-extrabold text-emerald-950'
                                      : isLast
                                      ? 'text-[13.5px] font-extrabold text-rose-950'
                                      : 'text-[13px] font-semibold text-neutral-800 group-hover:text-neutral-950'
                                  }`}
                                >
                                  {stop.stop_name}
                                </span>

                                {stop.platform_code && (
                                  <span className="text-[10px] font-mono font-medium text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded shrink-0">
                                    {stop.platform_code}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-400">
                                <span className="font-mono text-[10px]">{stop.stop_id}</span>
                                {stop.facilities && stop.facilities.length > 0 && (
                                  <span className="inline-flex items-center gap-0.5 text-neutral-400">
                                    <Accessibility className="w-2.5 h-2.5" />
                                  </span>
                                )}
                              </div>

                              {stopBuses.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  {stopBuses.map((bus) => {
                                    const eta = formatEta(bus, stop);

                                    return (
                                      <div
                                        key={`${bus.bus_body_no}-${stop.stop_id}`}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (
                                            typeof bus.longitude === 'number' &&
                                            typeof bus.latitude === 'number'
                                          ) {
                                            setFlyToCoord([bus.longitude, bus.latitude]);
                                          }
                                        }}
                                        className={`flex items-center justify-between text-xs py-1 px-2.5 rounded-lg border transition-all ${
                                          eta.isAtStop
                                            ? 'bg-emerald-50/90 text-emerald-950 border-emerald-200/80 shadow-xs'
                                            : 'bg-neutral-50 hover:bg-neutral-100/80 text-neutral-800 border-neutral-200/60'
                                        }`}
                                      >
                                        <div className="flex items-center gap-1.5 font-bold tracking-tight">
                                          <span
                                            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                              eta.isAtStop
                                                ? 'bg-emerald-500 animate-ping'
                                                : 'bg-amber-500'
                                            }`}
                                          />
                                          <Bus className="w-3 h-3 text-neutral-400" />
                                          <span>{bus.bus_body_no}</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 font-semibold tabular-nums">
                                          {eta.isAtStop ? (
                                            <span className="text-emerald-700 font-bold">
                                              Tiba sekarang
                                            </span>
                                          ) : (
                                            <>
                                              <span className="text-neutral-900 font-bold">
                                                {eta.minutes} min
                                              </span>
                                              <span className="text-neutral-400 font-normal text-[11px]">
                                                {eta.clockTime}
                                              </span>
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col h-full overflow-hidden bg-white">
          <div className="px-5 pt-4 pb-3 border-b border-neutral-100 shrink-0">
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-7 h-7 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-xs shrink-0"
                  style={{ backgroundColor: '#D62126' }}
                >
                  <Bus className="w-4 h-4 text-white" />
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5">
                    <h1 className="font-extrabold text-[14px] tracking-tight text-neutral-900 leading-none">
                      Transjakarta
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
                  {routes.length} Trayek
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
                className={`flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeCity === 'jakarta'
                    ? 'bg-white text-neutral-900 shadow-xs'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
              >
                <span>Jakarta</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveCity('semarang')}
                className="flex-1 flex items-center justify-center py-1.5 rounded-lg text-xs font-bold transition-all text-neutral-500 hover:text-neutral-800"
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
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-neutral-400 hover:text-neutral-700"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 -mb-1">
              {CATEGORIES.map((cat) => {
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-neutral-900 text-white font-semibold'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/70'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="px-5 py-2 bg-neutral-50/70 border-b border-neutral-100 text-xs text-neutral-400 font-medium flex items-center justify-between shrink-0">
            <span>Daftar Trayek</span>
            <span>{filteredRoutes.length} ditemukan</span>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-neutral-100">
            {filteredRoutes.length === 0 ? (
              <div className="py-16 text-center">
                <Search className="w-6 h-6 text-neutral-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-neutral-700">Rute tidak ditemukan</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Coba gunakan nomor atau nama rute lain</p>
              </div>
            ) : (
              filteredRoutes.map((route) => {
                const isSelected = selectedRouteId === route.route_id;
                const rMeta = getRouteServiceMeta(
                  route.route_short_name,
                  route.route_desc,
                  route.route_color,
                  route.price
                );

                return (
                  <button
                    key={route.route_id}
                    onClick={() => handleSelectRoute(route.route_id)}
                    className={`w-full text-left px-5 py-3 flex items-center gap-3.5 transition-colors ${
                      isSelected
                        ? 'bg-neutral-100/90'
                        : 'hover:bg-neutral-50'
                    }`}
                  >
                    <div
                      className="px-2.5 py-1 rounded-lg text-xs font-black text-white shrink-0 min-w-[3.25rem] text-center tracking-tight shadow-xs"
                      style={{
                        backgroundColor: rMeta.color,
                        color: route.route_text_color ? `#${route.route_text_color}` : '#FFFFFF',
                      }}
                    >
                      {route.route_short_name}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs text-neutral-900 truncate leading-snug">
                        {route.route_long_name}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${rMeta.tagClass}`}>
                          {rMeta.categoryLabel}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            rMeta.isFree ? 'text-emerald-700 font-bold' : 'text-neutral-500'
                          }`}
                        >
                          {rMeta.priceLabel}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-neutral-300 shrink-0" />
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
      )}
    </aside>
  );
}
