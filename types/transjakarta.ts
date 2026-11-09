export type RouteCategory =
  | 'BRT'
  | 'Angkutan Umum Integrasi'
  | 'Mikrotrans'
  | 'Royaltrans'
  | 'Transjabodetabek'
  | 'Rusun'
  | 'Bus Wisata'
  | string;

export interface RouteSummary {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_desc: RouteCategory;
  route_color: string;
  route_text_color: string;
  price?: number;
  start_time?: string;
  end_time?: string;
  operational_days?: string;
  facilities?: string[];
  trip_ids?: string[];
  header_detail_color?: string;
}

export interface StopFacility {
  name: string;
  title?: string;
  icon?: {
    light: string;
    dark: string;
  };
}

export interface ConnectedRoute {
  route_id: string;
  route_short_name: string;
  route_long_name: string;
  route_color: string;
  route_text_color: string;
  route_desc: string;
}

export interface StopItem {
  stop_id: string;
  platform_code?: string;
  stop_name: string;
  stop_lat: number;
  stop_lon: number;
  facilities?: string[];
  v2_facilities?: StopFacility[];
  routes?: ConnectedRoute[];
  bus_stop_type?: 'halte' | 'busStop' | string;
  distance?: number;
}

export interface RouteDirection {
  trip_id: string;
  headsign: string;
  stops: StopItem[];
  polyline: string;
  start_time: string;
  end_time: string;
  operational_days: string;
}

export interface RouteDetailData {
  route: RouteSummary;
  inbound: RouteDirection;
  outbound: RouteDirection;
  facilities?: string[] | number;
  loop?: unknown;
  is_following?: boolean;
}

export interface LiveBusItem {
  bus_body_no: string;
  route_code: string;
  route_name?: string;
  current_stop?: string;
  curr_stops?: string;
  next_stops?: string;
  prev_stops?: string;
  estimated_time_next_stops?: number | string;
  estimated_distance_next_stops?: number;
  trip_headsign?: string;
  target_stop?: {
    stop_id: string;
    stop_name: string;
    platform_code?: string;
  };
  eta_status?: string;
  destination?: string;
  latitude?: number;
  longitude?: number;
  bearing?: number;
  speed?: number;
  vehicle_id?: string;
  timestamp?: number | string;
  route_color?: string;
  type?: string;
}

