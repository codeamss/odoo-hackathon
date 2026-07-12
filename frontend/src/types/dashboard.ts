export interface KPICards {
  assets_available: number;
  assets_allocated: number;
  assets_under_maintenance: number;
  assets_reserved: number;
  maintenance_today: number;
  active_bookings: number;
  pending_bookings: number;
  overdue_returns: number;
  upcoming_returns: number;
  total_assets: number;
}

export interface ReturnItem {
  allocation_id: string;
  asset_id: string;
  asset_tag: string;
  asset_name: string;
  allocated_to: string;
  allocated_to_type: "user" | "department" | "unknown";
  allocated_at: string;
  expected_return_date: string;
  days_overdue: number | null;
  department_name: string | null;
  category_name: string | null;
}

export interface OverdueReturnsResponse {
  total: number;
  items: ReturnItem[];
}

export interface UpcomingReturnsResponse {
  total: number;
  days_ahead: number;
  items: ReturnItem[];
}

export interface MaintenanceActivityItem {
  request_id: string;
  asset_tag: string;
  asset_name: string;
  status: string;
  priority: string;
  requested_by: string;
  submitted_at: string | null;
  created_at: string;
}

export interface MaintenanceActivityResponse {
  total: number;
  items: MaintenanceActivityItem[];
}

export interface ActiveBookingItem {
  booking_id: string;
  asset_tag: string;
  asset_name: string;
  booked_by: string;
  status: string;
  start_time: string;
  end_time: string;
  purpose: string | null;
}

export interface ActiveBookingsResponse {
  total: number;
  items: ActiveBookingItem[];
}
