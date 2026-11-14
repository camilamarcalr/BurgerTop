const fs = require('node:fs');
const path = require('node:path');
const { root, publicFiles, exactFile } = require('./site-files.cjs');

const files = publicFiles();
for (const file of files) exactFile(file);
const output = path.resolve(root, 'dist');
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('Destino de build inválido.');
if (fs.existsSync(output) && fs.lstatSync(output).isSymbolicLink()) throw new Error('dist não pode ser um link simbólico.');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
let bytes = 0;
for (const file of files) {
  const source = exactFile(file), target = path.join(output, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target); bytes += fs.statSync(source).size;
}
console.log(`Build estático: ${files.length} arquivos em dist (${(bytes / 1024 / 1024).toFixed(2)} MiB).`);
