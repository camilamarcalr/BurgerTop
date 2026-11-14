-- BurgerTop: perfis e pedidos privados por conta. Senhas pertencem ao Supabase Auth.
create schema if not exists burgertop_private;
revoke all on schema burgertop_private from public, anon, authenticated;
grant usage on schema burgertop_private to authenticated;

create table public.bt_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bt_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null,
  status text not null default 'registered' check (status = 'registered'),
  total_cents integer not null check (total_cents > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, request_id)
);
create index bt_orders_user_created_idx on public.bt_orders(user_id, created_at desc);

create table public.bt_order_items (
  id bigint generated always as identity primary key,
  order_id uuid not null references public.bt_orders(id) on delete cascade,
  product_id text not null,
  product_name text not null check (char_length(product_name) between 1 and 80),
  unit_price_cents integer not null check (unit_price_cents > 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_cents integer generated always as (unit_price_cents * quantity) stored,
  created_at timestamptz not null default now(),
  unique (order_id, product_id)
);

alter table public.bt_profiles enable row level security;
alter table public.bt_orders enable row level security;
alter table public.bt_order_items enable row level security;

create policy bt_profiles_select_own on public.bt_profiles
for select to authenticated using ((select auth.uid()) = id);
create policy bt_profiles_update_own on public.bt_profiles
for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy bt_orders_select_own on public.bt_orders
for select to authenticated using ((select auth.uid()) = user_id);
create policy bt_order_items_select_own on public.bt_order_items
for select to authenticated using (exists (
  select 1 from public.bt_orders orders
  where orders.id = order_id and orders.user_id = (select auth.uid())
));

revoke all on public.bt_profiles, public.bt_orders, public.bt_order_items from public, anon, authenticated;
grant select on public.bt_profiles, public.bt_orders, public.bt_order_items to authenticated;
grant update (display_name) on public.bt_profiles to authenticated;

create function burgertop_private.touch_updated_at()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function burgertop_private.touch_updated_at() from public, anon, authenticated;
create trigger bt_profiles_touch before update on public.bt_profiles
for each row execute function burgertop_private.touch_updated_at();
create trigger bt_orders_touch before update on public.bt_orders
for each row execute function burgertop_private.touch_updated_at();

create function burgertop_private.create_profile()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  proposed_name text := left(btrim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80);
begin
  if char_length(proposed_name) < 2 then proposed_name := 'Cliente BurgerTop'; end if;
  insert into public.bt_profiles(id, display_name) values (new.id, proposed_name);
  return new;
end;
$$;
revoke all on function burgertop_private.create_profile() from public, anon, authenticated;
create trigger bt_auth_user_created after insert on auth.users
for each row execute function burgertop_private.create_profile();

-- Usuários já existentes também recebem perfil; metadados servem só para exibição.
insert into public.bt_profiles(id, display_name)
select id, case when char_length(btrim(coalesce(raw_user_meta_data ->> 'full_name', ''))) >= 2
  then left(btrim(raw_user_meta_data ->> 'full_name'), 80) else 'Cliente BurgerTop' end
from auth.users on conflict (id) do nothing;

-- Lista validada no servidor. Ao mudar preços, atualizar esta função e produtos.js juntos.
create function burgertop_private.catalog()
returns table(product_id text, product_name text, unit_price_cents integer)
language sql immutable security invoker set search_path = '' as $$
  values ('x-burger', 'X-Burger', 2500), ('x-bacon', 'X-Bacon', 2800),
         ('x-tudo', 'X-Tudo', 3600), ('cheese', 'Cheese Burger', 3100), ('coca', 'Coca-Cola', 600);
$$;
revoke all on function burgertop_private.catalog() from public, anon, authenticated;

-- A gravação privilegiada fica em schema não exposto pela Data API.
-- Não recebe usuário, preço, total ou status do cliente.
create function burgertop_private.create_order(p_items jsonb, p_request_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  input_item jsonb;
  canonical record;
  normalized jsonb := '[]'::jsonb;
  qty integer;
  total integer;
  saved public.bt_orders%rowtype;
begin
  if owner_id is null then raise exception 'Autenticação necessária.' using errcode = '42501'; end if;
  if p_request_id is null then raise exception 'Identificador de requisição obrigatório.' using errcode = '22023'; end if;
  if jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Lista de produtos inválida.' using errcode = '22023'; end if;
  if jsonb_array_length(p_items) not between 1 and 5 then raise exception 'Informe de 1 a 5 produtos.' using errcode = '22023'; end if;

  for input_item in select value from jsonb_array_elements(p_items) loop
    if jsonb_typeof(input_item) is distinct from 'object' then raise exception 'Produto inválido.' using errcode = '22023'; end if;
    if exists (select 1 from jsonb_object_keys(input_item) as fields(key) where key not in ('product_id', 'quantity')) then
      raise exception 'Somente produto e quantidade são aceitos.' using errcode = '22023';
    end if;
    if jsonb_typeof(input_item -> 'product_id') is distinct from 'string' or
       jsonb_typeof(input_item -> 'quantity') is distinct from 'number' or
       (input_item ->> 'quantity') !~ '^[0-9]{1,2}$' then
      raise exception 'Produto ou quantidade inválidos.' using errcode = '22023';
    end if;
    qty := (input_item ->> 'quantity')::integer;
    if qty not between 1 and 99 then raise exception 'A quantidade deve ficar entre 1 e 99.' using errcode = '22023'; end if;
    select * into canonical from burgertop_private.catalog() where product_id = input_item ->> 'product_id';
    if not found then raise exception 'Produto indisponível.' using errcode = '22023'; end if;
    normalized := normalized || jsonb_build_array(jsonb_build_object('product_id', canonical.product_id,
      'product_name', canonical.product_name, 'unit_price_cents', canonical.unit_price_cents, 'quantity', qty));
  end loop;

  select jsonb_agg(jsonb_build_object('product_id', product_id, 'product_name', product_name,
    'unit_price_cents', unit_price_cents, 'quantity', quantity)) into normalized
  from (select product_id, product_name, unit_price_cents, sum(quantity)::integer quantity
        from jsonb_to_recordset(normalized) as x(product_id text, product_name text, unit_price_cents integer, quantity integer)
        group by product_id, product_name, unit_price_cents) grouped;
  if exists (select 1 from jsonb_to_recordset(normalized) as x(quantity integer) where quantity > 99) then
    raise exception 'A quantidade agrupada não pode passar de 99.' using errcode = '22023';
  end if;
  select sum(unit_price_cents * quantity)::integer into total
  from jsonb_to_recordset(normalized) as x(unit_price_cents integer, quantity integer);

  insert into public.bt_orders(user_id, request_id, total_cents) values (owner_id, p_request_id, total)
  on conflict (user_id, request_id) do nothing returning * into saved;
  if not found then
    select * into saved from public.bt_orders where user_id = owner_id and request_id = p_request_id;
  else
    insert into public.bt_order_items(order_id, product_id, product_name, unit_price_cents, quantity)
    select saved.id, product_id, product_name, unit_price_cents, quantity
    from jsonb_to_recordset(normalized) as x(product_id text, product_name text, unit_price_cents integer, quantity integer);
  end if;
  return jsonb_build_object('id', saved.id, 'total_cents', saved.total_cents, 'status', saved.status, 'created_at', saved.created_at);
end;
$$;
revoke all on function burgertop_private.create_order(jsonb, uuid) from public, anon, authenticated;
grant execute on function burgertop_private.create_order(jsonb, uuid) to authenticated;

create function public.bt_create_order(p_items jsonb, p_request_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select burgertop_private.create_order(p_items, p_request_id);
$$;
revoke all on function public.bt_create_order(jsonb, uuid) from public, anon, authenticated;
grant execute on function public.bt_create_order(jsonb, uuid) to authenticated;

comment on function public.bt_create_order(jsonb, uuid) is 'Registra o pedido da conta autenticada com preços calculados no servidor e chave de idempotência.';
