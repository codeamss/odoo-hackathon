import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import type { Booking, BookingCreatePayload, BookingListResponse, CalendarSlot } from "@/types/bookings";

export function useBookings(params?: { asset_id?: string; status?: string; my_only?: boolean }) {
  return useQuery<BookingListResponse>({
    queryKey: ["bookings", params],
    queryFn: async () => {
      const { data } = await apiClient.get<BookingListResponse>("/bookings", { params });
      return data;
    },
  });
}

export function useCalendar(assetId: string | null) {
  return useQuery<CalendarSlot[]>({
    queryKey: ["booking-calendar", assetId],
    queryFn: async () => {
      const { data } = await apiClient.get<CalendarSlot[]>(`/bookings/calendar/${assetId}`);
      return data;
    },
    enabled: !!assetId,
  });
}

export function useCreateBooking() {
  const qc = useQueryClient();
  return useMutation<Booking, Error, BookingCreatePayload>({
    mutationFn: async (payload) => {
      const { data } = await apiClient.post<Booking>("/bookings", payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["booking-calendar"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}

export function useUpdateBooking() {
  const qc = useQueryClient();
  return useMutation<Booking, Error, { id: string; start_time?: string; end_time?: string; purpose?: string }>({
    mutationFn: async ({ id, ...payload }) => {
      const { data } = await apiClient.patch<Booking>(`/bookings/${id}`, payload);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["booking-calendar"] }); },
  });
}

export function useCancelBooking() {
  const qc = useQueryClient();
  return useMutation<Booking, Error, string>({
    mutationFn: async (id) => {
      const { data } = await apiClient.post<Booking>(`/bookings/${id}/cancel`);
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["bookings"] }); qc.invalidateQueries({ queryKey: ["booking-calendar"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
  });
}
