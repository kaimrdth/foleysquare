import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "./components/MapCanvas";
import { Toolbar } from "./components/Toolbar";
import { AssetEditor } from "./components/AssetEditor";
import { createId } from "./lib/ids";
import {
  fetchRemoteLayout,
  getEditToken,
  RemoteUnauthorizedError,
  saveRemoteLayout,
  setEditToken,
} from "./lib/remoteLayout";
import { downloadLayout, loadLayout, saveLayout } from "./lib/storage";
import type { LatLngLiteral, LayoutAsset, LayoutState } from "./types";

export const DEFAULT_VIEW = {
  center: { lat: 40.71478, lng: -74.00276 },
  zoom: 20,
  heading: 0,
  tilt: 0,
};

const DEFAULT_LAYOUT: LayoutState = {
  version: 1,
  map: DEFAULT_VIEW,
  assets: [],
};

function nextTableLabel(assets: LayoutAsset[]) {
  return `Table ${assets.filter((asset) => asset.type === "table").length + 1}`;
}

function offsetPosition(position: LatLngLiteral) {
  const center = new google.maps.LatLng(position.lat, position.lng);
  const offset = google.maps.geometry.spherical.computeOffset(center, 1.25, 135);
  return { lat: offset.lat(), lng: offset.lng() };
}

