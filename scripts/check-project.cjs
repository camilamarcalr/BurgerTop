const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { root, publicFiles, exactFile } = require('./site-files.cjs');
const failures = [], warnings = [], files = [], directories = [root];
const skip = new Set(['node_modules', 'dist', '.git', '.vercel', '.temp', '.branches']);
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && skip.has(entry.name)) continue;
    const file = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) { failures.push('Link simbólico não permitido: ' + path.relative(root, file)); continue; }
    if (entry.isDirectory()) { directories.push(file); walk(file); } else files.push(file);
  }
}
walk(root);
for (const directory of directories) if (!fs.existsSync(path.join(directory, 'README.md'))) failures.push('Pasta sem README: ' + path.relative(root, directory));
const publish = publicFiles();
for (const file of publish) { try { exactFile(file); } catch (error) { failures.push(error.message); } }
for (const html of ['index.html', 'login.html', 'conta.html']) {
  const source = fs.readFileSync(path.join(root, html), 'utf8');
  for (const match of source.matchAll(/(?:src|href|data-src)="([^"]+)"/g)) {
    const reference = match[1].split(/[?#]/)[0];
    if (!reference || /^(?:https?:|data:|mailto:)/.test(reference)) continue;
    if (!publish.includes(reference)) failures.push(`${html}: dependência fora do build: ${reference}`);
  }
}
const detected = [];
const patterns = [
  ['chave privada PEM', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['chave secreta Supabase', /\bsb_secret_[A-Za-z0-9_-]{16,}/],
  ['token de administração Supabase', /\bsbp_[A-Za-z0-9]{20,}/],
  ['token GitHub', /\b(?:gh[pousr]_[A-Za-z0-9]{25,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['credencial AWS', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/],
  ['senha em URL de banco', /postgres(?:ql)?:\/\/[^\s:@/]+:[^\s@/$]+@[^\s/]+/]
];
for (const file of files) {
  const relative = path.relative(root, file).replaceAll(path.sep, '/');
  if (fs.statSync(file).size > 10 * 1024 * 1024) warnings.push('Arquivo acima de 10 MiB: ' + relative);
  if (!/\.(?:md|js|cjs|json|toml|html|css|sql|txt)$/.test(file) && !path.basename(file).startsWith('.env')) continue;
  const source = fs.readFileSync(file, 'utf8');
  for (const [type, pattern] of patterns) if (pattern.test(source)) detected.push({ file: relative, type });
  for (const match of source.matchAll(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g)) {
    try { if (JSON.parse(Buffer.from(match[0].split('.')[1], 'base64url')).role === 'service_role') detected.push({ file: relative, type: 'JWT administrativo' }); } catch { /* Texto sem formato de JWT válido. */ }
  }
  if (/\.(?:js|cjs)$/.test(file)) { try { new vm.Script(source, { filename: relative }); } catch { failures.push('Sintaxe JavaScript inválida: ' + relative); } }
  if (/README\.md$/i.test(file) || relative.startsWith('docs/')) {
    for (const link of source.matchAll(/\]\(([^)]+)\)/g)) {
      const target = link[1].split('#')[0];
      if (!target || /^[a-z]+:/i.test(target)) continue;
      if (!fs.existsSync(path.resolve(path.dirname(file), target))) failures.push('Link de documentação ausente em ' + relative + ': ' + target);
    }
  }
}
for (const finding of detected) failures.push(`${finding.type}: ${finding.file} (valor omitido)`);
const vendor = JSON.parse(fs.readFileSync(path.join(root, 'js/vendor/vendor-lock.json'), 'utf8'));
const hash = crypto.createHash('sha256').update(fs.readFileSync(exactFile('js/vendor/' + vendor.file))).digest('hex');
if (hash !== vendor.sha256) failures.push('O hash do SDK diverge do vendor-lock.json.');
if (!fs.readFileSync(path.join(root, 'js/auth.js'), 'utf8').includes('vendor/' + vendor.file)) failures.push('A referência dinâmica ao SDK não acompanha o manifesto.');
const configContext = {};
vm.runInNewContext(fs.readFileSync(path.join(root, 'js/config.js'), 'utf8'), configContext);
if (!configContext.BurgerTopConfig.supabasePublishableKey.startsWith('sb_publishable_')) failures.push('Revisar a configuração pública do Supabase.');
console.log(JSON.stringify({ filesReviewed: files.length, publicFiles: publish.length, readmes: directories.length, gitHistory: fs.existsSync(path.join(root, '.git')) ? 'Existe .git; revisar também os commits antes do envio.' : 'Sem .git; não existe histórico local para examinar.', credentials: detected.length ? 'Possível segredo encontrado; valores omitidos.' : 'Nenhum segredo reconhecido pelos padrões; configuração publishable pública mantida.', warnings, failures }, null, 2));
if (failures.length) process.exitCode = 1;
