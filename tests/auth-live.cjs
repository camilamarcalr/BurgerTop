// Teste opt-in contra o Supabase real. Cria uma conta fictícia somente se não houver confirmação por e-mail.
const { chromium } = require('playwright');
const { once } = require('node:events');
const { randomBytes, randomInt } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createServer } = require('../scripts/serve.cjs');
const report = { generatedAt: new Date().toISOString(), mode: 'Supabase real, sem interceptar Auth ou substituir sessões', checks: [], errors: [], account: null };
const out = path.join(__dirname, 'reports');
let server, browser, page;
function record(name, status, detail) { report.checks.push({ name, status, detail }); console.log(status.toUpperCase() + ' ' + name + (detail ? ': ' + detail : '')); }
(async () => {
  report.productionBuild = process.argv.includes('--dist');
  server = createServer({ directory: report.productionBuild ? 'dist' : '.' }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page = await context.newPage(); page.setDefaultTimeout(20000);
  page.on('pageerror', error => report.errors.push(error.message));
  let signupRequests = 0;
  page.on('request', request => { if (new URL(request.url()).pathname.endsWith('/auth/v1/signup')) signupRequests++; });
  await page.goto(base + 'login.html?mode=signup');
  await page.evaluate(() => BurgerTopAccount.ready);
  const settings = await page.evaluate(() => BurgerTopAccount.signupSettings());
  report.settings = { autoConfirm: settings.mailer_autoconfirm, signupDisabled: settings.disable_signup, emailEnabled: settings.external?.email };
  const email = `burgertop.teste.${Date.now()}.${randomBytes(5).toString('hex')}@gmail.com`;
  const password = String(randomInt(100000, 1000000));
  await page.locator('#full-name').fill('Teste BurgerTop');
  await page.locator('#email').fill(email);
  await page.locator('#password').fill(password);
  if (settings.mailer_autoconfirm !== true) {
    await page.locator('#auth-submit').click();
    await page.getByText(/Nenhum cadastro foi enviado/).waitFor();
    assert.equal(signupRequests, 0);
    record('Proteção contra envio de confirmação a e-mail fictício', 'passed', 'O formulário consultou o projeto real e não chamou signUp.');
    record('Cadastro real, saída e novo login', 'blocked', 'Confirm email continua ativo no projeto remoto. Nenhuma conta foi criada e nenhum e-mail foi solicitado.');
    process.exitCode = 2; return;
  }
  if (settings.disable_signup || settings.external?.email === false) {
    record('Cadastro real', 'blocked', 'Cadastro ou provedor de e-mail desativado no Supabase.'); process.exitCode = 2; return;
  }
  const signupResponse = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/auth/v1/signup'));
  await page.locator('#auth-submit').click();
  const response = await signupResponse;
  if (!response.ok()) {
    const error = await response.json();
    record('Cadastro real com senha de seis dígitos', 'failed', `HTTP ${response.status()}, código ${error.code || error.error_code || 'não informado'}.`);
    process.exitCode = 1; return;
  }
  await page.waitForURL('**/conta.html');
  await page.locator('#account-content').waitFor({ state: 'visible' });
  const registered = await page.evaluate(async () => {
    const user = await BurgerTopAccount.verifiedUser();
    return { id: user.id, email: user.email, fullName: user.user_metadata.full_name, confirmed: Boolean(user.email_confirmed_at) };
  });
  assert.equal(registered.email, email); assert.equal(registered.fullName, 'Teste BurgerTop'); assert(registered.confirmed);
  report.account = registered;
  record('Cadastro com Gmail fictício e senha numérica de seis dígitos', 'passed', 'Conta retornada e verificada pelo Supabase Auth real, sem confirmação enviada.');
  const profile = await page.evaluate(async id => {
    const client = await BurgerTopAccount.client();
    const { data, error } = await client.from('bt_profiles').select('id,display_name').eq('id', id).single();
    return { data, code: error?.code };
  }, registered.id);
  if (profile.code) record('Perfil no PostgreSQL remoto', 'blocked', 'Código ' + profile.code + '. Aplicar ou conferir a migração do BurgerTop.');
  else { assert.equal(profile.data.display_name, 'Teste BurgerTop'); record('Perfil no PostgreSQL remoto', 'passed', 'Perfil associado ao mesmo ID do Auth.'); }
  if (!profile.code) {
    await page.locator('#profile-name').fill('Teste BurgerTop Atualizado');
    await page.locator('#save-profile').click();
    await page.getByText('Nome atualizado.', { exact: true }).waitFor();
    const updated = await page.evaluate(async id => {
      const client = await BurgerTopAccount.client();
      const { data, error } = await client.from('bt_profiles').select('display_name').eq('id', id).single();
      if (error) throw new Error(error.code); return data.display_name;
    }, registered.id);
    assert.equal(updated, 'Teste BurgerTop Atualizado');
    record('Alteração de perfil persistida no PostgreSQL', 'passed');
    await page.goto(base + 'index.html');
    await page.locator('[data-add="x-burger"]').click(); await page.locator('[data-add="coca"]').click();
    await page.locator('#mobile-cart').click(); await page.locator('#checkout').click();
    await page.locator('#checkout-dialog').waitFor({ state: 'visible' }); await page.locator('#complete-demo').click();
    await page.locator('#checkout-dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#cart-count').textContent(), '0');
    await page.goto(base + 'conta.html'); await page.locator('.order-card').waitFor();
    const saved = await page.evaluate(async () => {
      const client = await BurgerTopAccount.client();
      const { data, error } = await client.from('bt_orders').select('id,total_cents,bt_order_items(product_id,quantity)').order('created_at', { ascending: false }).limit(1).single();
      if (error) throw new Error(error.code); return data;
    });
    assert.equal(saved.total_cents, 3100);
    assert.deepEqual(saved.bt_order_items.map(item => item.product_id).sort(), ['coca', 'x-burger']);
    assert(saved.bt_order_items.every(item => item.quantity === 1));
    assert.match(await page.locator('.order-card').first().textContent(), /31,00/);
    record('Pedido registrado e histórico lido do banco real', 'passed', 'X-Burger e Coca-Cola, total calculado no servidor de R$ 31,00.');
  }
  await page.reload(); await page.locator('#account-content').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(async () => (await BurgerTopAccount.verifiedUser()).id), registered.id);
  record('Sessão após recarregar', 'passed');
  await page.locator('.account-menu summary').click(); await page.locator('.header-signout').click(); await page.waitForURL('**/index.html');
  await page.goto(base + 'conta.html'); await page.waitForURL('**/login.html?next=conta.html');
  record('Saída e proteção da conta', 'passed');
  await page.locator('#email').fill(email); await page.locator('#password').fill(password);
  await page.locator('#auth-submit').click(); await page.waitForURL('**/conta.html'); await page.locator('#account-content').waitFor({ state: 'visible' });
  assert.equal(await page.evaluate(async () => (await BurgerTopAccount.verifiedUser()).id), registered.id);
  record('Novo login com as mesmas credenciais', 'passed');
  await page.locator('.account-menu summary').click(); await page.locator('.header-signout').click(); await page.waitForURL('**/index.html');
  await page.goto(base + 'login.html'); await page.locator('#email').fill(email);
  await page.locator('#password').fill(password === '111111' ? '222222' : '111111');
  await page.locator('#auth-submit').click(); await page.getByText('E-mail ou senha incorretos.', { exact: true }).waitFor();
  record('Senha incorreta no Auth real', 'passed');
})().catch(error => { report.errors.push(error.message); process.exitCode = 1; }).finally(async () => {
  if (page && report.account) {
    try { await page.evaluate(() => BurgerTopAccount.signOut()); } catch { /* O navegador será encerrado. */ }
  }
  await browser?.close(); server?.close(); fs.mkdirSync(out, { recursive: true });
  if (!process.exitCode && report.checks.some(check => check.status === 'blocked')) process.exitCode = 2;
  fs.writeFileSync(path.join(out, 'auth-live-report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(out, 'auth-live-report.md'), ['# Teste de autenticação real', '', report.mode, '', ...report.checks.map(c => `- ${c.status.toUpperCase()}: ${c.name}${c.detail ? ' — ' + c.detail : ''}`), '', report.account ? 'Uma conta fictícia foi criada no Auth e permanece disponível para inspeção administrativa. A senha e os tokens não foram gravados no relatório.' : 'Nenhuma conta criada nesta execução.', ...report.errors].join('\n') + '\n');
});

