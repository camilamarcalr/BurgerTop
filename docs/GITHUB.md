# GitHub

Repositório: [camilamarcalr/BurgerTop](https://github.com/camilamarcalr/BurgerTop). A branch principal é `main`, conectada à Vercel.

## Obter o código

```powershell
git clone https://github.com/camilamarcalr/BurgerTop.git
cd BurgerTop
npm ci
npm run dev
```

Uma pasta baixada como ZIP não tem o histórico do Git. Para enviar alterações, trabalhe no clone do repositório existente.

## Enviar alterações

Execute os testes e o build antes de preparar o commit:

```powershell
npm run check
npm test
npm run build
git status
git diff
git add .
git commit -m "Atualiza o BurgerTop"
git push origin main
```

Confira os arquivos antes do commit. O `.gitignore` exclui dependências, build, arquivos de ambiente, chaves e relatórios gerados. A URL e a chave publishable do Supabase são públicas; senhas e tokens não devem estar no projeto.

## Website

O campo Website, na seção About do repositório, usa `https://burgertop.vercel.app`.
