'use client';

import { useTransitStore } from '@/lib/store';
import { X, MapPin, Accessibility, Bus, Navigation } from 'lucide-react';
import { getCategoryColor } from '@/lib/mapUtils';
import { fetchRouteDetail } from '@/lib/api';
import { getBusesForStop, formatEta } from '@/lib/etaUtils';

export default function StopPanel() {
  const {
    selectedStop,
    setSelectedStop,
    setSelectedRouteId,
    setCurrentRouteDetail,
    setIsLoadingRoute,
    liveBuses,
    setFlyToCoord,
  } = useTransitStore();

  if (!selectedStop) return null;

  const stopBuses = getBusesForStop(selectedStop, liveBuses);

  const handleSelectRouteFromStop = async (routeId: string) => {
    setSelectedRouteId(routeId);
    setIsLoadingRoute(true);
    try {
      const detail = await fetchRouteDetail(routeId);
      setCurrentRouteDetail(detail);
    } catch (err) {
      console.error('Failed to load route detail:', err);
    } finally {
      setIsLoadingRoute(false);
    }
  };

  return (
    <div className="absolute left-4 bottom-6 md:left-[430px] z-30 max-w-sm w-[calc(100%-2rem)] bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-2xl shadow-xl shadow-black/10 p-4 text-neutral-900 select-none animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-neutral-100">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
            <MapPin className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-neutral-900 leading-snug">
              {selectedStop.stop_name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-neutral-400 font-normal">
              <span className="font-mono text-[11px]">{selectedStop.stop_id}</span>
              {selectedStop.platform_code && (
                <>
                  <span>•</span>
                  <span className="font-mono text-[11px] font-medium text-neutral-600 bg-neutral-100 px-1 rounded">
                    Peron {selectedStop.platform_code}
                  </span>
                </>
              )}
              {selectedStop.facilities && selectedStop.facilities.length > 0 && (
                <>
                  <span>•</span>
                  <Accessibility className="w-3 h-3 text-neutral-400" />
                </>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setSelectedStop(null)}
          className="p-1 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
          title="Tutup"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {stopBuses.length > 0 && (
        <div className="py-3 border-b border-neutral-100">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-neutral-700 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Kedatangan Bus Real-Time
            </span>
            <span className="text-[10px] font-medium text-emerald-600">Live GPS</span>
          </div>

          <div className="space-y-1.5">
            {stopBuses.map((bus) => {
              const eta = formatEta(bus, selectedStop);

              return (
                <div
                  key={`${bus.bus_body_no}-${selectedStop.stop_id}`}
                  onClick={() => {
                    if (
                      typeof bus.longitude === 'number' &&
                      typeof bus.latitude === 'number'
                    ) {
                      setFlyToCoord([bus.longitude, bus.latitude]);
                    }
                  }}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border text-xs cursor-pointer transition-all ${
                    eta.isAtStop
                      ? 'bg-emerald-50/80 border-emerald-200/80 text-emerald-950 shadow-xs'
                      : 'bg-neutral-50/80 hover:bg-neutral-100/80 border-neutral-200/60 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        eta.isAtStop ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'
                      }`}
                    />
                    <div className="flex flex-col">
                      <div className="font-bold tracking-tight text-neutral-900 flex items-center gap-1">
                        <Bus className="w-3 h-3 text-neutral-400" />
                        <span>{bus.bus_body_no}</span>
                      </div>
                      {bus.trip_headsign && (
                        <span className="text-[10px] text-neutral-400">
                          Tujuan {bus.trip_headsign}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right tabular-nums">
                    {eta.isAtStop ? (
                      <span className="text-emerald-700 font-bold">Tiba sekarang</span>
                    ) : (
                      <>
                        <div className="font-bold text-neutral-900">{eta.minutes} min</div>
                        <div className="text-[10px] text-neutral-400 font-normal">
                          {eta.clockTime}
                          {eta.distanceMeters ? ` • ${eta.distanceMeters}m` : ''}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedStop.routes && selectedStop.routes.length > 0 && (
        <div className="pt-3">
          <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">
            Trayek yang melintas ({selectedStop.routes.length})
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto no-scrollbar">
            {selectedStop.routes.map((rt) => {
              const bg = getCategoryColor(rt.route_desc, rt.route_color);
              return (
                <button
                  key={rt.route_id}
                  onClick={() => handleSelectRouteFromStop(rt.route_id)}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs transition-transform hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: bg,
                    color: rt.route_text_color ? `#${rt.route_text_color}` : '#FFFFFF',
                  }}
                  title={`${rt.route_short_name} - ${rt.route_long_name} (${rt.route_desc})`}
                >
                  {rt.route_short_name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
