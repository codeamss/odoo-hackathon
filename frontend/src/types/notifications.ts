export interface NotificationItem {
  id: string; type: string; title: string; body: string;
  is_read: boolean; reference_type: string | null; reference_id: string | null; created_at: string;
}
export interface NotificationListResponse { total: number; unread_count: number; items: NotificationItem[]; }

export interface ActivityLogItem {
  id: string; actor_name: string | null; actor_email: string | null;
  action: string; entity_type: string | null; entity_id: string | null;
  description: string; created_at: string;
}
export interface ActivityLogListResponse { total: number; items: ActivityLogItem[]; }
