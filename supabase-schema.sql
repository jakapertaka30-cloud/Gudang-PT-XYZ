create table if not exists public.wms_meta (
  id boolean primary key default true check (id),
  revision bigint not null default 0
);

insert into public.wms_meta (id, revision)
values (true, 0)
on conflict (id) do nothing;

create table if not exists public.wms_settings (
  id boolean primary key default true check (id),
  record jsonb not null
);

create table if not exists public.wms_materials (id text primary key, record jsonb not null);
create table if not exists public.wms_suppliers (id text primary key, record jsonb not null);
create table if not exists public.wms_locations (id text primary key, record jsonb not null);
create table if not exists public.wms_receipts (id text primary key, record jsonb not null);
create table if not exists public.wms_receipt_items (id text primary key, record jsonb not null);
create table if not exists public.wms_qc (id text primary key, record jsonb not null);
create table if not exists public.wms_putaways (id text primary key, record jsonb not null);
create table if not exists public.wms_issues (id text primary key, record jsonb not null);
create table if not exists public.wms_stock (id text primary key, record jsonb not null);
create table if not exists public.wms_movements (id text primary key, record jsonb not null);
create table if not exists public.wms_opnames (id text primary key, record jsonb not null);
create table if not exists public.wms_activities (id text primary key, record jsonb not null);
create table if not exists public.wms_kpi_history (id text primary key, record jsonb not null);
create table if not exists public.wms_decision_logs (id text primary key, record jsonb not null);
create table if not exists public.wms_corrective_actions (id text primary key, record jsonb not null);
create table if not exists public.wms_user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null
);
alter table public.wms_user_roles drop constraint if exists wms_user_roles_role_check;
alter table public.wms_user_roles
  add constraint wms_user_roles_role_check check (role in ('admin', 'manager', 'director'));

alter table public.wms_meta enable row level security;
alter table public.wms_settings enable row level security;
alter table public.wms_materials enable row level security;
alter table public.wms_suppliers enable row level security;
alter table public.wms_locations enable row level security;
alter table public.wms_receipts enable row level security;
alter table public.wms_receipt_items enable row level security;
alter table public.wms_qc enable row level security;
alter table public.wms_putaways enable row level security;
alter table public.wms_issues enable row level security;
alter table public.wms_stock enable row level security;
alter table public.wms_movements enable row level security;
alter table public.wms_opnames enable row level security;
alter table public.wms_activities enable row level security;
alter table public.wms_kpi_history enable row level security;
alter table public.wms_decision_logs enable row level security;
alter table public.wms_corrective_actions enable row level security;
alter table public.wms_user_roles enable row level security;

create or replace function public.wms_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.wms_user_roles
    where user_id = auth.uid() and role = 'admin'
  )
$$;

create or replace function public.wms_current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.wms_user_roles
  where user_id = auth.uid()
$$;

revoke all on function public.wms_is_admin() from public, anon;
revoke all on function public.wms_current_role() from public, anon;
grant execute on function public.wms_is_admin() to authenticated;
grant execute on function public.wms_current_role() to authenticated;

drop policy if exists "Authenticated roles can read own role" on public.wms_user_roles;
create policy "Authenticated roles can read own role"
  on public.wms_user_roles for select to authenticated
  using (user_id = auth.uid() or public.wms_is_admin());
