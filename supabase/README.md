# Banco e autenticação

O BurgerTop usa o Supabase para autenticar as pessoas e guardar seus perfis e pedidos. A página continua sendo HTML, CSS e JavaScript, por isso pode ser publicada no GitHub Pages sem um servidor Node em produção.

## Configuração do projeto

O endereço configurado em `js/config.js` é `https://wsflmeguecexgsgwenkk.supabase.co`. O SDK usa esse endereço base; o trecho `/rest/v1/` pertence aos endpoints da API e não deve ser colocado na configuração do cliente.

A chave `publishable` também está nesse arquivo. Ela é pública e identifica o projeto. A autorização dos dados depende da sessão e das políticas RLS, não de esconder essa chave. Nunca coloque senha do banco, token administrativo, chave secreta ou `service_role` no site.

## Aplicar as tabelas

A migração está em [migrations](migrations/README.md). Ela foi executada em PostgreSQL local nos testes e aplicada no projeto hospedado pelo SQL Editor. O teste real confirmou que o cadastro cria um perfil no PostgreSQL com o mesmo ID do usuário no Auth. As instruções abaixo servem para reproduzir a instalação em um banco novo; não execute novamente a criação dos mesmos objetos no banco já configurado.

Para aplicar pelo painel:

1. Abra o projeto **wsflmeguecexgsgwenkk** no Supabase e confira o identificador antes de continuar.
2. Abra o SQL Editor e crie uma consulta.
3. Cole o conteúdo completo de `migrations/20261114013046_burgertop_accounts_orders.sql` e execute uma vez.
4. Confira as três tabelas `bt_profiles`, `bt_orders` e `bt_order_items`, com RLS habilitada. O schema privado contém as funções internas.

Outra opção é usar a CLI instalada pelas dependências de desenvolvimento. Depois de fazer login com uma conta que tenha acesso ao projeto, use `npx supabase link --project-ref wsflmeguecexgsgwenkk`. Confira a prévia com `npx supabase db push --remote --dry-run --skip-vault` e, depois de conferir o destino e as migrações, aplique com `npx supabase db push --remote --skip-vault`. A versão 3 exige selecionar explicitamente o destino remoto. Não publique credenciais nem a pasta `.temp`.

Como esta instalação foi feita pelo SQL Editor, confira e concilie o histórico de migrações antes de adotar `db push` no mesmo projeto. Executar SQL manualmente não registra automaticamente a migração no histórico da CLI.

O `config.toml` descreve o ambiente local da CLI; editar esse arquivo não altera automaticamente o serviço hospedado. Para subir a pilha local da CLI também é necessário Docker. Os testes de banco deste projeto usam PGlite e não precisam de Docker.

Não há arquivo de seed neste projeto. A seção de seed está desativada no `config.toml`, para não procurar um SQL inexistente. Os dados fictícios usados nos testes são criados pelo próprio teste.

## Configurar o Auth para os testes

O cadastro desta versão aceita e-mails com formato válido terminados em `@gmail.com`, inclusive endereços fictícios. A senha do formulário deve ter somente números, com pelo menos seis dígitos. As contas são criadas pelo Supabase Auth real; não há uma lista local de usuários.

No painel do projeto **wsflmeguecexgsgwenkk**, abra **Authentication → Sign In / Providers**:

1. Mantenha habilitados os novos cadastros e o provedor **Email**.
2. Desative **Confirm email** e salve. Sem isso, o servidor tenta confirmar o endereço e o cadastro de testes não pode ser usado com uma caixa fictícia.
3. Nas opções de senha do provedor Email, defina o tamanho mínimo como **6** e não exija letras, maiúsculas ou símbolos. Se a proteção de senhas vazadas impedir a senha numérica usada nos testes, ajuste essa opção no ambiente de testes também.
4. Confira o resultado executando `node tests/remote-check.cjs`. A propriedade `autoConfirm` precisa ser `true`: isso significa que a confirmação automática está ativa, sem envio de confirmação.

