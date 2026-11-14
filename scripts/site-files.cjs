const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');

function publicFiles() {
  const context = {};
  vm.runInNewContext(fs.readFileSync(path.join(root, 'js/produtos.js'), 'utf8'), context);
  const vendor = JSON.parse(fs.readFileSync(path.join(root, 'js/vendor/vendor-lock.json'), 'utf8'));
  return [...new Set([
    'index.html', 'login.html', 'conta.html',
    'css/style.css', 'css/conta.css',
    ...['config', 'auth', 'produtos', 'script', 'login', 'conta'].map(name => `js/${name}.js`),
    `js/vendor/${vendor.file}`, 'js/vendor/LICENSE.supabase.txt',
    'Assets/images/banner-final.webp', 'Assets/images/login-burger.jpeg',
    'Assets/videos/burger-intro.mp4',
    ...context.BurgerTop.products.map(product => product.image)
  ])];
}

function exactFile(relative, directory = root) {
  const parts = relative.split('/');
  if (path.isAbsolute(relative) || parts.some(part => !part || part === '.' || part === '..')) throw new Error('Caminho inválido: ' + relative);
  let current = directory;
  for (const part of parts) {
    if (!fs.readdirSync(current).includes(part)) throw new Error('Arquivo ausente ou capitalização incorreta: ' + relative);
    current = path.join(current, part);
    if (fs.lstatSync(current).isSymbolicLink()) throw new Error('Link simbólico não permitido na publicação: ' + relative);
  }
  if (!fs.statSync(current).isFile()) throw new Error('Não é um arquivo: ' + relative);
  return current;
}
module.exports = { root, publicFiles, exactFile };
