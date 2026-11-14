# Publicar na Vercel

O BurgerTop tem três páginas em HTML, CSS e JavaScript. O Supabase oferece Auth e PostgreSQL fora da Vercel. Não há servidor Node ou função serverless em produção.

## Configuração preparada

O `vercel.json` define:

| Campo | Valor |
| --- | --- |
| Framework | Other / sem framework |
| Root Directory | Raiz do repositório |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Install Command | Vazio; o build usa apenas o Node |
| cleanUrls | `false`, mantendo os links com .html |

O build reúne somente os arquivos públicos. Fotos originais não usadas, referências de layout, testes, relatórios, ferramentas e SQL ficam fora da publicação. A licença do SDK acompanha a biblioteca.

Confira localmente:

```text
npm run build
npm run test:production
npm run preview
```

Abra `http://127.0.0.1:4174`. O preview usa exatamente os arquivos de `dist`.

## Conectar o repositório

1. Faça o envio ao GitHub conforme [GITHUB.md](GITHUB.md).
2. Na Vercel, escolha **Add New → Project** e importe o repositório.
3. Confira a raiz e os valores do `vercel.json`. Não use `npm run dev` como build.
4. Publique e anote a URL HTTPS final.
5. Configure os retornos do Supabase e teste pelo domínio publicado.

A pasta `dist` não precisa estar no Git: a Vercel a gera durante o build.

## Variáveis de ambiente

Nenhuma variável é obrigatória na Vercel nesta versão. A URL e a chave publishable estão em `js/config.js` e são públicas. O navegador não lê automaticamente variáveis do painel da Vercel ou arquivos .env.

Para usar outro projeto Supabase, altere esses dois valores públicos e configure o banco correspondente. Nunca coloque chave secreta, senha do banco ou service_role no frontend. Dar um nome de variável "público" a uma chave administrativa não torna sua exposição segura.

## Ajustar o Supabase

Em **Authentication → URL Configuration**:

- Defina **Site URL** como a URL HTTPS final.
- Permita os retornos desse domínio em **Redirect URLs**. Exemplo: `https://SEU-PROJETO.vercel.app/**`.
- Se usar domínio próprio, cadastre os retornos dele também.
- Mantenha `http://127.0.0.1:4173/**` e `http://127.0.0.1:4174/**` enquanto precisar testar localmente.
- Para previews, permita apenas os endereços de teste que você realmente utilizar.

Os caminhos de recuperação são construídos a partir do endereço atual. O site publicado não manda os visitantes para localhost; os links locais aparecem apenas quando o HTML é aberto como arquivo.

O cadastro acadêmico continua exigindo confirmação de e-mail desativada e senha numérica com pelo menos seis dígitos. Antes de mudar essas regras para uso real, adapte também o formulário: hoje ele bloqueia o cadastro quando a confirmação está ativa. A recuperação de senha exige caixa de e-mail real e configuração de envio no Supabase.

## Conferir depois do deploy

Abra as três páginas diretamente, confira fotos e vídeo, cadastre uma conta de teste, saia e entre novamente. Altere o nome, registre um pedido e confira o histórico. Verifique o menu da conta, os filtros, o carrinho e uma largura de celular.

Contas e pedidos continuam no mesmo banco. Já o carrinho e a sessão local pertencem à origem do navegador: ao trocar localhost pelo domínio publicado, é esperado entrar novamente e começar outro carrinho local.

Uma publicação na Vercel não foi feita neste preparo. Domínio, redirecionamentos e eventuais restrições da hospedagem precisam ser conferidos depois do deploy. A entrega de e-mails depende do serviço externo e não é testada com Gmail fictício.

## Outra hospedagem estática

Para uma hospedagem como InfinityFree, gere `dist` e envie o conteúdo dessa pasta para o diretório público da conta, mantendo caminhos e capitalização. Configure HTTPS e os retornos do Auth. Não envie `node_modules` nem use o servidor de desenvolvimento como hospedagem.

Referências: [configuração da Vercel](https://vercel.com/docs/project-configuration/vercel-json) e [retornos do Supabase](https://supabase.com/docs/guides/auth/redirect-urls).
