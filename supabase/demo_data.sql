-- =====================================================================
-- FleetGuard demo data. Everything created here is flagged is_demo,
-- so remove_demo_data() wipes it without touching real records.
-- Run after schema.sql. Called from Settings -> Demo data.
-- =====================================================================

create or replace function public.seed_demo_data(p_fleet_id uuid)
returns integer language plpgsql security invoker set search_path = public as $$
declare
  v_regs text[] := array['TS09AB1234','TS09AB1278','TS10CD4567','TS11EF8901','TS12GH2345',
                         'AP16JK6789','AP28LM1122','KA05NP3344','KA09QR5566','MH12ST7788',
                         'MH14UV9900','TN22WX1212','TN38YZ3434','GJ01AB5656','GJ18CD7878',
                         'RJ14EF9090','UP32GH1313','DL01JK2424','KL07LM3535','TS07NP4646'];
  v_makes  text[] := array['Tata','Ashok Leyland','Eicher','BharatBenz','Mahindra'];
  v_models text[] := array['Prima','U-3718','Pro 3019','1917R','Blazo X'];
  v_names  text[] := array['Ramesh Kumar','Suresh Reddy','Anil Yadav','Mahesh Rao','Vijay Singh',
                           'Prakash Nair','Ravi Chandra','Sunil Patil','Ganesh Iyer','Naveen Kumar'];
  -- days from today for each doc slot; negative = already expired
  v_offsets int[][] := array[
    array[-45, 7, 210, 400, 95, 300],
    array[13, 150, 320, 500, 60, 240],
    array[27, 88, 410, 260, 720, 180],
    array[-3, 45, 190, 365, 540, 120],
    array[5, 33, 260, 480, 150, 610]
  ];
  v_driver_ids uuid[] := '{}';
  v_type_ids uuid[];
  v_vehicle_id uuid; v_did uuid;
  i int; j int; v_days int; v_slot int; v_type_count int;
begin
  if not public.owns_fleet(p_fleet_id) then raise exception 'Not authorised'; end if;

  select array_agg(id order by sort_order) into v_type_ids
    from public.document_types where fleet_id = p_fleet_id and is_active and is_required;
  v_type_count := coalesce(array_length(v_type_ids, 1), 0);
  if v_type_count = 0 then raise exception 'No document types configured for this fleet'; end if;

  -- drivers
  for i in 1..array_length(v_names, 1) loop
    insert into public.drivers (fleet_id, name, phone, license_number, license_expiry, is_demo)
    values (p_fleet_id, v_names[i], '9' || lpad((100000000 + i * 137)::text, 9, '0'),
            'DL-' || lpad((1000000 + i * 7919)::text, 10, '0'),
            current_date + ((i * 47) - 60), true)
    returning id into v_did;
    v_driver_ids := v_driver_ids || v_did;
  end loop;

  -- vehicles + documents
  for i in 1..array_length(v_regs, 1) loop
    insert into public.vehicles (fleet_id, registration_number, vehicle_type, make, model,
      manufacturing_year, chassis_number, engine_number, purchase_date, driver_id, is_demo)
    values (p_fleet_id, v_regs[i], case when i % 5 = 0 then 'Tipper' when i % 7 = 0 then 'Trailer' else 'Lorry' end,
      v_makes[1 + (i % 5)], v_models[1 + (i % 5)], 2018 + (i % 7),
      'MAT' || lpad((452000 + i * 311)::text, 12, '0'),
      'ENG' || lpad((78000 + i * 613)::text, 10, '0'),
      current_date - (i * 97), v_driver_ids[1 + (i % array_length(v_driver_ids, 1))], true)
    returning id into v_vehicle_id;

    v_slot := 1 + (i % 5);
    -- vehicles 18-20 deliberately miss documents (missing-document state)
    for j in 1..(case when i >= 18 then 2 else least(v_type_count, 4 + (i % 3)) end) loop
      v_days := v_offsets[v_slot][1 + ((j + i) % 6)];
      insert into public.documents (fleet_id, vehicle_id, document_type_id, document_number,
        issue_date, expiry_date, notes, is_demo)
      values (p_fleet_id, v_vehicle_id, v_type_ids[j],
        upper(left(replace(v_regs[i], ' ', ''), 4)) || '-' || lpad((100000 + i * 37 + j)::text, 6, '0'),
        current_date + v_days - 365, current_date + v_days, 'Demo record', true);
    end loop;
  end loop;

  perform public.generate_document_notifications(p_fleet_id);
  return (select count(*)::int from public.vehicles where fleet_id = p_fleet_id and is_demo);
end $$;

create or replace function public.remove_demo_data(p_fleet_id uuid)
returns void language plpgsql security invoker set search_path = public as $$
begin
  if not public.owns_fleet(p_fleet_id) then raise exception 'Not authorised'; end if;
  delete from public.documents where fleet_id = p_fleet_id and is_demo;
  delete from public.vehicles  where fleet_id = p_fleet_id and is_demo;
  delete from public.drivers   where fleet_id = p_fleet_id and is_demo;
  delete from public.notifications n
   where n.fleet_id = p_fleet_id
     and n.document_id is not null
     and not exists (select 1 from public.documents d where d.id = n.document_id);
end $$;
