-- =====================================================================
-- Migration for the live fleet (run once, after the original schema.sql):
--   * document types: drop National Permit / State Permit, add CLL Insurance
--   * Registration Certificate no longer needs an expiry date
--   * documents.expiry_date becomes optional
-- Safe to re-run.
-- =====================================================================

-- 1. document types can declare whether an expiry date applies
alter table public.document_types
  add column if not exists requires_expiry boolean not null default true;

-- 2. documents without an expiry date (e.g. RC) are now valid records
alter table public.documents alter column expiry_date drop not null;

-- 3. per-fleet type changes
do $$
declare f record;
begin
  for f in select id from public.fleets loop
    -- CLL Insurance, sorted right after Insurance
    insert into public.document_types (fleet_id, name, code, is_required, requires_expiry, sort_order)
    values (f.id, 'CLL Insurance', 'cll_insurance', true, true, 15)
    on conflict (fleet_id, code) do update
      set name = excluded.name, is_active = true;

    -- RC has no expiry date
    update public.document_types
       set requires_expiry = false
     where fleet_id = f.id and code = 'rc';

    -- remove the two permit types; keep them (deactivated) if documents exist
    update public.document_types dt
       set is_active = false
     where dt.fleet_id = f.id
       and dt.code in ('national_permit', 'state_permit')
       and exists (select 1 from public.documents d where d.document_type_id = dt.id);

    delete from public.document_types dt
     where dt.fleet_id = f.id
       and dt.code in ('national_permit', 'state_permit')
       and not exists (select 1 from public.documents d where d.document_type_id = dt.id);
  end loop;
end $$;

-- 4. notifications only for documents that actually expire
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
