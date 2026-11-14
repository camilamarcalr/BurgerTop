# Teste de autenticação real

Supabase real, sem interceptar Auth ou substituir sessões

- PASSED: Cadastro com Gmail fictício e senha numérica de seis dígitos — Conta retornada e verificada pelo Supabase Auth real, sem confirmação enviada.
- PASSED: Perfil no PostgreSQL remoto — Perfil associado ao mesmo ID do Auth.
- PASSED: Alteração de perfil persistida no PostgreSQL
- PASSED: Pedido registrado e histórico lido do banco real — X-Burger e Coca-Cola, total calculado no servidor de R$ 31,00.
- PASSED: Sessão após recarregar
- PASSED: Saída e proteção da conta
- PASSED: Novo login com as mesmas credenciais
- PASSED: Senha incorreta no Auth real

Uma conta fictícia foi criada no Auth e permanece disponível para inspeção administrativa. A senha e os tokens não foram gravados no relatório.
