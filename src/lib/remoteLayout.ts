import type { LayoutState } from "../types";

const API_PATH = "/api/layout";
const EDIT_TOKEN_KEY = "foley-resource-fair-edit-token";

export class RemoteUnauthorizedError extends Error {
  constructor() {
    super("Invalid edit token");
  }
}

export function getEditToken() {
  return window.localStorage.getItem(EDIT_TOKEN_KEY) ?? "";
}

export function setEditToken(token: string) {
  if (token.trim()) {
    window.localStorage.setItem(EDIT_TOKEN_KEY, token.trim());
  } else {
    window.localStorage.removeItem(EDIT_TOKEN_KEY);
  }
}

export async function fetchRemoteLayout() {
  const response = await fetch(API_PATH, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Unable to load shared layout");

  const data = (await response.json()) as { layout?: LayoutState | null };
  return data.layout ?? null;
}

export async function saveRemoteLayout(layout: LayoutState) {
  const token = getEditToken();
  const response = await fetch(API_PATH, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(layout),
  });

  if (response.status === 401) {
    throw new RemoteUnauthorizedError();
  }

  if (!response.ok) {
    throw new Error("Unable to save shared layout");
  }
}