revoke all on public.wms_user_roles from anon, authenticated;
grant select on public.wms_user_roles to authenticated;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'wms_meta', 'wms_settings', 'wms_materials', 'wms_suppliers',
    'wms_locations', 'wms_receipts', 'wms_receipt_items', 'wms_qc',
    'wms_putaways', 'wms_issues', 'wms_stock', 'wms_movements',
    'wms_opnames', 'wms_activities', 'wms_kpi_history',
    'wms_decision_logs', 'wms_corrective_actions'
  ]
  loop
    execute format('drop policy if exists "Authenticated warehouse access" on public.%I', table_name);
    execute format('drop policy if exists "Authenticated warehouse read" on public.%I', table_name);
    execute format('drop policy if exists "Admin warehouse write" on public.%I', table_name);
    execute format(
      'create policy "Authenticated warehouse read" on public.%I for select to authenticated using (auth.uid() is not null)',
      table_name
    );
    execute format(
      'create policy "Admin warehouse write" on public.%I for all to authenticated using (public.wms_is_admin()) with check (public.wms_is_admin())',
      table_name
    );
    execute format('revoke all on public.%I from anon', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  end loop;
end
$$;

create or replace function public.wms_load_db()
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  current_revision bigint;
  result_db jsonb;
  rows_json jsonb;
  collection_key text;
  table_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if public.wms_current_role() not in ('admin', 'manager', 'director') then
    raise exception 'Peran akun belum ditetapkan. Hubungi admin WMS.';
  end if;

  select revision into current_revision from public.wms_meta where id = true;
  if current_revision = 0 then
    return jsonb_build_object('revision', current_revision, 'db', null);
  end if;

  result_db := jsonb_build_object('schemaVersion', 2);
  for collection_key, table_name in
    select * from (values
      ('materials', 'wms_materials'),
      ('suppliers', 'wms_suppliers'),
      ('locations', 'wms_locations'),
      ('receipts', 'wms_receipts'),
      ('receiptItems', 'wms_receipt_items'),
      ('qc', 'wms_qc'),
      ('putaways', 'wms_putaways'),
      ('issues', 'wms_issues'),
      ('stock', 'wms_stock'),
      ('movements', 'wms_movements'),
      ('opnames', 'wms_opnames'),
      ('activities', 'wms_activities'),
      ('kpiHistory', 'wms_kpi_history'),
      ('decisionLogs', 'wms_decision_logs'),
      ('correctiveActions', 'wms_corrective_actions')
    ) as collections(key, table_name)
  loop
    execute format(
      'select coalesce(jsonb_agg(record order by id), ''[]''::jsonb) from public.%I',
      table_name
    ) into rows_json;
    result_db := jsonb_set(result_db, array[collection_key], rows_json, true);
  end loop;

  select record into rows_json from public.wms_settings where id = true;
  result_db := result_db || coalesce(rows_json, '{"settings": {}, "performanceSettings": {}}'::jsonb);
  return jsonb_build_object('revision', current_revision, 'db', result_db);
end
$$;

create or replace function public.wms_save_db(p_db jsonb, p_expected_revision bigint)
returns jsonb
language plpgsql
set search_path = public
as $$
declare
  current_revision bigint;
  next_revision bigint;
  collection_key text;
  table_name text;
  item jsonb;
  item_id text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if not public.wms_is_admin() then
    raise exception 'Hanya admin WMS yang dapat mengubah data.';
  end if;
  if p_db is null or jsonb_typeof(p_db) <> 'object' then
    raise exception 'Invalid warehouse data';
  end if;

  select revision into current_revision
  from public.wms_meta
  where id = true
  for update;
  if current_revision <> p_expected_revision then
    raise exception 'Data gudang berubah di pengguna lain. Muat ulang aplikasi sebelum mencoba lagi.';
  end if;

  for collection_key, table_name in
    select * from (values
      ('materials', 'wms_materials'),
      ('suppliers', 'wms_suppliers'),
      ('locations', 'wms_locations'),
      ('receipts', 'wms_receipts'),
      ('receiptItems', 'wms_receipt_items'),
      ('qc', 'wms_qc'),
      ('putaways', 'wms_putaways'),
      ('issues', 'wms_issues'),
      ('stock', 'wms_stock'),
      ('movements', 'wms_movements'),
      ('opnames', 'wms_opnames'),
      ('activities', 'wms_activities'),
      ('kpiHistory', 'wms_kpi_history'),
      ('decisionLogs', 'wms_decision_logs'),
      ('correctiveActions', 'wms_corrective_actions')
    ) as collections(key, table_name)
  loop
    if p_db ? collection_key and jsonb_typeof(p_db -> collection_key) not in ('array', 'null') then
      raise exception 'Invalid collection: %', collection_key;
    end if;
    execute format('delete from public.%I where id is not null', table_name);
    for item in select value from jsonb_array_elements(
      coalesce(nullif(p_db -> collection_key, 'null'::jsonb), '[]'::jsonb)
    )
    loop
      item_id := item ->> 'id';
      if item_id is null or item_id = '' then
        raise exception 'Missing id in collection: %', collection_key;
      end if;
      execute format('insert into public.%I (id, record) values ($1, $2)', table_name)
        using item_id, item;
    end loop;
  end loop;

  insert into public.wms_settings (id, record)
  values (true, jsonb_build_object(
    'settings', coalesce(p_db -> 'settings', '{}'::jsonb),
    'performanceSettings', coalesce(p_db -> 'performanceSettings', '{}'::jsonb)
  ))
  on conflict (id) do update set record = excluded.record;

  next_revision := current_revision + 1;
  update public.wms_meta set revision = next_revision where id = true;
  return jsonb_build_object('revision', next_revision);
end
$$;

revoke all on function public.wms_load_db() from public, anon;
revoke all on function public.wms_save_db(jsonb, bigint) from public, anon;
grant execute on function public.wms_load_db() to authenticated;
grant execute on function public.wms_save_db(jsonb, bigint) to authenticated;
