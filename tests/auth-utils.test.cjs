const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
function account() {
  const context = { URL, location: { href: 'https://example.org/BurgerTop/login.html', origin: 'https://example.org' }, document: { currentScript: { src: 'https://example.org/BurgerTop/js/auth.js' }, addEventListener() {} } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/auth.js'), 'utf8'), context);
  return context.BurgerTopAccount;
}
test('Retorno do login fica restrito às páginas locais permitidas', () => {
  const auth = account();
  assert.equal(auth.safeNext('index.html#carrinho'), 'index.html#carrinho');
  for (const target of ['https://evil.test', '//evil.test', 'javascript:alert(1)', '../index.html', 'index.html?token=x', 'login.html']) assert.equal(auth.safeNext(target), 'conta.html');
});
test('Mensagens não expõem detalhes internos do servidor', () => {
  const auth = account();
  assert.equal(auth.message({ code: 'invalid_credentials' }), 'E-mail ou senha incorretos.');
  assert(!auth.message({ message: 'secret SQL password' }).includes('secret'));
});
