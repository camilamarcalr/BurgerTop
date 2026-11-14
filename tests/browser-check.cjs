/* Testes reais em navegador isolado. Não acessa a sessão pessoal do navegador. */
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const { chromium } = require(process.argv[2] || process.env.BURGERTOP_PLAYWRIGHT || 'playwright');
const root = path.resolve(__dirname, '..');
const out = path.join(__dirname, 'reports');
const report = { generatedAt: new Date().toISOString(), engine: '', checks: [], warnings: [], errors: [], viewports: [], performance: null };
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.mp4': 'video/mp4' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/favicon.ico') { res.writeHead(204); res.end(); return; }
  // Esta suíte conserva a finalização demonstrativa sem banco. A integração usa auth-browser.cjs.
  if (url.pathname === '/js/config.js') { res.writeHead(200, { 'Content-Type': 'text/javascript' }); res.end('globalThis.BurgerTopConfig = {};'); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.stat(file, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404); res.end(); return; }
    const headers = { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Accept-Ranges': 'bytes' };
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || '');
    if (range) {
      const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), stat.size - 1) : stat.size - 1;
      if (start > end) { res.writeHead(416); res.end(); return; }
      res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${stat.size}` });
      fs.createReadStream(file, { start, end }).pipe(res);
    } else { res.writeHead(200, { ...headers, 'Content-Length': stat.size }); fs.createReadStream(file).pipe(res); }
  });
});
let browser;
async function check(name, fn) {
  try { const detail = await fn(); report.checks.push({ name, status: 'passed', detail: detail ?? null }); console.log('PASS ' + name); }
  catch (error) { report.checks.push({ name, status: 'failed', error: error.message }); console.log('FAIL ' + name + ': ' + error.message); }
}
async function noOverflow(page) {
  return page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth, body: document.body.scrollWidth, overflowing: [...document.querySelectorAll('body *')].filter(el => {
    const box = el.getBoundingClientRect(); const style = getComputedStyle(el);
    return style.display !== 'none' && box.width > 0 && box.left < -1 && !el.closest('.filters, dialog:not([open])') && !el.classList.contains('sr-only') && !el.closest('.hero-media');
  }).map(el => el.id || el.className).slice(0, 8) }));
}
async function openCart(page) { await page.locator('#mobile-cart').click(); await page.locator('#cart-dialog').waitFor({ state: 'visible' }); }
async function closeByEscape(page, selector) { await page.keyboard.press('Escape'); await page.locator(selector).waitFor({ state: 'hidden' }); }
async function waitModalReady(page, selector) {
  await page.waitForFunction(selector => {
    const modal = document.querySelector(selector);
    return modal.open && Number(getComputedStyle(modal).opacity) >= .999 && modal.getAnimations().every(animation => animation.playState === 'finished');
  }, selector);
}

(async () => {
  fs.mkdirSync(out, { recursive: true });
  browser = await chromium.launch({ channel: 'msedge', headless: true });
  report.engine = browser.version();
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/`;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', msg => { if (msg.type() === 'error') report.errors.push(msg.text()); });
  await page.goto(base, { waitUntil: 'load' });

  await check('Cinco produtos, imagens decodificadas e caminhos sem erro', async () => {
    assert.equal(await page.locator('.product-card').count(), 5);
    const photos = page.locator('.product-image img');
    for (const photo of await photos.all()) {
      await photo.scrollIntoViewIfNeeded();
      await photo.evaluate(img => img.decode());
      assert(await photo.evaluate(img => img.naturalWidth > 0));
      const box = await photo.evaluate(img => { const a = img.getBoundingClientRect(), b = img.parentElement.getBoundingClientRect(); return { dx: Math.abs(a.x - b.x), dy: Math.abs(a.y - b.y) }; });
      assert(box.dx <= 1 && box.dy <= 1, 'Imagem deslocada no botão');
    }
  });
  await check('Busca combinada com filtros e mensagem sem resultados', async () => {
    await page.getByRole('button', { name: 'Bebidas', exact: true }).click();
    assert.equal(await page.locator('.product-card').count(), 1);
    await page.locator('#search').fill('burger');
    assert.equal(await page.locator('.product-card').count(), 0);
    assert(await page.locator('#no-results').isVisible());
    await page.locator('#search').fill('');
    await page.getByRole('button', { name: 'Todos', exact: true }).click();
    await page.locator('#search').fill('BURGER');
    assert.equal(await page.locator('.product-card').count(), 2);
    await page.locator('#search').fill('');
  });
  await check('Modal da bebida, foco contido, texto correto e ESC', async () => {
    await page.getByRole('button', { name: 'Ver detalhes de Coca-Cola', exact: true }).click();
    assert.equal(await page.locator('#detail-eyebrow').textContent(), 'Para refrescar seu dia');
    assert.equal(await page.locator('#detail-composition-title').textContent(), 'Sobre a bebida');
    assert(await page.locator('#product-dialog').evaluate(el => el.matches(':modal')));
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      assert(await page.locator('#product-dialog').evaluate(el => el.contains(document.activeElement)), 'Foco escapou do modal');
    }
    await waitModalReady(page, '#product-dialog');
    await page.screenshot({ path: path.join(out, 'produto-mobile.png'), animations: 'disabled' });
    await closeByEscape(page, '#product-dialog');
    assert.equal(await page.evaluate(() => document.activeElement.dataset.details), 'coca');
  });
  await check('Adição por modal, quantidade, agrupamento e total exato', async () => {
    await page.getByRole('button', { name: 'Ver detalhes de X-Burger', exact: true }).click();
    assert(await page.locator('#detail-minus').isDisabled());
    await page.locator('#detail-plus').click();
    assert.equal(await page.locator('#detail-quantity').textContent(), '2');
    await page.locator('#detail-add').click();
    await closeByEscape(page, '#product-dialog');
    await page.locator('[data-add="x-burger"]').click();
    await page.locator('[data-add="coca"]').click();
    assert.equal(await page.locator('#cart-count').textContent(), '4');
    assert.match(await page.locator('#mobile-total').textContent(), /81,00/);
    await openCart(page);
    assert.equal(await page.getByRole('button', { name: 'Continuar comprando', exact: true }).count(), 0);
    assert.equal(await page.locator('#cart-items').count(), 1, 'Painel duplicado');
    assert.equal(await page.locator('#cart-items .cart-item').count(), 2);
    await page.locator('[data-id="x-burger"][data-action="plus"]').click();
    assert.match(await page.locator('#cart-total').textContent(), /106,00/);
    await page.locator('[data-id="x-burger"][data-action="minus"]').click();
    await page.locator('[data-id="coca"][data-action="remove"]').click();
    assert.equal(await page.locator('#cart-count').textContent(), '3');
    assert.match(await page.locator('#cart-total').textContent(), /75,00/);
    await closeByEscape(page, '#cart-dialog');
  });
  await check('Persistência real após recarregar o navegador', async () => {
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.locator('#cart-count').textContent(), '3');
    assert.match(await page.locator('#mobile-total').textContent(), /75,00/);
    assert.equal(await page.locator('#cart-items .cart-item').count(), 1);
  });
  await check('Carrinho compartilhado entre dialog mobile e painel desktop', async () => {
    await openCart(page);
    assert.equal(await page.locator('#cart-modal-slot #carrinho').count(), 1);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('#cart-dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#cart-dock #carrinho').count(), 1);
    assert.equal(await page.locator('#cart-items').count(), 1);
    await page.setViewportSize({ width: 390, height: 844 });
  });
  await check('Finalização, resumo e retorno automático com limpeza persistente', async () => {
    await openCart(page);
    await page.locator('#checkout').click();
    await page.locator('#checkout-dialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#checkout-items li').count(), 1);
    assert.match(await page.locator('#checkout-total').textContent(), /75,00/);
    assert.equal(await page.getByText('Voltar para a loja', { exact: true }).count(), 0);
    await waitModalReady(page, '#checkout-dialog');
    await page.screenshot({ path: path.join(out, 'resumo-mobile.png'), animations: 'disabled' });
    await page.locator('#complete-demo').click();
    await page.locator('#checkout-dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('#cart-count').textContent(), '0');
    assert.match(await page.locator('#mobile-total').textContent(), /0,00/);
    await page.reload({ waitUntil: 'load' });
    assert.equal(await page.locator('#cart-count').textContent(), '0');
  });
  await check('Vídeo inicia, termina uma vez e mantém fallback atrás', async () => {
    await page.waitForFunction(() => document.querySelector('video').ended, { timeout: 15000 });
    const state = await page.locator('video').evaluate(v => ({ ended: v.ended, loop: v.loop, muted: v.muted, controls: v.controls, duration: v.duration, width: v.videoWidth, height: v.videoHeight }));
    assert(state.ended && !state.loop && state.muted && !state.controls);
    return state;
  });
  for (const width of [320, 360, 390, 768, 1024, 1440]) {
    await check(`Layout sem rolagem horizontal em ${width}px`, async () => {
      await page.setViewportSize({ width, height: width < 600 ? 844 : 900 });
      await page.evaluate(() => scrollTo(0, 0));
      const dimensions = await noOverflow(page);
      assert(dimensions.document <= dimensions.viewport, JSON.stringify(dimensions));
      await page.getByRole('button', { name: 'Ver detalhes de X-Burger', exact: true }).click();
      const dialog = await page.locator('#product-dialog').boundingBox();
      assert(dialog.x >= 0 && dialog.x + dialog.width <= width + 1);
      await page.locator('#detail-add').scrollIntoViewIfNeeded();
      const close = await page.locator('#product-dialog .close-modal').boundingBox();
      assert(close && close.y >= 0 && close.y + close.height <= (width < 600 ? 844 : 900), 'Fechar inacessível durante rolagem');
      await closeByEscape(page, '#product-dialog');
      if ([320, 390, 768, 1440].includes(width)) {
        await page.locator('#search').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(out, `layout-${width}.png`), animations: 'disabled' });
      }
      report.viewports.push({ width, ...dimensions });
    });
  }
  await check('Celular em paisagem 844×390: detalhes e fechamento acessíveis', async () => {
    await page.setViewportSize({ width: 844, height: 390 });
    await page.getByRole('button', { name: 'Ver detalhes de X-Burger', exact: true }).click();
    await page.locator('#detail-add').scrollIntoViewIfNeeded();
    const modal = await page.locator('#product-dialog').boundingBox();
    assert(modal.width <= 844 && modal.height <= 390);
    assert((await noOverflow(page)).document <= 844);
    await closeByEscape(page, '#product-dialog');
  });
  await context.close();
  await check('Fallback real quando o arquivo de vídeo falha', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const p = await ctx.newPage();
    await p.route('**/burger-intro.mp4', route => route.abort());
    await p.goto(base, { waitUntil: 'load' });
    assert(await p.locator('.hero-fallback').evaluate(img => img.complete && img.naturalWidth > 0));
    assert(!await p.locator('video').evaluate(v => v.classList.contains('is-playing')));
    await ctx.close();
  });
  await check('Preferência de movimento reduzido', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    const p = await ctx.newPage(); const requests = [];
    p.on('request', req => { if (req.url().includes('.mp4')) requests.push(req.url()); });
    await p.goto(base, { waitUntil: 'load' });
    assert(await p.locator('video').evaluate(v => v.paused && getComputedStyle(v).display === 'none'));
    const motion = await p.locator('.product-card').first().evaluate(el => getComputedStyle(el).transitionDuration);
    assert.equal(requests.length, 0, 'MP4 não deve ser solicitado quando há preferência por movimento reduzido.');
    await ctx.close(); return { videoRequests: requests.length, cardTransition: motion };
  });
  console.log('Iniciando medição com rede de 1,6 Mbps, latência de 150 ms e CPU 4× mais lenta...');
  await check('Medição mobile com rede e CPU limitadas (não é pontuação Lighthouse)', async () => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const p = await ctx.newPage();
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1600000 / 8, uploadThroughput: 750000 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    let wireBytes = 0;
    cdp.on('Network.loadingFinished', event => { wireBytes += event.encodedDataLength; });
    await p.addInitScript(() => {
      window.__metrics = { lcp: 0, cls: 0, longTasks: 0, blockingMs: 0 };
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__metrics.lcp = entry.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__metrics.cls += entry.value; }).observe({ type: 'layout-shift', buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) { window.__metrics.longTasks++; window.__metrics.blockingMs += Math.max(0, entry.duration - 50); } }).observe({ type: 'longtask', buffered: true });
    });
    await p.goto(base, { waitUntil: 'load', timeout: 120000 });
    await p.waitForFunction(() => document.querySelector('video').ended || document.querySelector('video').error, { timeout: 60000 });
    const metrics = await p.evaluate(() => ({ ...window.__metrics, fcp: performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? null, loadMs: performance.getEntriesByType('navigation')[0].loadEventEnd, resources: performance.getEntriesByType('resource').map(r => ({ path: new URL(r.name).pathname, bytes: r.transferSize, durationMs: Math.round(r.duration) })) }));
    metrics.wireBytes = wireBytes;
    metrics.conditions = '390×844, rede 1,6 Mbps / 150 ms, upload 750 Kbps, CPU 4×, cache desativado, localhost sem compressão HTTP';
    report.performance = metrics;
    if (metrics.lcp > 2500) report.warnings.push(`LCP acima de 2,5 s nesta simulação: ${(metrics.lcp / 1000).toFixed(2)} s.`);
    if (wireBytes > 3 * 1024 * 1024) report.warnings.push(`Carga de mídia alta para mobile: ${(wireBytes / 1024 / 1024).toFixed(2)} MiB nesta medição.`);
    if (metrics.cls > .1) report.warnings.push(`Instabilidade visual: CLS ${metrics.cls.toFixed(3)}.`);
    await ctx.close(); return metrics;
  });
  if (report.errors.length) report.warnings.push('Erros de console/página observados: ' + report.errors.join('; '));
})().catch(error => { report.errors.push(error.stack); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  server.close();
  const passed = report.checks.filter(c => c.status === 'passed').length;
  const failed = report.checks.filter(c => c.status === 'failed').length;
  report.summary = { passed, failed };
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(path.join(out, 'browser-report.json'), JSON.stringify(report, null, 2));
  const lines = ['# Verificação local BurgerTop', '', `Navegador: Edge ${report.engine}. Execução isolada, sem usar dados do navegador pessoal.`, '', `Resultados: ${passed} verificações passaram; ${failed} falharam.`, '', ...report.checks.map(c => `- ${c.status === 'passed' ? 'PASSOU' : 'FALHOU'}: ${c.name}${c.error ? ' — ' + c.error : ''}`), '', '## Pontos de atenção', '', ...report.warnings.map(w => '- ' + w), '', '## Medição de desempenho', '', 'Esta é uma medição local com condições simuladas, não uma nota Lighthouse nem garantia sobre hospedagem, Safari ou aparelho físico.'];
  if (report.performance) { const p = report.performance; lines.push('', p.conditions, '', `- FCP: ${(p.fcp / 1000).toFixed(2)} s`, `- LCP: ${(p.lcp / 1000).toFixed(2)} s`, `- CLS: ${p.cls.toFixed(3)}`, `- Tarefas longas: ${p.longTasks}`, `- Bloqueio acumulado acima de 50 ms: ${Math.round(p.blockingMs)} ms`, `- Bytes recebidos: ${(p.wireBytes / 1024 / 1024).toFixed(2)} MiB`); }
  if (report.errors.length) lines.push('', '## Erros observados', '', ...report.errors.map(e => '- ' + e));
  fs.writeFileSync(path.join(out, 'browser-report.md'), lines.join('\n') + '\n');
  console.log(JSON.stringify({ summary: report.summary, warnings: report.warnings, performance: report.performance && { lcp: report.performance.lcp, fcp: report.performance.fcp, cls: report.performance.cls, wireBytes: report.performance.wireBytes } }, null, 2));
  if (failed || report.errors.length) process.exitCode = 1;
});
