const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { createServer } = require('../scripts/serve.cjs');
const { root, publicFiles, exactFile } = require('../scripts/site-files.cjs');

test('Saída estática de produção', async t => {
  const directory = path.join(root, 'dist');
  assert(fs.existsSync(path.join(directory, 'index.html')), 'Execute npm run build primeiro.');
  const actual = [];
  function walk(dir) { for (const item of fs.readdirSync(dir, { withFileTypes: true })) { const file = path.join(dir, item.name); if (item.isDirectory()) walk(file); else actual.push(path.relative(directory, file).replaceAll(path.sep, '/')); } }
  walk(directory);
  await t.test('Contém somente os arquivos públicos previstos', () => {
    assert.deepEqual(actual.sort(), publicFiles().sort());
    for (const file of actual) assert(fs.readFileSync(exactFile(file)).equals(fs.readFileSync(exactFile(file, directory))), file);
    for (const privatePath of ['supabase', 'tests', 'docs', 'scripts', 'node_modules', '.env']) assert(!fs.existsSync(path.join(directory, privatePath)));
  });
  const server = createServer({ directory: 'dist' }); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}/`;
  try {
    await t.test('Páginas, fotos, vídeo, CSS e SDK respondem por HTTP', async () => {
      for (const file of publicFiles()) {
        const response = await fetch(base + file);
        assert.equal(response.status, 200, file);
        await response.arrayBuffer();
      }
    });
    await t.test('Documentação, SQL e relatórios não são publicados', async () => {
      for (const file of ['README.md', 'package.json', 'supabase/config.toml', 'tests/reports/auth-live-report.json', '.env']) {
        const response = await fetch(base + file); assert([403, 404].includes(response.status), file);
      }
    });
  } finally { await new Promise(resolve => server.close(resolve)); }
});
