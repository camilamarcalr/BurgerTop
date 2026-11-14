(() => {
  'use strict';
  const video = document.querySelector('.hero-video');
  const source = video.querySelector('source');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let attempted = false;

  function fallback() {
    video.pause();
    video.classList.remove('is-playing');
  }

  function start() {
    if (motion.matches || navigator.connection?.saveData) {
      fallback();
      return;
    }
    if (attempted) return;
    attempted = true;
    video.muted = true;
    video.autoplay = true;
    source.src = source.dataset.src;
    video.load();
    const playback = video.play();
    if (playback) playback.catch(fallback);
  }

  video.addEventListener('playing', () => {
    if (motion.matches) fallback();
    else video.classList.add('is-playing');
  });
  video.addEventListener('error', fallback);
  source.addEventListener('error', fallback);
  motion.addEventListener('change', start);
  start();
})();
(() => {
  'use strict';
  const { products, byId, createCart, money, normalize, MAX_QUANTITY } = BurgerTop;
  const $ = selector => document.querySelector(selector);
  let storage;
  try { storage = window.localStorage; }
  catch { storage = { getItem() { throw new Error('Storage indisponível'); }, setItem() { throw new Error('Storage indisponível'); } }; }
  const cart = createCart(storage);
  const grid = $('#products'), list = $('#cart-items'), search = $('#search');
  const productDialog = $('#product-dialog'), cartDialog = $('#cart-dialog'), checkoutDialog = $('#checkout-dialog');
  const dialogs = [productDialog, cartDialog, checkoutDialog];
  const panel = $('#carrinho'), dock = $('#cart-dock');
  const mobile = window.matchMedia('(max-width: 950px)');
  const returnFocus = new Map();
  let category = 'all', selected = null, detailQuantity = 1, toastTimer;

  function announce(message) {
    const toast = $('#cart-status');
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add('visible');
    toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
  }
  function bump(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), 400);
  }
  function restorePanel() {
    if (!cartDialog.open && panel.parentElement !== dock) dock.append(panel);
  }
  function closeDialog(dialog, force = false) {
    if (dialog === checkoutDialog && submitting && !force) return;
    dialog.close();
    restorePanel();
    document.body.classList.toggle('modal-open', dialogs.some(item => item.open));
  }
  function openDialog(dialog, trigger = document.activeElement) {
    dialogs.filter(item => item.open).forEach(item => closeDialog(item));
    returnFocus.set(dialog, trigger);
    dialog.showModal();
    dialog.classList.add('active');
    document.body.classList.add('modal-open');
  }
  dialogs.forEach(dialog => {
    dialog.addEventListener('cancel', event => {
      if (dialog === checkoutDialog && submitting) event.preventDefault();
    });
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const controls = [...dialog.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
        .filter(element => element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden');
      const first = controls[0], last = controls[controls.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
    dialog.addEventListener('click', event => {
      if (event.target.closest('[data-close]')) closeDialog(dialog);
    });
    dialog.addEventListener('close', () => {
      if (dialog.open) return;
      dialog.classList.remove('active');
      restorePanel();
      const anotherOpen = dialogs.some(item => item.open);
      document.body.classList.toggle('modal-open', anotherOpen);
      if (!anotherOpen) {
        let target = returnFocus.get(dialog);
        if (target && dock.contains(target)) target = mobile.matches ? $('#mobile-cart') : $('.cart-link');
        if (target?.isConnected) target.focus({ preventScroll: true });
      }
    });
  });

  function renderProducts() {
    const matches = products.filter(product => (category === 'all' || category === product.category) && normalize(product.name).includes(normalize(search.value.trim())));
    grid.innerHTML = matches.map(product => `<article class="product-card"><button class="product-image" type="button" data-details="${product.id}" aria-label="Ver detalhes de ${product.name}"><img src="${product.image}" alt="${product.name}" loading="lazy" decoding="async"></button><div class="product-body"><h3><button type="button" class="product-name" data-details="${product.id}">${product.name}</button></h3><p>${product.description}</p><strong class="price">${money(product.price)}</strong><button type="button" class="add-button add-to-cart" data-add="${product.id}" aria-label="Adicionar ${product.name} ao pedido">+ Adicionar</button></div></article>`).join('');
    $('#no-results').hidden = matches.length !== 0;
  }
  function renderCart() {
    const snapshot = cart.snapshot();
    list.innerHTML = snapshot.items.map(({ product, quantity, subtotal }) => `<li class="cart-item"><div class="cart-item-main"><img class="cart-thumb" src="${product.image}" alt="${product.name}"><div><strong>${product.name}</strong><small>${money(product.price)} / unidade</small></div><strong>${money(subtotal)}</strong></div><div class="quantity"><button type="button" data-id="${product.id}" data-action="minus" aria-label="Diminuir ${product.name}" ${quantity === 1 ? 'disabled' : ''}>−</button><span aria-label="Quantidade">${quantity}</span><button type="button" data-id="${product.id}" data-action="plus" aria-label="Aumentar ${product.name}" ${quantity === MAX_QUANTITY ? 'disabled' : ''}>+</button><button type="button" class="remove-item" data-id="${product.id}" data-action="remove" aria-label="Remover ${product.name}">Remover</button></div></li>`).join('');
    $('#empty-cart').hidden = snapshot.count > 0;
    $('#cart-total').textContent = money(snapshot.total);
    $('#cart-subtotal').textContent = money(snapshot.total);
    $('#cart-count').textContent = snapshot.count;
    $('#mobile-count').textContent = `${snapshot.count} ${snapshot.count === 1 ? 'item' : 'itens'}`;
    $('#mobile-total').textContent = money(snapshot.total);
    $('#checkout').disabled = snapshot.count === 0;
    $('#storage-warning').hidden = cart.persistenceAvailable;
    $('#storage-warning').textContent = cart.persistenceAvailable ? '' : 'O navegador bloqueou o armazenamento. Seu pedido será mantido apenas nesta página.';
  }
  function add(id, amount, button) {
    const previous = cart.quantity(id);
    if (!cart.add(id, amount)) { announce(`Limite de ${MAX_QUANTITY} unidades por produto.`); return; }
    renderCart();
    bump($('#cart-count'), 'bump');
    if (button) bump(button, 'added');
    const added = cart.quantity(id) - previous;
    announce(`${byId.get(id).name}: ${added} ${added === 1 ? 'unidade adicionada' : 'unidades adicionadas'} ao pedido.`);
  }
  function updateDetailQuantity() {
    $('#detail-quantity').value = detailQuantity;
    $('#detail-minus').disabled = detailQuantity <= 1;
    $('#detail-plus').disabled = detailQuantity >= MAX_QUANTITY;
    $('#detail-add').textContent = `Adicionar · ${money(selected.price * detailQuantity)}`;
  }
  function showProduct(id, trigger) {
    selected = byId.get(id);
    detailQuantity = 1;
    $('#detail-feedback').textContent = '';
    $('#detail-eyebrow').textContent = selected.category === 'drink' ? 'Para refrescar seu dia' : 'Feito para matar a sua fome';
    $('#detail-composition-title').textContent = selected.category === 'drink' ? 'Sobre a bebida' : 'Ingredientes ilustrativos';
    $('#detail-composition-note').hidden = selected.category === 'drink';
    $('#detail-name').textContent = selected.name;
    $('#detail-image').src = selected.image;
    $('#detail-image').alt = selected.name;
    $('#detail-description').textContent = selected.description;
    $('#detail-ingredients').textContent = selected.ingredients;
    $('#detail-price').textContent = money(selected.price);
    updateDetailQuantity();
    openDialog(productDialog, trigger);
  }
  function openCart(trigger) {
    dialogs.filter(dialog => dialog.open).forEach(dialog => closeDialog(dialog));
    $('#cart-modal-slot').append(panel);
    openDialog(cartDialog, trigger);
  }
  grid.addEventListener('click', event => {
    const addButton = event.target.closest('[data-add]');
    if (addButton) { add(addButton.dataset.add, 1, addButton); return; }
    const detailButton = event.target.closest('[data-details]');
    if (detailButton) showProduct(detailButton.dataset.details, detailButton);
  });
  $('.filters').addEventListener('click', event => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    category = button.dataset.category;
    $('.filters').querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    renderProducts();
  });
  search.addEventListener('input', renderProducts);
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) return;
    const { id, action } = button.dataset;
    if (action === 'remove') cart.remove(id);
    else cart.setQuantity(id, cart.quantity(id) + (action === 'plus' ? 1 : -1));
    renderCart();
    const controls = [...list.querySelectorAll('button')];
    const target = controls.find(item => item.dataset.id === id && item.dataset.action === action && !item.disabled) || controls.find(item => item.dataset.id === id && !item.disabled) || panel;
    target.focus({ preventScroll: true });
    announce(`Pedido atualizado. Total: ${money(cart.snapshot().total)}.`);
  });
  $('#detail-minus').addEventListener('click', () => { detailQuantity = Math.max(1, detailQuantity - 1); updateDetailQuantity(); });
  $('#detail-plus').addEventListener('click', () => { detailQuantity = Math.min(MAX_QUANTITY, detailQuantity + 1); updateDetailQuantity(); });
  $('#detail-add').addEventListener('click', event => { add(selected.id, detailQuantity, event.currentTarget); $('#detail-feedback').textContent = `${selected.name} no pedido: ${cart.quantity(selected.id)} unidades.`; });
  $('#mobile-cart').addEventListener('click', event => openCart(event.currentTarget));
  $('.cart-link').addEventListener('click', event => {
    event.preventDefault();
    openCart(event.currentTarget);
  });
  const account = globalThis.BurgerTopAccount;
  let pendingOrder, submitting = false;
  if (account?.configured) {
    $('.cart-note').textContent = 'Registre o pedido na sua conta. Sem pagamento ou entrega.';
    $('#checkout-description').textContent = 'Confira os itens antes de registrar na sua conta.';
    $('.checkout-disclaimer').textContent = 'O pedido será salvo no seu histórico. Não há cobrança ou envio para uma loja.';
    $('#complete-demo').textContent = 'Registrar pedido';
  }
  $('#checkout').addEventListener('click', async event => {
    const trigger = event.currentTarget;
    if (account?.configured) {
      trigger.disabled = true;
      try {
        const state = await account.ready;
        if (state.error) throw state.error;
        if (!await account.verifiedUser()) { location.href = account.loginUrl('index.html#carrinho'); return; }
      } catch (error) { announce(account.message(error)); return; }
      finally { trigger.disabled = cart.snapshot().count === 0; }
    }
    const snapshot = cart.snapshot();
    if (!snapshot.count) return;
    const fingerprint = JSON.stringify(snapshot.items.map(item => [item.product.id, item.quantity]));
    let previous;
    try { previous = JSON.parse(sessionStorage.getItem('burgertop.pendingOrder')); } catch { /* Armazenamento opcional. */ }
    pendingOrder = { items: snapshot.items, fingerprint, id: previous?.fingerprint === fingerprint && /^[0-9a-f-]{36}$/i.test(previous.id) ? previous.id : crypto.randomUUID() };
    try { sessionStorage.setItem('burgertop.pendingOrder', JSON.stringify({ fingerprint, id: pendingOrder.id })); } catch { /* A chave permanece na memória durante a tentativa. */ }
    $('#checkout-feedback').hidden = true;
    $('#checkout-count').textContent = `${snapshot.count} ${snapshot.count === 1 ? 'item no pedido' : 'itens no pedido'}`;
    $('#checkout-items').innerHTML = snapshot.items.map(({ product, quantity, subtotal }) => `<li><img class="checkout-thumb" src="${product.image}" alt=""><div><strong>${product.name}</strong><small>${quantity} × ${money(product.price)}</small></div><strong>${money(subtotal)}</strong></li>`).join('');
    $('#checkout-total').textContent = money(snapshot.total);
    openDialog(checkoutDialog, trigger);
  });
  $('#complete-demo').addEventListener('click', async () => {
    if (submitting) return;
    submitting = true; $('#complete-demo').disabled = true;
    try {
      if (account?.configured) {
        const saved = await account.createOrder(pendingOrder.items, pendingOrder.id);
        if (!saved?.id) throw new Error('Resposta de pedido inválida.');
      }
      try { sessionStorage.removeItem('burgertop.pendingOrder'); } catch { /* Armazenamento opcional. */ }
      cart.clear(); renderCart();
      returnFocus.set(checkoutDialog, mobile.matches ? $('#mobile-cart') : $('.cart-link'));
      closeDialog(checkoutDialog, true);
      announce(account?.configured ? 'Pedido registrado. Você pode consultá-lo no menu da conta.' : 'Demonstração concluída. O carrinho foi limpo. Nenhum pedido real foi enviado.');
    } catch (error) {
      $('#checkout-feedback').textContent = account.message(error); $('#checkout-feedback').hidden = false;
    } finally { submitting = false; $('#complete-demo').disabled = false; }
  });
  renderProducts(); renderCart();
  if (location.hash === '#carrinho') openCart(mobile.matches ? $('#mobile-cart') : $('.cart-link'));
})();
