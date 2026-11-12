/**
 * Admin UI building blocks: modal/confirm dialogs, declarative form fields,
 * table rendering and small formatting helpers.
 */
import { icon, mountIcons } from '../icons.js';
import {
  esc,
  safeUrl,
  formatDayShort,
  formatTimeRange,
  formatDateTime,
  timeAgo,
} from '../util.js';
import {
  RESOURCES,
  EVENT_CATEGORIES,
  VENDOR_CATEGORIES,
  LOCATION_TYPES,
  EVENT_STATUS,
  VENDOR_STATUS,
  OFFER_STATUS,
  ANNOUNCEMENT_STATUS,
  PRIORITIES,
  SPONSORSHIP_STATUS,
  PLACEMENTS,
} from './schemas.js';
import { lookupLabel, lookupOptions } from './data.js';
import { toast } from '../ui.js';

/* ------------------------------------------------------------------ */
/* Labels                                                              */
/* ------------------------------------------------------------------ */

const labelMap = (options) => Object.fromEntries(options.map((o) => [o.value, o.label]));

const PRACTICE_LABELS = {
  ...labelMap(EVENT_CATEGORIES),
  ...labelMap(VENDOR_CATEGORIES),
  ...labelMap(LOCATION_TYPES),
  ...labelMap(EVENT_STATUS),
  ...labelMap(VENDOR_STATUS),
  ...labelMap(OFFER_STATUS),
  ...labelMap(ANNOUNCEMENT_STATUS),
  ...labelMap(SPONSORSHIP_STATUS),
  ...labelMap(PLACEMENTS),
  ...Object.fromEntries(PRIORITIES.map((p) => [p.value, p.label])),
};

/** Human label for a vocabulary value (falls back to a de-slugged string). */
export function vocabLabel(value) {
  if (value === null || value === undefined || value === '') return '';
  return PRACTICE_LABELS[value] || String(value).replace(/_/g, ' ');
}

function statusOptionsFor(resourceKey, columnKey) {
  if (columnKey === 'approval_status') return VENDOR_STATUS;
  if (columnKey === 'priority') return PRIORITIES;
  if (columnKey === 'placement') return PLACEMENTS;
  const map = {
    events: EVENT_STATUS,
    offers: OFFER_STATUS,
    announcements: ANNOUNCEMENT_STATUS,
    sponsorships: SPONSORSHIP_STATUS,
  };
  return map[resourceKey] || EVENT_STATUS;
}

/** Coloured status pill with an accessible text label. */
export function statusPill(value, label = '') {
  if (!value) return '<span class="dim">—</span>';
  const safe = String(value).replace(/[^a-z0-9_-]/gi, '');
  return `<span class="pill-status ${safe}">${esc(label || vocabLabel(value))}</span>`;
}

/* ------------------------------------------------------------------ */
/* Dialogs                                                             */
/* ------------------------------------------------------------------ */

/**
 * Open a native `<dialog>` modal. Returns handles so callers can update the
 * body or close it after a successful save.
 */
export function openModal({ title, subtitle = '', body = '', footer = '', wide = false, onClose } = {}) {
  const dialog = document.createElement('dialog');
  dialog.className = `modal${wide ? ' modal-wide' : ''}`;
  dialog.setAttribute('aria-labelledby', 'adm-modal-title');
  dialog.innerHTML = `
    <div class="modal-head">
      <div>
        <h2 id="adm-modal-title">${esc(title || '')}</h2>
        ${subtitle ? `<p class="field-help" style="margin-top:2px">${esc(subtitle)}</p>` : ''}
      </div>
      <button type="button" class="btn btn-icon" data-close-modal aria-label="Close dialog">
        ${icon('x', { size: 18 })}
      </button>
    </div>
    <div class="modal-body">${body}</div>
    ${footer ? `<div class="modal-foot">${footer}</div>` : ''}`;

  document.body.appendChild(dialog);
  dialog.showModal();
  mountIcons(dialog);

  const close = () => {
    if (dialog.open) dialog.close();
    else dialog.remove();
  };

  dialog.querySelectorAll('[data-close-modal]').forEach((btn) =>
    btn.addEventListener('click', close)
  );
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });
  dialog.addEventListener('close', () => {
    dialog.remove();
    onClose?.();
  });

  return {
    dialog,
    close,
    body: dialog.querySelector('.modal-body'),
    foot: dialog.querySelector('.modal-foot'),
  };
}

