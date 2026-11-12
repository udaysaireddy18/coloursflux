/**
 * Admin resource schemas.
 *
 * One definition per table drives the list view, the create/edit form, table
 * columns, quick status actions and validation. Keeping this declarative means
 * a field only has to be described once instead of being duplicated in markup,
 * read logic and validation.
 */

import { parseDateOnly } from '../util.js';

const option = (value, label) => ({ value, label });

export const EVENT_CATEGORIES = [
  option('music', 'Music'),
  option('dance', 'Dance'),
  option('theatre', 'Theatre'),
  option('tech', 'Tech'),
  option('arts', 'Arts'),
  option('sports', 'Sports'),
  option('food', 'Food'),
  option('literature', 'Literature'),
  option('fashion', 'Fashion'),
  option('art', 'Art & crafts'),
  option('merch', 'Merchandise'),
  option('other', 'Other'),
];

export const VENDOR_CATEGORIES = [
  option('food', 'Food & beverages'),
  option('fashion', 'Fashion'),
  option('art', 'Art & crafts'),
  option('tech', 'Technology'),
  option('merch', 'Merchandise'),
  option('other', 'Other'),
];

export const LOCATION_TYPES = [
  option('stage', 'Stage'),
  option('food', 'Food & drink'),
  option('venue', 'Venue / room'),
  option('sports', 'Sports area'),
  option('service', 'Service point'),
  option('parking', 'Parking / entry'),
  option('other', 'Other'),
];

export const EVENT_STATUS = [
  option('draft', 'Draft'),
  option('published', 'Published'),
  option('cancelled', 'Cancelled'),
  option('archived', 'Archived'),
];

export const VENDOR_STATUS = [
  option('pending', 'Pending review'),
  option('approved', 'Approved'),
  option('rejected', 'Rejected'),
];

export const OFFER_STATUS = [
  option('draft', 'Draft'),
  option('active', 'Active'),
  option('expired', 'Expired'),
];

export const ANNOUNCEMENT_STATUS = [
  option('draft', 'Draft'),
  option('published', 'Published'),
  option('archived', 'Archived'),
];

export const PRIORITIES = [
  option('urgent', 'Urgent'),
  option('high', 'High'),
  option('normal', 'Notice'),
  option('low', 'Info'),
];

export const SPONSORSHIP_STATUS = [
  option('draft', 'Draft'),
  option('active', 'Active'),
  option('ended', 'Ended'),
];

export const PLACEMENTS = [
  option('home_strip', 'Home page sponsor strip'),
  option('stalls_banner', 'Stalls page placement'),
  option('events_banner', 'Events page placement'),
];

/* ------------------------------------------------------------------ */
/* Fields                                                              */
/* ------------------------------------------------------------------ */

const titleField = (label, placeholder, max = 160) => ({
  name: 'title',
  label,
  type: 'text',
  required: true,
  max,
  span: 2,
  placeholder,
});

const slugField = {
  name: 'slug',
  label: 'URL slug',
  type: 'text',
  required: true,
  max: 80,
  pattern: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  patternMessage: 'Use lowercase letters, numbers and single hyphens only.',
  help: 'Used in the public event link. Filled automatically from the title; edit if needed.',
  span: 2,
};

const descriptionField = (label = 'Description', rows = 4) => ({
  name: 'description',
  label,
  type: 'textarea',
  rows,
  span: 2,
  max: 2000,
  placeholder: 'What should visitors know about this?',
});

const imageField = (folder, label = 'Image') => ({
  name: 'image_url',
  label,
  type: 'image',
  folder,
  span: 2,
  help: 'PNG, JPEG or WebP, up to 2 MB. Uploaded to the public festival-media bucket.',
});

const dateField = (name, label) => ({ name, label, type: 'date' });
const timeField = (name, label, required = false) => ({
  name,
  label,
  type: 'time',
  required,
  nullable: !required,
});