O formulário consulta essa configuração antes de chamar `signUp`. Enquanto a confirmação de e-mail estiver ativa, ele informa a pendência e não envia o cadastro. A chave pública não permite alterar configurações administrativas, então é necessário acesso ao painel ou uma conexão administrativa autorizada para fazer esse ajuste.

O `config.toml` já usa mínimo de seis caracteres e confirmação desativada para o ambiente local. Isso não muda o projeto hospedado. A última tentativa real está em `tests/reports/auth-live-report.md`, com a situação encontrada no serviço.

## Endereços de retorno e recuperação

Em **URL Configuration**, defina a Site URL como a URL final do site. Adicione às Redirect URLs o endereço completo de `login.html` da publicação, incluindo a pasta do repositório no GitHub Pages. Os fluxos acrescentam os parâmetros `mode=confirm` ou `mode=reset` e, na confirmação, `next`; permita esses retornos no padrão cadastrado. Para desenvolvimento, permita `http://127.0.0.1:4173/**`. Restrinja os padrões de produção ao domínio e à pasta reais.

O cadastro de testes não usa e-mail de confirmação. A recuperação de senha continua sendo uma ação separada, solicitada pelo botão Esqueci minha senha: ela depende de um endereço com caixa real para receber o link. Esse fluxo usa PKCE e deve ser concluído no mesmo navegador que o iniciou. Os testes reais com endereços fictícios não solicitam recuperação.

## Como os dados ficam protegidos

- `bt_profiles`: um perfil por usuário do Auth. A pessoa lê seu perfil e altera apenas o próprio nome.
- `bt_orders`: pedidos vinculados à conta autenticada. Só o dono pode consultá-los.
- `bt_order_items`: itens associados ao pedido, sujeitos à mesma regra de leitura.

O navegador envia apenas os IDs dos produtos, as quantidades e uma chave de tentativa para `bt_create_order`. A função calcula o valor com o catálogo validado no servidor e grava tudo em uma operação. Enviar preço, usuário ou status no corpo é rejeitado. A mesma chave, na mesma conta, devolve o pedido já registrado, evitando duplicações nas tentativas repetidas.

Não há permissões de inserção direta nas tabelas para visitantes ou clientes autenticados. As funções privilegiadas ficam no schema `burgertop_private`, fora dos schemas expostos pela Data API, com caminhos de busca fixos. Os metadados do cadastro servem para o nome exibido, nunca para decidir permissões.

## Conferência depois da configuração

Abra o site por HTTP ou HTTPS. Depois de ajustar o Auth, execute `npm run test:auth:live`. O teste usa um Gmail fictício único e uma senha numérica de seis dígitos, cria a conta pela própria tela, verifica o usuário no Auth, confere o perfil no PostgreSQL, recarrega a sessão, sai e entra novamente. Também testa uma senha incorreta. Senhas e tokens não ficam nos relatórios. A conta fictícia criada permanece no Auth para inspeção.

O teste real também altera o nome, registra um X-Burger e uma Coca-Cola e confere o pedido e o total no banco e no histórico. Para testar os arquivos de produção, execute `npm run build` e depois `npm run test:auth:live -- --dist`. Isso cria uma conta e um pedido fictícios no projeto configurado.

Na Vercel não é preciso instalar um segundo banco ou enviar esta pasta para o site público. O build exclui o SQL e o `config.toml`; ambos continuam no repositório para documentar a estrutura. Configure o domínio final conforme [PUBLICACAO.md](../docs/PUBLICACAO.md).

Para conferir o isolamento dos pedidos manualmente, use duas contas de teste: registre um pedido na primeira, saia e entre na segunda. A segunda não deve enxergar o pedido da primeira. A migração precisa estar aplicada para perfis e pedidos funcionarem. Nenhum pagamento ou pedido para uma loja física é feito pelo projeto.
