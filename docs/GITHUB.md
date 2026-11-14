# Enviar o BurgerTop ao GitHub

A pasta foi preparada sem inicializar o Git, criar repositório remoto ou fazer push. Este roteiro serve para o primeiro envio dessa pasta.

## Conferir o projeto

Abra o PowerShell:

```powershell
Set-Location 'C:\Users\camil\OneDrive\Documentos\BurgerTop'
git --version
npm ci
npm run check
npm test
npm run build
npm run test:production
```

`node_modules`, `dist`, arquivos de ambiente, chaves privadas e capturas/JSON gerados pelos testes estão no `.gitignore`. O lockfile, os scripts, os SQLs e os READMEs devem ser enviados.

## Criar o repositório vazio

No GitHub, escolha **New repository** e use, por exemplo, `BurgerTop`. Selecione público ou privado conforme a entrega. Em um repositório privado, dê ao professor o acesso necessário para avaliar.

Não marque a criação automática de README, .gitignore ou licença. Esses arquivos já são tratados localmente; começar com o repositório vazio evita um conflito no primeiro envio. Depois de criar, copie a URL HTTPS exibida.

## Criar o primeiro commit

Na mesma pasta:

```powershell
git init -b main
git add .
git status
git diff --cached --stat
git ls-files --cached --ignored --exclude-standard
```

O último comando deve ficar sem saída. Confira que não há `.env`, `node_modules`, `dist`, chaves privadas ou tokens nos arquivos preparados. `js/config.js` pode aparecer: ele contém somente a URL e a chave publishable pública do Supabase.

Se um arquivo indevido estiver preparado antes do primeiro commit, use `git rm --cached -- CAMINHO_DO_ARQUIVO`. Para uma pasta, use `git rm -r --cached -- CAMINHO_DA_PASTA`. Esses comandos retiram os caminhos do índice e mantêm os arquivos no disco; confira sempre os nomes antes de executar.

Depois da revisão:

```powershell
git commit -m "Organiza o projeto BurgerTop"
```

Se o Git pedir identidade, configure seu nome e e-mail de autoria com `git config user.name "Seu nome"` e `git config user.email "Seu e-mail"`, e repita o commit. O GitHub oferece um endereço noreply nas configurações de e-mail para quem preferir não publicar o endereço pessoal.

## Fazer o primeiro envio

Substitua SEU_USUARIO e o nome do repositório pela URL que você criou:

```powershell
git remote add origin https://github.com/SEU_USUARIO/BurgerTop.git
git remote -v
git push -u origin main
```

Conclua a autenticação pelo navegador ou gerenciador de credenciais do GitHub. Não coloque senha ou token no projeto nem na URL do remoto.

Abra o repositório no site e confira os READMEs, `Assets`, `supabase/migrations` e os testes. Para alterações futuras, prepare os arquivos com `git add .`, revise `git status`, faça outro commit e envie com `git push`.

Se a pasta já tiver Git quando você for seguir o roteiro, confira `git status` e `git remote -v` antes de repetir a inicialização ou adicionar um remoto.

Referência: [guia oficial do GitHub para código local](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github).
