export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
export type ComputedStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface AssetBrief { id: string; asset_tag: string; name: string; location: string | null; }
export interface UserBrief { id: string; full_name: string; email: string; }

export interface Booking {
  id: string;
  asset_id: string;
  asset: AssetBrief;
  booked_by_id: string;
  booked_by: UserBrief;
  status: BookingStatus;
  start_time: string;
  end_time: string;
  purpose: string | null;
  computed_status: ComputedStatus;
  created_at: string;
  updated_at: string;
}

export interface BookingListResponse { total: number; items: Booking[]; }

export interface CalendarSlot {
  booking_id: string;
  booked_by_name: string;
  status: string;
  start_time: string;
  end_time: string;
  purpose: string | null;
}

export interface BookingCreatePayload {
  asset_id: string;
  start_time: string;
  end_time: string;
  purpose?: string;
}
