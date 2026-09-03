-- =========================================================
-- EVENT SCHEDULE APP — SUPABASE SCHEMA
-- Run this in the Supabase SQL editor (or via CLI migration)
-- =========================================================

-- ---------- Extensions ----------
create extension if not exists "uuid-ossp";

-- ---------- Enums ----------
create type user_role as enum ('user', 'admin');
create type connection_status as enum ('pending', 'accepted', 'declined', 'blocked');
create type notification_type as enum (
  'connection_request',
  'connection_accepted',
  'event_invite',
  'event_updated',
  'event_reminder'
);

-- =========================================================
-- PROFILES
-- One row per auth.users row. Created automatically via trigger.
-- =========================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  full_name text,
  avatar_url text,
  bio text,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint username_format check (username ~ '^[a-zA-Z0-9_.]{3,20}$')
);

create extension if not exists pg_trgm;
create index profiles_username_idx on public.profiles using gin (username gin_trgm_ops);

-- ---------- Auto-create profile on signup ----------
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', 'user_' || substr(new.id::text, 1, 8)),
    new.raw_user_meta_data->>'full_name'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- =========================================================
-- CONNECTIONS
-- Directional request (requester -> addressee), status tracks lifecycle.
-- A connection is "active" once status = 'accepted'.
-- =========================================================
create table public.connections (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status connection_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint no_self_connection check (requester_id <> addressee_id),
  constraint unique_pair unique (requester_id, addressee_id)
);

create index connections_requester_idx on public.connections(requester_id);
create index connections_addressee_idx on public.connections(addressee_id);

create trigger connections_set_updated_at
  before update on public.connections
  for each row execute procedure public.set_updated_at();

-- Prevent duplicate reverse-direction requests (A->B and B->A both existing)
create or replace function public.prevent_duplicate_reverse_connection()
returns trigger as $$
begin
  if exists (
    select 1 from public.connections
    where requester_id = new.addressee_id
      and addressee_id = new.requester_id
      and status in ('pending', 'accepted')
  ) then
    raise exception 'A connection already exists between these users';
  end if;
  return new;
end;
$$ language plpgsql;

create trigger connections_prevent_duplicate
  before insert on public.connections
  for each row execute procedure public.prevent_duplicate_reverse_connection();

