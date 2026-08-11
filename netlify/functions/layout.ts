import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

const STORE_NAME = "foley-layouts";
const LAYOUT_KEY = "current.json";
const MAX_LAYOUT_BYTES = 1_000_000;

function json(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: {
      "Cache-Control": "no-store",
      ...(init?.headers ?? {}),
    },
  });
}

function isAuthorized(request: Request) {
  const editToken = process.env.LAYOUT_EDIT_TOKEN;
  if (!editToken) return true;

  return request.headers.get("authorization") === `Bearer ${editToken}`;
}

export default async function handler(request: Request) {
  const store = getStore(STORE_NAME);

  if (request.method === "GET") {
    const saved = await store.get(LAYOUT_KEY, { consistency: "strong", type: "text" });
    return json({ layout: saved ? JSON.parse(saved) : null });
  }

  if (request.method === "PUT") {
    if (!isAuthorized(request)) {
      return json({ error: "Invalid edit token" }, { status: 401 });
    }

    const body = await request.text();
    if (body.length > MAX_LAYOUT_BYTES) {
      return json({ error: "Layout is too large" }, { status: 413 });
    }

    let layout: unknown;
    try {
      layout = JSON.parse(body);
    } catch {
      return json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (
      !layout ||
      typeof layout !== "object" ||
      (layout as { version?: unknown }).version !== 1 ||
      !Array.isArray((layout as { assets?: unknown }).assets)
    ) {
      return json({ error: "Invalid layout" }, { status: 400 });
    }

    await store.set(LAYOUT_KEY, JSON.stringify(layout));
    return json({ ok: true, savedAt: new Date().toISOString() });
  }

  return json({ error: "Method not allowed" }, { status: 405 });
}

export const config: Config = {
  path: "/api/layout",
};
