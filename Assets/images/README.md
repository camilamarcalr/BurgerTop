# Imagens do projeto

Esta pasta reúne as fotos exibidas no site e as imagens usadas como referência durante a construção do layout.

## Arquivos que aparecem na página

O site usa as versões WebP da tabela abaixo no banner, nos cards, nos detalhes e nas miniaturas do pedido. Os originais continuam guardados ao lado delas.

| Versão usada no site | Arquivo original | Onde aparece |
| --- | --- | --- |
| `banner-final.webp` | `banner-final.png` | Imagem estática do banner |
| `x-burger.webp` | `x-burger.jpg` | X-Burger |
| `x-bacon.webp` | `x-bacon.jpg` | X-Bacon |
| `x-tudo.webp` | `x-tudo.png` | X-Tudo |
| `cheese-burger.webp` | `cheese-burger.png` | Cheese Burger |
| `coca-cola.webp` | `coca-cola.jpg` | Coca-Cola |

## Referências de layout

`login-reference.jpeg` é a referência da composição da tela de acesso. `login-burger.jpeg` é a fotografia exibida no painel esquerdo do login. A referência não é carregada pelo site; a tela de acesso usa somente a fotografia estática.

`inicio-referencia.png` ajudou a orientar a composição da página. `produto-referencia.png` serviu de referência para a janela de detalhes. Elas ficam disponíveis para consulta, mas não são carregadas pelo site.

## Por que há duas versões de cada foto?

Os PNGs e JPGs são as fontes recebidas. Os WebPs são versões de exibição, mais leves. A conversão usou qualidade 82 e reduziu a largura máxima para 1280 pixels no banner, 1200 em X-Tudo e Cheese Burger e 1000 nas outras fotos, sem ampliar imagens menores.

Para conferir, abra o site e clique na foto de um produto. A imagem do card e a imagem grande dos detalhes devem mostrar o mesmo produto. Se quiser alterar uma foto no futuro, o caminho usado pelo catálogo fica em `js/produtos.js`, na raiz do projeto.

A autoria e a licença das imagens originais não estão identificadas nos arquivos.

No build, entram os seis WebPs da tabela e a fotografia `login-burger.jpeg`. As fotos originais dos produtos e as referências continuam nesta pasta para consulta, mas não são publicadas em `dist`. Para conferir os caminhos depois de uma alteração, execute `npm run check` e `npm run build` na raiz.