-- =========================================================
-- EVENTS
-- Owned by one user. Optionally shared with connected users via
-- event_participants. Visible to owner always; visible to a
-- participant only if they are an accepted connection of the owner.
-- =========================================================
create table public.events (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  event_date date not null,
  start_time time,
  end_time time,
  color text default '#6366f1',
  visibility text not null default 'private' check (visibility in ('private', 'shared')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index events_owner_idx on public.events(owner_id);
create index events_date_idx on public.events(event_date);

create trigger events_set_updated_at
  before update on public.events
  for each row execute procedure public.set_updated_at();

-- Which connected user(s) an event is shared with
create table public.event_participants (
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
create table public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  message text not null,
  related_id uuid, -- e.g. connection id or event id
  actor_id uuid references public.profiles(id) on delete set null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id, is_read);

-- ---------- Notify on connection request ----------
create or replace function public.notify_connection_request()
returns trigger as $$
begin
  insert into public.notifications (user_id, type, message, related_id, actor_id)
  values (
    new.addressee_id,
    'connection_request',
    (select username from public.profiles where id = new.requester_id) || ' wants to connect with you',
    new.id,
    new.requester_id
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_connection_request
  after insert on public.connections
  for each row execute procedure public.notify_connection_request();

-- ---------- Notify when accepted ----------
create or replace function public.notify_connection_accepted()
returns trigger as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    insert into public.notifications (user_id, type, message, related_id, actor_id)
    values (
      new.requester_id,
      'connection_accepted',
      (select username from public.profiles where id = new.addressee_id) || ' accepted your connection request',
      new.id,
      new.addressee_id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_connection_accepted
  after update on public.connections
  for each row execute procedure public.notify_connection_accepted();

-- ---------- Notify participants when shared event created ----------
create or replace function public.notify_event_shared()
returns trigger as $$
begin
  insert into public.notifications (user_id, type, message, related_id, actor_id)
  select
    new.user_id,
    'event_invite',
    (select username from public.profiles where id = e.owner_id) || ' shared an event: ' || e.title,
    e.id,
    e.owner_id
  from public.events e
  where e.id = new.event_id;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_event_participant_added
  after insert on public.event_participants
  for each row execute procedure public.notify_event_shared();

-- =========================================================
-- HELPER: are two users connected (accepted)?
-- =========================================================
create or replace function public.are_connected(user_a uuid, user_b uuid)
returns boolean as $$
  select exists (
    select 1 from public.connections
    where status = 'accepted'
      and ((requester_id = user_a and addressee_id = user_b)
        or (requester_id = user_b and addressee_id = user_a))
  );
$$ language sql stable security definer;

-- =========================================================
-- HELPERS: break RLS recursion between events <-> event_participants
-- =========================================================
create or replace function public.is_event_owner(p_event_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.events
    where id = p_event_id and owner_id = p_user_id
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_event_participant(p_event_id uuid, p_user_id uuid)
returns boolean as $$
  select exists (
    select 1 from public.event_participants
    where event_id = p_event_id and user_id = p_user_id
  );
$$ language sql stable security definer set search_path = public;

-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================
alter table public.profiles enable row level security;
alter table public.connections enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.notifications enable row level security;

-- ---------- helper: is current user admin ----------
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql stable security definer;

-- ---------- PROFILES policies ----------
create policy "Profiles are viewable by any authenticated user"
  on public.profiles for select
  using (auth.role() = 'authenticated');

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin());

-- ---------- CONNECTIONS policies ----------
create policy "Users can view their own connections"
  on public.connections for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id or public.is_admin());

create policy "Users can create connection requests"
  on public.connections for insert
  with check (auth.uid() = requester_id);

create policy "Addressee or requester can update connection status"
  on public.connections for update
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

create policy "Users can delete their own connections"
  on public.connections for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- ---------- EVENTS policies ----------
create policy "Owner can view own events"
  on public.events for select
  using (auth.uid() = owner_id);

create policy "Participants can view shared events"
  on public.events for select
  using ( public.is_event_participant(events.id, auth.uid()) );

create policy "Admins can view all events"
  on public.events for select
  using (public.is_admin());

create policy "Owner can insert own events"
  on public.events for insert
  with check (auth.uid() = owner_id);

create policy "Owner can update own events"
  on public.events for update
  using (auth.uid() = owner_id);

create policy "Owner can delete own events"
  on public.events for delete
  using (auth.uid() = owner_id);

-- ---------- EVENT_PARTICIPANTS policies ----------
create policy "Owner can view participants of own events"
  on public.event_participants for select
  using ( public.is_event_owner(event_id, auth.uid()) or user_id = auth.uid() );

create policy "Owner can add participants who are connected"
  on public.event_participants for insert
  with check (
    public.is_event_owner(event_id, auth.uid())
    and public.are_connected(auth.uid(), user_id)
  );

create policy "Owner can remove participants"
  on public.event_participants for delete
  using ( public.is_event_owner(event_id, auth.uid()) );

-- ---------- NOTIFICATIONS policies ----------
create policy "Users can view their own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can mark their own notifications read"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete their own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- =========================================================
-- ADMIN DASHBOARD VIEW (aggregate stats)
-- =========================================================
create or replace view public.admin_stats as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.profiles where role = 'admin') as total_admins,
  (select count(*) from public.connections where status = 'accepted') as total_connections,
  (select count(*) from public.events) as total_events,
  (select count(*) from public.profiles where created_at > now() - interval '7 days') as new_users_7d;

-- Restrict view access to admins only via security barrier function instead of
-- direct RLS on views (Postgres views don't support RLS directly) — enforce
-- in application layer by only calling this from an admin-guarded route,
-- and additionally via a SECURITY DEFINER function:
create or replace function public.get_admin_stats()
returns table (
  total_users bigint,
  total_admins bigint,
  total_connections bigint,
  total_events bigint,
  new_users_7d bigint
) as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized';
  end if;
  return query select * from public.admin_stats;
end;
$$ language plpgsql security definer;
