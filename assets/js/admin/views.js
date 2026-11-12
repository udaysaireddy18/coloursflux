/**
 * Admin screens. Each render function receives the persistent `#admin-view`
 * element and a context object ({ profile, timezone, onSaved }).
 */
import { icon, mountIcons } from '../icons.js';
import {
  esc,
  formatDayShort,
  formatTime,
  formatDateTime,
  timeAgo,
} from '../util.js';
import { APP } from '../config.js';
import { RESOURCES } from './schemas.js';
import {
  noticeMarkup,
  statusPill,
  tableMarkup,
  vocabLabel,
} from './components.js';
import {
  locationName,
  lastLoadLabel,
  rows,
  sampleRowCount,
  saveProfileRole,
  state,
  stats,
  upcoming,
} from './data.js';
import {
  bindSettingsForm,
  openResourceForm,
  openPreview,
  runQuickAction,
  deleteResource,
  settingsFormMarkup,
} from './forms.js';
import { toast } from '../ui.js';

/* ------------------------------------------------------------------ */
/* Permissions                                                         */
/* ------------------------------------------------------------------ */

export function canEditResource(profile, key) {
  if (!profile || profile.role === 'viewer') return false;
  const rule = RESOURCES[key]?.canEdit;
  return rule === true || (rule === 'admin' && profile.role === 'admin');
}

export function canDeleteResource(profile, key) {
  if (!profile || profile.role === 'viewer') return false;
  const rule = RESOURCES[key]?.canDelete;
  return rule === true || (rule === 'admin' && profile.role === 'admin');
}

const roleLabel = (role) => (role ? role.charAt(0).toUpperCase() + role.slice(1) : 'No role');

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function resetHandlers(host) {
  host.onclick = null;
  host.oninput = null;
  host.onchange = null;
}

function pageHead(title, description, actions = '') {
  return `<div class="page-head">
    <div>
      <h2>${esc(title)}</h2>
      <p>${esc(description)}</p>
    </div>
    ${actions ? `<div class="page-actions">${actions}</div>` : ''}
  </div>`;
}

function sampleNotice() {
  const count = sampleRowCount();
  if (!count) return '';
  return noticeMarkup(
    `<b>${count} seeded sample record${count === 1 ? '' : 's'}</b> ${count === 1 ? 'is' : 'are'} still in the database and flagged <span class="code-inline">is_sample</span>. Replace or delete them before launch so visitors never see demo content.`,
    { tone: 'warn', iconName: 'alert-triangle' }
  );
}

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function statCard(iconName, value, label) {
  return `<div class="stat-card">
    <span class="stat-icon">${icon(iconName, { size: 17 })}</span>
    <b>${esc(value)}</b>
    <span>${esc(label)}</span>
  </div>`;
}

function upcomingMarkup(ctx) {
  const list = upcoming(5);
  if (!list.length) {
    return `<div class="admin-empty">${icon('calendar', { size: 22 })}<p>No upcoming published events.</p></div>`;
  }
  return `<div class="overview-list">${list
    .map(
      (ev) => `<button type="button" class="overview-row" data-edit-resource="events" data-id="${esc(ev.id)}">
        <span class="date-block">
          <b>${esc(formatDayShort(ev.event_date))}</b>
          <small>${esc(formatTime(ev.start_time) || 'TBA')}</small>
        </span>
        <span class="overview-main">
          <b>${esc(ev.title)}</b>
          <small>${esc(locationName(ev.location_id) || 'Venue TBA')} · ${esc(vocabLabel(ev.category))}${ev.featured ? ' · Featured' : ''}</small>
        </span>
        ${statusPill(ev.status, vocabLabel(ev.status))}
      </button>`
    )
    .join('')}</div>`;
}

