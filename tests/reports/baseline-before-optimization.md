# Verificação local BurgerTop

Navegador: Edge 157.0.4341.46. Execução isolada, sem usar dados do navegador pessoal.

Resultados: 17 verificações passaram; 0 falharam.

- PASSOU: Cinco produtos, imagens decodificadas e caminhos sem erro
- PASSOU: Busca combinada com filtros e mensagem sem resultados
- PASSOU: Modal da bebida, foco contido, texto correto e ESC
- PASSOU: Adição por modal, quantidade, agrupamento e total exato
- PASSOU: Persistência real após recarregar o navegador
- PASSOU: Carrinho compartilhado entre dialog mobile e painel desktop
- PASSOU: Finalização, resumo e retorno automático com limpeza persistente
- PASSOU: Vídeo inicia, termina uma vez e mantém fallback atrás
- PASSOU: Layout sem rolagem horizontal em 320px
- PASSOU: Layout sem rolagem horizontal em 360px
- PASSOU: Layout sem rolagem horizontal em 390px
- PASSOU: Layout sem rolagem horizontal em 768px
- PASSOU: Layout sem rolagem horizontal em 1024px
- PASSOU: Layout sem rolagem horizontal em 1440px
- PASSOU: Fallback real quando o arquivo de vídeo falha
- PASSOU: Preferência de movimento reduzido
- PASSOU: Medição mobile com rede e CPU limitadas (não é pontuação Lighthouse)

## Pontos de atenção

- Movimento reduzido oculta o vídeo, mas ainda solicita o MP4; há download evitável.
- LCP acima de 2,5 s nesta simulação: 38.50 s.
- Carga de mídia alta para mobile: 9.15 MiB nesta medição.

## Medição de desempenho

Esta é uma medição local com condições simuladas, não uma nota Lighthouse nem garantia sobre hospedagem, Safari ou aparelho físico.

390×844, rede 1,6 Mbps / 150 ms, upload 750 Kbps, CPU 4×, cache desativado, localhost sem compressão HTTP

- FCP: 1.64 s
- LCP: 38.50 s
- CLS: 0.000
- Tarefas longas: 3
- Bloqueio acumulado acima de 50 ms: 610 ms
- Bytes recebidos: 9.15 MiB
