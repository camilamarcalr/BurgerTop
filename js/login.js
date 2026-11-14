(() => {
  'use strict';
  const account = BurgerTopAccount;
  const $ = selector => document.querySelector(selector);
  const params = new URLSearchParams(location.search);
  const next = account.safeNext(params.get('next'));
  const modes = ['signin', 'signup', 'recover', 'reset', 'confirm'];
  let mode = modes.includes(params.get('mode')) ? params.get('mode') : 'signin';
  let busy = false, transitioning = false, completed = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const form = $('#auth-form'), submit = $('#auth-submit');

  function feedback(text, type = 'error') {
    const box = $('#auth-message');
    box.textContent = text; box.hidden = !text; box.className = 'auth-message ' + type;
  }
  function link(modeName, text) {
    const anchor = document.createElement('a');
    anchor.href = 'login.html?mode=' + modeName + '&next=' + encodeURIComponent(next);
    anchor.textContent = text; return anchor;
  }
  function render() {
    const signup = mode === 'signup', recover = mode === 'recover', reset = mode === 'reset';
    const titles = { signin: 'Bem-vindo de volta.', signup: 'Crie sua conta.', recover: 'Esqueceu a senha?', reset: 'Escolha uma nova senha.', confirm: 'Confirme seu acesso.' };
    const descriptions = { signin: 'Acompanhe seus pedidos.', signup: 'Seus favoritos e seus pedidos.', recover: 'Receba um link para trocar sua senha.', reset: 'Cadastre sua nova senha.', confirm: 'Conferindo seu acesso…' };
    $('#auth-title').textContent = titles[mode];
    $('#auth-intro').textContent = descriptions[mode];
    document.title = titles[mode] + ' — BurgerTop';
    $('#name-field').hidden = !signup; $('#full-name').disabled = !signup; $('#full-name').required = signup;
    $('#email-field').hidden = reset; $('#email').disabled = reset;
    $('#password-field').hidden = recover || mode === 'confirm';
    $('#password').disabled = recover || mode === 'confirm';
    $('#password').minLength = 6;
    $('#password').autocomplete = signup || reset ? 'new-password' : 'current-password';
    $('#password-hint').hidden = recover || mode === 'confirm';
    $('#recover-link').parentElement.hidden = mode !== 'signin';
    $('#recover-link').href = link('recover', '').href;
    submit.textContent = { signin: 'Entrar', signup: 'Criar conta', recover: 'Enviar link', reset: 'Salvar nova senha', confirm: 'Conferindo…' }[mode];
    submit.disabled = busy || !account.configured || mode === 'confirm';
    const switchText = $('#auth-switch'); switchText.replaceChildren();
    if (mode === 'signin') { switchText.append('Ainda não tem conta? ', link('signup', 'Criar conta')); }
    else switchText.append(link('signin', 'Já tenho conta. Entrar'));
    form.querySelectorAll('[aria-invalid]').forEach(input => input.removeAttribute('aria-invalid'));
    if (!account.supportedOrigin) {
      form.querySelectorAll('input, button').forEach(control => { control.disabled = true; });
      const local = new URL('http://127.0.0.1:4173/login.html');
      local.searchParams.set('mode', mode); local.searchParams.set('next', next);
      $('#open-local-login').href = local.href;
      $('#open-local-login').hidden = false;
    }
  }
  async function changeMode(target, push = true) {
    if (!modes.includes(target) || target === mode || busy || transitioning) return;
    transitioning = true;
    const stage = $('#auth-stage');
    const previousHeight = stage.getBoundingClientRect().height;
    try {
      if (!reducedMotion.matches) await stage.animate([{ opacity: 1, transform: 'translateY(0)' }, { opacity: 0, transform: 'translateY(-5px)' }], { duration: 90, easing: 'ease-out' }).finished;
      mode = target; feedback(''); render();
      $('#password').value = ''; $('#password').type = 'password';
      $('#toggle-password').setAttribute('aria-pressed', 'false'); $('#toggle-password').setAttribute('aria-label', 'Mostrar senha');
      if (push) { const url = new URL(location.href); url.searchParams.set('mode', mode); history.pushState({}, '', url); }
      const nextHeight = stage.getBoundingClientRect().height;
      if (!reducedMotion.matches) {
        await Promise.all([
          stage.animate([{ height: previousHeight + 'px' }, { height: nextHeight + 'px' }], { duration: 180, easing: 'cubic-bezier(.2,.7,.2,1)' }).finished,
          stage.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 180, easing: 'ease-out' }).finished
        ]);
      }
      $('#auth-title').focus({ preventScroll: true });
    } finally { transitioning = false; }
  }
  document.addEventListener('click', event => {
    const anchor = event.target.closest('#auth-switch a, #recover-link');
    if (!anchor || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    changeMode(new URL(anchor.href).searchParams.get('mode'));
  });
  addEventListener('popstate', () => changeMode(new URLSearchParams(location.search).get('mode') || 'signin', false));
  form.addEventListener('input', event => event.target.removeAttribute('aria-invalid'));
  function invalid(input, text) {
    input.setAttribute('aria-invalid', 'true'); feedback(text); input.focus(); return false;
  }
  function validate() {
    const name = $('#full-name'), email = $('#email'), password = $('#password');
    if (mode === 'signup' && name.value.trim().length < 2) return invalid(name, 'Informe seu nome com pelo menos 2 caracteres.');
    if (!email.disabled) {
      email.value = email.value.trim().toLowerCase();
      if (!email.value) return invalid(email, 'Informe seu e-mail.');
      if (!email.checkValidity()) return invalid(email, 'Informe um endereço de e-mail válido.');
      if (mode === 'signup' && (!/^[^\s@]+@gmail\.com$/i.test(email.value) || /^\.|\.@|\.\./.test(email.value))) return invalid(email, 'Use um e-mail válido terminado em @gmail.com.');
    }
    if (!password.disabled) {
      if (!password.value) return invalid(password, 'Informe sua senha.');
      if (!/^[0-9]{6,128}$/.test(password.value)) return invalid(password, 'Use somente números, com pelo menos 6 dígitos.');
    }
    return true;
  }
  $('#toggle-password').addEventListener('click', event => {
    const visible = $('#password').type === 'password';
    $('#password').type = visible ? 'text' : 'password';
    event.currentTarget.setAttribute('aria-label', visible ? 'Ocultar senha' : 'Mostrar senha');
    event.currentTarget.setAttribute('aria-pressed', String(visible));
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || transitioning || !account.configured || !validate()) return;
    const email = $('#email').value.trim();
    const password = $('#password').value;
    const fullName = $('#full-name').value.trim();
    if (mode === 'signup' && fullName.length < 2) { feedback('Informe seu nome com pelo menos 2 caracteres.'); $('#full-name').focus(); return; }
    busy = true; feedback(''); submit.disabled = true; form.setAttribute('aria-busy', 'true');
    submit.textContent = 'Aguarde…';
    try {
      const client = await account.client();
      if (mode === 'signin') {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        location.assign(next);
      } else if (mode === 'signup') {
        const settings = await account.signupSettings();
        if (settings.mailer_autoconfirm !== true) {
          feedback('O cadastro de testes ainda está bloqueado: a confirmação de e-mail precisa ser desativada no Supabase. Nenhum cadastro foi enviado.'); return;
        }
        if (settings.disable_signup || settings.external?.email === false) { feedback('O cadastro por e-mail está desativado no momento.'); return; }
        const { data, error } = await client.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        $('#password').value = '';
        if (data.session && await account.verifiedUser()) {
          completed = true;
          feedback('Conta criada. Entrando…', 'success');
          setTimeout(() => location.assign(next), 650);
        } else feedback('O cadastro não gerou uma sessão. Confira a configuração do Auth antes de tentar novamente.');
      } else if (mode === 'recover') {
        const redirect = new URL('login.html', location.href); redirect.searchParams.set('mode', 'reset');
        const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: redirect.href });
        if (error) throw error;
        feedback('Se existir uma conta com esse endereço, enviaremos um link de recuperação. Abra o link no mesmo navegador em que fez a solicitação.', 'success');
      } else if (mode === 'reset') {
        if (!await account.verifiedUser()) { feedback('O link expirou ou já foi usado. Solicite uma nova recuperação.'); return; }
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        $('#password').value = '';
        try { await account.signOut(); } catch { /* A alteração já foi confirmada pelo servidor. */ }
        mode = 'signin';
        feedback('Senha atualizada. Entre com sua nova senha.', 'success');
      }
    } catch (error) { feedback(account.message(error)); }
    finally { busy = completed; form.removeAttribute('aria-busy'); render(); }
  });
  account.subscribe(({ event }) => {
    if (event === 'PASSWORD_RECOVERY') { mode = 'reset'; render(); }
  });
  render();
  (async () => {
    if (!account.configured) { feedback('O acesso à conta está indisponível no momento. Você ainda pode consultar os produtos.'); return; }
    if (!account.supportedOrigin) {
      submit.disabled = true;
      feedback('Esta página foi aberta como arquivo. Use o botão abaixo para acessar o login pelo endereço local.');
      return;
    }
    const state = await account.ready;
    if (account.lastEvent === 'PASSWORD_RECOVERY') { mode = 'reset'; render(); }
    if (state.error) { feedback(account.message(state.error)); return; }
    const authError = new URLSearchParams(location.hash.slice(1));
    if (authError.has('error')) { feedback(account.message({ code: authError.get('error_code') })); return; }
    try {
      if (mode === 'confirm' || (mode === 'signin' && state.user)) {
        if (await account.verifiedUser()) location.replace(next);
        else { mode = 'signin'; render(); feedback('A confirmação não está mais disponível. Entre na conta ou solicite um novo link.'); }
      } else if (mode === 'reset' && !await account.verifiedUser()) {
        submit.disabled = true; feedback('Solicite um link de recuperação para escolher uma nova senha.');
      }
    } catch (error) { feedback(account.message(error)); }
  })();
})();
