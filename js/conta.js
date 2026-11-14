(() => {
  'use strict';
  const account = BurgerTopAccount;
  const $ = selector => document.querySelector(selector);
  const money = cents => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  let currentUser;
  account.subscribe(({ event }) => {
    if (event === 'SIGNED_OUT' && currentUser && !account.loggingOut) {
      $('#account-content').hidden = true;
      location.replace(account.loginUrl('conta.html'));
    }
  });
  function feedback(text, type = 'error') { const box = $('#account-message'); box.textContent = text; box.className = 'auth-message ' + type; box.hidden = !text; }
  function textElement(tag, text, className) { const element = document.createElement(tag); element.textContent = text; if (className) element.className = className; return element; }
  async function loadOrders() {
    $('#refresh-orders').disabled = true; $('#orders-status').textContent = 'Carregando pedidos…';
    try {
      const client = await account.client();
      const { data, error } = await client.from('bt_orders').select('id,status,total_cents,created_at,bt_order_items(product_name,unit_price_cents,quantity,line_total_cents)').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      const list = $('#orders-list'); list.replaceChildren();
      for (const order of data) {
        const card = textElement('li', '', 'order-card');
        const header = document.createElement('header');
        const date = new Date(order.created_at);
        const time = textElement('time', date.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })); time.dateTime = order.created_at;
        header.append(textElement('strong', 'Pedido #' + order.id.slice(0, 8)), textElement('span', 'Registrado', 'order-tag'), time);
        const items = document.createElement('ul');
        for (const item of order.bt_order_items || []) items.append(textElement('li', `${item.quantity} × ${item.product_name} · ${money(item.line_total_cents)}`));
        card.append(header, items, textElement('strong', money(order.total_cents), 'order-total')); list.append(card);
      }
      $('#orders-status').textContent = data.length ? (data.length === 50 ? 'Mostrando os 50 pedidos mais recentes.' : '') : 'Você ainda não registrou pedidos.';
    } catch (error) { $('#orders-status').textContent = account.message(error); }
    finally { $('#refresh-orders').disabled = false; }
  }
  $('#account-retry').addEventListener('click', () => location.reload());
  $('#refresh-orders').addEventListener('click', loadOrders);
  $('#profile-form').addEventListener('submit', async event => {
    event.preventDefault();
    const name = $('#profile-name').value.trim();
    if (name.length < 2) { feedback('Informe seu nome com pelo menos 2 caracteres.'); return; }
    $('#save-profile').disabled = true;
    try {
      const client = await account.client();
      const { data, error } = await client.from('bt_profiles').update({ display_name: name }).eq('id', currentUser.id).select('display_name').single();
      if (error) throw error;
      $('#account-welcome').textContent = 'Olá, ' + data.display_name + '.';
      account.setDisplayName(data.display_name);
      feedback('Nome atualizado.', 'success');
    } catch (error) { feedback(account.message(error)); }
    finally { $('#save-profile').disabled = false; }
  });
  (async () => {
    try {
      if (!account.supportedOrigin) {
        $('#account-loading-text').textContent = 'Esta página foi aberta como arquivo. Acesse sua conta pelo endereço local.';
        $('#open-local-account').hidden = false;
        return;
      }
      if (!account.configured) throw new Error('Conta indisponível.');
      const state = await account.ready;
      if (state.error) throw state.error;
      currentUser = await account.verifiedUser();
      if (!currentUser) { location.replace(account.loginUrl('conta.html')); return; }
      $('#account-email').textContent = currentUser.email;
      $('#account-welcome').textContent = 'Minha conta';
      $('#account-loading').hidden = true; $('#account-content').hidden = false;
      $('#save-profile').disabled = true;
      const client = await account.client();
      const { data, error } = await client.from('bt_profiles').select('display_name').eq('id', currentUser.id).single();
      if (error) feedback(account.message(error));
      else {
        $('#profile-name').value = data.display_name;
        $('#account-welcome').textContent = 'Olá, ' + data.display_name + '.';
        account.setDisplayName(data.display_name);
        $('#save-profile').disabled = false;
      }
      await loadOrders();
    } catch (error) {
      $('#account-loading-text').textContent = account.message(error);
      $('#account-retry').hidden = false;
    }
  })();
})();
