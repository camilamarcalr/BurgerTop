# Aparência do site

Esta pasta cuida de como o BurgerTop aparece na tela. O arquivo `style.css` reúne as cores, a tipografia, os espaçamentos, os cards, o banner e as janelas de detalhes e finalização.

O `conta.css` cuida da tela de acesso, dos formulários e do histórico. No computador, o login tem dois painéis; no celular, a fotografia fica acima do formulário. A imagem usa o contêiner `.auth-media`, preparado para aceitar um vídeo no futuro sem alterar o formulário. Nesta versão só há a fotografia estática.

A marca e o texto de apresentação ficam acima do título do formulário. Login e cadastro compartilham campos, botões e alinhamentos. O título do cadastro fica junto dos campos, e a troca entre os formulários anima apenas o conteúdo, respeitando a preferência de reduzir movimento.

O mesmo arquivo estiliza o menu do cabeçalho com nome, ícone de hambúrguer e logout. O botão de senha usa apenas um ícone de olho. Campos inválidos e solicitações em andamento têm estados próprios; um botão bloqueado por abertura como arquivo não exibe cursor de carregamento.

## O que foi feito aqui

A base visual usa fundo escuro, texto claro e laranja para destacar preços e ações. A grade de produtos usa CSS Grid; os alinhamentos dos controles e de outros elementos usam Flexbox.

As regras de responsividade mudam o número de colunas conforme a largura da tela. O carrinho abre centralizado em todas as larguras, sem painel lateral fixo. No celular há também uma barra inferior de acesso ao pedido. Os detalhes se organizam em uma coluna nas telas menores, com ajustes para o celular deitado.

As fotos preenchem a área dos cards sem serem esticadas. O vídeo fica alinhado ao fundo do banner. Os modais têm rolagem interna e um botão de fechar que continua acessível durante a rolagem.

## Interações e acessibilidade

Os cards e botões têm efeitos curtos de interação. A adição de um produto dá um retorno visual no botão e no contador. Esses efeitos são reduzidos quando a pessoa escolhe menos movimento nas configurações do aparelho.

O foco do teclado tem uma marca visível. Os controles de quantidade e os botões foram dimensionados para facilitar o toque no celular.

## Como conferir na prática

Abra o `index.html` da raiz e diminua a largura da janela. Observe a mudança na grade, abra os detalhes de um produto e veja como o conteúdo se adapta. Use Tab para conferir a marca de foco e role um modal para verificar o botão de fechar.

As capturas e os resultados das larguras testadas estão em [tests/reports](../tests/reports/README.md).

Os dois CSS são copiados sem transformação por `npm run build`. Use `npm run preview` para conferir a versão de produção. Os caminhos relativos são os mesmos da execução local.
