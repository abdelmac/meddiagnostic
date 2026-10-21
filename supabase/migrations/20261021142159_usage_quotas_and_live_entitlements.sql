-- Reservations are authoritative across devices; clients cannot edit their usage.
create table private.quiz_reservations (
 user_id uuid not null references auth.users(id) on delete cascade,
 request_id uuid not null,
 usage_day date not null,
 question_count integer not null check(question_count between 1 and 200),
 premium boolean not null,
 created_at timestamptz not null default now(),
 primary key(user_id,request_id)
);
create index quiz_reservations_daily_idx on private.quiz_reservations(user_id,usage_day);
alter table private.quiz_reservations enable row level security;
revoke all on private.quiz_reservations from public,anon,authenticated;
grant all on private.quiz_reservations to service_role;

create function private.quiz_allowance() returns jsonb
language plpgsql security definer set search_path='' as $$
declare account uuid := auth.uid(); today date := (now() at time zone 'Europe/Paris')::date;
 paid boolean; used_count int;
begin
 if account is null then raise exception 'authentication required' using errcode='42501'; end if;
 select exists(select 1 from public.subscription_entitlements e where e.user_id=account and e.active
   and e.environment='PRODUCTION' and e.expires_at>now()) into paid;
 select count(*)::int into used_count from private.quiz_reservations r where r.user_id=account and r.usage_day=today;
 return jsonb_build_object('premium',paid,'used',used_count,'remaining',case when paid then null else greatest(0,3-used_count) end,
   'maxQuestions',case when paid then null else 10 end,'day',today,'resetsAt',((today+1)::timestamp at time zone 'Europe/Paris'));
end; $$;
revoke all on function private.quiz_allowance() from public,anon,authenticated;
grant usage on schema private to authenticated;
grant execute on function private.quiz_allowance() to authenticated;
create function public.get_quiz_allowance() returns jsonb language sql security invoker set search_path=''
as $$select private.quiz_allowance()$$;
revoke all on function public.get_quiz_allowance() from public,anon;
grant execute on function public.get_quiz_allowance() to authenticated;

create function private.reserve_quiz_session(request_id uuid,requested_count int) returns jsonb
language plpgsql security definer set search_path='' as $$
declare account uuid := auth.uid(); allowance jsonb; previous private.quiz_reservations%rowtype;
begin
 if account is null then raise exception 'authentication required' using errcode='42501'; end if;
 if request_id is null or requested_count is null or requested_count not between 1 and 200 then raise exception 'invalid reservation'; end if;
 -- One short lock per account also serializes sessions from different devices.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(account::text,81427));
 allowance := private.quiz_allowance();
 select * into previous from private.quiz_reservations r where r.user_id=account and r.request_id=reserve_quiz_session.request_id;
 if found then
   if previous.question_count<>requested_count then raise exception 'reservation count changed'; end if;
   return allowance || jsonb_build_object('allowed',true,'reservationId',request_id);
 end if;
 if not (allowance->>'premium')::boolean and requested_count>10 then
   return allowance || jsonb_build_object('allowed',false,'error','question_limit');
 end if;
 if not (allowance->>'premium')::boolean and (allowance->>'remaining')::int=0 then
   return allowance || jsonb_build_object('allowed',false,'error','daily_limit');
 end if;
 insert into private.quiz_reservations(user_id,request_id,usage_day,question_count,premium)
 values(account,request_id,(allowance->>'day')::date,requested_count,(allowance->>'premium')::boolean);
 return private.quiz_allowance() || jsonb_build_object('allowed',true,'reservationId',request_id);
end; $$;
revoke all on function private.reserve_quiz_session(uuid,int) from public,anon,authenticated;
grant execute on function private.reserve_quiz_session(uuid,int) to authenticated;
create function public.reserve_quiz_session(request_id uuid,requested_count int) returns jsonb
language sql security invoker set search_path='' as $$select private.reserve_quiz_session(request_id,requested_count)$$;
revoke all on function public.reserve_quiz_session(uuid,int) from public,anon;
grant execute on function public.reserve_quiz_session(uuid,int) to authenticated;

-- Production billing is distinct from sandbox: test purchases never lift public quotas.
create function public.apply_payment_event(event_id text,account_id uuid,event_time bigint,entitlement_active boolean,
 entitlement_expiry timestamptz,entitlement_store text,entitlement_environment text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare inserted_count int;
begin
 if entitlement_environment not in ('SANDBOX','PRODUCTION') or entitlement_environment is null then raise exception 'invalid environment'; end if;
 insert into private.payment_events(event_id,user_id,event_timestamp_ms) values(event_id,account_id,event_time) on conflict do nothing;
 get diagnostics inserted_count=row_count;
 if inserted_count=0 then return false; end if;
 insert into public.subscription_entitlements(user_id,active,expires_at,environment,store,event_timestamp_ms)
 values(account_id,entitlement_active,entitlement_expiry,entitlement_environment,entitlement_store,event_time)
 on conflict(user_id) do update set active=excluded.active,expires_at=excluded.expires_at,environment=excluded.environment,
 store=excluded.store,event_timestamp_ms=excluded.event_timestamp_ms,checked_at=now()
 where subscription_entitlements.event_timestamp_ms<=excluded.event_timestamp_ms
 and (excluded.environment='PRODUCTION' or subscription_entitlements.environment<>'PRODUCTION');
 return true;
end; $$;
revoke all on function public.apply_payment_event(text,uuid,bigint,boolean,timestamptz,text,text) from public,anon,authenticated;
grant execute on function public.apply_payment_event(text,uuid,bigint,boolean,timestamptz,text,text) to service_role;

-- The earlier sandbox endpoint keeps its signature while sharing the same guard.
create or replace function public.apply_payment_event(event_id text,account_id uuid,event_time bigint,entitlement_active boolean,
 entitlement_expiry timestamptz,entitlement_store text)
returns boolean language sql security invoker set search_path='' as $$
 select public.apply_payment_event(event_id,account_id,event_time,entitlement_active,entitlement_expiry,entitlement_store,'SANDBOX')
$$;
