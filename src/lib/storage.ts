import type { LayoutState } from "../types";

const STORAGE_KEY = "foley-resource-fair-layout";

export function loadLayout(defaultLayout: LayoutState): LayoutState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultLayout;

    const parsed = JSON.parse(raw) as LayoutState;
    if (parsed.version !== 1 || !Array.isArray(parsed.assets)) return defaultLayout;

    return {
      version: 1,
      map: parsed.map ?? defaultLayout.map,
      assets: parsed.assets,
      settings: {
        mapNumberFontSize: parsed.settings?.mapNumberFontSize ?? defaultLayout.settings?.mapNumberFontSize ?? 12,
        organizationFontSize:
          parsed.settings?.organizationFontSize ?? defaultLayout.settings?.organizationFontSize ?? 12,
        ...parsed.settings,
        organizationPanelPositions: {
          ...defaultLayout.settings?.organizationPanelPositions,
          ...parsed.settings?.organizationPanelPositions,
        },
      },
    };
  } catch {
    return defaultLayout;
  }
}

export function saveLayout(layout: LayoutState) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layout));
}

export function downloadLayout(layout: LayoutState) {
  const blob = new Blob([JSON.stringify(layout, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "foley-square-layout.json";
  link.click();
  URL.revokeObjectURL(url);
}
