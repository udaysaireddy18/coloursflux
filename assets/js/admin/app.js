/**
 * Admin bootstrap: authentication, role gate, application shell and hash
 * router. Everything here assumes the dashboard is online — the service worker
 * deliberately never caches /admin/, so an offline organiser cannot accidentally
 * edit stale data.
 */
import { icon, mountIcons } from '../icons.js';
import { esc, initials } from '../util.js';
import { APP, hasSupabase } from '../config.js';
import {
  ApiError,
  getProfile,
  loadSession,
  signIn,
  signOut,
} from '../api.js';
import { confirmDialog, noticeMarkup, spinnerMarkup } from './components.js';
import {
  loadAll,
  rows,
  state,
  TABLE_KEYS,
} from './data.js';
import { RESOURCES } from './schemas.js';
import {
  renderOverview,
  renderResource,
  renderSettings,
  renderTeam,
} from './views.js';
import { toast } from '../ui.js';

const root = document.getElementById('admin-root');
const ADMIN_ROLES = ['admin', 'editor', 'viewer'];

const ctx = {
  profile: null,
  timezone: 'Asia/Kolkata',
  config: null,
  profiles: [],
  loaded: false,
  reload: async () => {},
  onSaved: () => {},
};

let routerBound = false;
let netBound = false;

/* ------------------------------------------------------------------ */
/* Screens                                                             */
/* ------------------------------------------------------------------ */

function loginCard(inner) {
  // `main#admin-view` is also the shell's content landmark, so the skip link in
  // index.html always has a real target — including on the setup/login screens.
  root.innerHTML = `<main id="admin-view" class="login-wrap" tabindex="-1"><div class="login-card">${inner}</div></main>`;
  mountIcons(root);
}

function renderLoading(label = 'Loading dashboard…') {
  loginCard(`
    <p class="eyebrow">${esc(APP.name)} · Organiser access</p>
    <h1>${esc(label)}</h1>
    ${spinnerMarkup('Talking to Supabase…')}
  `);
}

function renderSetup() {
  loginCard(`
    <p class="eyebrow">${esc(APP.name)} · Setup required</p>
    <h1>Connect Supabase</h1>
    <p class="muted">The public site runs in demo mode until a Supabase project is connected. The admin dashboard only works against a real database — it never pretends a save succeeded.</p>
    <ol class="setup-steps">
      <li>Create a Supabase project.</li>
      <li>Run <span class="code-inline">supabase/schema.sql</span>, <span class="code-inline">policies.sql</span> and <span class="code-inline">storage.sql</span> in the SQL editor.</li>
      <li>Copy your project URL and <b>anon</b> key into <span class="code-inline">assets/js/env.js</span>.</li>
      <li>Create the first organiser in <b>Authentication → Users</b>, then add their profile row.</li>
    </ol>
    <div class="notice-strip" data-tone="info">${icon('shield', { size: 16 })}<span>Never place the <span class="code-inline">service_role</span> key in this project. Only the public anon key belongs in the browser.</span></div>
    <div class="login-actions">
      <a class="btn" href="../index.html">${icon('arrow-left', { size: 15 })} Public site</a>
      <button type="button" class="btn btn-primary" data-retry-setup>${icon('refresh', { size: 15 })} I've added the keys</button>
    </div>
    <p class="field-help">Full walkthrough: <span class="code-inline">README.md</span> → “Supabase setup”.</p>
  `);
  root.querySelector('[data-retry-setup]')?.addEventListener('click', () => location.reload());
}

