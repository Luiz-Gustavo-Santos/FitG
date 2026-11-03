import type { Activity } from '../../types';

export interface StravaActivity {
  id: number;
  name: string;
  sport_type: string;
  start_date: string;
  elapsed_time: number;
  distance?: number;
  average_heartrate?: number;
  calories?: number;
}
export interface StravaAdapter {
  status(): Promise<{ connected: boolean }>;
  listActivities(after?: string): Promise<StravaActivity[]>;
  disconnect(): Promise<void>;
}
export interface ActivityMapper<External> {
  map(activity: External): Activity;
}
export interface SyncService {
  sync(): Promise<{ imported: number; skipped: number; needsReview: Activity[] }>;
}
