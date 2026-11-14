# Migrações do BurgerTop

Uma migração registra uma mudança na estrutura do banco. O prefixo de data foi gerado pela CLI do Supabase e determina a ordem de execução.

`20261114013046_burgertop_accounts_orders.sql` cria perfis, pedidos e itens, seus relacionamentos, validações e políticas de acesso. Também cria o perfil após o cadastro e a função que registra pedidos com preços calculados no servidor.

O catálogo continua no JavaScript para exibição. A lista validada de IDs, nomes e preços também aparece na função interna `catalog()`; alterações futuras de produto ou preço devem atualizar os dois lados, por meio de uma nova migração. Os testes comparam os valores para evitar divergências.

Não execute o mesmo arquivo repetidamente pelo SQL Editor, pois ele cria objetos que já existirão. Depois de aplicado, preserve este arquivo e crie outra migração para as próximas mudanças. Veja o passo a passo de configuração no [README do banco](../README.md).

O SQL deve ir para o GitHub junto com o código, pois descreve a estrutura utilizada. Ele não contém senhas ou dados pessoais e não entra no build estático da Vercel. O arquivo de migração aplicado foi preservado durante a organização; somente a configuração local de seed foi corrigida.
