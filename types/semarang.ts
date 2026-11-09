export interface SemarangCorridor {
  id: string;
  kor: string;
  trayek: string;
  origin: string;
  toward: string;
  color: string;
  jam_operasional: string;
  jumlah_bis: number;
  jumlah_halte: number;
  points_a?: string;
  points_b?: string;
}

export interface SemarangLiveBus {
  id: string;
  imei: string;
  name: string;
  plate_number: string;
  kor: string;
  toward: string;
  lat: number;
  lng: number;
  speed: number;
  angle: number;
  dist_shel?: string;
  gap?: string;
  ago?: string;
  dt_tracker?: string;
  is_maintenance?: string;
}

export type CityType = 'jakarta' | 'semarang';

