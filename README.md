# BurgerTop

O BurgerTop é um projeto de hamburgueria feito com HTML, CSS e JavaScript. Dá para consultar produtos, montar o carrinho, criar uma conta e guardar os pedidos no Supabase. O site se adapta ao computador e ao celular.

Os pedidos fazem parte de um projeto acadêmico: não há pagamento ou envio para uma loja física.

[Site publicado](https://burgertop.vercel.app) · [Repositório](https://github.com/camilamarcalr/BurgerTop)

## Executar no computador

Instale Node.js 22 ou superior. Na pasta do projeto, execute:

```powershell
npm ci
npm run dev
```

Abra `http://127.0.0.1:4173`. Mantenha o terminal aberto enquanto estiver usando o servidor. Para encerrar, pressione Ctrl+C.

O acesso à conta precisa de HTTP ou HTTPS. O servidor local é só de desenvolvimento; a versão publicada funciona sem o computador de quem a criou.

## Organização

```text
BurgerTop/
├── index.html                   # Catálogo, banner, carrinho e detalhes
├── login.html                   # Entrada, cadastro e recuperação
├── conta.html                   # Perfil e histórico
├── css/                         # Estilos do catálogo e da conta
├── js/                          # Produtos, carrinho e integração com Auth
│   └── vendor/                  # SDK local do Supabase e sua licença
├── Assets/
│   ├── images/                  # Fotos originais, WebP e referências
│   └── videos/                  # Vídeo do banner
├── supabase/
│   └── migrations/              # Estrutura SQL e regras de acesso
├── scripts/                     # Servidor local, conferência e build
├── tests/
│   └── reports/                 # Resumos; capturas e JSON gerados localmente
├── docs/                        # Guias de GitHub, publicação e verificações
├── package.json
├── package-lock.json
├── vercel.json
└── .gitignore
```

Cada pasta mantida tem um README sobre seu conteúdo. `node_modules` e `dist` são gerados por comandos e ficam fora do Git. A pasta `Assets` tem A maiúsculo; os caminhos precisam manter essa escrita na hospedagem.

## O que funciona

- Busca e filtros por hambúrgueres ou bebidas.
- Detalhes dos produtos, escolha de quantidade e carrinho salvo no navegador. O carrinho abre em uma janela centralizada no desktop e no celular; no celular também há uma barra inferior de acesso.
- Cadastro, login, saída da conta e sessão após recarregar.
- Cabeçalho com o nome da pessoa, ícone de hambúrguer e menu de perfil e logout.
- Alteração do nome e histórico privado dos pedidos.
- Registro com preços calculados no servidor e repetição da tentativa sem duplicação.
- Navegação por teclado, modais com ESC e preferência de movimento reduzido.

Para experimentar: adicione duas unidades de X-Burger e uma Coca-Cola. O total deve ser R$ 56,00. Recarregue a página para conferir a persistência. Depois entre na conta, registre e consulte o pedido no menu do seu nome, em Perfil e pedidos.

O carrinho pertence ao navegador e pode continuar nele depois do logout. O histórico pertence à conta e é protegido pelo banco.

## Tecnologias e dependências

O site não usa framework. O SDK de navegador do Supabase está em `js/vendor`, com versão e hash registrados. Auth cuida das senhas e sessões; PostgreSQL guarda perfis, pedidos e itens, com RLS.

As dependências instaladas por `npm ci` são ferramentas de desenvolvimento:

| Pacote | Uso |
| --- | --- |
| Playwright | Navegador isolado para os testes |
| PGlite | PostgreSQL embarcado para executar a migração nos testes |
| Supabase CLI | Comandos locais e gerenciamento de migrações |

As versões estão fixadas no `package.json` e no lockfile. O build de publicação usa apenas recursos do Node e não precisa dessas bibliotecas.

## Configurar o Supabase

`js/config.js` contém a URL e a chave **publishable**, que é pública e precisa chegar ao navegador. Não coloque senha do banco, chave secreta ou `service_role` ali.

O projeto configurado já recebeu a migração pelo SQL Editor. Em outro projeto, siga o [guia do banco](supabase/README.md), aplique o SQL uma vez e atualize a configuração pública.

O cadastro acadêmico aceita Gmail fictício e senha numérica de pelo menos seis dígitos, sem confirmação de e-mail. Isso não comprova a posse do endereço. As opções de Auth e a recuperação de senha estão descritas no guia do banco.

## Conferir e gerar a publicação

```powershell
npm run check
npm test
npm run test:auth
npm run test:browser
npm run build
npm run test:production
npm run preview
```

O preview abre em `http://127.0.0.1:4174`. O build não compila um framework: reúne em `dist` apenas os HTMLs, estilos, scripts, SDK e mídias usados pelo site. SQL, testes, referências de layout, fotos originais não usadas e documentação ficam no repositório, mas não vão para a publicação.

O teste real é separado, pois cria uma conta fictícia e registra dados no Supabase:

```powershell
npm run test:auth:live -- --dist
```

Os comandos e os resultados estão na [documentação dos testes](tests/README.md).

## GitHub e Vercel

O repositório está em `camilamarcalr/BurgerTop`, com branch padrão `main`. O [guia do GitHub](docs/GITHUB.md) explica como obter o código e enviar alterações.

A integração com a Vercel já existe. A configuração permanece sem framework, com build `npm run build` e saída `dist`. Os detalhes de domínio e retornos do Auth estão no [guia de publicação](docs/PUBLICACAO.md).

## Produtos, imagens e vídeo

Os preços são referências para o projeto, não uma tabela oficial da BurgerTop:

| Produto | Valor | Referência |
| --- | --- | --- |
| X-Burger | R$ 25,00 | X Burguer da Anísio |
| X-Bacon | R$ 28,00 | X-Bacon da Anísio |
| X-Tudo | R$ 36,00 | X-Tudo da Anísio |
| Cheese Burger | R$ 31,00 | Estimativa por comparação com o Canguru de duas carnes da Anísio |
| Coca-Cola | R$ 6,00 | Valor ilustrativo |

A consulta foi feita em 13/11/2026 no [cardápio da Anísio Hamburgueria](https://anisio-hamburgueria.ola.click/products). Descrições e ingredientes são ilustrativos. Os preços do JavaScript e da função SQL precisam ser atualizados juntos; os testes comparam os valores.

Os originais foram preservados junto das versões WebP usadas pelo catálogo. O login usa `Assets/images/login-burger.jpeg`; `login-reference.jpeg` é apenas referência. O vídeo do banner toca uma vez, sem som. Se falhar ou houver preferência por menos movimento ou economia de dados, aparece a foto estática. Não há vídeo ou fumaça artificial na tela de login.

A autoria das mídias fornecidas não está identificada. A licença MIT do SDK está em `js/vendor`; ela se aplica à biblioteca, não às fotos ou ao projeto inteiro. Confira a autorização de uso das mídias antes de distribuí-las publicamente.

