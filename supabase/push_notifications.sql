-- =====================================================================
-- Web push: device subscriptions + a service-role path for the daily job.
-- Run after schema.sql. Safe to re-run.
-- =====================================================================

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  fleet_id    uuid not null references public.fleets(id) on delete cascade,
  user_id     uuid not null references public.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_used_at timestamptz
);
create index if not exists push_subscriptions_fleet_idx on public.push_subscriptions(fleet_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_fleet_scoped on public.push_subscriptions;
create policy push_subscriptions_fleet_scoped on public.push_subscriptions
  for all using (public.owns_fleet(fleet_id)) with check (public.owns_fleet(fleet_id));

-- The nightly job runs with the service role, which has no auth.uid().
-- Keep the ownership check for real users, skip it for the service role.
create or replace function public.generate_document_notifications(p_fleet_id uuid)
returns integer language plpgsql security invoker set search_path = public as $$
declare v_inserted integer := 0; v_lead integer[];
begin
  if auth.uid() is not null and not public.owns_fleet(p_fleet_id) then
    raise exception 'Not authorised';
  end if;

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