function renderLogin({ message = '', error = '' } = {}) {
  loginCard(`
    <p class="eyebrow">${esc(APP.name)} · Organiser access</p>
    <h1>Sign in</h1>
    <p class="muted">Use the account an organiser created for you in Supabase Auth.</p>
    ${message ? noticeMarkup(esc(message), { tone: 'info', iconName: 'info' }) : ''}
    <form id="login-form" class="admin-form" novalidate>
      <div class="form-error" data-login-error ${error ? '' : 'hidden'}>${icon('alert-circle', { size: 16 })}<span>${esc(error)}</span></div>
      <div class="field">
        <label class="field-label" for="login-email">Email</label>
        <input class="input" id="login-email" name="email" type="email" autocomplete="username" required placeholder="you@example.com" />
      </div>
      <div class="field">
        <label class="field-label" for="login-password">Password</label>
        <div class="password-wrap">
          <input class="input" id="login-password" name="password" type="password" autocomplete="current-password" required placeholder="Your password" />
          <button type="button" class="btn btn-icon" data-toggle-password aria-label="Show password">${icon('eye', { size: 17 })}</button>
        </div>
      </div>
      <button type="submit" class="btn btn-primary btn-block" data-login-submit>Sign in ${icon('arrow-right', { size: 15 })}</button>
    </form>
    <p class="field-help">There is no public sign-up. Lost access? Ask another admin to reset your account in Supabase.</p>
    <a class="btn btn-ghost btn-sm" href="../index.html">${icon('arrow-left', { size: 14 })} Back to the festival</a>
  `);

  const form = root.querySelector('#login-form');
  const password = form.elements.namedItem('password');
  const errorHost = form.querySelector('[data-login-error]');
  const submit = form.querySelector('[data-login-submit]');

  form.querySelector('[data-toggle-password]').addEventListener('click', (event) => {
    const btn = event.currentTarget;
    const show = password.type === 'password';
    password.type = show ? 'text' : 'password';
    btn.innerHTML = icon(show ? 'eye-off' : 'eye', { size: 17 });
    btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  });

  const showError = (text) => {
    errorHost.hidden = false;
    errorHost.innerHTML = `${icon('alert-circle', { size: 16 })}<span>${esc(text)}</span>`;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const email = form.elements.namedItem('email').value.trim();
    const pass = password.value;

    if (!email || !pass) {
      showError('Enter both your email and password.');
      return;
    }

    submit.disabled = true;
    const original = submit.innerHTML;
    submit.innerHTML = `${icon('refresh', { size: 15 })} Signing in…`;
    mountIcons(submit);
    errorHost.hidden = true;

    try {
      await signIn(email, pass);
      const profile = await getProfile().catch((err) => {
        if (err instanceof ApiError && err.status === 401) throw err;
        throw new Error(
          `Signed in, but the dashboard profile could not be loaded: ${err.message}`
        );
      });

      if (!profile || !ADMIN_ROLES.includes(profile.role)) {
        await signOut(loadSession());
        renderLogin({
          error:
            'This account has no dashboard role. Ask an existing admin to add a matching row to the profiles table.',
        });
        return;
      }

      await enterDashboard(profile);
    } catch (err) {
      const text =
        err instanceof ApiError && [400, 401].includes(err.status)
          ? 'Email or password is incorrect.'
          : err instanceof ApiError && err.status === 404
            ? 'The profiles table is missing. Run supabase/schema.sql first.'
            : err.message || 'Could not sign in right now.';
      showError(text);
    } finally {
      submit.disabled = false;
      submit.innerHTML = original;
      mountIcons(submit);
    }
  });

  root.querySelector('#login-email')?.focus();
}

function renderNoAccess(email) {
  loginCard(`
    <p class="eyebrow">${esc(APP.name)} · Access denied</p>
    <h1>No dashboard role</h1>
    <p class="muted">You are signed in as <b>${esc(email || 'an unknown account')}</b>, but this account has no editor, admin or viewer role.</p>
    <div class="notice-strip" data-tone="danger">${icon('shield', { size: 16 })}<span>Authentication alone does not grant access. An admin must add a row to the <span class="code-inline">profiles</span> table for this user.</span></div>
    <p class="field-help">SQL example:</p>
    <pre class="code-block">insert into public.profiles (id, email, full_name, role)
values ('&lt;auth-user-uuid&gt;', '${esc(email || 'person@example.com')}', 'Full name', 'editor')
on conflict (id) do update set role = excluded.role;</pre>
    <div class="login-actions">
      <button type="button" class="btn" data-signout>${icon('log-out', { size: 15 })} Sign out</button>
      <a class="btn btn-primary" href="../index.html">Public site ${icon('arrow-right', { size: 15 })}</a>
    </div>
  `);

  root.querySelector('[data-signout]')?.addEventListener('click', () => doSignOut('Signed out.'));
}

