-- =====================================================================
-- FleetGuard - schema, indexes, RLS, triggers, functions, storage
-- Run in Supabase SQL editor (or `supabase db push`) on a fresh project.
-- Safe to re-run.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- users
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  phone       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.fleets (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.users(id) on delete cascade,
  name        text not null default 'My Fleet',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists fleets_owner_id_idx on public.fleets(owner_id);

-- -------------------------------------------------------------- drivers
create table if not exists public.drivers (
  id             uuid primary key default gen_random_uuid(),
  fleet_id       uuid not null references public.fleets(id) on delete cascade,
  name           text not null,
  phone          text,
  license_number text,
  license_expiry date,
  notes          text,
  is_demo        boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists drivers_fleet_id_idx on public.drivers(fleet_id);
create index if not exists drivers_phone_idx   on public.drivers(phone);

-- ------------------------------------------------------------- vehicles
create table if not exists public.vehicles (
  id                  uuid primary key default gen_random_uuid(),
  fleet_id            uuid not null references public.fleets(id) on delete cascade,
  registration_number text not null,
  vehicle_type        text not null default 'Lorry',
  make                text,
  model               text,
  manufacturing_year  integer,
  chassis_number      text,
  engine_number       text,
  purchase_date       date,
  driver_id           uuid references public.drivers(id) on delete set null,
  notes               text,
  is_demo             boolean not null default false,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint vehicles_reg_unique unique (fleet_id, registration_number)
);
create index if not exists vehicles_registration_number_idx on public.vehicles(registration_number);
create index if not exists vehicles_fleet_id_idx on public.vehicles(fleet_id);
create index if not exists vehicles_driver_id_idx on public.vehicles(driver_id);

-- ------------------------------------------------------- document types
-- Configurable per fleet: add/disable types without code changes.
create table if not exists public.document_types (
  id          uuid primary key default gen_random_uuid(),
  fleet_id    uuid not null references public.fleets(id) on delete cascade,
  name        text not null,
  code        text not null,
  is_required boolean not null default true,
  requires_expiry boolean not null default true,
  sort_order  integer not null default 100,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint document_types_code_unique unique (fleet_id, code)
);
create index if not exists document_types_fleet_id_idx on public.document_types(fleet_id);

-- ------------------------------------------------------------ documents
create table if not exists public.documents (
  id                uuid primary key default gen_random_uuid(),
  fleet_id          uuid not null references public.fleets(id) on delete cascade,
  vehicle_id        uuid not null references public.vehicles(id) on delete cascade,
  document_type_id  uuid not null references public.document_types(id) on delete restrict,
  document_number   text,
  issue_date        date,
  expiry_date       date,
  file_path         text,
  file_name         text,
  file_size         integer,
  file_mime         text,
  notes             text,
  is_current        boolean not null default true,
  replaced_at       timestamptz,
  previous_document_id uuid references public.documents(id) on delete set null,
  created_by        uuid references public.users(id) on delete set null,
  is_demo           boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint documents_dates_check check (issue_date is null or issue_date <= expiry_date)
);
create index if not exists documents_vehicle_id_idx       on public.documents(vehicle_id);
create index if not exists documents_expiry_date_idx      on public.documents(expiry_date);
create index if not exists documents_document_type_id_idx on public.documents(document_type_id);
create index if not exists documents_fleet_id_idx         on public.documents(fleet_id);
create index if not exists documents_number_idx           on public.documents(document_number);
-- one CURRENT document per (vehicle, type); history rows keep is_current = false
create unique index if not exists documents_one_current_idx
  on public.documents(vehicle_id, document_type_id) where is_current;

-- ---------------------------------------------------- document history
create table if not exists public.document_history (
  id                       uuid primary key default gen_random_uuid(),
  fleet_id                 uuid not null references public.fleets(id) on delete cascade,
  vehicle_id               uuid not null references public.vehicles(id) on delete cascade,
  document_id              uuid references public.documents(id) on delete set null,
  replacement_document_id  uuid references public.documents(id) on delete set null,
  document_type_id         uuid references public.document_types(id) on delete set null,
  document_number          text,
  issue_date               date,
  expiry_date              date,
  file_path                text,
  file_name                text,
  note                     text,
  replaced_at              timestamptz not null default now(),
  replaced_by              uuid references public.users(id) on delete set null
);
create index if not exists document_history_vehicle_id_idx on public.document_history(vehicle_id);
create index if not exists document_history_document_id_idx on public.document_history(document_id);

-- -------------------------------------------------------- notifications
-- channel is 'in_app' today; email/sms/whatsapp rows can be queued later
-- by a scheduled job without a schema change.
create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  fleet_id       uuid not null references public.fleets(id) on delete cascade,
  vehicle_id     uuid references public.vehicles(id) on delete cascade,
  document_id    uuid references public.documents(id) on delete cascade,
  driver_id      uuid references public.drivers(id) on delete cascade,
  type           text not null default 'document_expiry',
  severity       text not null default 'warning',
  threshold_days integer,
  title          text not null,
  body           text,
  channel        text not null default 'in_app',
  scheduled_for  date not null default current_date,
  sent_at        timestamptz,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);
create index if not exists notifications_fleet_unread_idx on public.notifications(fleet_id, read_at);
create unique index if not exists notifications_dedupe_idx
  on public.notifications(document_id, threshold_days, channel) where document_id is not null;

create table if not exists public.notification_preferences (
  id                uuid primary key default gen_random_uuid(),
  fleet_id          uuid not null references public.fleets(id) on delete cascade,
  user_id           uuid not null references public.users(id) on delete cascade,
  in_app_enabled    boolean not null default true,
  email_enabled     boolean not null default false,
  sms_enabled       boolean not null default false,
  whatsapp_enabled  boolean not null default false,
  lead_days         integer[] not null default '{60,30,15,7,1,0}',
  updated_at        timestamptz not null default now(),
  constraint notification_preferences_unique unique (fleet_id, user_id)
);

-- ----------------------------------------------------------- audit logs
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  fleet_id    uuid not null references public.fleets(id) on delete cascade,
  user_id     uuid references public.users(id) on delete set null,
  action      text not null,
  entity_type text not null,
  entity_id   uuid,
  meta        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_fleet_created_idx on public.audit_logs(fleet_id, created_at desc);

-- =====================================================================
-- updated_at triggers
-- =====================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['users','fleets','drivers','vehicles','document_types','documents']
  loop
    execute format('drop trigger if exists set_updated_at on public.%I', t);
    execute format('create trigger set_updated_at before update on public.%I
                    for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- =====================================================================
-- New user bootstrap: profile + fleet + default document types + prefs
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_fleet_id uuid;
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;

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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- RLS - a user only ever sees fleets they own
-- =====================================================================
create or replace function public.owns_fleet(p_fleet_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.fleets f where f.id = p_fleet_id and f.owner_id = auth.uid());
$$;

alter table public.users                    enable row level security;
alter table public.fleets                   enable row level security;
alter table public.drivers                  enable row level security;
alter table public.vehicles                 enable row level security;
alter table public.document_types           enable row level security;
alter table public.documents                enable row level security;
alter table public.document_history         enable row level security;
alter table public.notifications            enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.audit_logs               enable row level security;

drop policy if exists users_self on public.users;
create policy users_self on public.users
  for all using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists fleets_owner on public.fleets;
create policy fleets_owner on public.fleets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['drivers','vehicles','document_types','documents',
                           'document_history','notifications','notification_preferences','audit_logs']
  loop
    execute format('drop policy if exists %I_fleet_scoped on public.%I', t, t);
    execute format($f$create policy %I_fleet_scoped on public.%I
                     for all using (public.owns_fleet(fleet_id))
                     with check (public.owns_fleet(fleet_id))$f$, t, t);
  end loop;
end $$;

-- =====================================================================
-- Storage: private bucket, files namespaced by fleet id
--   path = {fleet_id}/{vehicle_id}/{uuid}.{ext}
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760,
        array['application/pdf','image/jpeg','image/jpg','image/png'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists documents_bucket_fleet_scoped on storage.objects;
create policy documents_bucket_fleet_scoped on storage.objects
  for all to authenticated
  using (bucket_id = 'documents' and public.owns_fleet(((storage.foldername(name))[1])::uuid))
  with check (bucket_id = 'documents' and public.owns_fleet(((storage.foldername(name))[1])::uuid));

-- =====================================================================
-- renew_document: never overwrite - archive the old row, create the new
-- =====================================================================
create or replace function public.renew_document(
  p_document_id     uuid,
  p_document_number text,
  p_issue_date      date,
  p_expiry_date     date,
  p_file_path       text default null,
  p_file_name       text default null,
  p_file_size       integer default null,
  p_file_mime       text default null,
  p_notes           text default null
) returns uuid language plpgsql security invoker set search_path = public as $$
declare old_doc public.documents; new_id uuid;
begin
  select * into old_doc from public.documents where id = p_document_id;
  if old_doc.id is null then raise exception 'Document not found'; end if;

  update public.documents
     set is_current = false, replaced_at = now()
   where id = old_doc.id;

  insert into public.documents (fleet_id, vehicle_id, document_type_id, document_number,
    issue_date, expiry_date, file_path, file_name, file_size, file_mime, notes,
    is_current, previous_document_id, created_by, is_demo)
  values (old_doc.fleet_id, old_doc.vehicle_id, old_doc.document_type_id, p_document_number,
    p_issue_date, p_expiry_date, coalesce(p_file_path, old_doc.file_path),
    coalesce(p_file_name, old_doc.file_name), p_file_size, p_file_mime, p_notes,
    true, old_doc.id, auth.uid(), false)
  returning id into new_id;

  insert into public.document_history (fleet_id, vehicle_id, document_id, replacement_document_id,
    document_type_id, document_number, issue_date, expiry_date, file_path, file_name, replaced_by)
  values (old_doc.fleet_id, old_doc.vehicle_id, old_doc.id, new_id, old_doc.document_type_id,
    old_doc.document_number, old_doc.issue_date, old_doc.expiry_date, old_doc.file_path,
    old_doc.file_name, auth.uid());

  insert into public.audit_logs (fleet_id, user_id, action, entity_type, entity_id, meta)
  values (old_doc.fleet_id, auth.uid(), 'document.renewed', 'document', new_id,
          jsonb_build_object('previous_document_id', old_doc.id,
                             'previous_expiry', old_doc.expiry_date,
                             'new_expiry', p_expiry_date));
  return new_id;
end $$;

-- =====================================================================
-- Notification generation (idempotent). Called on app load today; the
-- same function is what a pg_cron / Edge Function job would call to fan
-- out to email / sms / whatsapp later.
-- =====================================================================
create or replace function public.generate_document_notifications(p_fleet_id uuid)
returns integer language plpgsql security invoker set search_path = public as $$
declare v_inserted integer := 0; v_lead integer[];
begin
  if not public.owns_fleet(p_fleet_id) then raise exception 'Not authorised'; end if;

  select lead_days into v_lead from public.notification_preferences
   where fleet_id = p_fleet_id limit 1;
  v_lead := coalesce(v_lead, '{60,30,15,7,1,0}');

  with candidates as (
    select d.id, d.fleet_id, d.vehicle_id, d.expiry_date,
           v.registration_number, dt.name as type_name,
           (d.expiry_date - current_date) as days_left
      from public.documents d
      join public.vehicles v on v.id = d.vehicle_id
      join public.document_types dt on dt.id = d.document_type_id
     where d.fleet_id = p_fleet_id and d.is_current and d.expiry_date is not null
  ), matched as (
    select c.*,
           case when c.days_left < 0 then -1
                else (select min(l) from unnest(v_lead) l where l >= c.days_left) end as threshold
      from candidates c
     where c.days_left < 0 or exists (select 1 from unnest(v_lead) l where l >= c.days_left and c.days_left <= 60)
  )
  insert into public.notifications (fleet_id, vehicle_id, document_id, type, severity,
                                    threshold_days, title, body, scheduled_for)
  select m.fleet_id, m.vehicle_id, m.id, 'document_expiry',
         case when m.days_left < 0 then 'expired'
              when m.days_left <= 7 then 'critical'
              when m.days_left <= 30 then 'warning' else 'info' end,
         m.threshold,
         case when m.days_left < 0
              then m.type_name || ' expired for ' || m.registration_number
              else m.type_name || ' expires in ' || m.days_left || ' day(s) for ' || m.registration_number end,
         'Expiry date ' || to_char(m.expiry_date, 'DD Mon YYYY'),
         current_date
    from matched m
  on conflict do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted;
end $$;
