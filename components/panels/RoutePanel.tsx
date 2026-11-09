'use client';

import { useTransitStore } from '@/lib/store';
import { getCategoryColor } from '@/lib/mapUtils';
import { X, ArrowLeftRight, Accessibility, ChevronRight } from 'lucide-react';
import { StopItem } from '@/types/transjakarta';

export default function RoutePanel() {
  const {
    currentRouteDetail,
    selectedDirection,
    setSelectedDirection,
    setSelectedRouteId,
    setCurrentRouteDetail,
    setSelectedStop,
    isLoadingRoute,
  } = useTransitStore();

  if (!currentRouteDetail && !isLoadingRoute) return null;

  const handleClose = () => {
    setSelectedRouteId(null);
    setCurrentRouteDetail(null);
  };

  if (isLoadingRoute) {
    return (
      <div className="absolute right-0 top-0 bottom-0 w-full md:w-[420px] bg-white border-l border-slate-200 z-30 p-6 flex items-center justify-center text-slate-500 text-sm font-medium">
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="w-8 h-8 rounded-full border-2 border-red-600 border-t-transparent animate-spin" />
          <span>Memuat detail halte rute...</span>
        </div>
      </div>
    );
  }

  const route = currentRouteDetail?.route;
  const activeDir =
    currentRouteDetail?.[selectedDirection] ||
    currentRouteDetail?.outbound ||
    currentRouteDetail?.inbound;
  const stops = activeDir?.stops || [];
  const badgeColor = getCategoryColor(route?.route_desc || '', route?.route_color);

  return (
    <div className="absolute right-0 top-0 bottom-0 w-full md:w-[420px] bg-white border-l border-slate-200 z-30 flex flex-col shadow-2xl">
      <div className="p-4 border-b border-slate-200 flex items-start justify-between gap-3 bg-white">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="px-3 py-1.5 rounded-lg text-sm font-black text-white shadow-sm shrink-0"
            style={{ backgroundColor: badgeColor }}
          >
            {route?.route_short_name}
          </div>
          <div className="min-w-0">
            <h2 className="font-extrabold text-sm text-slate-900 leading-snug truncate">
              {route?.route_long_name}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">{route?.route_desc}</p>
          </div>
        </div>

        <button
          onClick={handleClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Tutup panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
        <div className="text-xs text-slate-600 truncate font-medium">
          Arah:{' '}
          <span className="font-bold text-slate-900">{activeDir?.headsign || 'Lintasan'}</span>
        </div>

        <button
          onClick={() =>
            setSelectedDirection(selectedDirection === 'outbound' ? 'inbound' : 'outbound')
          }
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 shrink-0 shadow-xs transition-all active:scale-95"
        >
          <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
          Tukar Arah
        </button>
      </div>

      <div className="px-4 py-2 bg-slate-100/60 border-b border-slate-200 text-xs font-semibold text-slate-600 flex items-center justify-between">
        <span>{stops.length} Halte Dilalui</span>
        {route?.price !== undefined && (
          <span className="text-slate-800">Tarif: Rp {route.price.toLocaleString('id-ID')}</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {stops.map((stop: StopItem, idx: number) => {
          const isFirst = idx === 0;
          const isLast = idx === stops.length - 1;

          return (
            <div
              key={`${stop.stop_id}-${idx}`}
              onClick={() => setSelectedStop(stop)}
              className="group p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer flex items-start gap-3 transition-all border border-transparent hover:border-slate-200"
            >
              <div className="flex flex-col items-center self-stretch shrink-0">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shadow-xs ${
                    isFirst || isLast
                      ? 'bg-red-600 text-white ring-2 ring-red-100'
                      : 'bg-white text-slate-700 border border-slate-300 group-hover:border-slate-400'
                  }`}
                >
                  {idx + 1}
                </div>
                {!isLast && (
                  <div className="w-0.5 flex-1 bg-slate-200 my-1 group-hover:bg-slate-300 transition-colors" />
                )}
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <div className="font-bold text-xs text-slate-800 group-hover:text-red-600 transition-colors flex items-center justify-between gap-2">
                  <span className="truncate">{stop.stop_name}</span>
                  {stop.platform_code && (
                    <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 shrink-0">
                      {stop.platform_code}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-400 font-mono">{stop.stop_id}</span>
                  {stop.bus_stop_type && (
                    <span className="text-[10px] font-medium text-slate-500 capitalize">
                      {stop.bus_stop_type}
                    </span>
                  )}
                  {stop.facilities && stop.facilities.length > 0 && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-emerald-600">
                      <Accessibility className="w-3 h-3" />
                      Aksesibel
                    </span>
                  )}
                </div>
              </div>

              <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 self-center" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
