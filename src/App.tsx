import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapCanvas } from "./components/MapCanvas";
import { Toolbar } from "./components/Toolbar";
import { AssetEditor } from "./components/AssetEditor";
import { TableList } from "./components/TableList";
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [hoveredTableId, setHoveredTableId] = useState<string | null>(null);
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
  const selectedAssets = useMemo(
    () => layout.assets.filter((asset) => selectedIds.includes(asset.id)),
    [layout.assets, selectedIds],
  );
  const tables = useMemo(
    () => layout.assets.filter((asset) => asset.type === "table"),
    [layout.assets],
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

  const updateSelectedAssets = useCallback(
    (patch: Partial<LayoutAsset>) => {
      if (selectedIds.length === 0) return;
      updateLayout((current) => ({
        ...current,
        assets: current.assets.map((asset) =>
          selectedIds.includes(asset.id) && asset.type === "table"
            ? ({ ...asset, ...patch } as LayoutAsset)
            : asset,
        ),
      }));
    },
    [selectedIds, updateLayout],
  );

  const selectAsset = useCallback((id: string | null, additive = false) => {
    if (!id) {
      setSelectedId(null);
      setSelectedIds([]);
      setEditingId(null);
      return;
    }

    setEditingId(null);
    setSelectedId(id);
    setSelectedIds((current) => {
      if (!additive) return [id];
      if (current.includes(id)) {
        const next = current.filter((selected) => selected !== id);
        setSelectedId(next[next.length - 1] ?? null);
        return next;
      }
      return [...current, id];
    });
  }, []);

  const reorderTables = useCallback(
    (draggedId: string, targetId: string) => {
      updateLayout((current) => {
        const currentTables = current.assets.filter((asset) => asset.type === "table");
        const fromIndex = currentTables.findIndex((table) => table.id === draggedId);
        const toIndex = currentTables.findIndex((table) => table.id === targetId);

        if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return current;

        const reorderedTables = [...currentTables];
        const [draggedTable] = reorderedTables.splice(fromIndex, 1);
        reorderedTables.splice(toIndex, 0, draggedTable);

        let tableIndex = 0;
        return {
          ...current,
          assets: current.assets.map((asset) =>
            asset.type === "table" ? reorderedTables[tableIndex++] : asset,
          ),
        };
      });
    },
    [updateLayout],
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    updateLayout((current) => ({
      ...current,
      assets: current.assets.filter((asset) => !selectedIds.includes(asset.id)),
    }));
    setSelectedId(null);
    setSelectedIds([]);
    setEditingId(null);
  }, [selectedIds, updateLayout]);

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
    setSelectedIds([asset.id]);
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
    setSelectedIds([asset.id]);
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
    setSelectedIds([copy.id]);
  }, [selectedAsset, updateLayout]);

  const resetView = useCallback(() => {
    mapRef.current?.setOptions(DEFAULT_VIEW);
  }, []);

  const clearLayout = useCallback(() => {
    if (!confirm("Clear the entire layout?")) return;
    updateLayout((current) => ({ ...current, assets: [] }));
    setSelectedId(null);
    setSelectedIds([]);
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
        setSelectedIds([]);
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
        setSelectedIds([]);
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
        tableCount={tables.length}
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
        <TableList
          tables={tables}
          selectedIds={selectedIds}
          onSelect={selectAsset}
          onHover={setHoveredTableId}
          onRename={(id, label) => updateAsset(id, { label } as Partial<LayoutAsset>)}
          onReorder={reorderTables}
        />
        <MapCanvas
          layout={layout}
          selectedId={selectedId}
          selectedIds={selectedIds}
          editingId={editingId}
          hoveredTableId={hoveredTableId}
          onMapReady={(map) => {
            mapRef.current = map;
          }}
          onMapChanged={handleMapChanged}
          onSelect={selectAsset}
          onEdit={setEditingId}
          onUpdateAsset={updateAsset}
          onFinishEdit={() => setEditingId(null)}
        />
        <AssetEditor
          assets={selectedAssets}
          onEdit={() => selectedId && setEditingId(selectedId)}
          onChange={(patch) => {
            if (selectedIds.length > 1) {
              updateSelectedAssets(patch);
            } else if (selectedId) {
              updateAsset(selectedId, patch);
            }
          }}
          onDelete={deleteSelected}
        />
      </main>
    </div>
  );
}
