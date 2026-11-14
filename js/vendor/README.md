# Biblioteca do Supabase

Esta pasta guarda a versão de navegador do SDK oficial do Supabase, usada para login, sessão e acesso aos dados da conta. O site continua em HTML, CSS e JavaScript.

A versão está fixada em 2.119.0. O arquivo de licença acompanha a biblioteca, e `vendor-lock.json` registra a origem e o hash do arquivo para conferir a cópia. O navegador carrega a biblioteca local, sem depender de um CDN durante o uso do site.

`npm run check` confere o hash. `npm run build` copia a biblioteca e a licença para a publicação; o manifesto fica no código-fonte. Para atualizar o SDK, obtenha a versão oficial, atualize o arquivo, o manifesto e a referência em `js/auth.js`, e execute os testes de acesso antes de publicar.
