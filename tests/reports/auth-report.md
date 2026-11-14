# Login e pedidos

Edge isolado, SDK real e API simulada; sem e-mails ou contas externas

- PASSOU: Área da conta redireciona visitante para entrar
- PASSOU: Login sem rolagem horizontal e foto correta em 320, 390, 768 e 1440 px
- PASSOU: Mostrar senha e validação impedem envio incompleto
- PASSOU: Credenciais inválidas exibem mensagem sem sair do login
- PASSOU: Alternância animada preserva a marca e funciona sem recarregar
- PASSOU: Cadastro rejeita campos vazios, domínio diferente, letras e senha curta
- PASSOU: Confirmação ativa bloqueia envio de cadastro e de e-mail
- PASSOU: Cadastro aceita 6 dígitos, recebe sessão e envia apenas nome como metadado
- PASSOU: Recuperação responde sem revelar se a conta existe
- PASSOU: Redefinição sem sessão é bloqueada
- PASSOU: Entrada válida, sessão após recarregar, perfil e histórico
- PASSOU: Falha no pedido conserva carrinho; repetição usa a mesma chave e limpa só após sucesso
- PASSOU: Saída encerra sessão e volta a proteger a conta
- PASSOU: Visitante vai do carrinho ao login sem perder os produtos
- PASSOU: Menu da conta exibe nome, fecha por ESC e encerra a sessão pelo cabeçalho
- PASSOU: Link de confirmação troca código PKCE e abre a conta
- PASSOU: Link de recuperação permite salvar nova senha e encerra a sessão
- PASSOU: Arquivo local oferece acesso HTTP sem iniciar Auth ou exibir cursor de carregamento

A migração é testada separadamente em PostgreSQL local. O fluxo de cadastro e login contra o Supabase real tem relatório próprio em auth-live-report.md. Esta suíte não envia e-mails nem valida os redirecionamentos da futura hospedagem.
