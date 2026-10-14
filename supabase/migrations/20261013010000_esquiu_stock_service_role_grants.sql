-- Backend-only privileges. Browser roles remain denied and protected by RLS.
grant select, insert, update, delete on public.stock_snapshots to service_role;
grant select, insert, update, delete on public.stock_snapshot_items to service_role;
grant select, insert, update, delete on public.stock_item_rules to service_role;
grant select, insert, update, delete on public.replenishment_orders to service_role;
grant select, insert, update, delete on public.replenishment_order_items to service_role;

