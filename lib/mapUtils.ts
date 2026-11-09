export function decodePolyline(encoded: string): [number, number][] {
  if (!encoded) return [];
  const coordinates: [number, number][] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    coordinates.push([lng * 1e-5, lat * 1e-5]);
  }

  return coordinates;
}

export interface ServiceMeta {
  color: string;
  categoryLabel: string;
  tagClass: string;
  isJaklingko: boolean;
  isBRT: boolean;
  isFree: boolean;
  priceLabel: string;
  lineWidth: number;
}

export function getRouteServiceMeta(
  shortName?: string,
  category?: string,
  defaultColor?: string,
  price?: number
): ServiceMeta {
  const cat = (category || '').trim();
  const name = (shortName || '').toUpperCase().trim();
  const isJak = name.startsWith('JAK') || cat === 'Mikrotrans';

  let cleanColor = (defaultColor || '').replace('#', '').trim();

  if (isJak) {
    return {
      color: cleanColor ? `#${cleanColor}` : '#00609C',
      categoryLabel: 'Mikrotrans (JakLingko)',
      tagClass: 'bg-sky-50 text-sky-800 border-sky-200/80',
      isJaklingko: true,
      isBRT: false,
      isFree: true,
      priceLabel: 'Gratis (Rp 0)',
      lineWidth: 4.5,
    };
  }

  if (cat === 'BRT') {
    return {
      color: cleanColor ? `#${cleanColor}` : '#D62126',
      categoryLabel: 'BRT Koridor Utama',
      tagClass: 'bg-red-50 text-red-800 border-red-200/80',
      isJaklingko: false,
      isBRT: true,
      isFree: false,
      priceLabel: price !== undefined ? `Rp ${price.toLocaleString('id-ID')}` : 'Rp 3.500',
      lineWidth: 6.5,
    };
  }

  if (cat === 'Royaltrans') {
    return {
      color: cleanColor ? `#${cleanColor}` : '#9C4782',
      categoryLabel: 'Royaltrans Premium',
      tagClass: 'bg-purple-50 text-purple-800 border-purple-200/80',
      isJaklingko: false,
      isBRT: false,
      isFree: false,
      priceLabel: price !== undefined ? `Rp ${price.toLocaleString('id-ID')}` : 'Rp 20.000',
      lineWidth: 5,
    };
  }

  if (cat === 'Transjabodetabek') {
    return {
      color: cleanColor && cleanColor !== 'FFFF6D' ? `#${cleanColor}` : '#059669',
      categoryLabel: 'Transjabodetabek',
      tagClass: 'bg-emerald-50 text-emerald-800 border-emerald-200/80',
      isJaklingko: false,
      isBRT: false,
      isFree: false,
      priceLabel: price !== undefined ? `Rp ${price.toLocaleString('id-ID')}` : 'Rp 3.500',
      lineWidth: 5,
    };
  }

  if (cat === 'Bus Wisata') {
    return {
      color: cleanColor ? `#${cleanColor}` : '#EA580C',
      categoryLabel: 'Bus Wisata Tingkat',
      tagClass: 'bg-orange-50 text-orange-800 border-orange-200/80',
      isJaklingko: false,
      isBRT: false,
      isFree: true,
      priceLabel: 'Gratis (Rp 0)',
      lineWidth: 5,
    };
  }

  if (cat === 'Rusun') {
    return {
      color: cleanColor ? `#${cleanColor}` : '#475569',
      categoryLabel: 'Bus Rusun Warga',
      tagClass: 'bg-slate-100 text-slate-700 border-slate-200/80',
      isJaklingko: false,
      isBRT: false,
      isFree: true,
      priceLabel: 'Gratis (Rp 0)',
      lineWidth: 4.5,
    };
  }

  return {
    color: cleanColor ? `#${cleanColor}` : '#D97706',
    categoryLabel: 'Bus Non-BRT (Integrasi)',
    tagClass: 'bg-amber-50 text-amber-800 border-amber-200/80',
    isJaklingko: false,
    isBRT: false,
    isFree: false,
    priceLabel: price !== undefined ? `Rp ${price.toLocaleString('id-ID')}` : 'Rp 3.500',
    lineWidth: 5,
  };
}

export function getCategoryColor(category: string, defaultColor?: string, shortName?: string): string {
  const meta = getRouteServiceMeta(shortName, category, defaultColor);
  return meta.color;
}