/** Promise-based confirmation dialog. Resolves false on escape/backdrop. */
export function confirmDialog({
  title = 'Are you sure?',
  message = '',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
} = {}) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
      ref.close();
    };
    const ref = openModal({
      title,
      body: `<p style="font-size:0.92rem;line-height:1.65;color:var(--muted)">${esc(message)}</p>`,
      footer: `<button type="button" class="btn btn-ghost" data-cancel>${esc(cancelLabel)}</button>
        <button type="button" class="btn ${tone === 'danger' ? 'btn-danger' : 'btn-primary'}" data-confirm>${esc(confirmLabel)}</button>`,
      onClose: () => {
        if (!settled) {
          settled = true;
          resolve(false);
        }
      },
    });
    ref.dialog.querySelector('[data-cancel]').addEventListener('click', () => finish(false));
    ref.dialog.querySelector('[data-confirm]').addEventListener('click', () => finish(true));
  });
}

/* ------------------------------------------------------------------ */
/* Date/time helpers                                                   */
/* ------------------------------------------------------------------ */

const zoneFormatters = new Map();

function formatterFor(timezone) {
  if (!zoneFormatters.has(timezone)) {
    try {
      zoneFormatters.set(
        timezone,
        new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hourCycle: 'h23',
        })
      );
    } catch {
      zoneFormatters.set(timezone, null);
    }
  }
  return zoneFormatters.get(timezone);
}

function zoneParts(date, timezone) {
  const fmt = formatterFor(timezone);
  if (!fmt) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    };
  }
  const parts = Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== 'literal')
      .map((p) => [p.type, Number(p.value)])
  );
  return parts;
}

const pad2 = (n) => String(n).padStart(2, '0');

