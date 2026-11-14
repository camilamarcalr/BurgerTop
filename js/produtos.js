(() => {
  'use strict';
  const products = [
    { id: 'x-burger', name: 'X-Burger', category: 'burger', image: 'Assets/images/x-burger.webp', description: 'O clássico para qualquer hora.', ingredients: 'Pão, carne bovina, queijo, alface, tomate, cebola e molho.', price: 2500 },
    { id: 'x-bacon', name: 'X-Bacon', category: 'burger', image: 'Assets/images/x-bacon.webp', description: 'Bacon e queijo em uma combinação cheia de sabor.', ingredients: 'Pão, carne bovina, queijo, bacon, alface, tomate, cebola e molho.', price: 2800 },
    { id: 'x-tudo', name: 'X-Tudo', category: 'burger', image: 'Assets/images/x-tudo.webp', description: 'Uma combinação generosa para uma fome de respeito.', ingredients: 'Pão, carne bovina, queijo, bacon, ovo, alface, tomate e molho.', price: 3600 },
    { id: 'cheese', name: 'Cheese Burger', category: 'burger', image: 'Assets/images/cheese-burger.webp', description: 'Carne e queijo para quem gosta de sabor em dobro.', ingredients: 'Pão, duas carnes bovinas, queijo cheddar e molho.', price: 3100 },
    { id: 'coca', name: 'Coca-Cola', category: 'drink', image: 'Assets/images/coca-cola.webp', description: 'Uma bebida para acompanhar seu hambúrguer.', ingredients: 'Consulte a composição e os alergênicos no rótulo da embalagem.', price: 600 }
  ].map(Object.freeze);
  const byId = new Map(products.map(product => [product.id, product]));
  const STORAGE_KEY = 'burgertop.cart.v1';
  const MAX_QUANTITY = 99;
  const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // O storage guarda quantidades; os preços sempre vêm do catálogo atual.
  function createCart(storage) {
    const quantities = new Map();
    let persistenceAvailable = true;
    try {
      const saved = JSON.parse(storage.getItem(STORAGE_KEY) || 'null');
      if (saved?.version === 1 && Array.isArray(saved.items)) {
        for (const item of saved.items) {
          if (item && byId.has(item.id) && Number.isInteger(item.quantity) && item.quantity > 0) {
            quantities.set(item.id, Math.min(MAX_QUANTITY, item.quantity));
          }
        }
      }
    } catch (error) {
      // JSON inválido não impede o uso. Falhas de acesso ativam o aviso na interface.
      if (!(error instanceof SyntaxError)) persistenceAvailable = false;
    }
    function save() {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, items: [...quantities].map(([id, quantity]) => ({ id, quantity })) }));
        persistenceAvailable = true;
      } catch { persistenceAvailable = false; }
    }
    const api = {
      get persistenceAvailable() { return persistenceAvailable; },
      quantity(id) { return quantities.get(id) || 0; },
      add(id, amount = 1) {
        if (!byId.has(id) || !Number.isInteger(amount) || amount <= 0) return false;
        const previous = api.quantity(id);
        const next = Math.min(MAX_QUANTITY, previous + amount);
        if (next === previous) return false;
        quantities.set(id, next); save(); return true;
      },
      setQuantity(id, amount) {
        if (!quantities.has(id) || !Number.isInteger(amount) || amount < 1 || amount > MAX_QUANTITY) return false;
        quantities.set(id, amount); save(); return true;
      },
      remove(id) { quantities.delete(id); save(); },
      clear() { quantities.clear(); save(); },
      snapshot() {
        const items = [...quantities].map(([id, quantity]) => ({ product: byId.get(id), quantity, subtotal: byId.get(id).price * quantity }));
        return { items, count: items.reduce((sum, item) => sum + item.quantity, 0), total: items.reduce((sum, item) => sum + item.subtotal, 0) };
      }
    };
    return api;
  }
  globalThis.BurgerTop = Object.freeze({ products: Object.freeze(products), byId, createCart, money, normalize, STORAGE_KEY, MAX_QUANTITY });
})();
