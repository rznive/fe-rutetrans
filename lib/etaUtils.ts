import { StopItem, LiveBusItem } from '@/types/transjakarta';

export function getBusesForStop(stop: StopItem, liveBuses: LiveBusItem[]): LiveBusItem[] {
  if (!liveBuses || liveBuses.length === 0) return [];
  const sId = (stop.stop_id || '').toLowerCase().trim();
  const sName = (stop.stop_name || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const matched = liveBuses.filter((bus) => {
    const curr = (bus.curr_stops || '').toLowerCase();
    const next = (bus.next_stops || '').toLowerCase();

    if (sId && (curr.includes(sId) || next.includes(sId))) {
      return true;
    }

    const currClean = curr.replace(/[^a-z0-9]/g, '');
    const nextClean = next.replace(/[^a-z0-9]/g, '');
    if (sName.length >= 4 && (currClean.includes(sName) || nextClean.includes(sName))) {
      return true;
    }

    if (
      typeof bus.latitude === 'number' &&
      typeof bus.longitude === 'number' &&
      typeof stop.stop_lat === 'number' &&
      typeof stop.stop_lon === 'number'
    ) {
      const dLat = (bus.latitude - stop.stop_lat) * 111000;
      const dLon =
        (bus.longitude - stop.stop_lon) * 111000 * Math.cos((stop.stop_lat * Math.PI) / 180);
      const dist = Math.sqrt(dLat * dLat + dLon * dLon);
      if (dist <= 300) {
        return true;
      }
    }

    return false;
  });

  return matched.sort((a, b) => {
    const etaA = formatEta(a, stop);
    const etaB = formatEta(b, stop);

    if (etaA.isAtStop && !etaB.isAtStop) return -1;
    if (!etaA.isAtStop && etaB.isAtStop) return 1;

    if (etaA.minutes !== etaB.minutes) {
      return etaA.minutes - etaB.minutes;
    }

    const distA = etaA.distanceMeters ?? 999999;
    const distB = etaB.distanceMeters ?? 999999;
    return distA - distB;
  });
}

export interface EtaResult {
  isAtStop: boolean;
  minutes: number;
  label: string;
  clockTime: string;
  badgeText: string;
  distanceMeters: number | null;
}

export function formatEta(bus: LiveBusItem, stop: StopItem): EtaResult {
  const sId = (stop.stop_id || '').toLowerCase();
  const isDirectCurr = Boolean(bus.curr_stops && bus.curr_stops.toLowerCase().includes(sId));

  let distMeters: number | null = null;
  if (
    typeof bus.latitude === 'number' &&
    typeof bus.longitude === 'number' &&
    typeof stop.stop_lat === 'number' &&
    typeof stop.stop_lon === 'number'
  ) {
    const dLat = (bus.latitude - stop.stop_lat) * 111000;
    const dLon =
      (bus.longitude - stop.stop_lon) * 111000 * Math.cos((stop.stop_lat * Math.PI) / 180);
    distMeters = Math.round(Math.sqrt(dLat * dLat + dLon * dLon));
  }

  if (typeof bus.estimated_distance_next_stops === 'number' && bus.estimated_distance_next_stops > 0) {
    distMeters = bus.estimated_distance_next_stops;
  }

  const isAtStop = isDirectCurr || (distMeters !== null && distMeters <= 120);

  if (isAtStop) {
    return {
      isAtStop: true,
      minutes: 0,
      label: 'Sekarang',
      clockTime: '',
      badgeText: 'Tiba Sekarang',
      distanceMeters: distMeters,
    };
  }

  let minutes = 2;
  if (typeof bus.estimated_time_next_stops === 'number' && bus.estimated_time_next_stops > 0) {
    minutes = bus.estimated_time_next_stops > 60
      ? Math.round(bus.estimated_time_next_stops / 60)
      : Math.round(bus.estimated_time_next_stops);
  } else if (distMeters !== null && distMeters > 0) {
    minutes = Math.max(1, Math.round(distMeters / 350));
  }

  const arrival = new Date(Date.now() + minutes * 60000);
  const hours = String(arrival.getHours()).padStart(2, '0');
  const mins = String(arrival.getMinutes()).padStart(2, '0');
  const clockTime = `${hours}:${mins}`;

  return {
    isAtStop: false,
    minutes,
    label: `${minutes} mnt lagi`,
    clockTime,
    badgeText: `${minutes} mnt lagi • ${clockTime}`,
    distanceMeters: distMeters,
  };
}

