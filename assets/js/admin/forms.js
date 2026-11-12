/**
 * Admin forms and destructive actions.
 *
 * Create/edit dialogs are generated from `schemas.js`, validated in the browser
 * for fast feedback, then written with PostgREST. The browser validation is a
 * convenience only — database constraints and RLS remain the real authority.
 */
import { icon, mountIcons } from '../icons.js';
import {
  esc,
  slugify,
  formatDay,
  formatTimeRange,
  formatDateTime,
} from '../util.js';
import {
  RESOURCES,
  CONFIG_FIELDS,
} from './schemas.js';
import {
  FormError,
  collectForm,
  confirmDialog,
  formFieldsMarkup,
  mediaPreviewUrl,
  openModal,
  showFormError,
  statusPill,
  vocabLabel,
  wireImageField,
  zonedInputToIso,
} from './components.js';
import {
  createRow,
  deleteRow,
  lookupLabel,
  updateRow,
  saveConfig,
} from './data.js';
import { toast } from '../ui.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function defaultsFor(resource, ctx) {
  const values = {};
  for (const field of resource.fields) {
    values[field.name] = field.default ?? (field.type === 'checkbox' ? false : null);
  }
  if (resource.defaults) Object.assign(values, resource.defaults(ctx));
  return values;
}

function titleOf(row, resource) {
  return row.title || row.name || row.sponsor_name || resource.singular;
}

/* Keep the slug in step with the title until the editor edits the slug itself. */
function wireSlug(form, isNew) {
  const title = form.elements.namedItem('title');
  const slug = form.elements.namedItem('slug');
  if (!title || !slug || !isNew) return;
  let auto = !slug.value;
  slug.addEventListener('input', () => {
    auto = false;
  });
  title.addEventListener('input', () => {
    if (auto) slug.value = slugify(title.value);
  });
}

/** Read the form without enforcing required fields, for live previews. */
function snapshot(form, fields, timezone) {
  const values = {};
  for (const field of fields) {
    const el = form.elements.namedItem(field.name);
    if (!el) continue;
    if (field.type === 'checkbox') {
      values[field.name] = Boolean(el.checked);
    } else if (field.type === 'social') {
      values[field.name] = String(el.value || '')
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const [label = '', url = '', iconName = 'link'] = line.split('|').map((p) => p.trim());
          return { label, url, icon: iconName };
        });
    } else if (field.type === 'datetime') {
      values[field.name] = el.value ? zonedInputToIso(el.value, timezone) : null;
    } else if (field.type === 'number') {
      values[field.name] = el.value === '' ? null : Number(el.value);
    } else {
      values[field.name] = el.value;
    }
  }
  return values;
}

/* ------------------------------------------------------------------ */
/* Resource forms                                                      */
/* ------------------------------------------------------------------ */

/**
 * Open the create/edit dialog for a resource.
 * @param {string} key resource key
 * @param {object|null} row existing row, or null to create
 * @param {{timezone: string, onSaved: Function}} ctx
 */