const locationField = {
  name: 'location_id',
  label: 'Venue',
  type: 'lookup',
  source: 'locations',
  nullable: true,
  help: 'Only published locations appear on the public map. Unpublished venues still work for drafts.',
};

/* ------------------------------------------------------------------ */
/* Table definitions                                                   */
/* ------------------------------------------------------------------ */

export const RESOURCES = {
  events: {
    key: 'events',
    table: 'events',
    label: 'Events',
    singular: 'Event',
    icon: 'calendar',
    description:
      'Talks, competitions and performances. Draft items stay private until published.',
    order: 'event_date.desc,start_time.desc',
    searchFields: ['title', 'slug', 'description', 'category'],
    canEdit: true,
    canDelete: 'admin',
    columns: [
      { label: 'Event', type: 'primary', key: 'title', sub: 'slug' },
      { label: 'Date', type: 'date', key: 'event_date' },
      { label: 'Time', type: 'timerange', keys: ['start_time', 'end_time'] },
      { label: 'Venue', type: 'lookup', key: 'location_id', source: 'locations' },
      { label: 'Category', type: 'category', key: 'category' },
      { label: 'Status', type: 'status', key: 'status' },
      { label: 'Featured', type: 'bool', key: 'featured' },
    ],
    filters: [{ key: 'status', label: 'Status', options: EVENT_STATUS }],
    fields: [
      titleField('Event title', 'e.g. Event 1'),
      slugField,
      descriptionField(),
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: EVENT_CATEGORIES,
        required: true,
        default: 'music',
      },
      {
        name: 'event_date',
        label: 'Event date',
        type: 'date',
        required: true,
      },
      timeField('start_time', 'Start time', true),
      timeField('end_time', 'End time'),
      locationField,
      imageField('events'),
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: EVENT_STATUS,
        required: true,
        default: 'draft',
        help: 'Cancelled events stay visible publicly with a cancellation warning.',
      },
      {
        name: 'featured',
        label: 'Feature on the home page',
        type: 'checkbox',
        help: 'Featured events appear first under “Featured events”.',
      },
    ],
    defaults: (ctx) => ({
      status: 'draft',
      featured: false,
      category: 'music',
      event_date: configDate(ctx?.config?.festival_start) || '',
    }),
    validate: (values) => {
      if (values.start_time && values.end_time && values.end_time <= values.start_time) {
        return 'End time must be after the start time. Events spanning midnight are not supported.';
      }
      return null;
    },
    preview: 'event',
    quickActions: [
      { key: 'publish', label: 'Publish', icon: 'send', when: (r) => r.status !== 'published', patch: { status: 'published' } },
      { key: 'unpublish', label: 'Unpublish', icon: 'eye-off', when: (r) => r.status === 'published', patch: { status: 'draft' } },
      { key: 'feature', label: 'Feature', icon: 'star', when: (r) => !r.featured, patch: { featured: true } },
      { key: 'unfeature', label: 'Unfeature', icon: 'star', when: (r) => !!r.featured, patch: { featured: false } },
      {
        key: 'cancel',
        label: 'Cancel event',
        icon: 'x-circle',
        when: (r) => r.status !== 'cancelled',
        patch: { status: 'cancelled' },
        confirm: 'Mark this event as cancelled? It stays visible so visitors see the cancellation.',
      },
      {
        key: 'archive',
        label: 'Archive',
        icon: 'rotate-ccw',
        when: (r) => r.status !== 'archived',
        patch: { status: 'archived' },
        confirm: 'Archive this event? It will no longer be visible to visitors.',
      },
    ],
  },

  locations: {
    key: 'locations',
    table: 'locations',
    label: 'Locations',
    singular: 'Location',
    icon: 'map',
    description:
      'Stages, food court, rooms, services and parking on the campus map. Map positions are percentages of the map image.',
    order: 'name.asc',
    searchFields: ['name', 'description', 'location_type'],
    canEdit: true,
    canDelete: 'admin',
    columns: [
      { label: 'Location', type: 'primary', key: 'name', sub: 'description' },
      { label: 'Type', type: 'locationType', key: 'location_type' },
      { label: 'Map position', type: 'mapxy', keys: ['map_x', 'map_y'] },
      { label: 'Published', type: 'bool', key: 'is_published' },
      { label: 'Updated', type: 'datetime', key: 'updated_at' },
    ],
    filters: [{ key: 'location_type', label: 'Type', options: LOCATION_TYPES }],
    fields: [
      {
        name: 'name',
        label: 'Location name',
        type: 'text',
        required: true,
        max: 120,
        span: 2,
        placeholder: 'e.g. Main Stage',
      },
      descriptionField('Description', 3),
      {
        name: 'location_type',
        label: 'Location type',
        type: 'select',
        options: LOCATION_TYPES,
        required: true,
        default: 'venue',
      },
      {
        name: 'is_published',
        label: 'Show on the public campus map',
        type: 'checkbox',
      },
      {
        name: 'map_x',
        label: 'Map X position (%)',
        type: 'number',
        min: 0,
        max: 100,
        step: 0.1,
        nullable: true,
        help: '0 = left edge, 100 = right edge.',
      },
      {
        name: 'map_y',
        label: 'Map Y position (%)',
        type: 'number',
        min: 0,
        max: 100,
        step: 0.1,
        nullable: true,
        help: '0 = top edge, 100 = bottom edge.',
      },
      {
        name: 'latitude',
        label: 'Latitude',
        type: 'number',
        min: -90,
        max: 90,
        step: 0.000001,
        nullable: true,
        help: 'Optional. Add only verified coordinates; otherwise leave blank.',
      },
      {
        name: 'longitude',
        label: 'Longitude',
        type: 'number',
        min: -180,
        max: 180,
        step: 0.000001,
        nullable: true,
        help: 'Optional. Used for the “Open in maps” link.',
      },
    ],
    defaults: () => ({ is_published: false, location_type: 'venue' }),
    quickActions: [
      {
        key: 'publish',
        label: 'Publish',
        icon: 'send',
        when: (r) => !r.is_published,
        patch: { is_published: true },
      },
      {
        key: 'unpublish',
        label: 'Hide',
        icon: 'eye-off',
        when: (r) => !!r.is_published,
        patch: { is_published: false },
      },
    ],
  },

  vendors: {
    key: 'vendors',
    table: 'vendors',
    label: 'Stalls & vendors',
    singular: 'Vendor',
    icon: 'store',
    description:
      'Vendor profiles, approval state and featured placements. Only approved vendors appear publicly.',
    order: 'name.asc',
    searchFields: ['name', 'description', 'category', 'opening_hours'],
    canEdit: true,
    canDelete: 'admin',
    columns: [
      { label: 'Vendor', type: 'primary', key: 'name', sub: 'description' },
      { label: 'Category', type: 'category', key: 'category' },
      { label: 'Location', type: 'lookup', key: 'location_id', source: 'locations' },
      { label: 'Approval', type: 'status', key: 'approval_status' },
      { label: 'Featured until', type: 'datetime', key: 'featured_until', empty: 'No expiry' },
    ],
    filters: [{ key: 'approval_status', label: 'Approval', options: VENDOR_STATUS }],
    fields: [
      {
        name: 'name',
        label: 'Vendor name',
        type: 'text',
        required: true,
        max: 120,
        span: 2,
        placeholder: 'e.g. Stall 1',
      },
      descriptionField(),
      {
        name: 'category',
        label: 'Category',
        type: 'select',
        options: VENDOR_CATEGORIES,
        required: true,
        default: 'food',
      },
      { ...locationField, label: 'Campus location' },
      imageField('vendors', 'Logo or photo'),
      {
        name: 'contact_url',
        label: 'Contact / social link',
        type: 'url',
        nullable: true,
        span: 2,
        placeholder: 'https://instagram.com/…',
        help: 'Optional public link. Only http(s) links are accepted.',
      },
      {
        name: 'opening_hours',
        label: 'Opening hours',
        type: 'text',
        nullable: true,
        span: 2,
        max: 120,
        placeholder: 'e.g. 11 AM – 10 PM daily',
        help: 'Optional. Shown on the vendor detail card.',
      },
      {
        name: 'approval_status',
        label: 'Approval status',
        type: 'select',
        options: VENDOR_STATUS,
        required: true,
        default: 'pending',
      },
      {
        name: 'is_featured',
        label: 'Featured placement',
        type: 'checkbox',
        help: 'Featured vendors are labelled as promoted placements.',
      },
      {
        name: 'featured_until',
        label: 'Featured until',
        type: 'datetime',
        nullable: true,
        help: 'Leave blank for no expiry. Featured status also respects this date on the public site.',
      },
    ],
    defaults: () => ({ approval_status: 'pending', is_featured: false }),
    quickActions: [
      {
        key: 'approve',
        label: 'Approve',
        icon: 'check',
        when: (r) => r.approval_status !== 'approved',
        patch: { approval_status: 'approved' },
      },
      {
        key: 'reject',
        label: 'Reject',
        icon: 'x',
        when: (r) => r.approval_status !== 'rejected',
        patch: { approval_status: 'rejected' },
        confirm: 'Reject this vendor? They will not appear on the public site.',
      },
      {
        key: 'feature',
        label: 'Feature',
        icon: 'star',
        when: (r) => !r.is_featured,
        patch: { is_featured: true },
      },
      {
        key: 'unfeature',
        label: 'Unfeature',
        icon: 'star',
        when: (r) => !!r.is_featured,
        patch: { is_featured: false },
      },
    ],
  },

  offers: {
    key: 'offers',
    table: 'offers',
    label: 'Offers',
    singular: 'Offer',
    icon: 'tag',
    description:
      'Time-limited vendor offers. Expired offers stay in the database but are hidden publicly.',
    order: 'created_at.desc',
    searchFields: ['title', 'description'],
    canEdit: true,
    canDelete: 'admin',
    columns: [
      { label: 'Offer', type: 'primary', key: 'title', sub: 'description' },
      { label: 'Vendor', type: 'lookup', key: 'vendor_id', source: 'vendors', lookupLabel: 'name' },
      { label: 'Valid until', type: 'datetime', key: 'valid_until', empty: 'No expiry' },
      { label: 'Status', type: 'status', key: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: OFFER_STATUS }],
    fields: [
      titleField('Offer title', 'e.g. Buy 1 get 1 cold brew'),
      {
        name: 'vendor_id',
        label: 'Vendor',
        type: 'lookup',
        source: 'vendors',
        lookupLabel: 'name',
        required: true,
        span: 2,
        help: 'Only approved vendors are shown publicly; the offer is hidden if the vendor is not approved.',
      },
      descriptionField('Offer details', 3),
      {
        name: 'valid_from',
        label: 'Valid from',
        type: 'datetime',
        nullable: true,
      },
      {
        name: 'valid_until',
        label: 'Valid until',
        type: 'datetime',
        nullable: true,
        help: 'The offer disappears from the public site after this time.',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: OFFER_STATUS,
        required: true,
        default: 'draft',
      },
    ],
    defaults: () => ({ status: 'draft' }),
    validate: (values) => {
      if (values.valid_from && values.valid_until && new Date(values.valid_until) <= new Date(values.valid_from)) {
        return '“Valid until” must be after “Valid from”.';
      }
      return null;
    },
    quickActions: [
      {
        key: 'activate',
        label: 'Activate',
        icon: 'check',
        when: (r) => r.status !== 'active',
        patch: { status: 'active' },
      },
      {
        key: 'expire',
        label: 'Expire',
        icon: 'clock',
        when: (r) => r.status !== 'expired',
        patch: { status: 'expired' },
        confirm: 'Mark this offer expired? It will disappear from the public stalls page.',
      },
    ],
  },

  announcements: {
    key: 'announcements',
    table: 'announcements',
    label: 'Announcements',
    singular: 'Announcement',
    icon: 'megaphone',
    description:
      'Notices for visitors: timing changes, venue changes and urgent information. Published notices are cached offline.',
    order: 'published_at.desc',
    searchFields: ['title', 'message'],
    canEdit: true,
    canDelete: 'admin',
    columns: [
      { label: 'Announcement', type: 'primary', key: 'title', sub: 'message' },
      { label: 'Priority', type: 'priority', key: 'priority' },
      { label: 'Published', type: 'datetime', key: 'published_at' },
      { label: 'Expires', type: 'datetime', key: 'expires_at', empty: 'No expiry' },
      { label: 'Status', type: 'status', key: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: ANNOUNCEMENT_STATUS }],
    fields: [
      titleField('Announcement title', 'e.g. DJ set moved to 8 PM', 140),
      {
        name: 'message',
        label: 'Message',
        type: 'textarea',
        rows: 5,
        required: true,
        span: 2,
        max: 1500,
        placeholder: 'What changed, and what should visitors do?',
      },
      {
        name: 'priority',
        label: 'Priority',
        type: 'select',
        options: PRIORITIES,
        required: true,
        default: 'normal',
        help: 'Urgent notices stand out and should be reserved for real problems.',
      },
      {
        name: 'status',
        label: 'Status',
        type: 'select',
        options: ANNOUNCEMENT_STATUS,
        required: true,
        default: 'draft',
      },
      {
        name: 'published_at',
        label: 'Publish time',
        type: 'datetime',
        nullable: true,
        help: 'Set automatically when you publish from the list. Leave blank for drafts.',
      },
      {
        name: 'expires_at',
        label: 'Expires at',
        type: 'datetime',
        nullable: true,
        help: 'Optional. Expired notices are hidden from visitors but kept here.',
      },
    ],
    defaults: () => ({ status: 'draft', priority: 'normal' }),
    quickActions: [
      {
        key: 'publish',
        label: 'Publish',
        icon: 'send',
        when: (r) => r.status !== 'published',
        patch: (r) => ({ status: 'published', published_at: r.published_at || new Date().toISOString() }),
      },
      {
        key: 'unpublish',
        label: 'Unpublish',
        icon: 'eye-off',
        when: (r) => r.status === 'published',
        patch: { status: 'draft' },
        confirm: 'Unpublish this notice? Visitors will no longer see it.',
      },
      {
        key: 'archive',
        label: 'Archive',
        icon: 'rotate-ccw',
        when: (r) => r.status !== 'archived',
        patch: { status: 'archived' },
        confirm: 'Archive this notice? It disappears from the public site.',
      },
    ],
  },

  sponsorships: {
    key: 'sponsorships',
    table: 'sponsorships',
    label: 'Sponsors',
    singular: 'Sponsorship',
    icon: 'gift',
    description:
      'Sponsor names, logos, placements and campaign dates. Payment verification is recorded manually by an admin.',
    order: 'created_at.desc',
    searchFields: ['sponsor_name', 'placement'],
    canEdit: 'admin',
    canDelete: 'admin',
    columns: [
      { label: 'Sponsor', type: 'primary', key: 'sponsor_name', sub: 'placement' },
      { label: 'Placement', type: 'placement', key: 'placement' },
      { label: 'Campaign', type: 'daterange', keys: ['campaign_start', 'campaign_end'] },
      { label: 'Paid', type: 'bool', key: 'is_paid', yes: 'Verified', no: 'Not verified' },
      { label: 'Status', type: 'status', key: 'status' },
    ],
    filters: [{ key: 'status', label: 'Status', options: SPONSORSHIP_STATUS }],
    fields: [
      {
        name: 'sponsor_name',
        label: 'Sponsor name',
        type: 'text',
        required: true,
        max: 120,
        span: 2,
        placeholder: 'e.g. Nova Foods',
      },
      imageField('sponsors', 'Sponsor logo'),
      {
        name: 'placement',
        label: 'Placement',
        type: 'select',
        options: PLACEMENTS,
        required: true,
        default: 'home_strip',
      },
      {
        name: 'status',
        label: 'Campaign status',
        type: 'select',
        options: SPONSORSHIP_STATUS,
        required: true,
        default: 'draft',
        help: 'Only active campaigns are shown publicly.',
      },
      dateField('campaign_start', 'Campaign start'),
      dateField('campaign_end', 'Campaign end'),
      {
        name: 'is_paid',
        label: 'Payment verified by an admin',
        type: 'checkbox',
        span: 2,
        help: 'Illustrative demo pricing only. Never mark this without a real, verified payment.',
      },
    ],
    defaults: () => ({ placement: 'home_strip', status: 'draft', is_paid: false }),
    validate: (values) => {
      if (values.campaign_start && values.campaign_end && values.campaign_end < values.campaign_start) {
        return 'Campaign end must be on or after the campaign start.';
      }
      return null;
    },
    quickActions: [
      {
        key: 'activate',
        label: 'Activate',
        icon: 'check',
        when: (r) => r.status !== 'active',
        patch: { status: 'active' },
      },
      {
        key: 'end',
        label: 'End campaign',
        icon: 'x-circle',
        when: (r) => r.status !== 'ended',
        patch: { status: 'ended' },
        confirm: 'End this campaign? The sponsor will disappear from the public site.',
      },
    ],
  },
};