function renderFatal(message, { retry = true } = {}) {
  loginCard(`
    <p class="eyebrow">${esc(APP.name)} · Connection problem</p>
    <h1>Could not load the dashboard</h1>
    ${noticeMarkup(esc(message), { tone: 'danger', iconName: 'alert-triangle' })}
    <p class="field-help">The dashboard always reads fresh data. Check your connection and Supabase status, then retry.</p>
    <div class="login-actions">
      ${retry ? `<button type="button" class="btn btn-primary" data-retry>${icon('refresh', { size: 15 })} Retry</button>` : ''}
      <button type="button" class="btn" data-signout>${icon('log-out', { size: 15 })} Sign out</button>
    </div>
  `);
  root.querySelector('[data-retry]')?.addEventListener('click', () => boot());
  root.querySelector('[data-signout]')?.addEventListener('click', () => doSignOut('Signed out.'));
}

async function doSignOut(message = '') {
  await signOut(loadSession());
  ctx.profile = null;
  ctx.loaded = false;
  state.loaded = false;
  if (location.hash) history.replaceState(null, '', location.pathname);
  renderLogin({ message });
}

/* ------------------------------------------------------------------ */
/* Shell                                                               */
/* ------------------------------------------------------------------ */

function navItems(profile) {
  const content = TABLE_KEYS.filter((key) => key !== 'sponsorships' || profile.role === 'admin').map(
    (key) => ({
      href: `#/${key}`,
      label: RESOURCES[key].label,
      icon: RESOURCES[key].icon,
      key,
    })
  );

  const items = [{ href: '#/overview', label: 'Overview', icon: 'layout', key: 'overview' }, ...content];
  if (profile.role === 'admin') {
    items.push({ href: '#/team', label: 'Team', icon: 'users', key: 'team' });
    items.push({ href: '#/settings', label: 'Settings', icon: 'settings', key: 'settings' });
  }
  return items;
}

function shellMarkup(profile) {
  const items = navItems(profile);
  return `<div class="admin-shell" id="admin-shell">
    <aside class="admin-side" aria-label="Dashboard navigation">
      <div class="admin-brand">
        <span class="brand-mark" aria-hidden="true">
          <img class="brand-img" src="../assets/icons/logo.png" alt="" width="32" height="32" decoding="async" />
        </span>
        <small>Organiser dashboard</small>
      </div>

      <nav class="admin-nav">
        ${items
          .map(
            (item) => `<a href="${item.href}" data-nav="${item.key}">
              ${icon(item.icon, { size: 17 })}<span>${esc(item.label)}</span>
              <span class="count" data-nav-count="${item.key}"></span>
            </a>`
          )
          .join('')}
      </nav>

      <div class="admin-sidefoot">
        <div class="admin-user">
          <span class="admin-avatar">${esc(initials(profile.full_name || profile.email || 'A'))}</span>
          <div style="min-width:0">
            <b>${esc(profile.full_name || profile.email || 'Organiser')}</b>
            <small>${esc(profile.role)} · ${esc(profile.email || '')}</small>
          </div>
        </div>
        <a class="btn btn-sm btn-ghost" href="../index.html">${icon('external-link', { size: 14 })} View public site</a>
        <button type="button" class="btn btn-sm" data-signout>${icon('log-out', { size: 14 })} Sign out</button>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-top">
        <button type="button" class="btn btn-icon admin-menu-btn" data-menu aria-label="Open navigation" aria-expanded="false">${icon('menu', { size: 20 })}</button>
        <h1 id="admin-title">Overview</h1>
        <span class="spacer"></span>
        <span class="admin-net" id="admin-net" data-state="${navigator.onLine ? 'online' : 'offline'}">
          <span class="dot"></span><span class="label">${navigator.onLine ? 'Connected' : 'Offline'}</span>
        </span>
        <button type="button" class="btn btn-sm btn-ghost" data-shell-refresh title="Reload all dashboard data">${icon('refresh', { size: 14 })} Reload</button>
      </header>

      <main id="admin-view" class="admin-content" tabindex="-1">
        ${spinnerMarkup('Loading festival data…')}
      </main>
    </div>
  </div>`;
}