function activityPanel() {
  const items = state.activity || [];
  if (!items.length) {
    return `<div class="admin-empty">${icon('activity', { size: 22 })}<p>Activity appears here after the first content change.</p></div>`;
  }
  return `<div class="activity">${items
    .slice(0, 8)
    .map(
      (item) => `<div class="activity-row">
        <span class="activity-dot">${icon(item.action === 'DELETE' ? 'trash' : item.action === 'INSERT' ? 'plus' : 'pencil', { size: 14 })}</span>
        <div style="min-width:0">
          <div>${esc(item.summary || `${item.action} on ${item.table_name}`)}</div>
          <small>${esc(item.actor_email || 'System')} · ${esc(timeAgo(item.created_at))}</small>
        </div>
      </div>`
    )
    .join('')}</div>`;
}

function configPanel() {
  const cfg = state.config;
  if (!cfg) {
    return `<div class="admin-empty">${icon('settings', { size: 22 })}<p>Festival settings are not set up yet.</p></div>`;
  }
  const tz = cfg.timezone || 'Asia/Kolkata';
  return `<dl class="overview-dl">
    <div><dt>Festival dates</dt><dd>${esc(formatDateTime(cfg.festival_start, tz))} → ${esc(formatDateTime(cfg.festival_end, tz))}</dd></div>
    <div><dt>Timezone</dt><dd>${esc(tz)}</dd></div>
    <div><dt>Data version</dt><dd>${esc(cfg.data_version ?? 0)}</dd></div>
    <div><dt>Last dashboard load</dt><dd>${esc(lastLoadLabel())}</dd></div>
  </dl>`;
}

export function renderOverview(host, ctx) {
  resetHandlers(host);
  const s = stats();
  const canSettings = ctx.profile.role === 'admin';
  const quickActions = [
    canEditResource(ctx.profile, 'events')
      ? `<button type="button" class="btn btn-sm btn-primary" data-create-resource="events">${icon('plus', { size: 15 })} New event</button>`
      : '',
    canEditResource(ctx.profile, 'announcements')
      ? `<button type="button" class="btn btn-sm" data-create-resource="announcements">${icon('megaphone', { size: 15 })} New notice</button>`
      : '',
    canEditResource(ctx.profile, 'vendors')
      ? `<button type="button" class="btn btn-sm" data-create-resource="vendors">${icon('store', { size: 15 })} Add vendor</button>`
      : '',
    canSettings ? `<a class="btn btn-sm" href="#/settings">${icon('settings', { size: 15 })} Settings</a>` : '',
  ]
    .filter(Boolean)
    .join('');

  host.innerHTML = `
    ${sampleNotice()}
    ${ctx.profile.role === 'viewer' ? noticeMarkup('You have read-only access. Editing controls are hidden.', { tone: 'info', iconName: 'eye' }) : ''}

    <div class="stat-grid">
      ${statCard('calendar', `${s.eventsPublished}/${s.events}`, 'Events published')}
      ${statCard('clock', s.eventsDraft, 'Event drafts')}
      ${statCard('store', s.vendorsPending, 'Vendors pending')}
      ${statCard('tag', s.offersActive, 'Active offers')}
      ${statCard('megaphone', s.announcementsPublished, 'Live notices')}
    </div>

    <div class="admin-cols">
      <div class="admin-col">
        <section class="panel">
          <div class="panel-head">
            <div><h2>Next on the schedule</h2><p>Published events from today onwards.</p></div>
            <span class="spacer"></span>
            <a class="btn btn-sm btn-ghost" href="#/events">All events ${icon('arrow-right', { size: 14 })}</a>
          </div>
          <div class="panel-body flush">${upcomingMarkup(ctx)}</div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><h2>Recent activity</h2><p>Confirmed database changes only.</p></div></div>
          <div class="panel-body">${activityPanel()}</div>
        </section>
      </div>

      <div class="admin-col">
        <section class="panel">
          <div class="panel-head"><div><h2>Quick actions</h2><p>Jump straight into the common tasks.</p></div></div>
          <div class="panel-body"><div class="quick-actions">${quickActions || '<span class="field-help">No editing actions for your role.</span>'}</div></div>
        </section>

        <section class="panel">
          <div class="panel-head">
            <div><h2>Festival setup</h2><p>Drives the countdown and public footer.</p></div>
            <span class="spacer"></span>
            ${canSettings ? `<a class="btn btn-sm btn-ghost" href="#/settings">Edit ${icon('chevron-right', { size: 14 })}</a>` : ''}
          </div>
          <div class="panel-body">${configPanel()}</div>
        </section>

        <section class="panel">
          <div class="panel-head"><div><h2>Publish checklist</h2><p>Before you share the QR code.</p></div></div>
          <div class="panel-body">
            <ul class="warn-list">
              <li>${icon('check', { size: 15 })} Confirm festival dates and timezone in Settings.</li>
              <li>${icon('check', { size: 15 })} Replace seeded sample rows with real content.</li>
              <li>${icon('check', { size: 15 })} Publish at least one notice and one event.</li>
              <li>${icon('check', { size: 15 })} Test the public site on a phone, then install it.</li>
              <li>${icon('check', { size: 15 })} Re-check the countdown at a minute before launch.</li>
            </ul>
          </div>
        </section>
      </div>
    </div>`;

  host.onclick = (event) => {
    const createBtn = event.target.closest('[data-create-resource]');
    if (createBtn) {
      openResourceForm(createBtn.dataset.createResource, null, ctx);
      return;
    }
    const editBtn = event.target.closest('[data-edit-resource]');
    if (editBtn) {
      const key = editBtn.dataset.editResource;
      const row = rows(key).find((r) => r.id === editBtn.dataset.id);
      if (row) openResourceForm(key, row, ctx);
    }
  };

  mountIcons(host);
}