/** ISO timestamp -> value for `<input type="datetime-local">` in the festival zone. */
export function isoToZonedInput(iso, timezone = 'Asia/Kolkata') {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const p = zoneParts(date, timezone);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}T${pad2(p.hour)}:${pad2(p.minute)}`;
}

/** `datetime-local` wall time in the festival zone -> ISO timestamp. */
export function zonedInputToIso(local, timezone = 'Asia/Kolkata') {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(local || ''));
  if (!m) return null;
  const target = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  if (Number.isNaN(target)) return null;
  let stamp = target;
  for (let i = 0; i < 3; i += 1) {
    const p = zoneParts(new Date(stamp), timezone);
    const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second || 0);
    const diff = target - asUtc;
    if (diff === 0) break;
    stamp += diff;
  }
  return new Date(stamp).toISOString();
}

/** ISO timestamp -> value for `<input type="date">`. */
function dateInputValue(value) {
  return value ? String(value).slice(0, 10) : '';
}

function timeInputValue(value) {
  return value ? String(value).slice(0, 5) : '';
}

/* ------------------------------------------------------------------ */
/* Field rendering                                                     */
/* ------------------------------------------------------------------ */

function optionMarkup(options, selected, placeholder = null) {
  const head =
    placeholder !== null ? `<option value="">${esc(placeholder)}</option>` : '';
  return (
    head +
    options
      .map(
        (o) =>
          `<option value="${esc(o.value)}" ${String(selected ?? '') === String(o.value) ? 'selected' : ''}>${esc(o.label)}</option>`
      )
      .join('')
  );
}

function parseSocial(value) {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label = '', url = '', iconName = 'link'] = line.split('|').map((p) => p.trim());
      return { label, url, icon: iconName || 'link' };
    });
}

function socialText(value) {
  return parseSocial(value)
    .map((s) => [s.label, s.url, s.icon || 'link'].join(' | '))
    .join('\n');
}

function inputType(type) {
  if (type === 'email') return 'email';
  if (type === 'url') return 'url';
  if (type === 'number') return 'number';
  if (type === 'date') return 'date';
  if (type === 'time') return 'time';
  if (type === 'datetime') return 'datetime-local';
  return 'text';
}

/** Resolve a stored media path for display inside /admin/. */
export function mediaPreviewUrl(value) {
  const str = String(value || '');
  if (!str) return '';
  if (/^https?:\/\//i.test(str) || str.startsWith('/')) return safeUrl(str, '');
  return safeUrl(`../${str.replace(/^\.?\//, '')}`, '');
}

/**
 * Render one schema field.
 * @param {object} field schema field
 * @param {*} value current value
 * @param {{idPrefix?: string, timezone?: string}} ctx
 */
export function fieldMarkup(field, value, { idPrefix = 'adm', timezone = 'Asia/Kolkata' } = {}) {
  const id = `${idPrefix}-${field.name}`;
  const span = field.span === 2 ? 'span-full' : '';
  const required = field.required ? 'required' : '';
  const help = field.help ? `<p class="field-help">${esc(field.help)}</p>` : '';
  const label = `<label class="field-label" for="${esc(id)}">${esc(field.label)}${field.required ? ' <span class="req" aria-hidden="true">*</span>' : ''}</label>`;

  if (field.type === 'checkbox') {
    return `<div class="field ${span} field-check">
      <label class="switch" for="${esc(id)}">
        <input type="checkbox" id="${esc(id)}" name="${esc(field.name)}" ${value ? 'checked' : ''} />
        <span>${esc(field.label)}</span>
      </label>
      ${help}
    </div>`;
  }

  if (field.type === 'image') {
    const src = mediaPreviewUrl(value);
    return `<div class="field ${span}">
      ${label}
      <div class="image-field">
        <div class="image-preview" data-image-preview>
          ${src ? `<img src="${esc(src)}" alt="Current image preview" />` : icon('image', { size: 22 })}
        </div>
        <div class="image-controls">
          <input class="input" type="text" id="${esc(id)}" name="${esc(field.name)}"
            data-image-url value="${esc(value || '')}" placeholder="Paste an image URL or upload a file" />
          <div class="cluster" style="gap:8px">
            <label class="btn btn-sm upload-btn" data-upload-label>
              ${icon('upload', { size: 14 })} Upload
              <input type="file" accept="image/png,image/jpeg,image/webp" data-upload="${esc(field.folder || 'misc')}" />
            </label>
            <button type="button" class="btn btn-sm btn-ghost" data-clear-image>${icon('x', { size: 14 })} Remove</button>
          </div>
          ${help}
        </div>
      </div>
    </div>`;
  }

  if (field.type === 'textarea' || field.type === 'social') {
    const rows = field.type === 'social' ? 4 : field.rows || 4;
    const text = field.type === 'social' ? socialText(value) : value || '';
    return `<div class="field ${span}">
      ${label}
      <textarea class="textarea" id="${esc(id)}" name="${esc(field.name)}" rows="${rows}"
        placeholder="${esc(field.placeholder || '')}" ${required}
        ${field.max ? `maxlength="${field.max}"` : ''}>${esc(text)}</textarea>
      ${help}
    </div>`;
  }

  if (field.type === 'select' || field.type === 'lookup' || field.type === 'radio') {
    let options;
    if (field.type === 'lookup') {
      options = lookupOptions(field.source);
    } else {
      options = field.options || [];
    }
    return `<div class="field ${span}">
      ${label}
      <select class="select" id="${esc(id)}" name="${esc(field.name)}" ${required}>
        ${optionMarkup(options, value, field.required ? 'Select…' : '— None —')}
      </select>
      ${help}
    </div>`;
  }

  let inputValue = value ?? '';
  if (field.type === 'datetime') inputValue = isoToZonedInput(value, timezone);
  if (field.type === 'date') inputValue = dateInputValue(value);
  if (field.type === 'time') inputValue = timeInputValue(value);

  const min = field.min !== undefined ? `min="${field.min}"` : '';
  const max = field.max !== undefined && field.type === 'number' ? `max="${field.max}"` : '';
  const step = field.step !== undefined ? `step="${field.step}"` : '';
  const pattern =
    field.pattern instanceof RegExp ? `pattern="${esc(field.pattern.source)}"` : '';
  const maxlength =
    field.max !== undefined && ['text', 'email', 'url'].includes(field.type)
      ? `maxlength="${field.max}"`
      : '';

  return `<div class="field ${span}">
    ${label}
    <input class="input" type="${inputType(field.type)}" id="${esc(id)}" name="${esc(field.name)}"
      value="${esc(inputValue)}" placeholder="${esc(field.placeholder || '')}"
      ${required} ${min} ${max} ${step} ${pattern} ${maxlength} />
    ${help}
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Form rendering                                                      */
/* ------------------------------------------------------------------ */

export function formFieldsMarkup(fields, values = {}, ctx = {}) {
  return `<div class="form-grid">${fields
    .map((f) => fieldMarkup(f, values[f.name], ctx))
    .join('')}</div>`;
}

/* ------------------------------------------------------------------ */
/* Form collection + validation                                        */
/* ------------------------------------------------------------------ */

export class FormError extends Error {
  constructor(message, field = '') {
    super(message);
    this.name = 'FormError';
    this.field = field;
  }
}

function looksLikeHttp(value) {
  try {
    const url = new URL(String(value), location.href);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Bundled artwork uses repo-relative paths like `assets/img/art/wave-purple.svg`.
 * They are valid for seeded rows, so image fields accept them as well as http(s)
 * URLs. Nothing else (javascript:, data:, …) is allowed.
 */
function looksLikeRelativeImage(value) {
  return /^assets\/[A-Za-z0-9._/-]+\.(png|jpe?g|webp|svg)$/i.test(String(value || ''));
}

/**
 * Read and validate a rendered form.
 * @returns {Record<string, unknown>}
 */
export function collectForm(form, fields, { timezone = 'Asia/Kolkata' } = {}) {
  const values = {};

  for (const field of fields) {
    const el = form.elements.namedItem(field.name);
    if (!el) continue;

    if (field.type === 'checkbox') {
      values[field.name] = Boolean(el.checked);
      continue;
    }

    if (field.type === 'social') {
      values[field.name] = parseSocial(el.value).filter((s) => s.url || s.label);
      for (const item of values[field.name]) {
        if (item.url && !looksLikeHttp(item.url)) {
          throw new FormError('Social links must start with http:// or https://.', field.name);
        }
      }
      continue;
    }

    const raw = typeof el.value === 'string' ? el.value.trim() : el.value;

    if (!raw) {
      if (field.required) {
        throw new FormError(`${field.label} is required.`, field.name);
      }
      values[field.name] = null;
      continue;
    }

    let value = raw;
    if (field.type === 'number') {
      value = Number(raw);
      if (Number.isNaN(value)) {
        throw new FormError(`${field.label} must be a number.`, field.name);
      }
      if (field.min !== undefined && value < field.min) {
        throw new FormError(`${field.label} must be at least ${field.min}.`, field.name);
      }
      if (field.max !== undefined && value > field.max) {
        throw new FormError(`${field.label} must be ${field.max} or less.`, field.name);
      }
    } else if (field.type === 'datetime') {
      value = zonedInputToIso(raw, timezone);
      if (!value) {
        throw new FormError(`${field.label} is not a valid date and time.`, field.name);
      }
    } else if (field.type === 'date') {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
        throw new FormError(`${field.label} is not a valid date.`, field.name);
      }
    } else if (field.type === 'time') {
      if (!/^\d{2}:\d{2}(:\d{2})?$/.test(raw)) {
        throw new FormError(`${field.label} is not a valid time.`, field.name);
      }
      value = raw.length === 5 ? `${raw}:00` : raw;
    } else if (field.type === 'url') {
      if (!looksLikeHttp(raw)) {
        throw new FormError(`${field.label} must be a full http(s) URL.`, field.name);
      }
    } else if (field.type === 'image') {
      if (!looksLikeHttp(raw) && !looksLikeRelativeImage(raw)) {
        throw new FormError(
          `${field.label} must be a full http(s) URL or a bundled assets/… image.`,
          field.name
        );
      }
    } else if (field.type === 'email') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
        throw new FormError(`${field.label} is not a valid email address.`, field.name);
      }
    }

    if (field.pattern instanceof RegExp && typeof value === 'string' && !field.pattern.test(value)) {
      throw new FormError(field.patternMessage || `${field.label} has an invalid format.`, field.name);
    }
    if (field.max && typeof value === 'string' && value.length > field.max) {
      throw new FormError(`${field.label} must be ${field.max} characters or fewer.`, field.name);
    }

    values[field.name] = value;
  }

  return values;
}

/** Show an inline form error and focus the offending field. */
export function showFormError(host, err) {
  if (!host) return;
  host.innerHTML = `${icon('alert-circle', { size: 16 })}<span>${esc(err.message || 'Could not save.')}</span>`;
  host.hidden = false;
  const field = err.field && host.closest('form')?.elements.namedItem(err.field);
  if (field && typeof field.focus === 'function') field.focus();
}

/** Image upload wiring for every rendered image field inside `scope`. */
export function wireImageField(scope, { onError } = {}) {
  scope.querySelectorAll('.image-field').forEach((field) => {
    const input = field.querySelector('[data-upload]');
    const label = field.querySelector('[data-upload-label]');
    const urlInput = field.querySelector('[data-image-url]');
    const preview = field.querySelector('[data-image-preview]');
    const clear = field.querySelector('[data-clear-image]');
    if (!input || !urlInput) return;

    const paint = (src) => {
      if (!preview) return;
      preview.innerHTML = src
        ? `<img src="${esc(src)}" alt="Image preview" />`
        : icon('image', { size: 22 });
    };

    urlInput.addEventListener('input', () => paint(mediaPreviewUrl(urlInput.value)));

    clear?.addEventListener('click', () => {
      urlInput.value = '';
      paint('');
      urlInput.focus();
    });

    input.addEventListener('change', async () => {
      const file = input.files?.[0];
      if (!file) return;
      const original = label?.innerHTML;
      if (label) {
        label.classList.add('is-busy');
        label.innerHTML = `${icon('refresh', { size: 14 })} Uploading…`;
        mountIcons(label);
      }
      try {
        const { upload } = await import('./data.js');
        const url = await upload(file, input.dataset.upload || 'misc');
        urlInput.value = url;
        paint(url);
        toast('Image uploaded.', { type: 'success', timeout: 2400 });
      } catch (err) {
        onError?.(err);
        toast(err.message || 'Upload failed.', { type: 'error' });
      } finally {
        input.value = '';
        if (label) {
          label.classList.remove('is-busy');
          label.innerHTML = original;
          mountIcons(label);
        }
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Tables                                                              */
/* ------------------------------------------------------------------ */

function cellValue(column, row) {
  const raw = row[column.key];
  switch (column.type) {
    case 'primary': {
      const sub = column.sub ? row[column.sub] : '';
      return `<div class="cell-primary">
        <span class="cell-title">${esc(raw || 'Untitled')}</span>
        ${sub ? `<span class="cell-sub">${esc(String(sub))}</span>` : ''}
      </div>`;
    }
    case 'date':
      return raw ? esc(formatDayShort(raw)) : '<span class="dim">—</span>';
    case 'timerange': {
      const text = formatTimeRange(row[column.keys[0]], row[column.keys[1]]);
      return text ? esc(text) : '<span class="dim">TBA</span>';
    }
    case 'lookup': {
      const label = lookupLabel(column.source, raw);
      return label ? esc(label) : '<span class="dim">—</span>';
    }
    case 'category':
      return raw ? `<span class="badge badge-neutral">${esc(vocabLabel(raw))}</span>` : '<span class="dim">—</span>';
    case 'status':
      return statusPill(raw, vocabLabel(raw));
    case 'priority':
      return raw ? `<span class="badge ${raw === 'urgent' ? 'badge-red' : raw === 'high' ? 'badge-amber' : 'badge-purple'}">${esc(vocabLabel(raw))}</span>` : '<span class="dim">—</span>';
    case 'placement':
      return raw ? esc(vocabLabel(raw)) : '<span class="dim">—</span>';
    case 'bool': {
      const yes = column.yes || 'Yes';
      const no = column.no || 'No';
      return raw
        ? `<span class="bool-yes">${icon('check', { size: 13 })} ${esc(yes)}</span>`
        : `<span class="bool-no">${icon('x', { size: 13 })} ${esc(no)}</span>`;
    }
    case 'datetime':
      if (!raw) return `<span class="dim">${esc(column.empty || '—')}</span>`;
      return `<span title="${esc(formatDateTime(raw))}">${esc(timeAgo(raw))}</span>`;
    case 'mapxy': {
      const [x, y] = column.keys.map((k) => row[k]);
      if (x === null || x === undefined || y === null || y === undefined) {
        return '<span class="dim">Not placed</span>';
      }
      return `<span class="mono">${esc(x)}% , ${esc(y)}%</span>`;
    }
    case 'daterange': {
      const [from, to] = column.keys.map((k) => row[k]);
      if (!from && !to) return '<span class="dim">—</span>';
      return `${esc(from ? formatDayShort(from) : '?')} → ${esc(to ? formatDayShort(to) : '?')}`;
    }
    default:
      return raw === null || raw === undefined || raw === ''
        ? '<span class="dim">—</span>'
        : esc(String(raw));
  }
}

function rowActionsMarkup(resource, row, { canEdit, canDelete }) {
  const actions = [];

  if (resource.preview) {
    actions.push(
      `<button type="button" class="btn btn-icon" data-row-action="preview" data-id="${esc(row.id)}" title="Preview" aria-label="Preview ${esc(row.title || resource.singular)}">${icon('eye', { size: 15 })}</button>`
    );
  }

  if (canEdit) {
    (resource.quickActions || [])
      .filter((a) => !a.when || a.when(row))
      .forEach((a) => {
        actions.push(
          `<button type="button" class="btn btn-icon" data-row-action="quick" data-quick="${esc(a.key)}" data-id="${esc(row.id)}" title="${esc(a.label)}" aria-label="${esc(a.label)}">${icon(a.icon || 'check', { size: 15 })}</button>`
        );
      });

    actions.push(
      `<button type="button" class="btn btn-icon" data-row-action="edit" data-id="${esc(row.id)}" title="Edit" aria-label="Edit ${esc(row.title || row.name || resource.singular)}">${icon('pencil', { size: 15 })}</button>`
    );
  }

  if (canDelete) {
    actions.push(
      `<button type="button" class="btn btn-icon btn-icon-danger" data-row-action="delete" data-id="${esc(row.id)}" title="Delete" aria-label="Delete ${esc(row.title || row.name || resource.singular)}">${icon('trash', { size: 15 })}</button>`
    );
  }

  return actions.length ? actions.join('') : '<span class="dim">—</span>';
}

/** Render a resource table. */
export function tableMarkup(resourceKey, list, { canEdit = false, canDelete = false, timezone = 'Asia/Kolkata' } = {}) {
  const resource = RESOURCES[resourceKey];
  if (!resource) return '';
  const columns = resource.columns || [];

  if (!list.length) {
    return `<div class="admin-empty">${icon('list', { size: 22 })}<p>No ${esc(resource.label.toLowerCase())} yet.</p></div>`;
  }

  return `<div class="table-wrap">
    <table class="table">
      <thead>
        <tr>
          ${columns.map((c) => `<th scope="col">${esc(c.label)}</th>`).join('')}
          <th scope="col" class="th-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${list
          .map(
            (row) => `<tr data-row="${esc(row.id)}">
              ${columns.map((c) => `<td data-col="${esc(c.type)}">${cellValue(c, row)}</td>`).join('')}
              <td><div class="row-actions">${rowActionsMarkup(resource, row, { canEdit, canDelete })}</div></td>
            </tr>`
          )
          .join('')}
      </tbody>
    </table>
  </div>`;
}

/* ------------------------------------------------------------------ */
/* Misc                                                                */
/* ------------------------------------------------------------------ */

export function noticeMarkup(message, { tone = 'info', iconName = 'info' } = {}) {
  return `<div class="notice-strip" data-tone="${esc(tone)}" role="note">
    ${icon(iconName, { size: 16 })}<span>${message}</span>
  </div>`;
}

export function spinnerMarkup(label = 'Loading…') {
  return `<div class="admin-loading" role="status">
    <span class="spinner" aria-hidden="true"></span>
    <span>${esc(label)}</span>
  </div>`;
}