export function openResourceForm(key, row, ctx) {
  const resource = RESOURCES[key];
  if (!resource) return;

  const values = row ? { ...row } : defaultsFor(resource, ctx);
  const isNew = !row;
  const formId = `adm-form-${key}`;
  const timezone = ctx.timezone || 'Asia/Kolkata';

  const ref = openModal({
    title: isNew ? `New ${resource.singular.toLowerCase()}` : `Edit ${titleOf(row, resource)}`,
    subtitle: resource.description,
    wide: true,
    body: `<form class="admin-form" id="${esc(formId)}" novalidate>
      <div class="form-error" data-form-error hidden></div>
      ${formFieldsMarkup(resource.fields, values, { idPrefix: formId, timezone })}
      ${
        resource.validate
          ? '<p class="field-help">Validation runs again when you save.</p>'
          : ''
      }
    </form>`,
    footer: `<button type="button" class="btn btn-ghost" data-cancel>Cancel</button>
      ${resource.preview ? `<button type="button" class="btn" data-preview>${icon('eye', { size: 15 })} Preview</button>` : ''}
      <button type="submit" class="btn btn-primary" form="${esc(formId)}" data-save>
        ${isNew ? 'Create' : 'Save changes'}
      </button>`,
  });

  const form = ref.dialog.querySelector('form');
  const errorHost = form.querySelector('[data-form-error]');
  const saveBtn = ref.dialog.querySelector('[data-save]');
  wireImageField(form);
  wireSlug(form, isNew);

  ref.dialog.querySelector('[data-cancel]').addEventListener('click', ref.close);

  ref.dialog.querySelector('[data-preview]')?.addEventListener('click', () => {
    openPreview(key, snapshot(form, resource.fields, timezone), ctx);
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    saveBtn.disabled = true;
    const original = saveBtn.innerHTML;
    saveBtn.innerHTML = `${icon('refresh', { size: 15 })} Saving…`;
    mountIcons(saveBtn);
    errorHost.hidden = true;

    try {
      const payload = collectForm(form, resource.fields, { timezone });
      if (key === 'announcements' && payload.status === 'published' && !payload.published_at) {
        payload.published_at = new Date().toISOString();
      }
      const problem = resource.validate?.(payload);
      if (problem) throw new FormError(problem);

      if (isNew) await createRow(key, payload);
      else await updateRow(key, row.id, payload);

      toast(`${resource.singular} ${isNew ? 'created' : 'updated'}.`, { type: 'success' });
      ref.close();
      ctx.onSaved?.();
    } catch (err) {
      showFormError(errorHost, err);
      toast(err.message || 'Could not save.', { type: 'error' });
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = original;
      mountIcons(saveBtn);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Quick actions + delete                                              */
/* ------------------------------------------------------------------ */

export async function runQuickAction(key, row, actionKey, ctx, button) {
  const resource = RESOURCES[key];
  const action = resource?.quickActions?.find((a) => a.key === actionKey);
  if (!action) return;

  if (action.confirm) {
    const ok = await confirmDialog({
      title: action.label,
      message: action.confirm,
      confirmLabel: action.label,
      tone: action.key === 'cancel' || action.key === 'archive' ? 'danger' : 'primary',
    });
    if (!ok) return;
  }

  if (button) {
    button.disabled = true;
    button.dataset.busy = '1';
  }
  try {
    const patch = typeof action.patch === 'function' ? action.patch(row) : action.patch;
    await updateRow(key, row.id, patch);
    toast(`${resource.singular} updated.`, { type: 'success', timeout: 2600 });
    ctx.onSaved?.();
  } catch (err) {
    toast(err.message || 'Could not update.', { type: 'error' });
    if (button) button.disabled = false;
  }
}

export async function deleteResource(key, row, ctx) {
  const resource = RESOURCES[key];
  if (!resource) return false;

  const ok = await confirmDialog({
    title: `Delete this ${resource.singular.toLowerCase()}?`,
    message: `“${titleOf(row, resource)}” will be permanently removed. This cannot be undone.`,
    confirmLabel: 'Delete permanently',
  });
  if (!ok) return false;

  try {
    await deleteRow(key, row.id);
    toast(`${resource.singular} deleted.`, { type: 'success' });
    ctx.onSaved?.();
    return true;
  } catch (err) {
    toast(err.message || 'Could not delete.', { type: 'error' });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Preview                                                             */
/* ------------------------------------------------------------------ */

function previewMeta(values) {
  return [
    ['Date', values.event_date ? formatDay(values.event_date) : 'TBA'],
    ['Time', formatTimeRange(values.start_time, values.end_time) || 'TBA'],
    ['Venue', lookupLabel('locations', values.location_id) || 'Venue to be announced'],
    ['Category', vocabLabel(values.category) || '—'],
  ]
    .map(
      ([label, value]) => `<div class="preview-meta-row"><span>${esc(label)}</span><b>${esc(value)}</b></div>`
    )
    .join('');
}

function genericPreview(key, values, timezone) {
  const resource = RESOURCES[key];
  return `<div class="preview-generic">
    ${resource.fields
      .filter((f) => !['image'].includes(f.type))
      .map((f) => {
        let value = values[f.name];
        if (value === null || value === undefined || value === '') return '';
        if (f.type === 'checkbox') value = value ? 'Yes' : 'No';
        else if (f.type === 'datetime') value = formatDateTime(value, timezone);
        else if (f.type === 'lookup') value = lookupLabel(f.source, value);
        else if (f.type === 'social') {
          value = Array.isArray(value)
            ? value.map((s) => `${s.label || 'Link'} — ${s.url || 'no URL'}`).join('\n')
            : String(value);
        } else if (Array.isArray(value)) value = value.join(', ');
        return `<div class="preview-meta-row"><span>${esc(f.label)}</span><b>${esc(value)}</b></div>`;
      })
      .join('')}
  </div>`;
}

/**
 * Preview an in-progress or saved record before it is published. This is a
 * lightweight rendering of the record's own values, not the live page, so it
 * works even when the public site is offline.
 */
export function openPreview(key, values, ctx = {}) {
  const resource = RESOURCES[key];
  if (!resource) return;

  const isEvent = key === 'events';
  const image = mediaPreviewUrl(values.image_url);
  const body = isEvent
    ? `<article class="preview-event">
        ${image ? `<img class="preview-cover" src="${esc(image)}" alt="" />` : ''}
        <div class="cluster" style="gap:8px">
          ${statusPill(values.status, vocabLabel(values.status))}
          ${values.featured ? '<span class="badge badge-magenta">Featured</span>' : ''}
          <span class="badge badge-neutral">${esc(vocabLabel(values.category) || 'Uncategorised')}</span>
        </div>
        <h3 style="font-size:1.25rem;margin-top:6px">${esc(values.title || 'Untitled event')}</h3>
        <p style="color:var(--muted);line-height:1.65">${esc(values.description || 'No description yet.')}</p>
        ${previewMeta(values)}
        <p class="field-help">${icon('eye', { size: 13 })} Preview only — nothing is published until you save with status “Published”.</p>
      </article>`
    : `<div class="cluster" style="gap:8px;margin-bottom:10px">
        ${statusPill(values.status, vocabLabel(values.status))}
      </div>
      <h3 style="font-size:1.15rem">${esc(values.title || values.name || values.sponsor_name || resource.singular)}</h3>
      ${image ? `<img class="preview-cover" src="${esc(image)}" alt="" style="margin-top:10px" />` : ''}
      <div style="margin-top:12px">${genericPreview(key, values, ctx.timezone || 'Asia/Kolkata')}</div>`;

  openModal({
    title: `Preview ${resource.singular.toLowerCase()}`,
    subtitle: 'This is how the record’s content reads. It is not a live page.',
    body,
    wide: true,
    footer: `<button type="button" class="btn" data-close-modal>Close preview</button>`,
  });
}

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export function settingsFormMarkup(config, { timezone = 'Asia/Kolkata' } = {}) {
  return `<form class="admin-form" id="adm-settings-form" novalidate>
    <div class="form-error" data-form-error hidden></div>
    ${formFieldsMarkup(CONFIG_FIELDS, config || {}, { idPrefix: 'adm-config', timezone })}
  </form>`;
}

export function bindSettingsForm(form, ctx = {}) {
  if (!form) return;
  const errorHost = form.querySelector('[data-form-error]');
  const timezone = ctx.timezone || 'Asia/Kolkata';
  const saveBtn = document.querySelector('[data-save-settings]');
  wireImageField(form);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saveBtn) {
      saveBtn.disabled = true;
      const original = saveBtn.innerHTML;
      saveBtn.dataset.original = original;
      saveBtn.innerHTML = `${icon('refresh', { size: 15 })} Saving…`;
      mountIcons(saveBtn);
    }
    errorHost.hidden = true;

    try {
      const payload = collectForm(form, CONFIG_FIELDS, { timezone });
      const start = payload.festival_start ? new Date(payload.festival_start).getTime() : NaN;
      const end = payload.festival_end ? new Date(payload.festival_end).getTime() : NaN;
      if (Number.isNaN(start) || Number.isNaN(end)) {
        throw new FormError('Choose a valid festival start and end.');
      }
      if (end <= start) {
        throw new FormError('The festival end must be after the start.');
      }
      if (!/^[A-Za-z_/]+$/.test(String(payload.timezone || ''))) {
        throw new FormError('Enter a valid IANA timezone, e.g. Asia/Kolkata.', 'timezone');
      }

      await saveConfig(payload);
      toast('Settings saved. Public pages update on their next refresh.', { type: 'success' });
      ctx.onSaved?.();
    } catch (err) {
      showFormError(errorHost, err);
      toast(err.message || 'Could not save settings.', { type: 'error' });
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = saveBtn.dataset.original || `${icon('check', { size: 15 })} Save settings`;
        mountIcons(saveBtn);
      }
    }
  });
}