/* ------------------------------------------------------------------ */
/* Resource tables                                                     */
/* ------------------------------------------------------------------ */

const filters = {};
const searches = {};

function resourceList(key) {
  const resource = RESOURCES[key];
  const filter = filters[key] || '';
  const query = (searches[key] || '').trim().toLowerCase();
  const filterKey = resource.filters?.[0]?.key;

  return rows(key).filter((row) => {
    if (filter && filterKey && row[filterKey] !== filter) return false;
    if (!query) return true;
    const haystack = (resource.searchFields || Object.keys(row))
      .map((field) => row[field])
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

function tableHostMarkup(key, ctx) {
  const list = resourceList(key);
  return `
    <div class="resource-table-host" data-table-host="${esc(key)}">
      ${tableMarkup(key, list, {
        canEdit: canEditResource(ctx.profile, key),
        canDelete: canDeleteResource(ctx.profile, key),
        timezone: ctx.timezone,
      })}
    </div>
    <p class="table-count" data-count>${list.length} record${list.length === 1 ? '' : 's'}</p>`;
}

export function renderResource(host, key, ctx) {
  resetHandlers(host);
  const resource = RESOURCES[key];
  const writable = canEditResource(ctx.profile, key);
  const filter = resource.filters?.[0];
  const canCreate = writable;
  searches[key] = searches[key] || '';
  filters[key] = filters[key] || '';

  host.innerHTML = `
    ${sampleNotice()}
    ${pageHead(
      resource.label,
      resource.description,
      canCreate
        ? `<button type="button" class="btn btn-primary" data-create>${icon('plus', { size: 16 })} New ${esc(resource.singular.toLowerCase())}</button>`
        : '<span class="badge badge-neutral">Read-only access</span>'
    )}

    <section class="panel">
      <div class="panel-head">
        <div class="admin-toolbar">
          <div class="search-box">
            ${icon('search', { size: 15 })}
            <label class="sr-only" for="adm-search">Search ${esc(resource.label.toLowerCase())}</label>
            <input class="input" id="adm-search" type="search" placeholder="Search ${esc(resource.label.toLowerCase())}…" value="${esc(searches[key])}" autocomplete="off" />
          </div>
          ${
            filter
              ? `<label class="sr-only" for="adm-filter">Filter by ${esc(filter.label)}</label>
                 <select class="select" id="adm-filter">
                   <option value="">All ${esc(filter.label.toLowerCase())}</option>
                   ${filter.options
                     .map(
                       (o) =>
                         `<option value="${esc(o.value)}" ${filters[key] === o.value ? 'selected' : ''}>${esc(o.label)}</option>`
                     )
                     .join('')}
                 </select>`
              : ''
          }
          <span class="spacer"></span>
          <button type="button" class="btn btn-sm btn-ghost" data-refresh>${icon('refresh', { size: 14 })} Refresh</button>
        </div>
      </div>
      <div class="panel-body flush" data-table-body>${tableHostMarkup(key, ctx)}</div>
    </section>`;

  const redrawTable = () => {
    const body = host.querySelector('[data-table-body]');
    if (body) body.innerHTML = tableHostMarkup(key, ctx);
    mountIcons(host);
  };

  host.oninput = (event) => {
    if (event.target.id !== 'adm-search') return;
    searches[key] = event.target.value;
    redrawTable();
  };

  host.onchange = (event) => {
    if (event.target.id !== 'adm-filter') return;
    filters[key] = event.target.value;
    redrawTable();
  };

  host.onclick = async (event) => {
    if (event.target.closest('[data-create]')) {
      openResourceForm(key, null, ctx);
      return;
    }

    const refreshBtn = event.target.closest('[data-refresh]');
    if (refreshBtn) {
      const original = refreshBtn.innerHTML;
      refreshBtn.disabled = true;
      refreshBtn.innerHTML = `${icon('refresh', { size: 14 })} Refreshing…`;
      mountIcons(refreshBtn);
      try {
        await ctx.reload();
      } catch (err) {
        toast(err.message || 'Could not refresh.', { type: 'error' });
        refreshBtn.disabled = false;
        refreshBtn.innerHTML = original;
        mountIcons(refreshBtn);
      }
      return;
    }

    const actionBtn = event.target.closest('[data-row-action]');
    if (!actionBtn) return;
    const row = rows(key).find((r) => r.id === actionBtn.dataset.id);
    if (!row) return;

    const action = actionBtn.dataset.rowAction;
    if (action === 'edit') {
      openResourceForm(key, row, ctx);
    } else if (action === 'quick') {
      await runQuickAction(key, row, actionBtn.dataset.quick, ctx, actionBtn);
    } else if (action === 'delete') {
      await deleteResource(key, row, ctx);
    } else if (action === 'preview') {
      // Preview uses the saved row, since the table only lists persisted data.
      openPreview(key, row, ctx);
    }
  };

  mountIcons(host);
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function renderSettings(host, ctx) {
  resetHandlers(host);
  const config = ctx.config || null;

  if (!config) {
    host.innerHTML = `
      ${pageHead('Settings', 'Create the single app configuration row that drives the public site.')}
      <section class="panel">
        <div class="panel-body">
          ${noticeMarkup(
            'No <span class="code-inline">app_config</span> row was found. Create it with the SQL in <span class="code-inline">supabase/seed.sql</span>, then reload this page.',
            { tone: 'danger', iconName: 'alert-triangle' }
          )}
          <p class="field-help" style="margin-top:12px">Once the row exists you can edit festival dates, branding and contact details here.</p>
        </div>
      </section>`;
    mountIcons(host);
    return;
  }

  host.innerHTML = `
    ${pageHead(
      'Settings',
      'Festival dates drive the public countdown. Contact details only appear when you fill them in.',
      `<button type="submit" form="adm-settings-form" class="btn btn-primary" data-save-settings>${icon('check', { size: 15 })} Save settings</button>`
    )}
    <section class="panel">
      <div class="panel-head">
        <div><h2>Festival configuration</h2><p>One row, shared by every public page.</p></div>
        <span class="spacer"></span>
        <span class="badge badge-neutral">${esc(config.timezone || 'Asia/Kolkata')}</span>
      </div>
      <div class="panel-body">${settingsFormMarkup(config, { timezone: ctx.timezone })}</div>
    </section>

    <section class="panel">
      <div class="panel-head"><div><h2>Static configuration</h2><p>Edit these values in source, not in the database.</p></div></div>
      <div class="panel-body">
        <dl class="overview-dl">
          <div><dt>App name</dt><dd>${esc(APP.name)}</dd></div>
          <div><dt>Institution</dt><dd>${esc(APP.institution)}</dd></div>
          <div><dt>Festival</dt><dd>${esc(APP.event)}</dd></div>
          <div><dt>Image bucket</dt><dd><span class="code-inline">${esc(APP.storageBucket)}</span> · ${esc(Math.round(APP.upload.maxBytes / 1024 / 1024))} MB limit</dd></div>
        </dl>
        <p class="field-help" style="margin-top:12px">Brand taglines and fallback names live in <span class="code-inline">assets/js/config.js</span>. Database settings above always take priority at runtime.</p>
      </div>
    </section>`;

  const form = host.querySelector('#adm-settings-form');
  bindSettingsForm(form, {
    timezone: ctx.timezone,
    onSaved: () => ctx.reload(),
  });
  mountIcons(host);
}

/* ------------------------------------------------------------------ */
/* Team                                                                */
/* ------------------------------------------------------------------ */

export function renderTeam(host, ctx) {
  resetHandlers(host);
  const profiles = ctx.profiles || [];
  const selfId = ctx.profile?.id;

  host.innerHTML = `
    ${pageHead(
      'Team',
      'Roles decide who can publish, edit or only read the dashboard.',
      `<a class="btn btn-sm" href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer">${icon('external-link', { size: 15 })} Authentication dashboard</a>`
    )}

    ${noticeMarkup(
      'New organisers must first be created in <b>Supabase → Authentication → Users</b> (email + password). Then assign their role here. Public sign-ups are disabled by design and never grant access.')
    }

    <section class="panel">
      <div class="panel-head"><div><h2>Dashboard accounts</h2><p>${profiles.length} profile${profiles.length === 1 ? '' : 's'} with a role.</p></div></div>
      <div class="table-wrap">
        <table class="table">
          <thead><tr><th scope="col">Account</th><th scope="col">Role</th><th scope="col">Added</th></tr></thead>
          <tbody>
            ${
              profiles.length
                ? profiles
                    .map(
                      (p) => `<tr>
                        <td>
                          <span class="cell-title">${esc(p.email || p.full_name || p.id)}</span>
                          <span class="cell-sub">${esc(p.full_name || (p.id === selfId ? 'You' : ''))}</span>
                        </td>
                        <td>
                          <select class="select role-select" data-role-user="${esc(p.id)}" ${p.id === selfId ? 'disabled title="You cannot change your own role here."' : ''}>
                            ${['admin', 'editor', 'viewer']
                              .map(
                                (role) =>
                                  `<option value="${role}" ${p.role === role ? 'selected' : ''}>${roleLabel(role)}</option>`
                              )
                              .join('')}
                          </select>
                        </td>
                        <td>${esc(p.created_at ? formatDayShort(p.created_at.slice(0, 10)) : '—')}</td>
                      </tr>`
                    )
                    .join('')
                : `<tr><td colspan="3"><div class="admin-empty">${icon('users', { size: 22 })}<p>No profiles yet. Create your first admin with the SQL in the deployment docs.</p></div></td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><div><h2>What each role can do</h2><p>Enforced by Row Level Security, not just hidden buttons.</p></div></div>
      <div class="panel-body">
        <dl class="overview-dl">
          <div><dt>Admin</dt><dd>Everything, including settings, sponsors and roles. The last admin cannot be removed.</dd></div>
          <div><dt>Editor</dt><dd>Create and edit events, locations, vendors, offers and announcements. No settings, sponsors or deletes.</dd></div>
          <div><dt>Viewer</dt><dd>Read-only access to the dashboard. Useful for organisers who only need the schedule.</dd></div>
        </dl>
      </div>
    </section>`;

  host.onchange = async (event) => {
    const select = event.target.closest('[data-role-user]');
    if (!select) return;
    const id = select.dataset.roleUser;
    const nextRole = select.value;
    const current = profiles.find((p) => p.id === id);
    const previous = current?.role;

    select.disabled = true;
    try {
      await saveProfileRole(id, nextRole);
      toast(`${current?.email || 'Account'} is now ${roleLabel(nextRole).toLowerCase()}.`, {
        type: 'success',
      });
      ctx.onSaved?.();
    } catch (err) {
      select.value = previous || 'viewer';
      select.disabled = false;
      toast(err.message || 'Could not change the role.', { type: 'error' });
    }
  };

  mountIcons(host);
}
