import { Cloud, Download, Eraser, FileUp, KeyRound, MapPinned, Plus, RotateCcw, Type } from "lucide-react";

type ToolbarProps = {
  tableCount: number;
  syncStatus: "loading" | "saved" | "syncing" | "local" | "error" | "unauthorized";
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
        <h1>Foley Square Layout</h1>
      </div>
      <div className="toolbar-actions">
        <button type="button" className="primary-action" onClick={onAddTable}>
          <Plus size={16} aria-hidden="true" />
          Add Table
        </button>
        <button type="button" onClick={onAddText}>
          <Type size={16} aria-hidden="true" />
          Add Text
        </button>
        <span className="table-count">Tables: {tableCount}</span>
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
