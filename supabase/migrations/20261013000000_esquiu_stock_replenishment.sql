-- ESQUIU only: stock snapshots imported from Alegon and supplier orders live here.
-- No API writes to Alegon are implemented. Data API access remains backend-only.

create table if not exists public.stock_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null check (length(source) <= 150),
  item_count integer not null check (item_count between 1 and 500),
  imported_by text not null,
  imported_at bigint not null
);
create index if not exists idx_stock_snapshots_imported_at
  on public.stock_snapshots (imported_at desc);

create table if not exists public.stock_snapshot_items (
  snapshot_id uuid not null references public.stock_snapshots(id) on delete cascade,
  sku text not null check (length(sku) between 1 and 80),
  product_name text not null check (length(product_name) between 1 and 240),
  category text not null default '',
  current_stock numeric(12,3) not null check (current_stock >= 0),
  min_stock numeric(12,3) check (min_stock is null or min_stock >= 0),
  supplier text not null default '',
  price_cents bigint not null check (price_cents >= 0),
  primary key (snapshot_id, sku)
);
create index if not exists idx_stock_snapshot_items_name
  on public.stock_snapshot_items (snapshot_id, product_name);

create table if not exists public.stock_item_rules (
  sku text primary key,
  min_stock numeric(12,3) not null check (min_stock >= 0),
  supplier_override text,
  suggested_quantity numeric(12,3) not null check (suggested_quantity >= 0),
  updated_by text not null,
  updated_at bigint not null
);

create table if not exists public.replenishment_orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  supplier text not null,
  status text not null check (status in ('draft', 'sent', 'received')),
  item_count integer not null check (item_count between 1 and 200),
  total_cents bigint not null check (total_cents >= 0),
  created_by text not null,
  created_at bigint not null,
  sent_at bigint,
  received_at bigint
);
create index if not exists idx_replenishment_orders_created_at
  on public.replenishment_orders (created_at desc);
create index if not exists idx_replenishment_orders_supplier_status
  on public.replenishment_orders (supplier, status);

create table if not exists public.replenishment_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.replenishment_orders(id) on delete cascade,
  sku text not null,
  product_name text not null,
  quantity numeric(12,3) not null check (quantity > 0),
  unit_price_cents bigint not null check (unit_price_cents >= 0)
);
create index if not exists idx_replenishment_order_items_order
  on public.replenishment_order_items (order_id);

alter table public.stock_snapshots enable row level security;
alter table public.stock_snapshot_items enable row level security;
alter table public.stock_item_rules enable row level security;
alter table public.replenishment_orders enable row level security;
alter table public.replenishment_order_items enable row level security;

revoke all on public.stock_snapshots, public.stock_snapshot_items,
  public.stock_item_rules, public.replenishment_orders,
  public.replenishment_order_items from anon, authenticated;

create policy "No direct client access to stock snapshots"
  on public.stock_snapshots for all to anon, authenticated
  using (false) with check (false);
create policy "No direct client access to stock snapshot items"
  on public.stock_snapshot_items for all to anon, authenticated
  using (false) with check (false);
create policy "No direct client access to stock rules"
  on public.stock_item_rules for all to anon, authenticated
  using (false) with check (false);
create policy "No direct client access to replenishment orders"
  on public.replenishment_orders for all to anon, authenticated
  using (false) with check (false);
create policy "No direct client access to replenishment order items"
  on public.replenishment_order_items for all to anon, authenticated
  using (false) with check (false);

