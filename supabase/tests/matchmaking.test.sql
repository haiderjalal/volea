-- Volea end-to-end database self-check. Run against a disposable/dev database:
--   psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/matchmaking.test.sql
--
-- Covers doubles + singles, pinned + automatic venue selection, intersecting
-- windows, two-way level bands, conflicting clubs, collision-safe direct
-- bookings, owner-only results, Elo, community retention, and cleanup.

do $test$
declare
  v_ids uuid[] := array[
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(),
    gen_random_uuid(), gen_random_uuid(), gen_random_uuid()
  ];
  v_owner uuid := v_ids[7];
  v_club1 uuid := gen_random_uuid();
  v_club2 uuid := gen_random_uuid();
  v_court1 uuid := gen_random_uuid();
  v_court2 uuid := gen_random_uuid();
  v_entry public.queue_entries;
  v_match public.matches;
  v_direct public.matches;
  v_n int;
  v_t1 int;
  v_t2 int;
  v_before int;
  v_after int;
  v_windows time[][] := array[
    array['18:00'::time, '22:00'::time],
    array['19:00'::time, '23:00'::time],
    array['20:00'::time, '23:00'::time],
    array['20:30'::time, '23:00'::time]
  ];
begin
  for i in 1..7 loop
    insert into auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at
    ) values (
      v_ids[i], '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated', 'p' || i || '@volea.test', '', now(),
      '{"provider":"email"}'::jsonb,
      jsonb_build_object(
        'username', 'tester' || i,
        'full_name', case when i = 7 then 'Test Owner' else 'Tester ' || i end,
        'city', 'Volea Test City',
        'account_type', case when i = 7 then 'club_owner' else 'player' end
      ),
      now(), now()
    );
  end loop;

  if not (select is_club_owner from public.profiles where id = v_owner) then
    raise exception 'FAIL: owner signup metadata did not produce an owner profile';
  end if;

  insert into public.clubs (
    id, owner_id, name, slug, city, country, lat, lng, timezone,
    price_per_hour_cents, currency, opens_at, closes_at, status
  ) values
    (v_club1, v_owner, 'Volea Test Club A', 'volea-test-club-a',
     'Volea Test City', 'PK', 33.7, 73.0, 'Asia/Karachi',
     600000, 'PKR', '06:00', '23:30', 'active'),
    (v_club2, v_owner, 'Volea Test Club B', 'volea-test-club-b',
     'Volea Test City', 'PK', 33.71, 73.01, 'Asia/Karachi',
     700000, 'PKR', '06:00', '23:30', 'active');
  insert into public.courts (id, club_id, name) values
    (v_court1, v_club1, 'Test Court A'),
    (v_court2, v_club2, 'Test Court B');

  -- Doubles, pinned club, and the running intersection of four windows.
  for i in 1..3 loop
    perform set_config('request.jwt.claims', json_build_object('sub', v_ids[i])::text, true);
    v_entry := public.join_queue(
      current_date + 1, v_windows[i][1], v_windows[i][2],
      'doubles', v_club1, 1.0, 7.0
    );
    if v_entry.status <> 'waiting' then
      raise exception 'FAIL: doubles matched before player four';
    end if;
  end loop;

  perform set_config('request.jwt.claims', json_build_object('sub', v_ids[4])::text, true);
  v_entry := public.join_queue(
    current_date + 1, v_windows[4][1], v_windows[4][2],
    'doubles', v_club1, 1.0, 7.0
  );
  if v_entry.status <> 'matched' or v_entry.match_id is null then
    raise exception 'FAIL: fourth compatible doubles player did not complete the match';
  end if;

  select * into v_match from public.matches where id = v_entry.match_id;
  if v_match.club_id <> v_club1 or v_match.court_id <> v_court1 then
    raise exception 'FAIL: pinned club/court was not respected';
  end if;
  if (v_match.starts_at at time zone 'Asia/Karachi')::time <> '20:30'::time
     or v_match.ends_at - v_match.starts_at <> interval '90 minutes' then
    raise exception 'FAIL: running window intersection did not produce 20:30-22:00';
  end if;

  select count(*), count(*) filter (where team = 1), count(*) filter (where team = 2)
    into v_n, v_t1, v_t2
  from public.match_players where match_id = v_match.id;
  if v_n <> 4 or v_t1 <> 2 or v_t2 <> 2 then
    raise exception 'FAIL: doubles roster is %, split %/%', v_n, v_t1, v_t2;
  end if;

  -- Owner-only result, locked and applied once. Move the synthetic match into
  -- the past because production correctly refuses scores before full time.
  update public.matches
     set starts_at = now() - interval '2 hours', ends_at = now() - interval '30 minutes'
   where id = v_match.id;
  select rating into v_before from public.profiles where id = v_ids[1];
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner)::text, true);
  perform public.report_match_result(v_match.id, 1::smallint, '[[6,4],[6,3]]'::jsonb);
  select rating into v_after from public.profiles where id = v_ids[1];
  if v_after <= v_before then
    raise exception 'FAIL: winning rating did not rise (% -> %)', v_before, v_after;
  end if;
  begin
    perform public.report_match_result(v_match.id, 2::smallint, null);
    raise exception 'FAIL: the same result was applied twice';
  exception when sqlstate '22023' then null;
  end;

  -- Singles with automatic venue selection.
  for i in 5..6 loop
    perform set_config('request.jwt.claims', json_build_object('sub', v_ids[i])::text, true);
    v_entry := public.join_queue(
      current_date + 2, '10:00', '12:00', 'singles', null, 1.0, 7.0
    );
  end loop;
  if v_entry.status <> 'matched' or v_entry.match_id is null then
    raise exception 'FAIL: two compatible singles players did not match';
  end if;
  select count(*), count(*) filter (where team = 1), count(*) filter (where team = 2)
    into v_n, v_t1, v_t2
  from public.match_players where match_id = v_entry.match_id;
  if v_n <> 2 or v_t1 <> 1 or v_t2 <> 1 then
    raise exception 'FAIL: singles roster is %, split %/%', v_n, v_t1, v_t2;
  end if;

  -- Two-way level compatibility.
  update public.profiles set rating = 2500 where id = v_ids[6];
  perform set_config('request.jwt.claims', json_build_object('sub', v_ids[5])::text, true);
  perform public.join_queue(current_date + 3, '18:00', '21:00', 'singles', v_club1, 1.0, 2.5);
  perform set_config('request.jwt.claims', json_build_object('sub', v_ids[6])::text, true);
  v_entry := public.join_queue(current_date + 3, '18:00', '21:00', 'singles', v_club1, 6.0, 7.0);
  if v_entry.status <> 'waiting' then
    raise exception 'FAIL: mutually incompatible level bands matched';
  end if;

  -- Conflicting club pins.
  perform set_config('request.jwt.claims', json_build_object('sub', v_ids[5])::text, true);
  perform public.join_queue(current_date + 4, '18:00', '21:00', 'singles', v_club1, 1.0, 7.0);
  perform set_config('request.jwt.claims', json_build_object('sub', v_ids[6])::text, true);
  v_entry := public.join_queue(current_date + 4, '18:00', '21:00', 'singles', v_club2, 1.0, 7.0);
  if v_entry.status <> 'waiting' then
    raise exception 'FAIL: players who pinned different clubs matched';
  end if;

  -- Direct booking and a differently-started overlapping booking.
  perform set_config('request.jwt.claims', json_build_object('sub', v_ids[1])::text, true);
  v_direct := public.book_court(v_court1, current_date + 6, '10:00');
  if v_direct.origin <> 'direct' or v_direct.booked_by <> v_ids[1]
     or v_direct.price_total_cents <> 900000 then
    raise exception 'FAIL: direct booking snapshot is incorrect';
  end if;
  begin
    perform public.book_court(v_court1, current_date + 6, '10:30');
    raise exception 'FAIL: overlapping booking was allowed';
  exception when sqlstate '23P01' then null;
  end;

  -- Seven-day community retention.
  insert into public.community_messages (sender_id, body, created_at)
  values (v_ids[1], 'expired test message', now() - interval '8 days');
  perform public.prune_community_messages();
  if exists (select 1 from public.community_messages where body = 'expired test message') then
    raise exception 'FAIL: expired community message was not pruned';
  end if;

  raise notice 'PASS: matchmaking settings, booking collisions, owner results, rankings input and chat retention are green';

  delete from public.matches where club_id in (v_club1, v_club2);
  delete from public.clubs where id in (v_club1, v_club2);
  delete from auth.users where id = any(v_ids);
end $test$;
