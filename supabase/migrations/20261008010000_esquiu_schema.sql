-- ESQUIU: separate Supabase schema. The existing LubriApp Supabase project is not referenced.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text not null unique,
  name text not null,
  brand text not null default '',
  description text not null default '',
  category text not null default '',
  price_cents bigint not null check (price_cents >= 0),
  image text,
  published boolean not null default false,
  active boolean not null default true,
  offer boolean not null default false,
  version integer not null default 1,
  source text not null default 'manual',
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists idx_products_public_category
  on public.products (published, active, category);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  idempotency_key text not null unique,
  request_hash text not null,
  token_hash text not null,
  status text not null default 'pending' check (status in ('pending','confirmed','awaiting_payment','paid','fulfilled','cancelled')),
  email text not null,
  first_name text not null,
  last_name text not null,
  phone text not null default '',
  delivery text not null check (delivery in ('pickup','shipping')),
  address_json jsonb not null default '{}'::jsonb,
  notes text not null default '',
  subtotal_cents bigint not null check (subtotal_cents >= 0),
  shipping_cents bigint check (shipping_cents is null or shipping_cents >= 0),
  discount_cents bigint not null default 0 check (discount_cents >= 0),
  coupon text,
  payment_method text,
  payment_note text,
  version integer not null default 1,
  created_at bigint not null,
  updated_at bigint not null
);
create index if not exists idx_orders_status_created on public.orders (status, created_at desc);
create index if not exists idx_orders_email on public.orders (email);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  product_id uuid not null references public.products(id),
  sku text not null,
  name text not null,
  quantity integer not null check (quantity between 1 and 99),
  unit_cents bigint not null check (unit_cents >= 0)
);
create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_order_items_product on public.order_items (product_id);

create table if not exists public.settings (
  key text primary key,
  value jsonb not null,
  updated_at bigint not null,
  version integer not null default 1
);
create table if not exists public.staff (
  email text primary key,
  user_id uuid unique references auth.users(id) on delete set null,
  name text not null default '',
  role text not null check (role in ('owner','admin','catalog','orders')),
  active boolean not null default true,
  created_at bigint not null
);
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  content_type text not null check (content_type in ('image/png','image/jpeg','image/webp')),
  size bigint not null check (size between 1 and 5000000),
  name text not null,
  created_by text not null,
  created_at bigint not null
);
create table if not exists public.audit (
  id uuid primary key default gen_random_uuid(),
  actor text not null,
  action text not null,
  resource text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at bigint not null
);
create index if not exists idx_audit_created on public.audit (created_at desc);
create table if not exists public.imports (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  count integer not null check (count >= 0),
  created_by text not null,
  created_at bigint not null
);
create table if not exists public.coupons (
  code text primary key,
  percent integer not null check (percent between 1 and 100),
  active boolean not null default true,
  expires_at bigint,
  version integer not null default 1
);
create table if not exists public.rate_limits (
  key text primary key,
  hits integer not null check (hits >= 0),
  expires_at bigint not null
);

-- All writes and sensitive reads go through the authenticated Edge Function.
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.settings enable row level security;
alter table public.staff enable row level security;
alter table public.media enable row level security;
alter table public.audit enable row level security;
alter table public.imports enable row level security;
alter table public.coupons enable row level security;
alter table public.rate_limits enable row level security;

revoke all on all tables in schema public from anon, authenticated;
grant select on public.products to anon, authenticated;
create policy "Public can read published active products"
  on public.products for select to anon, authenticated
  using (published and active);

create policy "No direct client access to orders"
  on public.orders for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to order items"
  on public.order_items for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to settings"
  on public.settings for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to staff"
  on public.staff for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to media metadata"
  on public.media for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to audit log"
  on public.audit for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to imports"
  on public.imports for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to coupons"
  on public.coupons for all to anon, authenticated using (false) with check (false);
create policy "No direct client access to rate limits"
  on public.rate_limits for all to anon, authenticated using (false) with check (false);

-- The Supabase dashboard's automatic-RLS toggle creates a SECURITY DEFINER helper.
-- Keep its trigger usable, but prevent direct invocation through the public API.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('esquiu-images', 'esquiu-images', true, 5000000, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read ESQUIU product images" on storage.objects;
create policy "Public can read ESQUIU product images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'esquiu-images');
-- No client-side upload policy is granted. Authenticated admin uploads use the server-side service role.
