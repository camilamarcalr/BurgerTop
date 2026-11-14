(() => {
  'use strict';
  const config = globalThis.BurgerTopConfig || {};
  const configured = Boolean(config.supabaseUrl && config.supabasePublishableKey);
  const supportedOrigin = ['http:', 'https:'].includes(location.protocol);
  const libraryUrl = new URL('vendor/supabase-2.119.0.js', document.currentScript.src).href;
  const callbacks = new Set();
  let clientPromise, user = null, lastEvent = '', connectionError = null;
  let profileName = '', profileUserId = null, nameVersion = 0, loggingOut = false;
  const accountMenus = new Map();

  function safeNext(value) {
    try {
      const target = new URL(value || 'conta.html', location.href);
      const allowed = ['index.html', 'conta.html'].map(file => new URL(file, location.href).pathname);
      if (target.origin !== location.origin || !allowed.includes(target.pathname) || target.search || target.username || target.password) return 'conta.html';
      const hash = ['', '#inicio', '#cardapio', '#carrinho'].includes(target.hash) ? target.hash : '';
      return target.pathname.split('/').pop() + hash;
    } catch { return 'conta.html'; }
  }
  function message(error) {
    if (error?.name === 'AbortError' || error?.name === 'AuthRetryableFetchError' || /fetch|network|timeout/i.test(error?.message || '')) return 'Não foi possível conectar. Confira sua internet e tente novamente.';
    const messages = {
      invalid_credentials: 'E-mail ou senha incorretos.',
      unsupported_origin: 'Para acessar sua conta, abra o site pelo endereço local ou pela versão publicada.',
      email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
      weak_password: 'O servidor recusou a senha. A configuração de testes deve permitir senhas numéricas de 6 dígitos.',
      email_address_invalid: 'Informe um endereço de e-mail válido.',
      validation_failed: 'Confira os dados informados e tente novamente.',
      unexpected_failure: 'Não foi possível criar a conta no servidor. Tente novamente.',
      same_password: 'Escolha uma senha diferente da anterior.',
      over_email_send_rate_limit: 'Aguarde alguns minutos antes de solicitar outro e-mail.',
      over_request_rate_limit: 'Muitas tentativas. Aguarde um pouco e tente novamente.',
      user_already_exists: 'Já existe uma conta com esse e-mail. Entre com sua senha.',
      signup_disabled: 'O cadastro está indisponível no momento.',
      otp_expired: 'O link expirou ou já foi usado. Solicite outro.',
      bad_code_verifier: 'Abra o link no mesmo navegador em que fez a solicitação.',
      session_not_found: 'Sua sessão terminou. Entre novamente.',
      PGRST202: 'O registro de pedidos está indisponível no momento.',
      PGRST205: 'Os dados da conta estão indisponíveis no momento. Tente novamente.',
      '42501': 'Sua sessão não permite essa ação. Entre novamente.'
    };
    return messages[error?.code] || 'Não foi possível concluir a ação. Tente novamente em instantes.';
  }
  async function timedFetch(input, options = {}) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    const timer = setTimeout(abort, 15000);
    if (options.signal?.aborted) abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    try { return await fetch(input, { ...options, signal: controller.signal }); }
    finally { clearTimeout(timer); options.signal?.removeEventListener('abort', abort); }
  }
  function validateConfig() {
    const url = new URL(config.supabaseUrl);
    if (url.username || url.password || (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('URL Supabase inválida.');
    const key = config.supabasePublishableKey;
    if (key.startsWith('sb_publishable_')) return;
    try {
      const part = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const claims = JSON.parse(atob(part));
      if (claims.role === 'anon') return;
    } catch { /* Chaves privadas e formatos desconhecidos são rejeitados. */ }
    throw new Error('Utilize apenas a chave pública publishable ou anon.');
  }
  function loadLibrary() {
    if (globalThis.supabase?.createClient) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => reject(new Error('Falha ao carregar a conexão da conta.')), 10000);
      script.src = libraryUrl;
      script.onload = () => { clearTimeout(timer); globalThis.supabase?.createClient ? resolve() : reject(new Error('SDK indisponível.')); };
      script.onerror = () => { clearTimeout(timer); reject(new Error('SDK indisponível.')); };
      document.head.append(script);
    });
  }
  function notify() {
    document.querySelectorAll('[data-account-link]').forEach(link => {
      let menu = accountMenus.get(link);
      if (!menu) {
        menu = document.createElement('details'); menu.className = 'account-menu';
        menu.innerHTML = '<summary><span class="account-avatar"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9a8 6 0 0 1 16 0H4Zm-1 4h18M4 17h16v1a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1Z"/><path d="m5 13 3 2 4-2 4 2 3-2M9 6h.01M14 5h.01"/></svg></span><span class="account-name"></span></summary><div class="account-dropdown"><a href="conta.html">Perfil e pedidos</a><button type="button" class="header-signout">Sair da conta</button><p class="account-menu-error" role="status" hidden></p></div>';
        const button = menu.querySelector('button');
        button.addEventListener('click', async () => {
          button.disabled = true; button.textContent = 'Saindo…';
          const feedback = menu.querySelector('[role="status"]'); feedback.hidden = true;
          try { await globalThis.BurgerTopAccount.logout(); }
          catch (error) { feedback.textContent = message(error); feedback.hidden = false; button.disabled = false; button.textContent = 'Sair da conta'; }
        });
        link.after(menu); accountMenus.set(link, menu);
      }
      link.textContent = 'Entrar'; link.href = 'login.html'; link.hidden = Boolean(user);
      menu.hidden = !user;
      if (!user) { menu.open = false; return; }
      const registeredName = typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name.trim() : '';
      const name = (profileUserId === user.id && profileName) || registeredName || user.email?.split('@')[0] || 'Conta';
      menu.querySelector('.account-name').textContent = name.split(/\s+/)[0];
      menu.querySelector('summary').setAttribute('aria-label', name + ' — abrir menu da conta');
      menu.querySelector('summary').title = name;
    });
    callbacks.forEach(callback => callback({ user, event: lastEvent, error: connectionError }));
  }
  document.addEventListener('click', event => {
    accountMenus.forEach(menu => { if (!menu.contains(event.target)) menu.open = false; });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') accountMenus.forEach(menu => { if (menu.open) { menu.open = false; menu.querySelector('summary').focus(); } });
  });
  async function loadDisplayName() {
    if (!user || profileUserId === user.id) return;
    const id = user.id, version = ++nameVersion;
    profileUserId = id; profileName = '';
    try {
      const instance = await client();
      const { data, error } = await instance.from('bt_profiles').select('display_name').eq('id', id).single();
      if (!error && user?.id === id && nameVersion === version) { profileName = data.display_name; notify(); }
    } catch { /* O nome do cadastro continua disponível se o perfil não responder. */ }
  }
  async function client() {
    if (!supportedOrigin) { const error = new Error('Origem sem suporte para autenticação.'); error.code = 'unsupported_origin'; throw error; }
    if (!configured) throw new Error('Conexão da conta ainda não configurada.');
    if (!clientPromise) clientPromise = (async () => {
      validateConfig();
      await loadLibrary();
      const instance = globalThis.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'burgertop.auth' },
        global: { fetch: timedFetch }
      });
      instance.auth.onAuthStateChange((event, session) => {
        user = session?.user || null; lastEvent = event;
        if (!user) { profileUserId = null; profileName = ''; nameVersion++; }
        // Não chama métodos assíncronos do SDK dentro deste callback.
        setTimeout(() => { notify(); void loadDisplayName(); }, 0);
      });
      return instance;
    })();
    return clientPromise;
  }
  const ready = configured && supportedOrigin ? client().then(async instance => {
    const result = await instance.auth.getSession();
    if (result.error) throw result.error;
    user = result.data.session?.user || null;
    notify(); void loadDisplayName(); return { user, error: null };
  }).catch(error => { connectionError = error; notify(); return { user: null, error }; }) : Promise.resolve({ user: null, error: null });

  async function verifiedUser() {
    const instance = await client();
    const { data, error } = await instance.auth.getUser();
    if (error) {
      if (error.name === 'AuthSessionMissingError') return null;
      throw error;
    }
    return data.user;
  }
  globalThis.BurgerTopAccount = Object.freeze({
    configured, supportedOrigin, ready, client, safeNext, message, verifiedUser,
    async signupSettings() {
      validateConfig();
      const response = await timedFetch(new URL('auth/v1/settings', config.supabaseUrl + '/'), { headers: { apikey: config.supabasePublishableKey } });
      if (!response.ok) throw new Error('Não foi possível conferir a configuração de cadastro.');
      return response.json();
    },
    get user() { return user; },
    get loggingOut() { return loggingOut; },
    setDisplayName(name) { if (user && typeof name === 'string') { profileUserId = user.id; profileName = name.trim(); nameVersion++; notify(); } },
    get lastEvent() { return lastEvent; },
    subscribe(callback) { callbacks.add(callback); return () => callbacks.delete(callback); },
    loginUrl(next = 'conta.html') { return 'login.html?next=' + encodeURIComponent(safeNext(next)); },
    async signOut() {
      const instance = await client();
      const { error } = await instance.auth.signOut();
      if (error) throw error;
      user = null; notify();
    },
    async logout() {
      loggingOut = true;
      try { await globalThis.BurgerTopAccount.signOut(); location.replace('index.html'); }
      catch (error) { loggingOut = false; throw error; }
    },
    async createOrder(items, requestId) {
      if (!await verifiedUser()) { const error = new Error('Entre novamente.'); error.code = 'session_not_found'; throw error; }
      const instance = await client();
      const { data, error } = await instance.rpc('bt_create_order', {
        p_items: items.map(item => ({ product_id: item.product.id, quantity: item.quantity })),
        p_request_id: requestId
      });
      if (error) throw error;
      return data;
    }
  });
})();