export default function App() {
  const [layout, setLayout] = useState<LayoutState>(() => loadLayout(DEFAULT_LAYOUT));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<
    "loading" | "saved" | "syncing" | "local" | "error" | "unauthorized"
  >("loading");
  const mapRef = useRef<google.maps.Map | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const saveTimerRef = useRef<number | null>(null);
  const remoteReadyRef = useRef(false);

  const selectedAsset = useMemo(
    () => layout.assets.find((asset) => asset.id === selectedId) ?? null,
    [layout.assets, selectedId],
  );

  const persistLayout = useCallback((next: LayoutState) => {
    saveLayout(next);

    if (!remoteReadyRef.current) return;

    setSyncStatus("syncing");

    if (saveTimerRef.current) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        await saveRemoteLayout(next);
        setSyncStatus("saved");
      } catch (error) {
        if (error instanceof RemoteUnauthorizedError) {
          const entered = prompt("Enter the shared layout edit token to save changes.");
          if (entered === null) {
            setSyncStatus("unauthorized");
            return;
          }

          setEditToken(entered);
          try {
            await saveRemoteLayout(next);
            setSyncStatus("saved");
          } catch {
            setSyncStatus("unauthorized");
          }
          return;
        }

        setSyncStatus("local");
      }
    }, 500);
  }, []);

  const updateLayout = useCallback((updater: (current: LayoutState) => LayoutState) => {
    setLayout((current) => {
      const next = updater(current);
      persistLayout(next);
      return next;
    });
  }, [persistLayout]);

  const updateAsset = useCallback(
    (id: string, patch: Partial<LayoutAsset>) => {
      updateLayout((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          asset.id === id ? ({ ...asset, ...patch } as LayoutAsset) : asset,
        ),
      }));
    },
    [updateLayout],
  );

  const deleteSelected = useCallback(() => {
    if (!selectedId) return;
    updateLayout((current) => ({
      ...current,
      assets: current.assets.filter((asset) => asset.id !== selectedId),
    }));
    setSelectedId(null);
    setEditingId(null);
  }, [selectedId, updateLayout]);

  const addTable = useCallback(() => {
    const center = mapRef.current?.getCenter()?.toJSON() ?? layout.map.center;
    const asset: LayoutAsset = {
      id: createId("table"),
      type: "table",
      position: center,
      widthFt: 6,
      depthFt: 2.5,
      rotation: 0,
      label: nextTableLabel(layout.assets),
      color: "#ffffff",
    };

    updateLayout((current) => ({ ...current, assets: [...current.assets, asset] }));
    setSelectedId(asset.id);
    setEditingId(asset.id);
  }, [layout.assets, layout.map.center, updateLayout]);

  const addText = useCallback(() => {
    const center = mapRef.current?.getCenter()?.toJSON() ?? layout.map.center;
    const asset: LayoutAsset = {
      id: createId("text"),
      type: "text",
      position: center,
      text: "New Label",
    };

    updateLayout((current) => ({ ...current, assets: [...current.assets, asset] }));
    setSelectedId(asset.id);
    setEditingId(asset.id);
  }, [layout.map.center, updateLayout]);

  const duplicateSelected = useCallback(() => {
    if (!selectedAsset) return;
    const copy: LayoutAsset =
      selectedAsset.type === "table"
        ? {
            ...selectedAsset,
            id: createId("table"),
            position: offsetPosition(selectedAsset.position),
            label: `${selectedAsset.label} copy`,
          }
        : {
            ...selectedAsset,
            id: createId("text"),
            position: offsetPosition(selectedAsset.position),
            text: `${selectedAsset.text} copy`,
          };

    updateLayout((current) => ({ ...current, assets: [...current.assets, copy] }));
    setSelectedId(copy.id);
  }, [selectedAsset, updateLayout]);

  const resetView = useCallback(() => {
    mapRef.current?.setOptions(DEFAULT_VIEW);
  }, []);

  const clearLayout = useCallback(() => {
    if (!confirm("Clear the entire layout?")) return;
    updateLayout((current) => ({ ...current, assets: [] }));
    setSelectedId(null);
    setEditingId(null);
  }, [updateLayout]);

  const exportLayout = useCallback(() => {
    downloadLayout(layout);
  }, [layout]);

  const importLayout = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(String(reader.result)) as LayoutState;
        if (imported.version !== 1 || !Array.isArray(imported.assets)) {
          throw new Error("Invalid layout file");
        }
        setLayout(imported);
        persistLayout(imported);
        setSelectedId(null);
        setEditingId(null);
      } catch {
        alert("This file is not a valid Foley Square layout JSON file.");
      }
    };
    reader.readAsText(file);
  }, [persistLayout]);

  const setSharedEditToken = useCallback(() => {
    const entered = prompt("Shared layout edit token", getEditToken());
    if (entered === null) return;
    setEditToken(entered);
    setSyncStatus(entered.trim() ? "saved" : "local");
  }, []);

  const handleMapChanged = useCallback(
    (map: LayoutState["map"]) => {
      updateLayout((current) => ({ ...current, map }));
    },
    [updateLayout],
  );

  useEffect(() => {
    let disposed = false;

    fetchRemoteLayout()
      .then((remoteLayout) => {
        if (disposed) return;
        if (remoteLayout) {
          setLayout(remoteLayout);
          saveLayout(remoteLayout);
        }
        remoteReadyRef.current = true;
        setSyncStatus("saved");
      })
      .catch(() => {
        if (!disposed) {
          remoteReadyRef.current = true;
          setSyncStatus("local");
        }
      });

    return () => {
      disposed = true;
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if (isTyping) return;

      if ((event.key === "Delete" || event.key === "Backspace") && selectedId) {
        event.preventDefault();
        deleteSelected();
      }

      if (event.key === "Escape") {
        setSelectedId(null);
        setEditingId(null);
      }

      if (event.key === "Enter" && selectedId) {
        event.preventDefault();
        setEditingId(selectedId);
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "d" && selectedId) {
        event.preventDefault();
        duplicateSelected();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelected, duplicateSelected, selectedId]);

  return (
    <div className="app-shell">
      <Toolbar
        tableCount={layout.assets.filter((asset) => asset.type === "table").length}
        syncStatus={syncStatus}
        onAddTable={addTable}
        onAddText={addText}
        onResetView={resetView}
        onClearLayout={clearLayout}
        onExport={exportLayout}
        onImport={() => fileInputRef.current?.click()}
        onSetEditToken={setSharedEditToken}
      />
      <input
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept="application/json,.json"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) importLayout(file);
          event.currentTarget.value = "";
        }}
      />
      <main className="map-area">
        <MapCanvas
          layout={layout}
          selectedId={selectedId}
          editingId={editingId}
          onMapReady={(map) => {
            mapRef.current = map;
          }}
          onMapChanged={handleMapChanged}
          onSelect={setSelectedId}
          onEdit={setEditingId}
          onUpdateAsset={updateAsset}
          onFinishEdit={() => setEditingId(null)}
        />
        <AssetEditor
          asset={selectedAsset}
          onEdit={() => selectedId && setEditingId(selectedId)}
          onChange={(patch) => selectedId && updateAsset(selectedId, patch)}
          onDelete={deleteSelected}
        />
      </main>
    </div>
  );
}
