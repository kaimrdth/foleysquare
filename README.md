# Foley Square Layout Planner

A small browser-based layout tool for placing labeled 6 ft x 2.5 ft resource fair tables and text annotations on a Google Map of Foley Square.

The layout syncs to one shared Netlify Blobs document through a Netlify Function. Browser `localStorage` is still used as a local cache/fallback.

## Setup

```bash
npm install
cp .env.example .env
```

Add a Google Maps browser key:

```text
VITE_GOOGLE_MAPS_API_KEY=...
```

Optional: add a shared edit token for protected saves:

```text
LAYOUT_EDIT_TOKEN=...
```

Then run:

```bash
npm run dev
```

## Production

```bash
npm run build
```

Deploy `dist/`, or connect this GitHub repository directly to Netlify.

Netlify settings:

- Build command: `npm run build`
- Publish directory: `dist`
- Environment variables:
  - `VITE_GOOGLE_MAPS_API_KEY`
  - `LAYOUT_EDIT_TOKEN` for protected shared saves

In Google Cloud Console, restrict the browser API key to your local and deployed HTTP referrers, enable only the Maps JavaScript API and Geometry library, and set quota or budget controls.

## Shared Persistence

The shared layout API lives at `/api/layout` and is deployed automatically by Netlify from `netlify/functions/layout.ts`.

If `LAYOUT_EDIT_TOKEN` is set in Netlify, users can view the shared layout but must enter the token before saving changes. The token is stored only in that user's browser localStorage.

Netlify Blobs uses last-write-wins behavior for this single shared JSON document, so simultaneous edits can overwrite each other. For one person actively editing while others reference the plan, this is intentionally simple and practical.
