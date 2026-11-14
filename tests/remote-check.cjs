// Consultas públicas somente de leitura: não cria usuários, pedidos ou e-mails.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../js/config.js'), 'utf8'), context);
const config = context.BurgerTopConfig;
(async () => {
  const headers = { apikey: config.supabasePublishableKey };
  const settingsResponse = await fetch(config.supabaseUrl + '/auth/v1/settings', { headers, signal: AbortSignal.timeout(15000) });
  const settings = await settingsResponse.json();
  const schemaResponse = await fetch(config.supabaseUrl + '/rest/v1/bt_profiles?select=id&limit=0', { headers, signal: AbortSignal.timeout(15000) });
  const schema = await schemaResponse.json();
  const report = { generatedAt: new Date().toISOString(), project: config.supabaseUrl, settingsStatus: settingsResponse.status, emailEnabled: settings.external?.email, signupDisabled: settings.disable_signup, autoConfirm: settings.mailer_autoconfirm, anonymousProfileProbeStatus: schemaResponse.status, anonymousProfileProbeCode: schema?.code || null, note: 'Consulta anônima limitada a zero linhas; nenhum dado pessoal é coletado. Nenhuma migração foi aplicada por este script.' };
  fs.writeFileSync(path.join(__dirname, 'reports/remote-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  if (!settingsResponse.ok) process.exitCode = 1;
})().catch(error => { console.error(error.message); process.exitCode = 1; });
