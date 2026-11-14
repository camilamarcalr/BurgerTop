const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');

test('Migração e isolamento em PostgreSQL local', async t => {
  const db = new PGlite();
  const alice = '11111111-1111-4111-8111-111111111111';
  const bob = '22222222-2222-4222-8222-222222222222';
  const request = '33333333-3333-4333-8333-333333333333';
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
      create table auth.users(id uuid primary key, raw_user_meta_data jsonb);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      grant execute on function auth.uid() to authenticated, anon;`);
    const migrations = path.join(__dirname, '..', 'supabase', 'migrations');
    for (const file of fs.readdirSync(migrations).filter(f => f.endsWith('.sql')).sort()) await db.exec(fs.readFileSync(path.join(migrations, file), 'utf8'));
    await db.query('insert into auth.users values ($1,$2),($3,$4)', [alice, { full_name: 'Alice' }, bob, { full_name: 'Beto' }]);
    async function asUser(id, fn, role = 'authenticated') {
      await db.exec(`set role ${role}`);
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id || '']);
      try { return await fn(); } finally { await db.exec('reset role'); }
    }
    const order = items => db.query('select public.bt_create_order($1::jsonb,$2::uuid) result', [JSON.stringify(items), request]);
    let saved;
    await t.test('Perfil criado pelo trigger e leitura limitada ao dono', async () => {
      const result = await asUser(alice, () => db.query('select * from public.bt_profiles'));
      assert.deepEqual(result.rows.map(r => r.display_name), ['Alice']);
    });
    await t.test('Preço calculado no servidor e itens agrupados', async () => {
      saved = (await asUser(alice, () => order([{ product_id: 'x-burger', quantity: 2 }, { product_id: 'coca', quantity: 1 }]))).rows[0].result;
      assert.equal(saved.total_cents, 5600);
    });
    await t.test('Repetir a requisição não duplica o pedido', async () => {
      const repeat = (await asUser(alice, () => order([{ product_id: 'coca', quantity: 1 }]))).rows[0].result;
      assert.equal(repeat.id, saved.id);
      assert.equal(repeat.total_cents, 5600);
      assert.equal((await asUser(alice, () => db.query('select * from public.bt_orders'))).rows.length, 1);
    });
    await t.test('Outra conta não lê pedidos, itens ou perfil alheios', async () => {
      await asUser(bob, async () => {
        assert.equal((await db.query('select * from public.bt_orders')).rows.length, 0);
        assert.equal((await db.query('select * from public.bt_order_items')).rows.length, 0);
        assert.deepEqual((await db.query('select id from public.bt_profiles')).rows.map(r => r.id), [bob]);
      });
    });
    await t.test('Nome próprio editável; perfil alheio permanece intacto', async () => {
      await asUser(alice, async () => {
        assert.equal((await db.query("update public.bt_profiles set display_name='Ana' where id=$1 returning *", [alice])).rows.length, 1);
        assert.equal((await db.query("update public.bt_profiles set display_name='Intruso' where id=$1 returning *", [bob])).rows.length, 0);
      });
    });
    await t.test('Escrita direta e mudança de dono são negadas', async () => {
      await assert.rejects(asUser(alice, () => db.query('delete from public.bt_orders')), /permission denied/);
      await assert.rejects(asUser(alice, () => db.query('update public.bt_profiles set id=$1', [bob])), /permission denied/);
      await assert.rejects(asUser(alice, () => db.query('insert into public.bt_orders(user_id,request_id,total_cents) values($1,$2,1)', [bob, request])), /permission denied/);
    });
    await t.test('Preço, usuário, produto e quantidades adulterados são rejeitados', async () => {
      for (const items of [[], null, [{ product_id: 'x-burger', quantity: 1, price: 1 }], [{ product_id: 'coca', quantity: 1, user_id: bob }], [{ product_id: 'inexistente', quantity: 1 }], [{ product_id: 'coca', quantity: 0 }], [{ product_id: 'coca', quantity: 100 }], [{ product_id: 'coca', quantity: 1.5 }], [{ product_id: 'coca', quantity: 60 }, { product_id: 'coca', quantity: 60 }]]) {
        await assert.rejects(asUser(alice, () => order(items)));
      }
    });
    await t.test('Anônimo não acessa tabelas nem registra pedido', async () => {
      await assert.rejects(asUser(null, () => order([{ product_id: 'coca', quantity: 1 }]), 'anon'), /permission denied/);
      await assert.rejects(asUser(null, () => db.query('select * from public.bt_orders'), 'anon'), /permission denied/);
      await assert.rejects(asUser(null, () => order([{ product_id: 'coca', quantity: 1 }])), /Autenticação necessária/);
    });
    await t.test('Catálogo do servidor acompanha o catálogo da página', async () => {
      const vm = require('node:vm'); const context = {};
      vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'produtos.js'), 'utf8'), context);
      const rows = (await db.query('select * from burgertop_private.catalog()')).rows;
      for (const product of context.BurgerTop.products) assert.equal(rows.find(r => r.product_id === product.id)?.unit_price_cents, product.price);
    });
  } finally { await db.close(); }
});
