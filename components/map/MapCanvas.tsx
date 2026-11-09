'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Map as MapLibreMap,
  NavigationControl,
  GeolocateControl,
  LngLatBounds,
  GeoJSONSource,
  Marker,
  Popup,
  setWorkerUrl,
} from 'maplibre-gl';
import { useTransitStore } from '@/lib/store';
import { decodePolyline, getCategoryColor, getRouteServiceMeta } from '@/lib/mapUtils';
import { RouteSummary, StopItem } from '@/types/transjakarta';
import { fetchRouteTracking, fetchAllLiveBuses } from '@/lib/api';
import {
  PanelLeftClose,
  PanelLeftOpen,
  Compass,
} from 'lucide-react';
import NearbyStopsPanel from '@/components/panels/NearbyStopsPanel';

if (typeof window !== 'undefined') {
  setWorkerUrl('/maplibre-gl-worker.mjs');
}

interface MapCanvasProps {
  allRoutes: RouteSummary[];
}

export default function MapCanvas({ allRoutes }: MapCanvasProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const geolocateControlRef = useRef<GeolocateControl | null>(null);
  const routeBadgesRef = useRef<Marker[]>([]);
  const terminalMarkersRef = useRef<Marker[]>([]);
  const busPopupRef = useRef<Popup | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const busAnimationStateRef = useRef<
    Map<
      string,
      {
        startLng: number;
        startLat: number;
        targetLng: number;
        targetLat: number;
        props: any;
      }
    >
  >(new Map());
  const currentBusPositionsRef = useRef<Map<string, [number, number]>>(new Map());
  const activePopupBusKeyRef = useRef<string | null>(null);
  const citywideIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const citywideActiveRef = useRef<boolean>(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [liveBusCount, setLiveBusCount] = useState<number>(0);
  const [citywideCount, setCitywideCount] = useState<number>(0);

  const {
    activeCity,
    setActiveCity,
    selectedRouteId,
    selectedDirection,
    currentRouteDetail,
    setSelectedStop,
    flyToCoord,
    setFlyToCoord,
    isSidebarOpen,
    toggleSidebar,
    setLiveBuses,
    selectedSemarangCorridor,
    selectedSemarangDirection,
    semarangLiveBuses,
  } = useTransitStore();

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      const workerUrl = `${window.location.origin}/maplibre-gl-worker.mjs`;
      setWorkerUrl(workerUrl);
    } catch (e) {
      setWorkerUrl('/maplibre-gl-worker.mjs');
    }

    const map = new MapLibreMap({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/bright',
      center: [106.8272, -6.1754],
      zoom: 12,
      maxZoom: 18,
      minZoom: 9,
    });

    map.on('error', (e) => {
      console.warn('[MapLibre Event Error]:', e.error?.message || e);
    });

    map.addControl(
      new NavigationControl({ showCompass: true, visualizePitch: true }),
      'bottom-right'
    );

    const geolocate = new GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
    });
    geolocateControlRef.current = geolocate;
    map.addControl(geolocate, 'bottom-right');

    map.on('load', () => {
      mapRef.current = map;
      setMapLoaded(true);

      try {
        map.addSource('citywide-stops-network', {
          type: 'geojson',
          data: '/data/network_stops.geojson',
        });

        map.addLayer({
          id: 'citywide-stops-circle',
          type: 'circle',
          source: 'citywide-stops-network',
          minzoom: 10.5,
          layout: { visibility: 'none' },
          paint: {
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['zoom'],
              10.5,
              2.5,
              12.5,
              3.8,
              15,
              5.5,
            ],
            'circle-color': ['get', 'color'],
            'circle-stroke-width': 1.5,
            'circle-stroke-color': '#FFFFFF',
            'circle-opacity': 0.88,
          },
        });

        map.addLayer({
          id: 'citywide-stops-label',
          type: 'symbol',
          source: 'citywide-stops-network',
          minzoom: 14.5,
          layout: {
            visibility: 'none',
            'text-field': ['get', 'stop_name'],
            'text-size': 10,
            'text-offset': [0, 1.2],
            'text-anchor': 'top',
            'text-max-width': 8,
          },
          paint: {
            'text-color': '#475569',
            'text-halo-color': '#FFFFFF',
            'text-halo-width': 2,
          },
        });

        map.on('click', 'citywide-stops-circle', (e) => {
          if (!e.features || !e.features[0]) return;
          const p = e.features[0].properties;
          const geom = e.features[0].geometry as any;
          if (!p || !geom?.coordinates) return;

          setSelectedStop({
            stop_id: p.stop_id,
            stop_name: p.stop_name,
            platform_code: p.platform_code || '',
            stop_lat: geom.coordinates[1],
            stop_lon: geom.coordinates[0],
            bus_stop_type: p.bus_stop_type || 'halte',
            facilities: [],
          });
        });

        map.on('mouseenter', 'citywide-stops-circle', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        map.on('mouseleave', 'citywide-stops-circle', () => {
          map.getCanvas().style.cursor = '';
        });
      } catch (err) {
        console.warn('Citywide stops layer setup warning:', err);
      }

      map.on('click', (e) => {
        const queryLayers = ['active-route-stops-circle', 'citywide-stops-circle'].filter((id) =>
          map.getLayer(id)
        );
        const features = map.queryRenderedFeatures(e.point, {
          layers: queryLayers,
        });
        if (!features || features.length === 0) {
          setSelectedStop(null);
        }

        if (map.getLayer('active-route-buses-dot')) {
          const busFeatures = map.queryRenderedFeatures(e.point, {
            layers: ['active-route-buses-dot', 'active-route-buses-ring'],
          });
          if (!busFeatures || busFeatures.length === 0) {
            busPopupRef.current?.remove();
          }
        }
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (!currentRouteDetail) {
      terminalMarkersRef.current.forEach((m) => m.remove());
      terminalMarkersRef.current = [];
      routeBadgesRef.current.forEach((m) => m.remove());
      routeBadgesRef.current = [];
      busPopupRef.current?.remove();
      busPopupRef.current = null;
      return;
    }

    const activeDir =
      currentRouteDetail[selectedDirection] ||
      currentRouteDetail.outbound ||
      currentRouteDetail.inbound;
    if (!activeDir) return;

    const coords = decodePolyline(activeDir.polyline);
    const meta = getRouteServiceMeta(
      currentRouteDetail.route?.route_short_name,
      currentRouteDetail.route?.route_desc,
      currentRouteDetail.route?.route_color,
      currentRouteDetail.route?.price
    );
    const color = meta.color;
    const lineWidth = meta.lineWidth;

    const geojsonData: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            route_id: currentRouteDetail.route?.route_id,
            color,
          },
          geometry: {
            type: 'LineString',
            coordinates: coords,
          },
        },
      ],
    };

    if (map.getSource('active-route-line')) {
      (map.getSource('active-route-line') as GeoJSONSource).setData(geojsonData);
      map.setPaintProperty('active-route-line-layer', 'line-color', color);
      map.setPaintProperty('active-route-line-layer', 'line-width', lineWidth);
      map.setPaintProperty('active-route-line-casing', 'line-width', lineWidth + 3);
    } else {
      map.addSource('active-route-line', {
        type: 'geojson',
        data: geojsonData,
      });

      map.addLayer({
        id: 'active-route-line-casing',
        type: 'line',
        source: 'active-route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': lineWidth + 3,
          'line-opacity': 0.95,
        },
      });

      map.addLayer({
        id: 'active-route-line-layer',
        type: 'line',
        source: 'active-route-line',
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': color,
          'line-width': lineWidth,
          'line-opacity': 1,
        },
      });
    }

    const stopsList = activeDir.stops || [];
    const stopsGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: stopsList.map((stop: StopItem, idx: number) => ({
        type: 'Feature',
        properties: {
          stop_id: stop.stop_id,
          stop_name: stop.stop_name,
          platform_code: stop.platform_code || '',
          sequence: idx + 1,
          color,
          is_start: idx === 0,
          is_end: idx === stopsList.length - 1,
        },
        geometry: {
          type: 'Point',
          coordinates: [stop.stop_lon, stop.stop_lat],
        },
      })),
    };

    if (map.getSource('active-route-stops')) {
      (map.getSource('active-route-stops') as GeoJSONSource).setData(stopsGeoJSON);
      map.setPaintProperty('active-route-stops-circle', 'circle-stroke-color', color);
    } else {
      map.addSource('active-route-stops', {
        type: 'geojson',
        data: stopsGeoJSON,
      });

      map.addLayer({
        id: 'active-route-stops-circle',
        type: 'circle',
        source: 'active-route-stops',
        paint: {
          'circle-radius': [
            'case',
            ['boolean', ['get', 'is_start'], false],
            7.5,
            ['boolean', ['get', 'is_end'], false],
            7.5,
            5.5,
          ],
          'circle-color': [
            'case',
            ['boolean', ['get', 'is_start'], false],
            '#10B981',
            ['boolean', ['get', 'is_end'], false],
            '#EF4444',
            '#FFFFFF',
          ],
          'circle-stroke-width': 2.5,
          'circle-stroke-color': [
            'case',
            ['boolean', ['get', 'is_start'], false],
            '#FFFFFF',
            ['boolean', ['get', 'is_end'], false],
            '#FFFFFF',
            color,
          ],
        },
      });

      map.addLayer({
        id: 'active-route-stops-label',
        type: 'symbol',
        source: 'active-route-stops',
        minzoom: 12.5,
        layout: {
          'text-field': ['get', 'stop_name'],
          'text-size': 11,
          'text-offset': [0, 1.2],
          'text-anchor': 'top',
          'text-max-width': 9,
        },
        paint: {
          'text-color': '#0F172A',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2,
        },
      });

      map.on('click', 'active-route-stops-circle', (e) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties;
        const stopId = props?.stop_id;
        const matched = activeDir.stops?.find((s: StopItem) => s.stop_id === stopId);
        if (matched) {
          setSelectedStop(matched);
        }
      });

      map.on('mouseenter', 'active-route-stops-circle', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'active-route-stops-circle', () => {
        map.getCanvas().style.cursor = '';
      });
    }

    routeBadgesRef.current.forEach((m) => m.remove());
    routeBadgesRef.current = [];

    terminalMarkersRef.current.forEach((m) => m.remove());
    terminalMarkersRef.current = [];

    if (stopsList.length > 0) {
      const startStop = stopsList[0];
      const endStop = stopsList[stopsList.length - 1];

      if (startStop) {
        const startEl = document.createElement('div');
        startEl.className =
          'px-2.5 py-1 rounded-full bg-white text-neutral-900 font-bold text-xs shadow-md border-2 border-emerald-500 flex items-center gap-1.5 cursor-pointer select-none z-20';
        startEl.innerHTML = `
          <span class="font-extrabold text-[12px] text-neutral-950">${startStop.stop_name}</span>
        `;
        startEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedStop(startStop);
          setFlyToCoord([startStop.stop_lon, startStop.stop_lat]);
        });

        const startMarker = new Marker({ element: startEl, offset: [0, -22] })
          .setLngLat([startStop.stop_lon, startStop.stop_lat])
          .addTo(map);
        terminalMarkersRef.current.push(startMarker);
      }

      if (endStop && endStop.stop_id !== startStop?.stop_id) {
        const endEl = document.createElement('div');
        endEl.className =
          'px-2.5 py-1 rounded-full bg-white text-neutral-900 font-bold text-xs shadow-md border-2 border-rose-500 flex items-center gap-1.5 cursor-pointer select-none z-20';
        endEl.innerHTML = `
          <span class="font-extrabold text-[12px] text-neutral-950">${endStop.stop_name}</span>
        `;
        endEl.addEventListener('click', (e) => {
          e.stopPropagation();
          setSelectedStop(endStop);
          setFlyToCoord([endStop.stop_lon, endStop.stop_lat]);
        });

        const endMarker = new Marker({ element: endEl, offset: [0, -22] })
          .setLngLat([endStop.stop_lon, endStop.stop_lat])
          .addTo(map);
        terminalMarkersRef.current.push(endMarker);
      }
    }

    const shortName = currentRouteDetail.route?.route_short_name;
    if (shortName && coords.length > 5) {
      const milestoneIndices = [
        Math.floor(coords.length * 0.25),
        Math.floor(coords.length * 0.5),
        Math.floor(coords.length * 0.75),
      ];

      milestoneIndices.forEach((coordIdx) => {
        const point = coords[coordIdx];
        if (!point) return;

        const pill = document.createElement('div');
        pill.className =
          'px-2 py-0.5 rounded-full text-[10px] font-black tracking-tight text-white shadow-md border-1.5 border-white select-none pointer-events-none transition-transform';
        pill.style.backgroundColor = color;
        pill.innerText = shortName;

        const marker = new Marker({ element: pill }).setLngLat(point as [number, number]).addTo(map);
        routeBadgesRef.current.push(marker);
      });
    }

    if (coords.length > 0) {
      const bounds = coords.reduce(
        (b, coord) => b.extend(coord as [number, number]),
        new LngLatBounds(coords[0], coords[0])
      );
      map.fitBounds(bounds, {
        padding: { top: 60, bottom: 60, left: isSidebarOpen ? 460 : 60, right: 60 },
        maxZoom: 15,
        duration: 900,
      });
    }
  }, [currentRouteDetail, selectedDirection, mapLoaded, setSelectedStop, isSidebarOpen]);

  useEffect(() => {
    const timer = setTimeout(() => {
      mapRef.current?.resize();
    }, 320);
    return () => clearTimeout(timer);
  }, [isSidebarOpen]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || !flyToCoord) return;

    map.flyTo({
      center: flyToCoord,
      zoom: 15.5,
      essential: true,
      duration: 800,
    });

    setFlyToCoord(null);
  }, [flyToCoord, mapLoaded, setFlyToCoord]);

  useEffect(() => {
    if (!mapLoaded) return;
    const map = mapRef.current;
    if (!map) return;

    if (map.getLayer('citywide-stops-circle')) {
      map.setLayoutProperty('citywide-stops-circle', 'visibility', 'none');
    }
    if (map.getLayer('citywide-stops-label')) {
      map.setLayoutProperty('citywide-stops-label', 'visibility', 'none');
    }

    if (selectedRouteId) {
      if (map.getLayer('citywide-buses-label')) {
        map.setLayoutProperty('citywide-buses-label', 'visibility', 'none');
      }
      citywideActiveRef.current = false;
      if (citywideIntervalRef.current) {
        clearInterval(citywideIntervalRef.current);
        citywideIntervalRef.current = null;
      }
      setCitywideCount(0);
      return;
    }

    citywideActiveRef.current = true;
    if (map.getLayer('citywide-buses-label')) {
      map.setLayoutProperty('citywide-buses-label', 'visibility', 'visible');
    }

    function makePillImage(routeCode: string, hexColor: string): ImageData {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const fontSize = 10 * dpr;
      const paddingX = 7 * dpr;
      const paddingY = 3 * dpr;
      const radius = 10 * dpr;

      const tmpCanvas = document.createElement('canvas');
      const tmpCtx = tmpCanvas.getContext('2d')!;
      tmpCtx.font = `800 ${fontSize}px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;
      const textW = tmpCtx.measureText(routeCode).width;

      const w = Math.ceil(textW + paddingX * 2 + 2 * dpr);
      const h = Math.ceil(fontSize + paddingY * 2 + 2 * dpr);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;

      const r = parseInt(hexColor.slice(1, 3), 16) || 100;
      const g = parseInt(hexColor.slice(3, 5), 16) || 100;
      const b = parseInt(hexColor.slice(5, 7), 16) || 100;
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      const textColor = luminance > 0.55 ? '#1a1a1a' : '#ffffff';

      ctx.shadowColor = 'rgba(0,0,0,0.30)';
      ctx.shadowBlur = 3 * dpr;
      ctx.shadowOffsetY = 1.5 * dpr;

      ctx.beginPath();
      ctx.moveTo(radius, 1 * dpr);
      ctx.arcTo(w - 1 * dpr, 1 * dpr, w - 1 * dpr, h - 1 * dpr, radius);
      ctx.arcTo(w - 1 * dpr, h - 1 * dpr, 1 * dpr, h - 1 * dpr, radius);
      ctx.arcTo(1 * dpr, h - 1 * dpr, 1 * dpr, 1 * dpr, radius);
      ctx.arcTo(1 * dpr, 1 * dpr, w - 1 * dpr, 1 * dpr, radius);
      ctx.closePath();
      ctx.fillStyle = hexColor;
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = 'rgba(255,255,255,0.75)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.stroke();

      ctx.font = `800 ${fontSize}px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif`;
      ctx.fillStyle = textColor;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(routeCode, w / 2, h / 2);

      return ctx.getImageData(0, 0, w, h);
    }

    const registeredIcons = new Set<string>();

    async function pollAllBuses() {
      if (!citywideActiveRef.current) return;
      try {
        const buses = await fetchAllLiveBuses();
        if (!citywideActiveRef.current) return;
        const curMap = mapRef.current;
        if (!curMap) return;

        const validBuses = buses.filter(
          (b) => typeof b.latitude === 'number' && typeof b.longitude === 'number'
        );

        for (const bus of validBuses) {
          const routeCode = bus.route_code || '?';
          const hexColor = bus.route_color ? `#${bus.route_color}` : '#6B7280';
          const iconId = `pill-${routeCode}-${hexColor.replace('#', '')}`;
          if (!registeredIcons.has(iconId) && !curMap.hasImage(iconId)) {
            const imgData = makePillImage(routeCode, hexColor);
            curMap.addImage(iconId, imgData, { pixelRatio: Math.min(window.devicePixelRatio || 1, 2) });
            registeredIcons.add(iconId);
          }
        }

        const geojson: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: validBuses.map((bus) => {
            const routeCode = bus.route_code || '?';
            const hexColor = bus.route_color ? `#${bus.route_color}` : '#6B7280';
            return {
              type: 'Feature' as const,
              properties: {
                icon_id: `pill-${routeCode}-${hexColor.replace('#', '')}`,
                bus_body_no: bus.bus_body_no || '',
                route_code: routeCode,
                speed: bus.speed ?? 0,
                trip_headsign: bus.trip_headsign || '',
                next_stops: bus.next_stops || '',
                curr_stops: bus.curr_stops || '',
                estimated_distance_next_stops: bus.estimated_distance_next_stops ?? 0,
                estimated_time_next_stops: bus.estimated_time_next_stops ?? '',
              },
              geometry: {
                type: 'Point' as const,
                coordinates: [bus.longitude!, bus.latitude!],
              },
            };
          }),
        };

        if (curMap.getSource('citywide-buses')) {
          (curMap.getSource('citywide-buses') as GeoJSONSource).setData(geojson);
        } else {
          curMap.addSource('citywide-buses', { type: 'geojson', data: geojson, cluster: false });

          curMap.addLayer({
            id: 'citywide-buses-label',
            type: 'symbol',
            source: 'citywide-buses',
            layout: {
              'icon-image': ['get', 'icon_id'],
              'icon-allow-overlap': true,
              'icon-ignore-placement': true,
              'icon-anchor': 'center',
            },
          });

          curMap.on('click', 'citywide-buses-label', (e) => {
            if (!e.features || !e.features[0]) return;
            const props = e.features[0].properties;
            const coords = (e.features[0].geometry as any).coordinates as [number, number];
            if (!props || !coords) return;

            const speed = Number(props.speed || 0);
            const nextStop = props.next_stops || '';
            const currStop = props.curr_stops || '';
            const headsign = props.trip_headsign || '';
            const distNext = Number(props.estimated_distance_next_stops || 0);
            const timeNext = props.estimated_time_next_stops;

            let etaBadge = '';
            if (timeNext && timeNext !== '0') {
              const min = Number(timeNext) > 60 ? Math.round(Number(timeNext) / 60) : Math.round(Number(timeNext));
              etaBadge = min <= 0 ? 'Tiba Sekarang' : `${min} min lagi`;
            } else if (distNext > 0) {
              etaBadge = `${Math.max(1, Math.round(distNext / 350))} min lagi`;
            }

            const contentHtml = `
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-width:220px;padding:4px;">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid #f1f5f9;padding-bottom:8px;margin-bottom:8px;padding-right:28px;">
                  <div style="display:flex;align-items:center;gap:6px;">
                    <span style="background:#0f172a;color:#fff;border-radius:6px;padding:2.5px 7px;font-weight:800;font-size:12px;">${props.bus_body_no || 'BUS'}</span>
                    ${props.route_code ? `<span style="font-size:11px;font-weight:800;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;padding:1.5px 6px;border-radius:5px;">${props.route_code}</span>` : ''}
                  </div>
                  ${speed > 0 ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;font-weight:700;padding:2px 7px;border-radius:9999px;background:#ecfdf5;color:#047857;border:1px solid #a7f3d0;"><span style="width:5px;height:5px;border-radius:9999px;background:#10b981;"></span>${speed} km/jam</span>` : ''}
                </div>
                ${headsign ? `<div style="font-size:11px;margin-bottom:8px;color:#334155;"><span style="color:#94a3b8;font-weight:600;">Arah:</span><strong style="color:#0f172a;margin-left:4px;">${headsign}</strong></div>` : ''}
                ${nextStop ? `
                  <div style="background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:7px 9px;margin-bottom:6px;">
                    <div style="font-size:9px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Menuju Halte Berikutnya</div>
                    <div style="font-size:12px;font-weight:700;color:#0f172a;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${nextStop}</div>
                    <div style="display:flex;align-items:center;gap:8px;margin-top:4px;font-size:10px;font-weight:600;color:#475569;">
                      ${etaBadge ? `<span style="color:#059669;font-weight:700;">⏱️ ${etaBadge}</span>` : ''}
                      ${distNext > 0 ? `<span>📏 ${distNext} m</span>` : ''}
                    </div>
                  </div>
                ` : ''}
                ${currStop ? `<div style="font-size:10px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><span style="color:#94a3b8;">Posisi/Halte terakhir:</span> ${currStop}</div>` : ''}
              </div>
            `;

            busPopupRef.current?.remove();
            const popup = new Popup({ closeButton: true, closeOnClick: false, offset: 12, className: 'modern-bus-popup' })
              .setLngLat(coords)
              .setHTML(contentHtml)
              .addTo(curMap);
            popup.on('close', () => { activePopupBusKeyRef.current = null; });
            busPopupRef.current = popup;
          });

          curMap.on('mouseenter', 'citywide-buses-label', () => { curMap.getCanvas().style.cursor = 'pointer'; });
          curMap.on('mouseleave', 'citywide-buses-label', () => { curMap.getCanvas().style.cursor = ''; });
        }

        setCitywideCount(validBuses.length);
      } catch {}
    }

    pollAllBuses();
    citywideIntervalRef.current = setInterval(pollAllBuses, 15000);

    return () => {
      citywideActiveRef.current = false;
      if (citywideIntervalRef.current) {
        clearInterval(citywideIntervalRef.current);
        citywideIntervalRef.current = null;
      }
      setCitywideCount(0);
    };
  }, [selectedRouteId, mapLoaded]);

  useEffect(() => {
    if (!selectedRouteId || !mapLoaded) return;

    let isSubscribed = true;

    async function pollBuses() {
      try {
        const tracking = await fetchRouteTracking(selectedRouteId!, selectedDirection);
        if (!isSubscribed) return;

        const buses = tracking.active_buses || [];
        const validBuses = buses.filter(
          (b) => typeof b.latitude === 'number' && typeof b.longitude === 'number'
        );
        setLiveBusCount(validBuses.length);
        setLiveBuses(validBuses);

        const map = mapRef.current;
        if (!map) return;

        if (!map.getSource('active-route-buses')) {
          map.addSource('active-route-buses', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] },
          });

          map.addLayer({
            id: 'active-route-buses-ring',
            type: 'circle',
            source: 'active-route-buses',
            paint: {
              'circle-radius': 13,
              'circle-color': '#E22726',
              'circle-opacity': 0.25,
            },
          });

          map.addLayer({
            id: 'active-route-buses-dot',
            type: 'circle',
            source: 'active-route-buses',
            paint: {
              'circle-radius': 7.5,
              'circle-color': '#E22726',
              'circle-stroke-width': 2.5,
              'circle-stroke-color': '#FFFFFF',
            },
          });

          map.addLayer({
            id: 'active-route-buses-label',
            type: 'symbol',
            source: 'active-route-buses',
            layout: {
              'text-field': ['get', 'route_code'],
              'text-size': 11,
              'text-offset': [0, -1.3],
              'text-anchor': 'bottom',
              'text-allow-overlap': true,
              'text-ignore-placement': true,
            },
            paint: {
              'text-color': '#0F172A',
              'text-halo-color': '#FFFFFF',
              'text-halo-width': 2.5,
            },
          });

          const handleBusMarkerClick = (e: any) => {
            if (!e.features || !e.features[0]) return;
            const props = e.features[0].properties;
            const geom = e.features[0].geometry as any;
            const coords = geom?.coordinates;
            if (!coords) return;

            const busNo = props.bus_body_no || 'Bus';
            const routeName = props.route_code || '';
            const headsign = props.trip_headsign || '';
            const nextStop = props.next_stops || '';
            const currStop = props.curr_stops || '';
            const speed = Number(props.speed || 0);
            const distNext = Number(props.estimated_distance_next_stops || 0);
            const timeNext = props.estimated_time_next_stops;

            activePopupBusKeyRef.current = busNo;

            let etaBadge = '';
            if (timeNext && timeNext !== '0') {
              const min =
                Number(timeNext) > 60
                  ? Math.round(Number(timeNext) / 60)
                  : Math.round(Number(timeNext));
              etaBadge = min <= 0 ? 'Tiba Sekarang' : `${min} min lagi`;
            } else if (distNext > 0) {
              const min = Math.max(1, Math.round(distNext / 350));
              etaBadge = `${min} min lagi`;
            }

            const contentHtml = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; padding: 4px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px; padding-right: 28px;">
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="background: #0f172a; color: #ffffff; border-radius: 6px; padding: 2.5px 7px; font-weight: 800; font-size: 12px; letter-spacing: -0.01em;">
                      ${busNo}
                    </span>
                    ${routeName ? `<span style="font-size: 11px; font-weight: 800; color: #0284c7; background: #f0f9ff; border: 1px solid #bae6fd; padding: 1.5px 6px; border-radius: 5px;">${routeName}</span>` : ''}
                  </div>
                  <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 9999px; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0;">
                    <span style="width: 5px; height: 5px; border-radius: 9999px; background: #10b981;"></span>
                    ${speed > 0 ? `${speed} km/jam` : ''}
                  </span>
                </div>

                ${headsign ? `
                  <div style="font-size: 11px; margin-bottom: 8px; color: #334155;">
                    <span style="color: #94a3b8; font-weight: 600;">Arah:</span>
                    <strong style="color: #0f172a; margin-left: 4px;">${headsign}</strong>
                  </div>
                ` : ''}

                ${nextStop ? `
                  <div style="background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 8px; padding: 7px 9px; margin-bottom: 6px;">
                    <div style="font-size: 9px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em;">Menuju Halte Berikutnya</div>
                    <div style="font-size: 12px; font-weight: 700; color: #0f172a; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                      ${nextStop}
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; font-size: 10px; font-weight: 600; color: #475569;">
                      ${etaBadge ? `<span style="color: #059669; font-weight: 700;">⏱️ ${etaBadge}</span>` : ''}
                      ${distNext > 0 ? `<span>📏 ${distNext} m</span>` : ''}
                    </div>
                  </div>
                ` : ''}

                ${currStop ? `
                  <div style="font-size: 10px; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <span style="color: #94a3b8;">Posisi/Halte terakhir:</span> ${currStop}
                  </div>
                ` : ''}
              </div>
            `;

            busPopupRef.current?.remove();
            const popup = new Popup({
              closeButton: true,
              closeOnClick: false,
              offset: 14,
              className: 'modern-bus-popup',
            })
              .setLngLat(coords as [number, number])
              .setHTML(contentHtml)
              .addTo(map);

            popup.on('close', () => {
              activePopupBusKeyRef.current = null;
            });

            busPopupRef.current = popup;
          };

          map.on('click', 'active-route-buses-dot', handleBusMarkerClick);
          map.on('click', 'active-route-buses-ring', handleBusMarkerClick);

          map.on('mouseenter', 'active-route-buses-dot', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'active-route-buses-dot', () => {
            map.getCanvas().style.cursor = '';
          });
          map.on('mouseenter', 'active-route-buses-ring', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'active-route-buses-ring', () => {
            map.getCanvas().style.cursor = '';
          });
        }

        const INTERPOLATION_DURATION = 14000;
        const animStartTime = performance.now();

        const updatedStates = new Map<
          string,
          {
            startLng: number;
            startLat: number;
            targetLng: number;
            targetLat: number;
            props: any;
          }
        >();

        validBuses.forEach((bus) => {
          const key = bus.bus_body_no || bus.vehicle_id || `${bus.longitude}-${bus.latitude}`;
          const targetLng = bus.longitude!;
          const targetLat = bus.latitude!;

          let startLng = targetLng;
          let startLat = targetLat;

          const prevPos = currentBusPositionsRef.current.get(key);
          if (prevPos) {
            const dLat = (targetLat - prevPos[1]) * 111000;
            const dLon =
              (targetLng - prevPos[0]) * 111000 * Math.cos((prevPos[1] * Math.PI) / 180);
            const dist = Math.sqrt(dLat * dLat + dLon * dLon);

            if (dist > 0.5 && dist < 3000) {
              startLng = prevPos[0];
              startLat = prevPos[1];
            }
          } else {
            currentBusPositionsRef.current.set(key, [startLng, startLat]);
          }

          updatedStates.set(key, {
            startLng,
            startLat,
            targetLng,
            targetLat,
            props: {
              bus_body_no: bus.bus_body_no || bus.vehicle_id || 'BUS',
              route_code: bus.route_code || currentRouteDetail?.route?.route_short_name || '',
              speed: typeof bus.speed === 'number' ? bus.speed : 0,
              bearing: typeof bus.bearing === 'number' ? bus.bearing : 0,
              curr_stops: bus.curr_stops || '',
              next_stops: bus.next_stops || '',
              prev_stops: bus.prev_stops || '',
              estimated_time_next_stops: bus.estimated_time_next_stops ?? '',
              estimated_distance_next_stops: bus.estimated_distance_next_stops ?? 0,
              trip_headsign: bus.trip_headsign || '',
            },
          });
        });

        busAnimationStateRef.current = updatedStates;

        if (animFrameRef.current) {
          cancelAnimationFrame(animFrameRef.current);
        }

        function animateFrame(now: number) {
          if (!isSubscribed) return;
          const elapsed = now - animStartTime;
          const progress = Math.min(1, elapsed / INTERPOLATION_DURATION);

          const features: GeoJSON.Feature[] = [];

          busAnimationStateRef.current.forEach((state, key) => {
            const curLng = state.startLng + (state.targetLng - state.startLng) * progress;
            const curLat = state.startLat + (state.targetLat - state.startLat) * progress;

            currentBusPositionsRef.current.set(key, [curLng, curLat]);

            if (activePopupBusKeyRef.current === key && busPopupRef.current) {
              busPopupRef.current.setLngLat([curLng, curLat]);
            }

            features.push({
              type: 'Feature',
              properties: state.props,
              geometry: {
                type: 'Point',
                coordinates: [curLng, curLat],
              },
            });
          });

          const src = mapRef.current?.getSource('active-route-buses') as GeoJSONSource | undefined;
          if (src) {
            src.setData({
              type: 'FeatureCollection',
              features,
            });
          }

          if (progress < 1) {
            animFrameRef.current = requestAnimationFrame(animateFrame);
          }
        }

        animFrameRef.current = requestAnimationFrame(animateFrame);
      } catch (err) {}
    }

    pollBuses();
    const interval = setInterval(pollBuses, 15000);

    return () => {
      isSubscribed = false;
      clearInterval(interval);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      busAnimationStateRef.current.clear();
      currentBusPositionsRef.current.clear();
      activePopupBusKeyRef.current = null;
    };
  }, [selectedRouteId, selectedDirection, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    if (activeCity === 'semarang') {
      if (map.getSource('active-route-line')) {
        (map.getSource('active-route-line') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      if (map.getSource('active-route-stops')) {
        (map.getSource('active-route-stops') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      if (map.getSource('active-route-buses')) {
        (map.getSource('active-route-buses') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      if (map.getSource('citywide-all-buses')) {
        (map.getSource('citywide-all-buses') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      terminalMarkersRef.current.forEach((m) => m.remove());
      terminalMarkersRef.current = [];
      routeBadgesRef.current.forEach((m) => m.remove());
      routeBadgesRef.current = [];
      busPopupRef.current?.remove();

      map.flyTo({
        center: [110.4203, -6.9932],
        zoom: 12.5,
        essential: true,
        duration: 1200,
      });
    } else {
      if (map.getSource('semarang-corridor-line')) {
        (map.getSource('semarang-corridor-line') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      if (map.getSource('semarang-live-buses')) {
        (map.getSource('semarang-live-buses') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      busPopupRef.current?.remove();

      map.flyTo({
        center: [106.8272, -6.1754],
        zoom: 12,
        essential: true,
        duration: 1200,
      });
    }
  }, [activeCity, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || activeCity !== 'semarang') return;

    if (!selectedSemarangCorridor) {
      if (map.getSource('semarang-corridor-line')) {
        (map.getSource('semarang-corridor-line') as GeoJSONSource).setData({
          type: 'FeatureCollection',
          features: [],
        });
      }
      return;
    }

    const rawPolyline =
      selectedSemarangDirection === 'A'
        ? selectedSemarangCorridor.points_a
        : selectedSemarangCorridor.points_b || selectedSemarangCorridor.points_a;

    if (!rawPolyline) return;

    const coords = decodePolyline(rawPolyline);
    if (coords.length === 0) return;

    const color = selectedSemarangCorridor.color || '#005fa5';
    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { kor: selectedSemarangCorridor.kor, color },
          geometry: { type: 'LineString', coordinates: coords },
        },
      ],
    };

    if (map.getSource('semarang-corridor-line')) {
      (map.getSource('semarang-corridor-line') as GeoJSONSource).setData(geojson);
      map.setPaintProperty('semarang-corridor-line-layer', 'line-color', color);
    } else {
      map.addSource('semarang-corridor-line', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'semarang-corridor-line-casing',
        type: 'line',
        source: 'semarang-corridor-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 7,
          'line-opacity': 0.95,
        },
      });

      map.addLayer({
        id: 'semarang-corridor-line-layer',
        type: 'line',
        source: 'semarang-corridor-line',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': color,
          'line-width': 4.5,
          'line-opacity': 1,
        },
      });
    }

    const bounds = new LngLatBounds();
    coords.forEach((c) => bounds.extend(c));
    map.fitBounds(bounds, { padding: 80, maxZoom: 14.5, duration: 800 });
  }, [selectedSemarangCorridor, selectedSemarangDirection, activeCity, mapLoaded]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || activeCity !== 'semarang') return;

    const features: GeoJSON.Feature[] = semarangLiveBuses
      .filter((b) => typeof b.lat === 'number' && typeof b.lng === 'number' && b.lat !== 0)
      .map((b) => ({
        type: 'Feature',
        properties: {
          id: b.id || b.imei,
          name: b.name || 'BUS',
          plate_number: b.plate_number || '',
          kor: b.kor || '',
          toward: b.toward || '',
          speed: Number(b.speed || 0),
          angle: Number(b.angle || 0),
          dist_shel: b.dist_shel || '',
        },
        geometry: {
          type: 'Point',
          coordinates: [b.lng, b.lat],
        },
      }));

    const geojson: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features,
    };

    if (map.getSource('semarang-live-buses')) {
      (map.getSource('semarang-live-buses') as GeoJSONSource).setData(geojson);
    } else {
      map.addSource('semarang-live-buses', { type: 'geojson', data: geojson });

      map.addLayer({
        id: 'semarang-buses-ring',
        type: 'circle',
        source: 'semarang-live-buses',
        paint: {
          'circle-radius': 9,
          'circle-color': '#005fa5',
          'circle-opacity': 0.25,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#005fa5',
        },
      });

      map.addLayer({
        id: 'semarang-buses-dot',
        type: 'circle',
        source: 'semarang-live-buses',
        paint: {
          'circle-radius': 5,
          'circle-color': '#FFFFFF',
          'circle-stroke-width': 2.5,
          'circle-stroke-color': '#0f172a',
        },
      });

      map.addLayer({
        id: 'semarang-buses-label',
        type: 'symbol',
        source: 'semarang-live-buses',
        layout: {
          'text-field': ['concat', ['get', 'name'], ' (Kor ', ['get', 'kor'], ')'],
          'text-size': 10,
          'text-offset': [0, -1.4],
          'text-anchor': 'bottom',
          'text-allow-overlap': true,
          'text-ignore-placement': true,
        },
        paint: {
          'text-color': '#0F172A',
          'text-halo-color': '#FFFFFF',
          'text-halo-width': 2.5,
        },
      });

      const handleSemarangBusClick = (e: any) => {
        if (!e.features || !e.features[0]) return;
        const props = e.features[0].properties as any;
        const geom = e.features[0].geometry as any;
        const coords = geom?.coordinates;
        if (!coords) return;

        const contentHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; min-width: 220px; padding: 4px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; margin-bottom: 8px; padding-right: 20px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                <span style="background: #005fa5; color: #ffffff; border-radius: 6px; padding: 2px 7px; font-weight: 800; font-size: 11px;">
                  Kor ${props.kor || '-'}
                </span>
                <span style="font-size: 12px; font-weight: 800; color: #0f172a;">${props.name}</span>
              </div>
              <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px; background: ${props.speed > 0 ? '#ecfdf5' : '#fef3c7'}; color: ${props.speed > 0 ? '#047857' : '#b45309'}; border: 1px solid ${props.speed > 0 ? '#a7f3d0' : '#fde68a'};">
                ${props.speed > 0 ? `${Math.round(props.speed)} km/h` : 'Berhenti'}
              </span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: #475569;">
              <div>Plat Nomor: <strong style="color: #0f172a;">${props.plate_number || '-'}</strong></div>
              <div>Arah Tujuan: <strong style="color: #005fa5;">${props.toward || '-'}</strong></div>
              ${props.dist_shel ? `<div>Jarak Halte: <strong>${(Number(props.dist_shel) * 1000).toFixed(0)}m</strong></div>` : ''}
            </div>
          </div>
        `;

        busPopupRef.current?.remove();
        busPopupRef.current = new Popup({
          closeButton: true,
          closeOnClick: false,
          offset: 14,
          className: 'custom-bus-live-popup',
        })
          .setLngLat(coords)
          .setHTML(contentHtml)
          .addTo(map);
      };

      map.on('click', 'semarang-buses-dot', handleSemarangBusClick);
      map.on('click', 'semarang-buses-ring', handleSemarangBusClick);

      map.on('mouseenter', 'semarang-buses-dot', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'semarang-buses-dot', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'semarang-buses-ring', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'semarang-buses-ring', () => {
        map.getCanvas().style.cursor = '';
      });
    }
  }, [semarangLiveBuses, activeCity, mapLoaded]);

  const handleRecenter = () => {
    const map = mapRef.current;
    if (!map) return;
    if (activeCity === 'semarang') {
      map.flyTo({
        center: [110.4203, -6.9932],
        zoom: 12.5,
        duration: 800,
      });
    } else {
      map.flyTo({
        center: [106.8272, -6.1754],
        zoom: 12,
        duration: 800,
      });
    }
  };

  return (
    <div className="relative w-full h-full bg-slate-100 overflow-hidden">
      <div ref={mapContainerRef} className="w-full h-full" />

      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        <button
          onClick={toggleSidebar}
          className="hidden md:flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-xl text-xs font-semibold text-neutral-800 shadow-sm hover:bg-white hover:text-neutral-950 transition-all active:scale-95"
          title={isSidebarOpen ? 'Sembunyikan Panel Trayek' : 'Tampilkan Panel Trayek'}
        >
          {isSidebarOpen ? (
            <>
              <PanelLeftClose className="w-4 h-4 text-neutral-500" />
              <span>Sembunyikan</span>
            </>
          ) : (
            <>
              <PanelLeftOpen className="w-4 h-4 text-neutral-500" />
              <span>Daftar Trayek</span>
            </>
          )}
        </button>

        <div className="flex items-center bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-xl p-0.5 shadow-sm">
          <button
            type="button"
            onClick={() => setActiveCity('jakarta')}
            className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeCity === 'jakarta'
                ? 'bg-neutral-900 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <span>Jakarta</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveCity('semarang')}
            className={`flex items-center px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
              activeCity === 'semarang'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-neutral-600 hover:text-neutral-950'
            }`}
          >
            <span>Semarang</span>
          </button>
        </div>

        {activeCity === 'semarang' ? (
          semarangLiveBuses.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md border border-neutral-200/80 text-neutral-800 rounded-xl text-xs font-semibold shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{semarangLiveBuses.length} bus aktif di Semarang</span>
            </div>
          )
        ) : (
          <>
            {liveBusCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md border border-neutral-200/80 text-neutral-800 rounded-xl text-xs font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{liveBusCount} bus di peta</span>
              </div>
            )}
            {citywideCount > 0 && !selectedRouteId && (
              <div className="flex items-center gap-2 px-3 py-2 bg-white/95 backdrop-blur-md border border-neutral-200/80 text-neutral-800 rounded-xl text-xs font-semibold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>{citywideCount} bus aktif</span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="absolute top-4 right-4 z-20 flex items-center gap-1.5">
        {activeCity === 'jakarta' && <NearbyStopsPanel />}

        <button
          onClick={handleRecenter}
          className="p-2.5 bg-white/95 backdrop-blur-md border border-neutral-200/80 rounded-xl text-neutral-600 shadow-sm hover:bg-white hover:text-neutral-900 transition-all active:scale-95"
          title={
            activeCity === 'semarang'
              ? 'Fokus ke Simpang Lima Semarang'
              : 'Fokus ke Pusat Jakarta (Monas)'
          }
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
