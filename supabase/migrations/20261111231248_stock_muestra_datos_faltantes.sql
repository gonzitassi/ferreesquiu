-- Un mínimo, sugerencia o precio de compra desconocido no equivale a cero.
alter table public.stock_item_rules alter column min_stock drop not null;
alter table public.stock_item_rules alter column suggested_quantity drop not null;
alter table public.replenishment_orders alter column total_cents drop not null;
alter table public.replenishment_order_items alter column unit_price_cents drop not null;