export const RESOURCE_KEYS = [
  'events',
  'locations',
  'vendors',
  'offers',
  'announcements',
  'sponsorships',
];

/** Singleton app settings, edited from the Settings screen. */
export const CONFIG_FIELDS = [
  {
    name: 'festival_name',
    label: 'Festival name',
    type: 'text',
    required: true,
    max: 120,
    help: 'Shown in the footer and public configuration.',
  },
  {
    name: 'tagline',
    label: 'Tagline',
    type: 'text',
    max: 160,
    placeholder: 'Feel the Flow. Live the Colours.',
  },
  {
    name: 'festival_start',
    label: 'Festival starts',
    type: 'datetime',
    required: true,
    help: 'Drives the public countdown. Use the campus timezone.',
  },
  {
    name: 'festival_end',
    label: 'Festival ends',
    type: 'datetime',
    required: true,
  },
  {
    name: 'timezone',
    label: 'Timezone (IANA)',
    type: 'text',
    required: true,
    placeholder: 'Asia/Kolkata',
    help: 'e.g. Asia/Kolkata. Used to format public dates and times.',
  },
  {
    name: 'logo_url',
    label: 'Festival logo',
    type: 'image',
    folder: 'branding',
    span: 2,
    help: 'Optional. If blank, the built-in ColoursFlux wordmark is used.',
  },
  {
    name: 'contact_email',
    label: 'Contact email',
    type: 'email',
    nullable: true,
    help: 'Only publish an address the organisers have approved.',
  },
  {
    name: 'contact_phone',
    label: 'Contact phone',
    type: 'text',
    nullable: true,
    max: 40,
    help: 'Only publish a number the organisers have approved.',
  },
  {
    name: 'social_links',
    label: 'Social links',
    type: 'social',
    span: 2,
    help: 'One per line: Label | https://link | icon-name. Icon names: instagram, globe, github, link, youtube is not available — use globe.',
  },
  {
    name: 'data_version',
    label: 'Data version',
    type: 'number',
    min: 0,
    step: 1,
    help: 'Increment after a large content refresh so offline clients can detect a newer dataset.',
  },
];

/** Extract YYYY-MM-DD from an ISO timestamp, in local time. */
function configDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Used by the event form date validation. */
export function isValidDateOnly(value) {
  if (!value) return false;
  return Boolean(parseDateOnly(value)) && /^\d{4}-\d{2}-\d{2}$/.test(value);
}
