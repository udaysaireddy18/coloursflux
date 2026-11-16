# Previous-year photos

Drop the archive photos for the home "Last year at Colours" strip here, one
folder per edition:

```
assets/img/gallery/2k26/rangoli.webp
assets/img/gallery/2k26/dance-group.webp
...
assets/img/gallery/2k25/...
```

## How to swap a photo in

The strip lives in `index.html` (section `#moments-title`). Each card is a
`<figure class="memory-card">` with a comment above it. Change the `src` to the
new file and update the `alt` text:

```html
<img src="assets/img/gallery/2k26/rangoli.webp"
     alt="Rangoli being drawn during Colours 2K26"
     width="800" height="600" loading="lazy" decoding="async" />
```

Keep the `width`/`height` attributes (or the 4:3 crop) so the page does not jump
while the photos load.

## Export settings

- **Crop:** 4:3 landscape. The card is `aspect-ratio: 4 / 3` with `object-fit:
  cover`, so off-centre crops just trim the edges.
- **Size:** 800×600 for the card, optionally 1200×900 for retina via `srcset`.
- **Format:** WebP (quality ~78) with a JPG fallback inside `<picture>` if you
  need older browsers.
- **Weight:** aim for 80–150 KB per photo; six cards should stay under ~1 MB.
- **Clean-up:** strip EXIF location data and get consent before publishing
  clear photos of students' faces.

## Offline behaviour

`sw.js` caches same-origin images the first time they are viewed, so the strip
works offline after one visit. There is no need to add every photo to the
precache list in `sw.js`; only add one or two above-the-fold images there if you
want them ready the moment the app is installed.
