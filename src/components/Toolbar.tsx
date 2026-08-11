import { Cloud, Download, Eraser, Eye, FileUp, KeyRound, MapPinned, Plus, RotateCcw, Type } from "lucide-react";
import type { LayoutSettings } from "../types";

type ToolbarProps = {
  tableCount: number;
  syncStatus: "loading" | "saved" | "syncing" | "local" | "error" | "unauthorized";
  settings: LayoutSettings;
  onSettingsChange: (patch: Partial<LayoutSettings>) => void;
  onAddTable: () => void;
  onAddText: () => void;
  onResetView: () => void;
  onClearLayout: () => void;
  onExport: () => void;
  onImport: () => void;
  onSetEditToken: () => void;
};

export function Toolbar({
  tableCount,
  syncStatus,
  settings,
  onSettingsChange,
  onAddTable,
  onAddText,
  onResetView,
  onClearLayout,
  onExport,
  onImport,
  onSetEditToken,
}: ToolbarProps) {
  const syncLabel = {
    loading: "Loading shared layout",
    saved: "Shared saved",
    syncing: "Saving shared",
    local: "Local only",
    error: "Sync error",
    unauthorized: "Edit token needed",
  }[syncStatus];

  return (
    <header className="toolbar">
      <div className="brand">
        <MapPinned size={19} aria-hidden="true" />
        <h1>MJO Community Resource Fair</h1>
      </div>
      <div className="toolbar-actions">
        <button type="button" className="primary-action" onClick={onAddTable}>
          <Plus size={16} aria-hidden="true" />
          Add Table
        </button>
        <a className="toolbar-link" href="/public" target="_blank" rel="noreferrer">
          <Eye size={16} aria-hidden="true" />
          Public Map
        </a>
        <button type="button" onClick={onAddText}>
          <Type size={16} aria-hidden="true" />
          Add Text
        </button>
        <span className="table-count">Organizations: {tableCount}</span>
        <div className="display-controls" aria-label="Display size controls">
          <label>
            # size
            <input
              type="number"
              min="8"
              max="32"
              value={settings.mapNumberFontSize}
              onChange={(event) =>
                onSettingsChange({ mapNumberFontSize: Number(event.target.value) || 12 })
              }
            />
          </label>
          <label>
            List size
            <input
              type="number"
              min="9"
              max="24"
              value={settings.organizationFontSize}
              onChange={(event) =>
                onSettingsChange({ organizationFontSize: Number(event.target.value) || 12 })
              }
            />
          </label>
        </div>
        <span className={`sync-status ${syncStatus}`}>
          <Cloud size={15} aria-hidden="true" />
          {syncLabel}
        </span>
        <button type="button" className="icon-button" onClick={onSetEditToken} aria-label="Set edit token">
          <KeyRound size={16} aria-hidden="true" />
        </button>
        <button type="button" onClick={onResetView}>
          <RotateCcw size={16} aria-hidden="true" />
          Reset View
        </button>
        <button type="button" className="icon-button" onClick={onExport} aria-label="Export layout">
          <Download size={16} aria-hidden="true" />
        </button>
        <button type="button" className="icon-button" onClick={onImport} aria-label="Import layout">
          <FileUp size={16} aria-hidden="true" />
        </button>
        <button type="button" className="danger-action" onClick={onClearLayout}>
          <Eraser size={16} aria-hidden="true" />
          Clear Layout
        </button>
      </div>
    </header>
  );
}
