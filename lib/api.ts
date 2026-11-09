import { RouteSummary, RouteDetailData, StopItem, LiveBusItem } from '../types/transjakarta';
import { SemarangCorridor, SemarangLiveBus } from '../types/semarang';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export async function fetchAllRoutes(category?: string, search?: string): Promise<RouteSummary[]> {
  try {
    const params = new URLSearchParams();
    if (category && category !== 'Semua') params.append('category', category);
    if (search) params.append('search', search);

    const query = params.toString() ? `?${params.toString()}` : '';
    const res = await fetch(`${API_BASE}/transjakarta/routes${query}`, { cache: 'no-store' });

    if (res.ok) {
      const json = await res.json();
      if (json.data && json.data.length > 0) return json.data;
    }
  } catch (err) {}

  try {
    const res = await fetch('/data/all_routes.json');
    if (res.ok) {
      const data: RouteSummary[] = await res.json();
      return data;
    }
  } catch (err) {
    console.error('Failed to load static routes fallback:', err);
  }

  return [];
}

export async function fetchRouteDetail(routeId: string): Promise<RouteDetailData> {
  try {
    const res = await fetch(`${API_BASE}/transjakarta/routes/${routeId}`, { cache: 'no-store' });

    if (res.ok) {
      const json = await res.json();
      if (json.data) return json.data;
    }
  } catch (err) {}

  try {
    const res = await fetch(`/data/route_${routeId}_detail.json`);
    if (res.ok) {
      const data: RouteDetailData = await res.json();
      return data;
    }
  } catch (err) {
    console.error(`Failed to load fallback for route ${routeId}:`, err);
  }

  throw new Error(`Detail rute ${routeId} tidak dapat dimuat`);
}

export async function fetchStopDetail(stopId: string): Promise<StopItem> {
  const res = await fetch(`${API_BASE}/transjakarta/stops/${stopId}`);
  if (!res.ok) {
    throw new Error(`Gagal memuat detail halte ${stopId}`);
  }
  const json = await res.json();
  return json.data;
}

export async function fetchRouteTracking(
  routeId: string,
  direction: 'outbound' | 'inbound' = 'outbound'
): Promise<{ active_buses: LiveBusItem[] }> {
  try {
    const res = await fetch(`${API_BASE}/transjakarta/routes/${routeId}/tracking?direction=${direction}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      return json.data || { active_buses: [] };
    }
  } catch (err) {}
  return { active_buses: [] };
}

export async function fetchAllLiveBuses(): Promise<LiveBusItem[]> {
  try {
    const res = await fetch(`${API_BASE}/transjakarta/routes/buses/all`, { cache: 'no-store' });

    if (res.ok) {
      const json = await res.json();
      if (json.data?.active_buses) return json.data.active_buses;
      if (Array.isArray(json.data)) return json.data;
    }
  } catch (err) {}
  return [];
}

export interface NearbyStop extends StopItem {
  distance_meters: number;
}

export async function fetchNearbyStops(lat: number, lng: number, radius = 1000): Promise<NearbyStop[]> {
  try {
    const res = await fetch(`${API_BASE}/transjakarta/stops/nearby?lat=${lat}&lng=${lng}&radius=${radius}`, {
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (err) {}
  return [];
}

export async function fetchSemarangCorridors(includePolylines = true): Promise<SemarangCorridor[]> {
  try {
    const res = await fetch(
      `${API_BASE}/transsemarang/corridors?includePolylines=${includePolylines}`,
      { cache: 'no-store' }
    );
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (err) {
    console.error('Failed to fetch Semarang corridors:', err);
  }
  return [];
}

export async function fetchSemarangCorridorDetail(id: string): Promise<SemarangCorridor | null> {
  try {
    const res = await fetch(`${API_BASE}/transsemarang/corridors/${id}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      return json.data || null;
    }
  } catch (err) {
    console.error(`Failed to fetch Semarang corridor detail ${id}:`, err);
  }
  return null;
}

export async function fetchSemarangLiveBuses(corridor?: string): Promise<SemarangLiveBus[]> {
  try {
    const query = corridor ? `?corridor=${encodeURIComponent(corridor)}` : '';
    const res = await fetch(`${API_BASE}/transsemarang/buses${query}`, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      return json.data || [];
    }
  } catch (err) {
    console.error('Failed to fetch Semarang live buses:', err);
  }
  return [];
}
