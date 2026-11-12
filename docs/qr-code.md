# QR code

The QR code is generated **locally in the browser** on `/install.html`. No
request leaves the device, no account is needed and it works offline once the
page is cached.

## Generating one

1. Deploy the site and open the final public URL.
2. Go to **Install → QR code**.
3. Paste the confirmed HTTPS URL, or press **Use current URL**.
4. Press **Generate**.
5. Press **Download PNG**.

The caption shows the exact URL and the module count. Check that the URL is the
public one, not `localhost`, a preview deploy or a temporary host.

The tool rejects non-HTTP(S) URLs and `localhost`/`127.0.0.1` links, because a
phone scanning those will fail.

## What the encoder supports

`assets/js/qr.js` is a small dependency-free encoder:

- Byte mode, error correction level **M** (~15% recovery).
- Versions 1–10, which covers roughly **210–213 characters** for typical URLs.
- URLs longer than that throw a clear error instead of drawing a broken code.
- No tracking parameters are added; the URL you type is the URL encoded.

Keep the link short. Prefer the root site or a short path such as
`https://fest.example.edu/coloursflux/`. Deep links work if they stay under the
limit, but a QR code to the home page is more durable if routes change.

Do **not** put a URL shortener in the QR unless you control it long-term. A dead
shortener breaks every printed poster at once.

## Printing

| Placement | Minimum printed size |
| --- | --- |
| Table tent / badge | 3 × 3 cm |
| A4 / A5 poster | 4 × 4 cm |
| Standee / gate banner | 8 × 8 cm or larger |
| Projector slide | At least 1/5 of the slide width |

Rules of thumb:

- Leave a **quiet zone** of at least 4 modules (the blank border) around the
  code. The downloaded PNG includes a small margin; do not crop it.
- Use **dark modules on a light background**. A dark navy code on white works;
  white on navy is unreliable on cheap scanners.
- Do not place the code over the wave artwork, gradients or a photo.
- Test at arm's length in poor light, not just on your monitor.
- Print one proof before the full run. Laminated glossy prints can glare; matte
  is safer.
- Put the human-readable URL underneath. Some people cannot or will not scan.

## Suggested placements

- Registration desk and pass-collection counter.
- Food court tables (table tents).
- Stage-side screens between acts.
- Stall vendor kits, so vendors can point visitors to the app.
- Posters and standees at the main gate and parking.
- The closing slide of the opening ceremony.

## Verification checklist

- [ ] The URL is the final deployed HTTPS URL.
- [ ] Scanning opens the site on a phone **not** on the campus Wi-Fi.
- [ ] The phone shows the live schedule, not a cached old build.
- [ ] The code scans from the printed proof at the expected distance.
- [ ] The URL still works if you append no query string at all.
- [ ] Someone other than the person who made it has scanned it successfully.

## Changing the destination later

The PNG is static. If the domain or path changes, regenerate and reprint. If you
need a single permanent code that can be re-pointed, host a redirect you
control (for example `https://fest.example.edu/app` → the current deployment)
and encode that short, stable URL.
