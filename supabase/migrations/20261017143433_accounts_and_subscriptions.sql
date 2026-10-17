-- Isolated per-account progress; no entitlement can be written by a client.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
create table public.progress_snapshots (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null check (version > 0),
  payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload->>'schema' = '1' and octet_length(payload::text) <= 2097152),
  updated_at timestamptz not null default now()
);
alter table public.progress_snapshots enable row level security;
create policy own_progress_select on public.progress_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy own_progress_insert on public.progress_snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_progress_update on public.progress_snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.progress_snapshots from public, anon, authenticated;
grant select, insert, update on public.progress_snapshots to authenticated;
grant all on public.progress_snapshots to service_role;

create function public.save_progress(expected_version bigint, snapshot jsonb) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare saved_version bigint;
begin
  if auth.uid() is null then raise exception 'authentication required' using errcode='42501'; end if;
  if expected_version < 0 then raise exception 'invalid version'; end if;
  if expected_version = 0 then
    insert into public.progress_snapshots(user_id,version,payload) values(auth.uid(),1,snapshot)
    on conflict (user_id) do nothing returning version into saved_version;
  else
    update public.progress_snapshots set payload=snapshot,version=version+1,updated_at=now()
    where user_id=auth.uid() and version=expected_version returning version into saved_version;
  end if;
  return saved_version;
end;
$$;
revoke all on function public.save_progress(bigint,jsonb) from public, anon;
grant execute on function public.save_progress(bigint,jsonb) to authenticated;

create table public.subscription_entitlements (
 user_id uuid primary key references auth.users(id) on delete cascade,
 active boolean not null default false,
 expires_at timestamptz,
 environment text not null check (environment in ('SANDBOX','PRODUCTION')),
 store text,
 checked_at timestamptz not null default now(),
 event_timestamp_ms bigint not null default 0
);
alter table public.subscription_entitlements enable row level security;
create policy own_entitlement on public.subscription_entitlements for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.subscription_entitlements from public,anon,authenticated;
grant select on public.subscription_entitlements to authenticated;
grant all on public.subscription_entitlements to service_role;

create table private.payment_events (
 event_id text primary key check(length(event_id) between 1 and 200),
 user_id uuid not null references auth.users(id) on delete cascade,
 event_timestamp_ms bigint not null,
 received_at timestamptz not null default now()
);
alter table private.payment_events enable row level security;
grant usage on schema private to service_role;
grant all on private.payment_events to service_role;
create index payment_events_user_idx on private.payment_events(user_id);

create function public.apply_payment_event(event_id text, account_id uuid, event_time bigint, entitlement_active boolean, entitlement_expiry timestamptz, entitlement_store text)
returns boolean language plpgsql security invoker set search_path='' as $$
declare inserted_count int;
begin
 insert into private.payment_events(event_id,user_id,event_timestamp_ms) values(event_id,account_id,event_time)
 on conflict do nothing;
 get diagnostics inserted_count=row_count;
 if inserted_count=0 then return false; end if;
 insert into public.subscription_entitlements(user_id,active,expires_at,environment,store,event_timestamp_ms)
 values(account_id,entitlement_active,entitlement_expiry,'SANDBOX',entitlement_store,event_time)
 on conflict(user_id) do update set active=excluded.active,expires_at=excluded.expires_at,store=excluded.store,event_timestamp_ms=excluded.event_timestamp_ms,checked_at=now()
 where subscription_entitlements.event_timestamp_ms<=excluded.event_timestamp_ms;
 return true;
end;
$$;
revoke all on function public.apply_payment_event(text,uuid,bigint,boolean,timestamptz,text) from public,anon,authenticated;
grant execute on function public.apply_payment_event(text,uuid,bigint,boolean,timestamptz,text) to service_role;
