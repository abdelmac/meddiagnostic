-- Stripe identifiers and locks are never exposed through the Data API.
create table private.stripe_customers (
 user_id uuid not null references auth.users(id) on delete cascade,
 environment text not null check(environment in ('SANDBOX','PRODUCTION')),
 customer_id text not null check(customer_id ~ '^cus_[A-Za-z0-9]+$'),
 created_at timestamptz not null default now(),
 primary key(user_id,environment),
 unique(customer_id,environment)
);
alter table private.stripe_customers enable row level security;
revoke all on private.stripe_customers from public,anon,authenticated;
grant all on private.stripe_customers to service_role;

create table private.stripe_billing_leases (
 user_id uuid not null references auth.users(id) on delete cascade,
 environment text not null check(environment in ('SANDBOX','PRODUCTION')),
 lease_id uuid not null,
 expires_at timestamptz not null,
 primary key(user_id,environment)
);
alter table private.stripe_billing_leases enable row level security;
revoke all on private.stripe_billing_leases from public,anon,authenticated;
grant all on private.stripe_billing_leases to service_role;

create table private.stripe_checkout_attempts (
 user_id uuid not null references auth.users(id) on delete cascade,
 environment text not null check(environment in ('SANDBOX','PRODUCTION')),
 attempt_id uuid not null,
 price_id text not null check(price_id ~ '^price_[A-Za-z0-9]+$'),
 language text not null check(language in ('fr','en')),
 expires_at bigint not null,
 session_id text,
 primary key(user_id,environment)
);
alter table private.stripe_checkout_attempts enable row level security;
revoke all on private.stripe_checkout_attempts from public,anon,authenticated;
grant all on private.stripe_checkout_attempts to service_role;

create function public.get_stripe_customer(account_id uuid,billing_environment text)
returns text language sql security invoker set search_path='' as $$
 select c.customer_id from private.stripe_customers c where c.user_id=account_id and c.environment=billing_environment
$$;
create function public.put_stripe_customer(account_id uuid,billing_environment text,stripe_customer_id text)
returns text language plpgsql security invoker set search_path='' as $$
begin
 insert into private.stripe_customers(user_id,environment,customer_id)
 values(account_id,billing_environment,stripe_customer_id) on conflict(user_id,environment) do nothing;
 return public.get_stripe_customer(account_id,billing_environment);
end; $$;
create function public.stripe_account_for_customer(stripe_customer_id text,billing_environment text)
returns uuid language sql security invoker set search_path='' as $$
 select c.user_id from private.stripe_customers c where c.customer_id=stripe_customer_id and c.environment=billing_environment
$$;
create function public.acquire_stripe_billing(account_id uuid,billing_environment text,requested_lease uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare locked_id uuid;
begin
 insert into private.stripe_billing_leases(user_id,environment,lease_id,expires_at)
 values(account_id,billing_environment,requested_lease,clock_timestamp()+interval '120 seconds')
 on conflict(user_id,environment) do update set lease_id=excluded.lease_id,expires_at=excluded.expires_at
 where stripe_billing_leases.expires_at<clock_timestamp()
 returning lease_id into locked_id;
 return locked_id is not null;
end; $$;
create function public.release_stripe_billing(account_id uuid,billing_environment text,requested_lease uuid)
returns void language sql security invoker set search_path='' as $$
 delete from private.stripe_billing_leases l where l.user_id=account_id and l.environment=billing_environment and l.lease_id=requested_lease
$$;

-- Persist the exact provider request identity before the HTTP call. If its
-- response is lost, retry with identical parameters and idempotency key.
create function public.stripe_checkout_attempt(account_id uuid,billing_environment text,requested_price text,requested_language text,replace_attempt boolean)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare attempt private.stripe_checkout_attempts%rowtype;
begin
 insert into private.stripe_checkout_attempts(user_id,environment,attempt_id,price_id,language,expires_at)
 values(account_id,billing_environment,pg_catalog.gen_random_uuid(),requested_price,requested_language,
   floor(extract(epoch from clock_timestamp()))::bigint+3600)
 on conflict(user_id,environment) do update set attempt_id=excluded.attempt_id,price_id=excluded.price_id,
 language=excluded.language,expires_at=excluded.expires_at,session_id=null
 where replace_attempt or stripe_checkout_attempts.expires_at<extract(epoch from clock_timestamp())+1801;
 select * into strict attempt from private.stripe_checkout_attempts a where a.user_id=account_id and a.environment=billing_environment;
 return jsonb_build_object('attemptId',attempt.attempt_id,'priceId',attempt.price_id,'language',attempt.language,
   'expiresAt',attempt.expires_at,'sessionId',attempt.session_id);
end; $$;
create function public.save_stripe_checkout(account_id uuid,billing_environment text,requested_attempt uuid,checkout_session text)
returns void language sql security invoker set search_path='' as $$
 update private.stripe_checkout_attempts a set session_id=checkout_session
 where a.user_id=account_id and a.environment=billing_environment and a.attempt_id=requested_attempt
$$;

revoke all on function public.get_stripe_customer(uuid,text),public.put_stripe_customer(uuid,text,text),
 public.stripe_account_for_customer(text,text),public.acquire_stripe_billing(uuid,text,uuid),public.release_stripe_billing(uuid,text,uuid)
 from public,anon,authenticated;
grant execute on function public.get_stripe_customer(uuid,text),public.put_stripe_customer(uuid,text,text),
 public.stripe_account_for_customer(text,text),public.acquire_stripe_billing(uuid,text,uuid),public.release_stripe_billing(uuid,text,uuid)
 to service_role;
revoke all on function public.stripe_checkout_attempt(uuid,text,text,text,boolean),public.save_stripe_checkout(uuid,text,uuid,text) from public,anon,authenticated;
grant execute on function public.stripe_checkout_attempt(uuid,text,text,text,boolean),public.save_stripe_checkout(uuid,text,uuid,text) to service_role;
