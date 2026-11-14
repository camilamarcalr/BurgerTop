# Ferramentas do projeto

Esta pasta reúne os comandos de desenvolvimento e publicação. Nenhum destes scripts roda no navegador ou é enviado para a saída de produção.

- `serve.cjs`: servidor HTTP em `127.0.0.1`. `npm run dev` serve o projeto na porta 4173; `npm run preview` serve apenas `dist`, na porta 4174. Os testes também reutilizam esse servidor com uma porta temporária.
- `site-files.cjs`: lista os arquivos usados pelo site e verifica caminhos com a capitalização exata. As fotos dos produtos vêm do catálogo, e o nome do SDK vem do manifesto de versão.
- `build.cjs`: recria somente a pasta `dist` e copia os arquivos públicos da lista. Antes de remover a saída anterior, confere o destino e rejeita links simbólicos.
- `check-project.cjs`: confere READMEs, referências dos HTMLs, sintaxe dos scripts, hash do SDK e padrões de possíveis credenciais. Mostra apenas o tipo e o arquivo de um possível segredo, nunca seu valor.

Execute os comandos na raiz:

```text
npm run check
npm run build
npm run preview
```

Os scripts usam apenas módulos do Node. A conferência automática ajuda a encontrar problemas, mas não garante a ausência de todo segredo possível e não substitui a leitura dos arquivos que serão enviados ao Git.

