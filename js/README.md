# Comportamento do site

Esta pasta contém o JavaScript do BurgerTop. As interações do catálogo continuam em JavaScript sem framework. A comunicação com autenticação e banco usa o SDK oficial do Supabase, guardado em `vendor` com versão fixa e licença.

## produtos.js

Aqui ficam os cinco produtos, com nome, categoria, foto, descrição, ingredientes ilustrativos e preço. Os preços são guardados em centavos: por exemplo, 2500 representa R$ 25,00.

O arquivo também reúne as regras do carrinho: agrupar o mesmo produto, limitar a quantidade entre 1 e 99 unidades, remover itens e calcular os valores. O armazenamento no navegador é feito pelo localStorage, com a chave `burgertop.cart.v1`.

Ao recuperar um pedido salvo, o código verifica os dados e calcula os preços pelo catálogo atual. Assim, um valor antigo ou inválido no armazenamento não substitui o preço do produto. Se o navegador bloquear o armazenamento, o pedido ainda funciona em memória e a página mostra um aviso.

## script.js

Este arquivo liga as regras aos elementos da página. Ele controla:

- Busca por nome e filtros de categoria usados em conjunto.
- Abertura dos detalhes, escolha de quantidade e adição ao pedido.
- Atualização do contador, da janela do carrinho e da barra mobile.
- Aumento, redução e remoção de itens no carrinho.
- Resumo da finalização e limpeza do carrinho somente após o registro confirmado pelo banco.
- Reprodução do vídeo e uso da imagem estática quando necessário.

O carrinho usa a mesma janela e os mesmos dados em todas as larguras. O botão do cabeçalho abre o pedido centralizado; no celular, a barra inferior abre essa mesma janela. O painel fica fora da visualização enquanto o carrinho está fechado, sem ocupar espaço no catálogo.

As janelas usam o elemento dialog do HTML. O JavaScript cuida do foco ao abrir e fechar, mantém o percurso da tecla Tab dentro delas e permite fechar por ESC ou pelo X.

O texto dos detalhes muda conforme a categoria: a bebida recebe uma mensagem sobre refrescar, enquanto os hambúrgueres recebem a mensagem sobre fome. O vídeo só recebe o caminho para download quando as preferências do navegador permitem sua reprodução.

## Como conferir na prática

Adicione duas unidades de X-Burger e uma Coca-Cola. O total deve ser R$ 56,00. Recarregue a página para conferir o carrinho salvo. Com o banco configurado, entre na conta e registre o pedido; depois confira o histórico em Minha conta.

Os testes dessas regras estão em [tests](../tests/README.md). O registro fica no Supabase; não há pagamento ou envio para uma loja física.

## Acesso e área da conta

`config.js` contém somente a URL e a chave pública do projeto. `auth.js` carrega o SDK local, mantém a sessão, traduz erros e oferece as operações compartilhadas. Os links de retorno são limitados às páginas locais conhecidas para evitar redirecionamentos externos.

`login.js` controla entrada, cadastro e recuperação de senha. O cadastro aceita Gmail com formato válido e senha numérica de seis a 128 dígitos. Campos vazios e valores fora dessas regras recebem mensagens na página. Antes de cadastrar, `auth.js` consulta as opções públicas do Auth; se a confirmação de e-mail estiver ativa, a operação é bloqueada antes de chamar `signUp`. Não há autenticação simulada no código do site.

Login e cadastro alternam na mesma página, mantendo a URL e o histórico de navegação. A transição combina fade e deslocamento leve, com duração total de 270 ms. A altura do conteúdo acompanha a mudança, e a marca fica no mesmo lugar. Com movimento reduzido, a troca é imediata. A recuperação por e-mail continua usando PKCE e precisa terminar no mesmo navegador que a iniciou.

`conta.js` verifica a sessão com o Auth antes de mostrar perfil e histórico, permite atualizar o nome e encerra a sessão ao sair. Conteúdo vindo do banco é inserido como texto, sem interpretar HTML.

Quando a pessoa está conectada, o cabeçalho mostra um ícone de hambúrguer e seu primeiro nome. O menu abre o perfil e oferece Sair da conta em qualquer página que tenha navegação de conta. O nome vem do perfil; enquanto ele é carregado, o nome do cadastro serve como alternativa. Alterar o nome atualiza o cabeçalho também. O menu fecha ao clicar fora ou pressionar ESC.

O histórico é protegido por RLS no banco. Esconder a página ou conferir a sessão no JavaScript não substitui essa proteção. No registro, a função SQL calcula os preços; o navegador não envia total ou usuário. Uma chave mantida em `sessionStorage` permite repetir a tentativa sem duplicar o pedido. Se o armazenamento estiver bloqueado, a tentativa atual continua em memória.

## Execução e publicação

Use `npm run dev` na raiz para testar por HTTP. O build copia os seis scripts e a biblioteca local para `dist/js`. Não há compilador que leia `.env` ou injete variáveis da Vercel: a configuração pública continua sendo `config.js`.

Os links entre páginas são relativos. A recuperação de senha usa o endereço atual para montar o retorno; por isso, o domínio publicado precisa estar autorizado no Supabase. A ajuda que aponta para localhost só aparece ao abrir o HTML como arquivo. O [guia de publicação](../docs/PUBLICACAO.md) descreve os ajustes externos.
