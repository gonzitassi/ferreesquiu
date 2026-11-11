-- The existing sample is private; only the trusted service role can call this reader.
grant usage on schema esquiu_prueba to service_role;
grant select on esquiu_prueba.lusqtoff_alegon to service_role;
create function public.esquiu_alegon_muestra()
returns table(codigo text, marca text, descripcion text, precio_exportado text, stock_alegon text, stock_fisico_verificado boolean)
language sql stable security invoker set search_path = ''
as $$
  select p.codigo, p.marca, p.descripcion, p.precio_exportado::text, p.stock_alegon::text, p.stock_fisico_verificado
  from esquiu_prueba.lusqtoff_alegon p order by p.codigo
$$;
revoke all on function public.esquiu_alegon_muestra() from public, anon, authenticated;
grant execute on function public.esquiu_alegon_muestra() to service_role;
