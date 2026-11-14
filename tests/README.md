# Testes do BurgerTop

Esta pasta confere as regras do carrinho, a estrutura do banco e o uso das páginas. Há testes locais com dados fictícios e um teste separado que usa o Supabase real. A diferença é importante: o teste real cria uma conta e um pedido no projeto configurado.

## Preparar

Instale Node.js 22 ou superior e execute `npm ci` na raiz. Os testes de navegador precisam do Microsoft Edge instalado. O Playwright abre um perfil isolado, sem acessar a sessão pessoal do navegador.

```text
npm test
npm run test:auth
npm run test:browser
npm run build
npm run test:production
```

Os testes de navegador e produção iniciam servidores temporários e os encerram ao terminar. O servidor compartilhado fica em `scripts/serve.cjs`; para usar o site manualmente, execute `npm run dev`.

## Arquivos

| Arquivo | O que confere |
| --- | --- |
| `cart.test.cjs` | Produtos, preços, quantidades, totais, persistência e busca |
| `auth-utils.test.cjs` | Retornos locais permitidos e mensagens de erro |
| `database.test.cjs` | Migração em PostgreSQL embarcado, RLS, permissões, preços e idempotência |
| `auth-browser.cjs` | Formulários, transição, sessão, perfil, menu, pedidos e erros com API simulada e SDK real |
| `browser-check.cjs` | Catálogo, carrinho, modais, teclado, vídeo, fallback, layouts e medição de desempenho |
| `production.test.cjs` | Conteúdo de dist, cópias idênticas, dependências por HTTP e exclusão de arquivos internos |
| `remote-check.cjs` | Configuração pública do Auth e consulta anônima limitada a zero linhas |
| `auth-live.cjs` | Cadastro, perfil, alteração do nome, pedido, histórico, sessão, logout e novo login no Supabase real |

A suíte do catálogo usa configuração vazia para verificar o modo demonstrativo sem banco. A suíte de interface intercepta as respostas de Auth e REST. Os testes SQL usam PGlite, com usuários e papéis fictícios; o schema de Auth desse teste é uma estrutura mínima para exercitar as políticas.

## Teste real

Depois de conferir a URL e a chave pública em `js/config.js`:

```text
npm run build
npm run test:auth:live -- --dist
```

O argumento `--dist` faz o teste usar a saída de produção. Sem esse argumento, usa os arquivos de origem.

O teste consulta as opções do Auth antes de cadastrar. Se a confirmação de e-mail estiver ativa, bloqueia o envio para evitar solicitar confirmação a um Gmail fictício. Quando permitido, cria uma conta única com senha numérica aleatória de seis dígitos, verifica seu perfil, altera o nome e registra X-Burger e Coca-Cola, total de R$ 31,00. A conta e o pedido permanecem no banco para inspeção. Senhas e tokens não são gravados nos relatórios.

Para consultar somente a configuração pública, sem criar nada, execute `node tests/remote-check.cjs`.

## Relatórios e limites

Os resultados ficam em [reports](reports/README.md). Resumos Markdown podem ser versionados; JSONs e capturas PNG são gerados localmente e ficam no .gitignore.

A medição do catálogo usa rede de 1,6 Mbps, latência de 150 ms e CPU quatro vezes mais lenta. Ela não é uma nota Lighthouse ou um teste em celular físico.

Safari, envio real de recuperação de senha e regressões no domínio publicado não são cobertos por estes testes. O Gmail fictício não é usado para solicitar recuperação. Consulte o [guia de publicação](../docs/PUBLICACAO.md) para a conferência depois de cada deploy.

