-- Volea matchmaking self-check. Run against a dev database:
--   psql "$DATABASE_URL" -f supabase/tests/matchmaking.test.sql
-- Creates four @volea.test users, drives a full doubles match through the
-- queue -> court assignment -> result -> rating pipeline, asserts, then cleans up.

do $test$
declare
  v_ids uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  v_day date := current_date + 1;
  v_entry volea.queue_entries;
  v_match volea.matches;
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
  -- four players, all in Dubai
  for i in 1..4 loop
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                            email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
                            created_at, updated_at)
    values (v_ids[i], '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'p' || i || '@volea.test', '', now(), '{"provider":"email"}'::jsonb,
            jsonb_build_object('username', 'tester' || i, 'full_name', 'Tester ' || i, 'city', 'Dubai'),
            now(), now());
  end loop;

  -- players 1-3 queue up: nobody should match yet (doubles needs four)
  for i in 1..3 loop
    perform set_config('request.jwt.claims', json_build_object('sub', v_ids[i])::text, true);
    v_entry := volea.join_queue(v_day, v_windows[i][1], v_windows[i][2]);
    if v_entry.status <> 'waiting' then
      raise exception 'FAIL: player % matched with only % in queue', i, i;
    end if;
  end loop;

  -- the fourth closes it out
  perform set_config('request.jwt.claims', json_build_object('sub', v_ids[4])::text, true);
  v_entry := volea.join_queue(v_day, v_windows[4][1], v_windows[4][2]);
  if v_entry.status <> 'matched' or v_entry.match_id is null then
    raise exception 'FAIL: fourth player did not complete the match (status=%)', v_entry.status;
  end if;

  select * into v_match from volea.matches where id = v_entry.match_id;

  -- the shared window is 20:30-22:00, so the slot must start at 20:30 Dubai time
  if (v_match.starts_at at time zone 'Asia/Dubai')::time <> '20:30'::time then
    raise exception 'FAIL: slot started at %, expected 20:30', (v_match.starts_at at time zone 'Asia/Dubai')::time;
  end if;
  if v_match.ends_at - v_match.starts_at <> interval '90 minutes' then
    raise exception 'FAIL: slot was % long, expected 90 minutes', v_match.ends_at - v_match.starts_at;
  end if;
  if v_match.court_id is null then
    raise exception 'FAIL: no court assigned';
  end if;
  if v_match.price_total_cents <= 0 then
    raise exception 'FAIL: match carries no price snapshot';
  end if;

  select count(*), count(*) filter (where team = 1), count(*) filter (where team = 2)
    into v_n, v_t1, v_t2
  from volea.match_players where match_id = v_match.id;
  if v_n <> 4 or v_t1 <> 2 or v_t2 <> 2 then
    raise exception 'FAIL: expected 2v2, got % players (%/%)', v_n, v_t1, v_t2;
  end if;

  -- all four queue rows must now be settled
  select count(*) into v_n from volea.queue_entries
   where match_id = v_match.id and status = 'matched';
  if v_n <> 4 then
    raise exception 'FAIL: % of 4 queue entries marked matched', v_n;
  end if;

  -- report a result and confirm ratings actually move
  select rating into v_before from volea.profiles
   where id = (select player_id from volea.match_players where match_id = v_match.id and team = 1 limit 1);

  perform set_config('request.jwt.claims', json_build_object('sub', v_ids[1])::text, true);
  perform volea.report_match_result(v_match.id, 1::smallint, '[[6,4],[6,3]]'::jsonb);

  select rating into v_after from volea.profiles
   where id = (select player_id from volea.match_players where match_id = v_match.id and team = 1 limit 1);
  if v_after <= v_before then
    raise exception 'FAIL: winner rating did not rise (% -> %)', v_before, v_after;
  end if;

  select count(*) into v_n from volea.profiles
   where id = any(v_ids) and matches_played = 1;
  if v_n <> 4 then
    raise exception 'FAIL: only % of 4 players had a match counted', v_n;
  end if;

  -- a second report on a settled match must be refused
  begin
    perform volea.report_match_result(v_match.id, 2::smallint, null);
    raise exception 'FAIL: double-reporting a result was allowed';
  exception when sqlstate '22023' then null;
  end;

  raise notice 'PASS: queue -> 2v2 match -> court -> result -> rating all green';

  -- cleanup
  delete from volea.matches where id = v_match.id;
  delete from auth.users where id = any(v_ids);
end $test$;
