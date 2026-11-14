# Verificações do projeto

Este documento registra a preparação do BurgerTop para versionamento e publicação. Os relatórios detalhados ficam em [tests/reports](../tests/reports/README.md).

## Estrutura encontrada e ajustes

A pasta estava sem Git inicializado e sem histórico local. Não havia arquivos idênticos duplicados. Os originais das mídias e as referências foram preservados; são fontes do trabalho e não substituem os WebPs usados na página.

O servidor de desenvolvimento foi movido de tests para scripts, com os imports e comandos atualizados. Foram criados um build estático com lista explícita de arquivos públicos, um preview de produção e uma conferência de referências, documentação e possíveis credenciais. A configuração local do Supabase deixou de procurar um seed.sql inexistente. O SQL já aplicado no projeto remoto não foi alterado.

O .gitignore cobre dependências, saída de build, caches, ambiente, chaves e relatórios JSON/capturas gerados. Os resumos Markdown dos testes permanecem como documentação. A publicação recebe apenas dist; o repositório mantém o código, a documentação e as migrations.

As três páginas permaneceram na raiz para preservar os links. Estilos, scripts do navegador e mídias mantiveram os caminhos anteriores. As ferramentas ficaram em scripts; os guias de entrega e publicação ficaram em docs. Os 11 READMEs anteriores foram revisados e atualizados, e foram criados os READMEs de scripts e docs: 13 pastas mantidas documentadas. As pastas geradas e ignoradas, como node_modules e dist, não são parte da documentação de código-fonte.

Não há arquivo mantido acima de 10 MiB. O maior é o vídeo, com aproximadamente 3 MiB. As mídias originais foram conservadas por serem fontes do projeto; a saída pública usa somente as versões necessárias.

## Verificações executadas

| Comando | Resultado |
| --- | --- |
| `npm ci` | Instalação pelo lockfile; 0 vulnerabilidades reportadas pelo npm |
| `npm run check` | Caminhos, capitalização, READMEs, sintaxe e hash do SDK conferidos; nenhum padrão de segredo detectado |
| `npm test` | 19 testes passaram, incluindo a migração e o isolamento entre usuários no PostgreSQL local |
| `npm run test:auth` | 18 verificações passaram com SDK real e respostas da API simuladas |
| `npm run test:browser` | 18 verificações passaram: catálogo, carrinho, vídeo, fallback, teclado e responsividade |
| `npm run build` | 21 arquivos em dist, aproximadamente 3,82 MiB |
| `npm run test:production` | Os 3 casos passaram: lista e cópias dos arquivos, acesso HTTP aos assets e exclusão de arquivos internos |
| `npm run test:auth:live -- --dist` | 8 etapas passaram no serviço real usando os arquivos de produção |
| `npm run supabase -- --version` | CLI instalada confirmada: 3.1.0 |

No teste real, foram criados uma conta Gmail fictícia e seu perfil, o nome foi atualizado, e um pedido de X-Burger e Coca-Cola foi registrado por R$ 31,00. O pedido foi lido do PostgreSQL e apareceu no histórico. Sessão após recarregar, logout, proteção da conta, novo login e credenciais incorretas também foram conferidos. A conta e o pedido fictícios permanecem no Supabase para inspeção; nenhuma senha ou token foi gravado nos relatórios.

As larguras verificadas no Edge foram 320, 360, 390, 768, 1024 e 1440 pixels, além de 844 × 390 em paisagem no catálogo. O menu de conta também foi conferido aberto em larguras pequenas.

A primeira execução da verificação HTTP de produção foi bloqueada pelo isolamento do ambiente (`EACCES` no localhost). Ela foi repetida com acesso permitido à conexão local e passou. A consulta de versão da CLI também precisou de acesso ao arquivo de telemetria fora da pasta. Não foi necessário mudar o site por causa desses bloqueios do ambiente de execução.

## Alcance da revisão de credenciais

A conferência examina os arquivos mantidos da pasta e procura padrões de chaves privadas, tokens conhecidos, JWT administrativo e senhas em URLs de banco. Os valores de possíveis achados nunca são impressos. Essa busca não é uma garantia contra todo formato de segredo.

Sem .git não há histórico local para auditar. Históricos de outros computadores ou de um repositório remoto não foram acessados. A configuração do frontend contém a URL e a chave publishable pública; a proteção dos dados depende de Auth, permissões e RLS.

## Limitações

O projeto usa a política acadêmica de cadastro sem confirmação e senha numérica de seis dígitos ou mais. Isso não valida a posse do e-mail. A recuperação por e-mail, Safari, aparelho físico e domínio de produção precisam de conferência própria. A autoria das mídias recebidas não está identificada.

GitHub e Vercel não foram alterados. Criar o repositório, revisar o primeiro commit, fazer o push, importar na Vercel e cadastrar o domínio no Auth são etapas do responsável pelo projeto.