function updateNavCounts() {
  const counts = {
    events: rows('events').length,
    locations: rows('locations').length,
    vendors: rows('vendors').filter((v) => v.approval_status === 'pending').length,
    offers: rows('offers').filter((o) => o.status === 'active').length,
    announcements: rows('announcements').filter((a) => a.status === 'published').length,
    sponsorships: rows('sponsorships').filter((s) => s.status === 'active').length,
    team: state.profiles.length,
  };
  root.querySelectorAll('[data-nav-count]').forEach((node) => {
    const value = counts[node.dataset.navCount];
    node.textContent = value ? String(value) : '';
    node.title =
      node.dataset.navCount === 'vendors'
        ? `${value || 0} pending vendors`
        : node.dataset.navCount === 'offers'
          ? `${value || 0} active offers`
          : '';
  });
}

function paintNet() {
  const pill = root.querySelector('#admin-net');
  if (!pill) return;
  const online = navigator.onLine;
  pill.dataset.state = online ? 'online' : 'offline';
  pill.querySelector('.label').textContent = online ? 'Connected' : 'Offline';
  pill.title = online
    ? 'Connected. Saves go straight to Supabase.'
    : 'Offline. The dashboard cannot save changes until you reconnect.';
}

function bindShell() {
  const shell = root.querySelector('#admin-shell');
  const menuBtn = shell.querySelector('[data-menu]');
  const closeMenu = () => {
    shell.classList.remove('menu-open');
    menuBtn.setAttribute('aria-expanded', 'false');
  };

  menuBtn.addEventListener('click', () => {
    const open = shell.classList.toggle('menu-open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });

  shell.querySelectorAll('.admin-nav a').forEach((link) =>
    link.addEventListener('click', closeMenu)
  );

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });

  shell.querySelectorAll('[data-signout]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Sign out?',
        message: 'Your local session will be cleared. Unsaved form changes are lost.',
        confirmLabel: 'Sign out',
        tone: 'primary',
      });
      if (ok) doSignOut('Signed out.');
    })
  );

  shell.querySelector('[data-shell-refresh]')?.addEventListener('click', async (event) => {
    const btn = event.currentTarget;
    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${icon('refresh', { size: 14 })} Reloading…`;
    mountIcons(btn);
    try {
      await reloadDashboard();
      toast('Dashboard refreshed.', { type: 'success', timeout: 2200 });
    } catch (err) {
      toast(err.message || 'Could not reload.', { type: 'error' });
    } finally {
      btn.disabled = false;
      btn.innerHTML = original;
      mountIcons(btn);
    }
  });

  if (!netBound) {
    window.addEventListener('online', paintNet);
    window.addEventListener('offline', paintNet);
    netBound = true;
  }
  paintNet();
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

const ROUTES = new Set(['overview', 'settings', 'team', ...TABLE_KEYS]);

function currentRoute() {
  const raw = location.hash.replace(/^#\/?/, '').split('?')[0].toLowerCase();
  return ROUTES.has(raw) ? raw : 'overview';
}

function syncContext() {
  ctx.timezone = state.config?.timezone || 'Asia/Kolkata';
  ctx.config = state.config;
  ctx.profiles = state.profiles;
  ctx.loaded = state.loaded;
}

async function route() {
  if (!ctx.profile || !state.loaded) return;
  const host = root.querySelector('#admin-view');
  if (!host) return;

  let key = currentRoute();
  const adminOnly = key === 'settings' || key === 'team' || key === 'sponsorships';
  if (adminOnly && ctx.profile.role !== 'admin') {
    key = 'overview';
    history.replaceState(null, '', '#/overview');
  }

  syncContext();
  root.querySelectorAll('[data-nav]').forEach((link) => {
    link.classList.toggle('is-active', link.dataset.nav === key);
  });

  const titleNode = root.querySelector('#admin-title');
  const title =
    key === 'overview'
      ? 'Overview'
      : key === 'settings'
        ? 'Settings'
        : key === 'team'
          ? 'Team'
          : RESOURCES[key]?.label || 'Dashboard';
  if (titleNode) titleNode.textContent = title;
  document.title = `${title} — ${APP.name} admin`;

  ctx.onSaved = () => {
    updateNavCounts();
    syncContext();
    route();
  };
  ctx.reload = async () => {
    await refreshData();
    syncContext();
    route();
  };

  try {
    if (key === 'overview') renderOverview(host, ctx);
    else if (key === 'settings') renderSettings(host, ctx);
    else if (key === 'team') renderTeam(host, ctx);
    else {
      if (!RESOURCES[key]) {
        renderOverview(host, ctx);
        return;
      }
      renderResource(host, key, ctx);
    }
  } catch (err) {
    console.error('[admin] view failed', err);
    host.innerHTML = `<section class="panel"><div class="panel-body">
      ${noticeMarkup(esc(err.message || 'This screen failed to render.'), {
        tone: 'danger',
        iconName: 'alert-triangle',
      })}
      <div class="login-actions" style="margin-top:14px">
        <button type="button" class="btn" data-retry-view>Retry</button>
      </div>
    </div></section>`;
    host.querySelector('[data-retry-view]')?.addEventListener('click', () => route());
  }
}

/* ------------------------------------------------------------------ */
/* Data + boot                                                         */
/* ------------------------------------------------------------------ */

async function refreshData() {
  await loadAll(ctx.profile);
  syncContext();
}

async function metricsFor(profile) {
  ctx.profile = profile;
  root.innerHTML = shellMarkup(profile);
  mountIcons(root);
  bindShell();

  try {
    await refreshData();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await doSignOut('Your session expired. Sign in again.');
      return;
    }
    const host = root.querySelector('#admin-view');
    if (host) {
      host.innerHTML = `<section class="panel"><div class="panel-body">
        ${noticeMarkup(esc(err.message || 'Could not load data.'), {
          tone: 'danger',
          iconName: 'alert-triangle',
        })}
        <p class="field-help" style="margin-top:10px">
          Common causes: the schema has not been run, RLS policies are missing, or this account has no profile row.
        </p>
        <div class="login-actions" style="margin-top:14px">
          <button type="button" class="btn btn-primary" data-retry-data>Retry</button>
          <button type="button" class="btn" data-signout-data>Sign out</button>
        </div>
      </div></section>`;
      host.querySelector('[data-retry-data]')?.addEventListener('click', () => enterDashboard(profile));
      host.querySelector('[data-signout-data]')?.addEventListener('click', () => doSignOut('Signed out.'));
    }
    return;
  }

  route();
  updateNavCounts();

  if (!routerBound) {
    window.addEventListener('hashchange', route);
    routerBound = true;
  }
}

async function enterDashboard(profile) {
  ctx.profile = profile;
  await metricsFor(profile);
}

async function boot() {
  mountIcons(root);

  if (!hasSupabase()) {
    renderSetup();
    return;
  }

  const session = loadSession();
  if (!session) {
    renderLogin();
    return;
  }

  renderLoading('Checking your access…');

  let profile = null;
  try {
    profile = await getProfile();
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      await doSignOut('Your session expired. Sign in again.');
      return;
    }
    const email = session.user?.email || '';
    renderFatal(
      err instanceof ApiError && err.status === 404
        ? 'The profiles table was not found. Run supabase/schema.sql, then retry.'
        : `Signed in as ${email}, but the dashboard profile could not be checked: ${err.message}`
    );
    return;
  }

  if (!profile || !ADMIN_ROLES.includes(profile.role)) {
    await signOut(loadSession());
    renderNoAccess(session.user?.email || '');
    return;
  }

  await enterDashboard(profile);
}

boot();
