// SDK real; respostas de Auth e REST simuladas. Não cria contas nem envia e-mails.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { createServer } = require('../scripts/serve.cjs');
const report = { mode: 'Edge isolado, SDK real e API simulada; sem e-mails ou contas externas', checks: [], errors: [] };
const out = path.join(__dirname, 'reports');
const user = { id: '11111111-1111-4111-8111-111111111111', aud: 'authenticated', role: 'authenticated', email: 'burgertop.ficticio.local@gmail.com', email_confirmed_at: new Date().toISOString(), created_at: new Date().toISOString(), user_metadata: { full_name: 'Alice' }, app_metadata: { provider: 'email', providers: ['email'] } };
const jwt = claims => Buffer.from(JSON.stringify(claims)).toString('base64url');
const access = jwt({ alg: 'HS256', typ: 'JWT' }) + '.' + jwt({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600, role: 'authenticated', aud: 'authenticated' }) + '.local-test-signature';
const session = () => ({ access_token: access, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, refresh_token: 'local-test-refresh', user });
let browser, server, base;
async function check(name, fn) {
  try { await fn(); report.checks.push({ name, passed: true }); console.log('PASS ' + name); }
  catch (error) { report.checks.push({ name, passed: false, error: error.message }); console.log('FAIL ' + name + ': ' + error.message); }
}
async function setup() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const state = { calls: [], autoConfirm: true, failOrder: false, failLogout: false, requestIds: [], orders: [] };
  await context.route('https://wsflmeguecexgsgwenkk.supabase.co/**', async route => {
    const req = route.request(), url = new URL(req.url()), body = req.postDataJSON();
    state.calls.push({ path: url.pathname, body });
    const reply = (data, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'x-supabase-api-version': '2024-01-01', 'access-control-expose-headers': 'X-Supabase-Api-Version' }, body: JSON.stringify(data) });
    if (url.pathname.endsWith('/token')) {
      if (url.searchParams.get('grant_type') === 'pkce') return reply(session());
      if (body.password !== '638259') return reply({ code: 'invalid_credentials', msg: 'Invalid login credentials' }, 400);
      return reply(session());
    }
    if (url.pathname.endsWith('/settings')) return reply({ external: { email: true }, disable_signup: false, mailer_autoconfirm: state.autoConfirm });
    if (url.pathname.endsWith('/signup')) return reply(session());
    if (url.pathname.endsWith('/recover')) return reply({});
    if (url.pathname.endsWith('/user')) return reply(user);
    if (url.pathname.endsWith('/logout')) return state.failLogout ? reply({ message: 'server error' }, 500) : reply({});
    if (url.pathname.endsWith('/bt_profiles')) return reply({ display_name: body?.display_name || 'Alice' });
    if (url.pathname.endsWith('/bt_orders')) return reply(state.orders);
    if (url.pathname.endsWith('/rpc/bt_create_order')) {
      state.requestIds.push(body.p_request_id);
      if (state.failOrder) return reply({ code: 'PGRST202', message: 'function missing' }, 404);
      const order = { id: '44444444-4444-4444-8444-444444444444', total_cents: 2500, status: 'registered', created_at: new Date().toISOString(), bt_order_items: [{ product_name: 'X-Burger', quantity: 1, unit_price_cents: 2500, line_total_cents: 2500 }] };
      state.orders = [order]; return reply(order);
    }
    return reply({ message: 'Unexpected test request: ' + url.pathname }, 400);
  });
  const page = await context.newPage(); page.setDefaultTimeout(7000);
  page.on('pageerror', error => report.errors.push(error.message));
  return { context, page, state };
}
async function signIn(page, next = 'conta.html') {
  await page.goto(base + 'login.html?next=' + encodeURIComponent(next));
  await page.locator('#email').fill(user.email);
  await page.locator('#password').fill('638259');
  await page.locator('#auth-submit').click();
  await page.waitForURL('**/' + next);
}
(async () => {
  server = createServer(); server.listen(0, '127.0.0.1'); await once(server, 'listening'); base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  const { page, context, state } = await setup();
  await check('Área da conta redireciona visitante para entrar', async () => {
    await page.goto(base + 'conta.html'); await page.waitForURL('**/login.html?next=conta.html');
    assert.equal(await page.locator('#auth-title').textContent(), 'Bem-vindo de volta.');
  });
  await check('Login sem rolagem horizontal e foto correta em 320, 390, 768 e 1440 px', async () => {
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('.auth-media img').evaluate(img => img.decode());
      assert((await page.locator('.auth-media img').getAttribute('src')).endsWith('login-burger.jpeg'));
      assert.equal(await page.locator('video').count(), 0);
      await page.screenshot({ path: path.join(out, `login-${width}.png`), fullPage: true });
    }
  });
  await check('Mostrar senha e validação impedem envio incompleto', async () => {
    await page.locator('#toggle-password').click(); assert.equal(await page.locator('#password').getAttribute('type'), 'text');
    const before = state.calls.length; await page.locator('#auth-submit').click(); assert.equal(state.calls.length, before);
  });
  await check('Credenciais inválidas exibem mensagem sem sair do login', async () => {
    await page.locator('#email').fill(user.email); await page.locator('#password').fill('111111'); await page.locator('#auth-submit').click();
    await page.locator('#auth-message').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#auth-message').textContent(), 'E-mail ou senha incorretos.');
  });
  await check('Alternância animada preserva a marca e funciona sem recarregar', async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const brandY = (await page.locator('.auth-brand').boundingBox()).y;
    await page.locator('#auth-switch a').click();
    await page.waitForFunction(() => document.querySelector('#auth-stage').getAnimations().length > 0);
    const durations = await page.locator('#auth-stage').evaluate(stage => stage.getAnimations().map(a => a.effect.getTiming().duration));
    assert(durations.every(ms => ms <= 180));
    await page.waitForFunction(() => document.querySelector('#auth-title').textContent === 'Crie sua conta.' && document.querySelector('#auth-stage').getAnimations().length === 0);
    assert(Math.abs((await page.locator('.auth-brand').boundingBox()).y - brandY) <= 1);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: path.join(out, `signup-${width}.png`), fullPage: true });
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('#auth-switch a').click(); await page.getByRole('heading', { name: 'Bem-vindo de volta.' }).waitFor();
    assert.equal(await page.locator('#auth-stage').evaluate(stage => stage.getAnimations().length), 0);
    await page.goBack(); await page.getByRole('heading', { name: 'Crie sua conta.' }).waitFor();
  });
  await check('Cadastro rejeita campos vazios, domínio diferente, letras e senha curta', async () => {
    await page.goto(base + 'login.html?mode=signup');
    for (const [name, email, password, message] of [
      ['', '', '', 'Informe seu nome'], ['Alice', '', '', 'Informe seu e-mail.'], ['Alice', 'alice@outlook.com', '638259', 'Use um e-mail válido terminado'], ['Alice', 'nome..invalido@gmail.com', '638259', 'Use um e-mail válido terminado'], ['Alice', user.email, '', 'Informe sua senha.'], ['Alice', user.email, '12345', 'Use somente números'], ['Alice', user.email, '12345a', 'Use somente números']
    ]) {
      await page.locator('#full-name').fill(name); await page.locator('#email').fill(email); await page.locator('#password').fill(password); await page.locator('#auth-submit').click();
      assert((await page.locator('#auth-message').textContent()).includes(message));
    }
    assert.equal(state.calls.filter(c => c.path.endsWith('/signup')).length, 0);
  });
  await check('Confirmação ativa bloqueia envio de cadastro e de e-mail', async () => {
    state.autoConfirm = false;
    await page.locator('#full-name').fill('Alice'); await page.locator('#email').fill(user.email); await page.locator('#password').fill('638259');
    await page.locator('#auth-submit').click(); await page.getByText(/Nenhum cadastro foi enviado/).waitFor();
    assert.equal(state.calls.filter(c => c.path.endsWith('/signup')).length, 0);
    state.autoConfirm = true;
  });
  await check('Cadastro aceita 6 dígitos, recebe sessão e envia apenas nome como metadado', async () => {
    await page.locator('#auth-submit').click(); await page.locator('#auth-message.success').waitFor();
    await page.waitForURL('**/conta.html'); await page.locator('#account-content').waitFor({ state: 'visible' });
    assert.deepEqual(state.calls.find(c => c.path.endsWith('/signup')).body.data, { full_name: 'Alice' });
    await page.locator('.account-menu summary').click(); await page.locator('.header-signout').click(); await page.waitForURL('**/index.html');
  });
  await check('Recuperação responde sem revelar se a conta existe', async () => {
    await page.goto(base + 'login.html?mode=recover'); await page.locator('#email').fill(user.email); await page.locator('#auth-submit').click();
    await page.locator('#auth-message.success').waitFor(); assert.match(await page.locator('#auth-message').textContent(), /Se existir uma conta/);
  });
  await check('Redefinição sem sessão é bloqueada', async () => {
    await page.goto(base + 'login.html?mode=reset'); await page.getByText('Solicite um link de recuperação para escolher uma nova senha.').waitFor(); assert(await page.locator('#auth-submit').isDisabled());
  });
  await check('Entrada válida, sessão após recarregar, perfil e histórico', async () => {
    await signIn(page); await page.locator('#account-content').waitFor({ state: 'visible' });
    await page.reload(); await page.getByRole('heading', { name: 'Olá, Alice.' }).waitFor();
    await page.locator('#profile-name').fill('Ana'); await page.locator('#save-profile').click(); await page.getByRole('heading', { name: 'Olá, Ana.' }).waitFor();
    assert.equal(await page.locator('.account-menu .account-name').textContent(), 'Ana');
    assert.equal(await page.locator('.account-avatar svg').count(), 1);
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
  });
  await check('Falha no pedido conserva carrinho; repetição usa a mesma chave e limpa só após sucesso', async () => {
    await page.goto(base); await page.locator('[data-add="x-burger"]').click(); await page.locator('.cart-link').click(); await page.locator('#checkout').click(); await page.locator('#checkout-dialog').waitFor({ state: 'visible' });
    state.failOrder = true; await page.locator('#complete-demo').click(); await page.locator('#checkout-feedback').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#cart-count').textContent(), '1');
    state.failOrder = false; await page.locator('#complete-demo').click(); await page.locator('#checkout-dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#cart-count').textContent(), '0'); assert.equal(state.requestIds[0], state.requestIds[1]);
    const payload = state.calls.find(c => c.path.endsWith('/rpc/bt_create_order')).body;
    assert.deepEqual(Object.keys(payload).sort(), ['p_items', 'p_request_id']); assert.deepEqual(payload.p_items, [{ product_id: 'x-burger', quantity: 1 }]);
    await page.goto(base + 'conta.html'); await page.locator('.order-card').waitFor();
    await page.screenshot({ path: path.join(out, 'account-1440.png'), fullPage: true });
  });
  await check('Saída encerra sessão e volta a proteger a conta', async () => {
    await page.locator('.account-menu summary').click(); await page.locator('.header-signout').click(); await page.waitForURL('**/index.html'); await page.goto(base + 'conta.html'); await page.waitForURL('**/login.html?next=conta.html');
  });
  await check('Visitante vai do carrinho ao login sem perder os produtos', async () => {
    await page.goto(base); await page.locator('[data-add="coca"]').click(); await page.locator('.cart-link').click(); await page.locator('#checkout').click(); await page.waitForURL('**/login.html?next=index.html%23carrinho');
    await page.locator('#email').fill(user.email); await page.locator('#password').fill('638259'); await page.locator('#auth-submit').click(); await page.waitForURL('**/index.html#carrinho');
    assert.equal(await page.locator('#cart-count').textContent(), '1');
    await page.locator('#cart-dialog').waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
  });
  await check('Menu da conta exibe nome, fecha por ESC e encerra a sessão pelo cabeçalho', async () => {
    await page.locator('.account-menu .account-name').getByText('Alice', { exact: true }).waitFor();
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.locator('.account-menu summary').click();
      const dropdown = await page.locator('.account-dropdown').boundingBox();
      assert(dropdown.x >= 0 && dropdown.x + dropdown.width <= width + 1);
      await page.keyboard.press('Escape');
    }
    await page.locator('.account-menu summary').click();
    await page.getByRole('link', { name: 'Perfil e pedidos' }).waitFor({ state: 'visible' });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.account-menu').getAttribute('open'), null);
    await page.locator('.account-menu summary').click();
    await page.getByRole('button', { name: 'Sair da conta', exact: true }).click();
    await page.waitForURL('**/index.html');
    await page.locator('[data-account-link]').waitFor({ state: 'visible' });
    assert.equal(await page.locator('.account-menu').isVisible(), false);
    await page.goto(base + 'conta.html'); await page.waitForURL('**/login.html?next=conta.html');
  });
  await check('Link de confirmação troca código PKCE e abre a conta', async () => {
    const other = await setup();
    await other.page.goto(base + 'login.html');
    await other.page.evaluate(() => localStorage.setItem('burgertop.auth-code-verifier', JSON.stringify('local-test-verifier')));
    await other.page.goto(base + 'login.html?mode=confirm&code=local-test-code');
    await other.page.waitForURL('**/conta.html'); await other.page.locator('#account-content').waitFor({ state: 'visible' });
    await other.context.close();
  });
  await check('Link de recuperação permite salvar nova senha e encerra a sessão', async () => {
    const other = await setup();
    await other.page.goto(base + 'login.html?mode=recover');
    await other.page.evaluate(() => localStorage.setItem('burgertop.auth-code-verifier', JSON.stringify('local-test-verifier/PASSWORD_RECOVERY')));
    await other.page.goto(base + 'login.html?mode=reset&code=local-recovery-code');
    await other.page.getByRole('heading', { name: 'Escolha uma nova senha.' }).waitFor();
    await other.page.waitForFunction(() => BurgerTopAccount.user !== null);
    await other.page.locator('#password').fill('827391'); await other.page.locator('#auth-submit').click();
    await other.page.getByText('Senha atualizada. Entre com sua nova senha.', { exact: true }).waitFor();
    assert.equal(await other.page.evaluate(() => BurgerTopAccount.user), null);
    assert(other.state.calls.some(call => call.path.endsWith('/user') && call.body?.password === '827391'));
    await other.context.close();
  });
  await check('Arquivo local oferece acesso HTTP sem iniciar Auth ou exibir cursor de carregamento', async () => {
    const other = await setup();
    const { pathToFileURL } = require('node:url');
    await other.page.goto(pathToFileURL(path.join(__dirname, '../login.html')).href);
    await other.page.locator('#open-local-login').waitFor({ state: 'visible' });
    assert(await other.page.locator('#auth-submit').isDisabled());
    assert.equal(await other.page.locator('#auth-submit').evaluate(button => getComputedStyle(button).cursor), 'not-allowed');
    assert.equal(await other.page.locator('#auth-form').getAttribute('aria-busy'), null);
    assert.equal(await other.page.evaluate(() => BurgerTopAccount.user), null);
    assert.equal(other.state.calls.length, 0);
    assert((await other.page.locator('#open-local-login').getAttribute('href')).startsWith('http://127.0.0.1:4173/login.html'));
    await other.page.goto(pathToFileURL(path.join(__dirname, '../conta.html')).href);
    await other.page.locator('#open-local-account').waitFor({ state: 'visible' });
    assert.equal(await other.page.locator('#account-retry').isVisible(), false);
    assert.equal(other.state.calls.length, 0);
    await other.context.close();
  });
  await context.close();
})().catch(error => { report.errors.push(error.stack); process.exitCode = 1; }).finally(async () => {
  await browser?.close(); server?.close(); fs.mkdirSync(out, { recursive: true });
  report.generatedAt = new Date().toISOString();
  fs.writeFileSync(path.join(out, 'auth-report.json'), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(out, 'auth-report.md'), ['# Login e pedidos', '', report.mode, '', ...report.checks.map(c => `- ${c.passed ? 'PASSOU' : 'FALHOU'}: ${c.name}${c.error ? ' — ' + c.error : ''}`), '', 'A migração é testada separadamente em PostgreSQL local. O fluxo de cadastro e login contra o Supabase real tem relatório próprio em auth-live-report.md. Esta suíte não envia e-mails nem valida os redirecionamentos da futura hospedagem.', ...report.errors].join('\n') + '\n');
  if (report.errors.length || report.checks.some(c => !c.passed)) process.exitCode = 1;
});

