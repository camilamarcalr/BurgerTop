# Vídeo de apresentação

O arquivo `burger-intro.mp4` é o vídeo usado no banner da página inicial. Ele está preservado no formato original, com resolução de 864 × 480 pixels e tamanho aproximado de 3 MiB.

## Como ele funciona no site

A reprodução começa automaticamente uma única vez, sem som e sem controles. Ao terminar, o vídeo permanece no último quadro. A queda do hambúrguer faz parte do próprio vídeo; não é uma animação refeita com CSS.

Se o arquivo não carregar ou o navegador impedir a reprodução, a página mantém a imagem estática `banner-final.webp`, que está na pasta de imagens.

Quando o aparelho indica preferência por menos movimento ou economia de dados, o site usa essa imagem sem baixar o vídeo. Por isso, o caminho do MP4 fica no atributo data-src do HTML e só é ativado pelo JavaScript quando a reprodução é permitida.

## Como conferir na prática

Abra o `index.html` da raiz e observe o banner por alguns segundos. O vídeo não deve reiniciar sozinho. A preferência por movimento reduzido e a falha de carregamento do arquivo também são verificadas pelo teste de navegador em `tests/browser-check.cjs`.

O vídeo não foi recomprimido e ainda é a maior parte do peso transferido pela página. A autoria e a licença da mídia original não foram informadas.

O MP4 também é copiado pelo build, mantendo `Assets/videos/burger-intro.mp4`. Para conferir a saída que será hospedada, execute `npm run build` e `npm run preview` e abra o endereço indicado pelo terminal. O arquivo de aproximadamente 3 MiB pode permanecer no repositório; não foi criada uma cópia extra do vídeo entre os arquivos mantidos.
