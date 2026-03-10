const { chromium } = require('../partner-dashboard/node_modules/playwright');

const BASE_URL = process.env.VERAPROOF_DASHBOARD_URL || 'http://127.0.0.1:8200';
const API_BASE = process.env.VERAPROOF_API_URL || 'http://127.0.0.1:8100';
const NAV_ROUTES = [
  { label: 'API Keys', path: '/api-keys' },
  { label: 'Sessions', path: '/sessions' },
  { label: 'Fraud Analysis', path: '/fraud-analysis' },
  { label: 'Analytics', path: '/analytics' },
  { label: 'Billing', path: '/billing' },
  { label: 'Webhooks', path: '/webhooks' },
  { label: 'Branding', path: '/branding' },
  { label: 'Encryption', path: '/encryption' },
  { label: 'Users', path: '/users' },
];

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForAppIdle(page, timeout = 15000) {
  await page.waitForLoadState('networkidle', { timeout }).catch(() => {});
  await page.waitForTimeout(500);
}

async function getCsrfToken(page) {
  return page.evaluate(() => {
    const match = document.cookie.match(/(?:^|; )vp_csrf=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : '';
  });
}

async function apiRequest(context, page, method, path, body) {
  const csrf = await getCsrfToken(page);
  const headers = csrf ? { 'X-CSRF-Token': csrf } : {};
  const options = {
    method,
    headers,
    failOnStatusCode: false,
  };
  if (body !== undefined) {
    options.data = body;
  }
  return context.request.fetch(`${API_BASE}${path}`, options);
}

async function navigateBySidebar(page, label, expectedPath) {
  await page.getByRole('link', { name: new RegExp(label, 'i') }).click();
  await page.waitForURL(`**${expectedPath}`, { timeout: 30000 });
  await waitForAppIdle(page);
  assert(!page.url().includes('/auth/login'), `unexpected redirect to login from ${expectedPath}`);
  const bodyText = (await page.textContent('body')) || '';
  assert(bodyText.toLowerCase().includes(label.toLowerCase()), `page body did not include ${label} for ${expectedPath}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(`console:${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    errors.push(`pageerror:${err.message}`);
  });
  page.on('response', async (response) => {
    const status = response.status();
    const url = response.url();
    if (status >= 400 && !url.includes('/admin/')) {
      errors.push(`response:${status}:${url}`);
    }
  });
  page.on('requestfailed', (request) => {
    errors.push(`requestfailed:${request.failure()?.errorText || 'unknown'}:${request.url()}`);
  });

  await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await waitForAppIdle(page);

  await page.fill('#email', 'admin@veraproof.ai');
  await page.fill('#password', 'Admin@123');
  await page.getByRole('button', { name: 'Developer login' }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await waitForAppIdle(page);
  await page.getByRole('heading').first().waitFor({ state: 'visible', timeout: 15000 });

  const authSessionResp = await apiRequest(context, page, 'GET', '/api/v1/auth/session');
  assert(authSessionResp.status() === 200, `auth/session returned ${authSessionResp.status()}`);
  const authSession = await authSessionResp.json();
  assert(authSession.authenticated === true, 'auth/session did not report authenticated');

  for (const route of NAV_ROUTES) {
    await navigateBySidebar(page, route.label, route.path);
  }

  await navigateBySidebar(page, 'Sessions', '/sessions');
  await page.getByRole('button', { name: /Create Session/i }).click();
  await page.waitForURL('**/sessions/create', { timeout: 30000 });
  await waitForAppIdle(page);
  await page.fill('#return_url', 'http://localhost:8200/sessions');
  await page.getByRole('button', { name: 'Create Session' }).click();
  await page.getByRole('heading', { name: 'Session Ready' }).waitFor({ state: 'visible', timeout: 20000 });

  const createKeyResp = await apiRequest(context, page, 'POST', '/api/v1/api-keys', { environment: 'production' });
  assert(createKeyResp.status() === 200, `api key create returned ${createKeyResp.status()}`);
  const createdKey = await createKeyResp.json();
  const keyId = createdKey.key_id;

  const listKeysResp = await apiRequest(context, page, 'GET', '/api/v1/api-keys');
  assert(listKeysResp.status() === 200, `api key list returned ${listKeysResp.status()}`);
  const keys = await listKeysResp.json();
  assert(keys.some((key) => key.key_id === keyId), 'created api key missing from list');

  const deleteKeyResp = await apiRequest(context, page, 'DELETE', `/api/v1/api-keys/${keyId}`);
  assert(deleteKeyResp.status() === 200, `api key delete returned ${deleteKeyResp.status()}`);

  const brandingSaveResp = await apiRequest(context, page, 'PUT', '/api/v1/branding/colors', {
    primary_color: '#1E40AF',
    secondary_color: '#3B82F6',
    button_color: '#10B981',
  });
  assert(brandingSaveResp.status() === 200, `branding save returned ${brandingSaveResp.status()}`);

  const createWebhookResp = await apiRequest(context, page, 'POST', '/api/v1/webhooks', {
    url: 'http://example.invalid/playwright-webhook',
    enabled: true,
    events: ['verification.complete'],
  });
  assert(createWebhookResp.status() === 200, `webhook create returned ${createWebhookResp.status()}`);
  const createdWebhook = await createWebhookResp.json();

  const webhookLogsResp = await apiRequest(context, page, 'GET', `/api/v1/webhooks/${createdWebhook.webhook_id}/logs`);
  assert(webhookLogsResp.status() === 200, `webhook logs returned ${webhookLogsResp.status()}`);

  const deleteWebhookResp = await apiRequest(context, page, 'DELETE', `/api/v1/webhooks/${createdWebhook.webhook_id}`);
  assert(deleteWebhookResp.status() === 200, `webhook delete returned ${deleteWebhookResp.status()}`);

  assert(await page.getByRole('link', { name: /Admin/i }).count() === 0, 'non-admin user should not see the admin link');
  const adminResp = await apiRequest(context, page, 'GET', '/api/v1/admin/tenants');
  assert([401, 403].includes(adminResp.status()), `admin tenants returned ${adminResp.status()}`);

  const filteredErrors = errors.filter((entry) => {
    return !entry.includes('/api/v1/admin/tenants');
  });
  assert(filteredErrors.length === 0, `captured browser errors: ${filteredErrors.join(' | ')}`);

  console.log('PLAYWRIGHT_SMOKE_OK');
  await browser.close();
})().catch(async (error) => {
  console.error(error.stack || error.message || String(error));
  process.exit(1);
});


