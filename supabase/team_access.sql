-- =====================================================================
-- Team access: several people on one fleet.
-- Every member gets the same rights as the owner; only the owner can
-- invite, remove people or delete the fleet.
-- Run after schema.sql. Safe to re-run.
-- =====================================================================

create table if not exists public.fleet_members (
  id         uuid primary key default gen_random_uuid(),
  fleet_id   uuid not null references public.fleets(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  role       text not null default 'member',
  invited_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint fleet_members_unique unique (fleet_id, user_id)
);
create index if not exists fleet_members_user_idx on public.fleet_members(user_id);

create table if not exists public.fleet_invites (
  id          uuid primary key default gen_random_uuid(),
  fleet_id    uuid not null references public.fleets(id) on delete cascade,
  email       text not null,
  token       text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by  uuid references public.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  accepted_at timestamptz,
  accepted_by uuid references public.users(id) on delete set null
);
create index if not exists fleet_invites_email_idx on public.fleet_invites(lower(email));
create unique index if not exists fleet_invites_pending_idx
  on public.fleet_invites(fleet_id, lower(email)) where accepted_at is null;

-- ---------------------------------------------------------------------
-- Access = owner OR member. Every existing policy already routes through
-- this function, so all tables inherit team access from this one change.
-- SECURITY DEFINER, so reading fleet_members here does not re-enter RLS.
-- ---------------------------------------------------------------------
create or replace function public.owns_fleet(p_fleet_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.fleets f where f.id = p_fleet_id and f.owner_id = auth.uid())
      or exists (select 1 from public.fleet_members m
                  where m.fleet_id = p_fleet_id and m.user_id = auth.uid());
$$;

-- fleets: members may read the fleet; only the owner may change or delete it
alter table public.fleet_members enable row level security;
alter table public.fleet_invites enable row level security;

drop policy if exists fleets_owner on public.fleets;
drop policy if exists fleets_read  on public.fleets;
create policy fleets_read on public.fleets
  for select using (public.owns_fleet(id));

drop policy if exists fleets_write on public.fleets;
create policy fleets_write on public.fleets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists fleet_members_read on public.fleet_members;
create policy fleet_members_read on public.fleet_members
  for select using (public.owns_fleet(fleet_id));

drop policy if exists fleet_members_owner_write on public.fleet_members;
create policy fleet_members_owner_write on public.fleet_members
  for all using (exists (select 1 from public.fleets f where f.id = fleet_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.fleets f where f.id = fleet_id and f.owner_id = auth.uid()));

drop policy if exists fleet_invites_read on public.fleet_invites;
create policy fleet_invites_read on public.fleet_invites
  for select using (public.owns_fleet(fleet_id));

drop policy if exists fleet_invites_owner_write on public.fleet_invites;
create policy fleet_invites_owner_write on public.fleet_invites
  for all using (exists (select 1 from public.fleets f where f.id = fleet_id and f.owner_id = auth.uid()))
  with check (exists (select 1 from public.fleets f where f.id = fleet_id and f.owner_id = auth.uid()));

-- ---------------------------------------------------------------------
-- Signing up with a pending invite joins that fleet instead of creating
-- a new (empty) one.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_fleet_id uuid; v_invite public.fleet_invites;
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

  select * into v_invite from public.fleet_invites
   where lower(email) = lower(new.email) and accepted_at is null and expires_at > now()
   order by created_at desc limit 1;

  if v_invite.id is not null then
    insert into public.fleet_members (fleet_id, user_id, invited_by)
    values (v_invite.fleet_id, new.id, v_invite.invited_by)
    on conflict do nothing;

    update public.fleet_invites
       set accepted_at = now(), accepted_by = new.id
     where id = v_invite.id;

    insert into public.notification_preferences (fleet_id, user_id)
    values (v_invite.fleet_id, new.id)
    on conflict do nothing;

    return new;   -- joins the existing fleet; no new fleet, no duplicate types
  end if;

  insert into public.fleets (owner_id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'fleet_name', 'My Fleet'))
  returning id into v_fleet_id;

  insert into public.document_types (fleet_id, name, code, is_required, requires_expiry, sort_order) values
    (v_fleet_id, 'Insurance',               'insurance',      true,  true,  10),
    (v_fleet_id, 'CLL Insurance',           'cll_insurance',  true,  true,  15),
    (v_fleet_id, 'Fitness Certificate',     'fitness',        true,  true,  20),
    (v_fleet_id, 'Permit',                  'permit',         true,  true,  30),
    (v_fleet_id, 'PUC',                     'puc',            true,  true,  40),
    (v_fleet_id, 'Road Tax',                'road_tax',       true,  true,  50),
    (v_fleet_id, 'Registration Certificate','rc',             true,  false, 60),
    (v_fleet_id, 'Other',                   'other',          false, true,  90);

  insert into public.notification_preferences (fleet_id, user_id) values (v_fleet_id, new.id)
  on conflict do nothing;

  return new;
end $$;

-- Someone who already has an account accepts an invite link.
create or replace function public.accept_fleet_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_invite public.fleet_invites; v_email text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  select email into v_email from public.users where id = auth.uid();

  select * into v_invite from public.fleet_invites
   where token = p_token and accepted_at is null and expires_at > now();
  if v_invite.id is null then raise exception 'This invite is invalid or has expired'; end if;
  if lower(v_invite.email) <> lower(v_email) then
    raise exception 'This invite was sent to %', v_invite.email;
  end if;

  insert into public.fleet_members (fleet_id, user_id, invited_by)
  values (v_invite.fleet_id, auth.uid(), v_invite.invited_by)
  on conflict do nothing;

  update public.fleet_invites set accepted_at = now(), accepted_by = auth.uid() where id = v_invite.id;

  insert into public.notification_preferences (fleet_id, user_id)
  values (v_invite.fleet_id, auth.uid())
  on conflict do nothing;

  return v_invite.fleet_id;
end $$;

-- Member list with emails (public.users is self-read only, so this is the
-- one sanctioned way to see who else is on the fleet).
create or replace function public.list_fleet_members(p_fleet_id uuid)
returns table (user_id uuid, email text, full_name text, role text, is_owner boolean, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select u.id, u.email, u.full_name, 'owner'::text, true, f.created_at
    from public.fleets f join public.users u on u.id = f.owner_id
   where f.id = p_fleet_id and public.owns_fleet(p_fleet_id)
  union all
  select u.id, u.email, u.full_name, m.role, false, m.created_at
    from public.fleet_members m join public.users u on u.id = m.user_id
   where m.fleet_id = p_fleet_id and public.owns_fleet(p_fleet_id)
   order by 5 desc, 6;
$$;
