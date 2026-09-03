// Starter types matching supabase/schema.sql.
// Once your project is linked, regenerate the full version with:
//   npx supabase gen types typescript --project-id <your-project-id> > src/types/supabase.ts

export type UserRole = "user" | "admin";
export type ConnectionStatus = "pending" | "accepted" | "declined" | "blocked";
export type NotificationType =
  | "connection_request"
  | "connection_accepted"
  | "event_invite"
  | "event_updated"
  | "event_reminder";

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Connection {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: ConnectionStatus;
  created_at: string;
  updated_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface EventItem {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  event_date: string; // YYYY-MM-DD
  start_time: string | null;
  end_time: string | null;
  color: string;
  visibility: "private" | "shared";
  created_at: string;
  updated_at: string;
  owner?: Profile;
}

export interface EventParticipant {
  event_id: string;
  user_id: string;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: NotificationType;
  message: string;
  related_id: string | null;
  actor_id: string | null;
  is_read: boolean;
  created_at: string;
  actor?: Profile;
}

// Minimal Database shape so `createClient<Database>()` type-checks.
// Replace with the CLI-generated version when you can.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;