const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(path.join(root, 'js/produtos.js'), 'utf8'), context);
const { products, createCart, normalize, STORAGE_KEY } = context.BurgerTop;
function memoryStorage(initial = null) {
  let value = initial;
  return { getItem: () => value, setItem: (key, next) => { assert.equal(key, STORAGE_KEY); value = next; } };
}
test('cinco produtos, preços exatos e arquivos reais', () => {
  assert.equal(products.length, 5);
  assert.equal(products.map(p => p.price).join(','), '2500,2800,3600,3100,600');
  for (const p of products) assert.ok(fs.existsSync(path.join(root, p.image)));
});
test('agrupamento, quantidades e totais em centavos', () => {
  const cart = createCart(memoryStorage());
  cart.add('x-burger', 2); cart.add('x-burger'); cart.add('coca', 2);
  assert.equal(cart.snapshot().items.length, 2);
  assert.equal(cart.snapshot().count, 5);
  assert.equal(cart.snapshot().total, 8700);
  cart.setQuantity('x-burger', 1);
  assert.equal(cart.snapshot().total, 3700);
  cart.remove('coca'); assert.equal(cart.snapshot().total, 2500);
});
test('não permite zero, negativos, frações, IDs desconhecidos ou mais de 99 unidades', () => {
  const cart = createCart(memoryStorage());
  assert.equal(cart.add('desconhecido'), false);
  for (const amount of [0, -1, 1.5, NaN, Infinity, '2']) assert.equal(cart.add('coca', amount), false);
  cart.add('coca');
  for (const amount of [0, -1, 1.5, 100]) assert.equal(cart.setQuantity('coca', amount), false);
  assert.equal(cart.quantity('coca'), 1);
  cart.add('coca', 500); assert.equal(cart.quantity('coca'), 99);
  assert.equal(cart.add('coca'), false);
});
test('restaura unidades, recalcula preços do catálogo e limpa de forma persistente', () => {
  const storage = memoryStorage(); const cart = createCart(storage);
  cart.add('cheese', 3); cart.add('coca');
  const restored = createCart(storage);
  assert.equal(restored.snapshot().total, 9900);
  assert.equal(restored.snapshot().count, 4);
  restored.clear();
  assert.equal(createCart(storage).snapshot().count, 0);
});
test('ignora dados adulterados ou inválidos do armazenamento', () => {
  const storage = memoryStorage(JSON.stringify({ version: 1, items: [{ id: 'coca', quantity: 2, price: 1 }, { id: 'ghost', quantity: 1 }, { id: 'x-burger', quantity: -1 }, null] }));
  assert.equal(createCart(storage).snapshot().total, 1200);
  assert.equal(createCart(memoryStorage('{invalid')).snapshot().count, 0);
  assert.equal(createCart(memoryStorage(JSON.stringify({ items: [] }))).snapshot().count, 0);
});
test('storage bloqueado não impede comprar nem calcular', () => {
  const cart = createCart({ getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); } });
  assert.equal(cart.persistenceAvailable, false);
  cart.add('x-tudo', 2); assert.equal(cart.snapshot().total, 7200);
  assert.equal(cart.persistenceAvailable, false);
});
test('busca por nome combinada com filtro de categoria', () => {
  const query = normalize('BURGER');
  const results = products.filter(p => p.category === 'burger' && normalize(p.name).includes(query));
  assert.equal(results.length, 2);
  assert.equal(normalize('Hambúrgueres'), 'hamburgueres');
  assert.equal(products.filter(p => p.category === 'drink' && normalize(p.name).includes(query)).length, 0);
});
