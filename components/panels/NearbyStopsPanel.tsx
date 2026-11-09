'use client';

import { useState, useCallback } from 'react';
import { X, Navigation, MapPin, Loader2, ChevronRight, Bus } from 'lucide-react';
import { fetchNearbyStops, NearbyStop } from '@/lib/api';
import { fetchRouteDetail } from '@/lib/api';
import { useTransitStore } from '@/lib/store';
import { getRouteServiceMeta } from '@/lib/mapUtils';

function formatDistance(meters: number): string {
  if (meters < 1000) return `${meters} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getWalkMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}

export default function NearbyStopsPanel() {
  const { setSelectedStop, setFlyToCoord, setSelectedRouteId, setCurrentRouteDetail, setIsLoadingRoute } =
    useTransitStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [nearbyStops, setNearbyStops] = useState<NearbyStop[]>([]);
  const [userCoord, setUserCoord] = useState<[number, number] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFindNearby = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Browser tidak mendukung GPS');
      setIsOpen(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsOpen(true);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setUserCoord([lng, lat]);

        try {
          const stops = await fetchNearbyStops(lat, lng, 1000);
          setNearbyStops(stops);
          if (stops.length === 0) {
            setError('Tidak ada halte dalam radius 1 km. Coba radius lebih jauh?');
          }
        } catch {
          setError('Gagal memuat halte terdekat. Periksa koneksi server.');
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setIsLoading(false);
        if (err.code === 1) {
          setError('Izin lokasi ditolak. Aktifkan GPS di browser.');
        } else {
          setError('Tidak dapat mendeteksi lokasi: ' + err.message);
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, []);

  const handleSelectStop = useCallback((stop: NearbyStop) => {
    setSelectedStop(stop);
    setFlyToCoord([stop.stop_lon, stop.stop_lat]);
  }, [setSelectedStop, setFlyToCoord]);

  const handleSelectRoute = useCallback(async (routeId: string) => {
    setSelectedRouteId(routeId);
    setIsLoadingRoute(true);
    setIsOpen(false);
    try {
      const detail = await fetchRouteDetail(routeId);
      setCurrentRouteDetail(detail);
    } catch {} finally {
      setIsLoadingRoute(false);
    }
  }, [setSelectedRouteId, setCurrentRouteDetail, setIsLoadingRoute]);

  return (
    <>
      <button
        onClick={handleFindNearby}
        className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-xl text-xs font-semibold text-neutral-800 shadow-sm hover:bg-white hover:text-neutral-950 transition-all active:scale-95"
        title="Temukan halte Transjakarta terdekat dari lokasi saya"
      >
        <Navigation className="w-4 h-4 text-neutral-500" />
        <span>Halte Terdekat</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed bottom-0 left-0 right-0 md:left-auto md:bottom-6 md:right-6 md:w-[420px] z-50 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-4 fade-in duration-200">
            <div className="bg-white/98 backdrop-blur-xl border border-neutral-200/90 rounded-t-2xl md:rounded-2xl shadow-2xl shadow-black/20 overflow-hidden flex flex-col max-h-[85vh]">
              <div className="px-5 pt-4 pb-3 border-b border-neutral-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-xs">
                    <Navigation className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-neutral-900 leading-none">Halte Terdekat</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">
                      {isLoading
                        ? 'Mencari halte terdekat...'
                        : nearbyStops.length > 0
                        ? `${nearbyStops.length} halte dalam radius 1 km`
                        : 'Radius 1 km dari posisi Anda'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="max-h-[60vh] md:max-h-[460px] overflow-y-auto">
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-3 text-neutral-400">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-500" />
                  <p className="text-xs font-medium">Mendeteksi lokasi & memuat halte...</p>
                </div>
              ) : error ? (
                <div className="py-12 px-6 text-center">
                  <MapPin className="w-7 h-7 text-neutral-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-neutral-700">{error}</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {nearbyStops.map((stop) => {
                    const walk = getWalkMinutes(stop.distance_meters);
                    return (
                      <div key={stop.stop_id} className="px-5 py-3.5">
                        <button
                          onClick={() => handleSelectStop(stop)}
                          className="w-full flex items-center gap-3 text-left group"
                        >
                          <div className="flex flex-col items-center gap-0.5 shrink-0 w-10">
                            <span className="text-[13px] font-black text-blue-600 tabular-nums leading-none">
                              {formatDistance(stop.distance_meters)}
                            </span>
                            <span className="text-[9px] font-semibold text-neutral-400 leading-none">
                              ~{walk} min jalan
                            </span>
                          </div>

                          <div className="w-px h-9 bg-neutral-200 shrink-0" />

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                              <span className="font-bold text-xs text-neutral-900 truncate group-hover:text-blue-700 transition-colors">
                                {stop.stop_name}
                              </span>
                              {stop.platform_code && (
                                <span className="text-[10px] font-mono font-medium text-neutral-500 bg-neutral-100 px-1 rounded shrink-0">
                                  {stop.platform_code}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-neutral-400 mt-0.5 font-medium ml-5">
                              {stop.stop_id} · {stop.bus_stop_type || 'Halte'}
                              {stop.facilities && stop.facilities.length > 0 && ' · ♿'}
                            </p>
                          </div>
                        </button>

                        {stop.routes && stop.routes.length > 0 && (
                          <div className="mt-2.5 ml-[52px] flex flex-wrap gap-1.5">
                            {stop.routes.slice(0, 10).map((rt) => {
                              const rMeta = getRouteServiceMeta(
                                rt.route_short_name,
                                rt.route_desc,
                                rt.route_color
                              );
                              return (
                                <button
                                  key={rt.route_id}
                                  onClick={() => handleSelectRoute(rt.route_id)}
                                  className="px-2 py-0.5 rounded text-[10px] font-black text-white shadow-xs transition-transform hover:scale-105 active:scale-95 flex items-center gap-0.5"
                                  style={{
                                    backgroundColor: rMeta.color,
                                    color: rt.route_text_color ? `#${rt.route_text_color}` : '#FFFFFF',
                                  }}
                                  title={`${rt.route_short_name} – ${rt.route_long_name || ''}`}
                                >
                                  <Bus className="w-2.5 h-2.5 opacity-80" />
                                  {rt.route_short_name}
                                </button>
                              );
                            })}
                            {stop.routes.length > 10 && (
                              <span className="text-[10px] text-neutral-400 font-medium self-center">
                                +{stop.routes.length - 10} lainnya
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {!isLoading && nearbyStops.length > 0 && (
              <div className="px-5 py-2.5 bg-neutral-50/80 border-t border-neutral-100 text-[11px] text-neutral-400 font-medium">
                Ketuk nama halte untuk lihat di peta · Ketuk nomor trayek untuk lihat rute
              </div>
            )}
          </div>
        </div>
        </>
      )}
    </>
  );
}

