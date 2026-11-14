# Resultados dos testes

Esta pasta guarda resumos, dados e capturas das verificações. Os arquivos são atualizados ao executar cada suíte.

- `browser-report.md`: catálogo, carrinho, vídeo, layouts e desempenho em condições simuladas.
- `auth-report.md`: formulários e área da conta com SDK real e respostas HTTP simuladas.
- `auth-live-report.md`: fluxo contra o Supabase real, distinguindo passos concluídos de etapas bloqueadas.
- `baseline-before-optimization.md`: comparação histórica anterior aos WebPs, preservada como referência.

Cada suíte também pode gerar JSON. As imagens `login-*.png`, `signup-*.png` e as capturas do catálogo ajudam a conferir proporções. Esses JSONs e PNGs ficam no computador e são ignorados pelo Git; incluem detalhes de execução ou identificadores de contas fictícias que não precisam fazer parte da entrega.

`remote-report.json` é uma consulta pública do projeto: indica confirmação automática e resposta da tabela de perfis, sem recolher linhas de usuários. O resumo da preparação está em [VERIFICACAO.md](../../docs/VERIFICACAO.md).

Os resultados de navegador são do Edge e de larguras emuladas. Não representam Safari, aparelho físico ou uma publicação na Vercel. Recuperação por e-mail e domínio de produção precisam de teste próprio.

