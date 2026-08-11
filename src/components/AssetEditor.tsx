import { Trash2 } from "lucide-react";
import type { LayoutAsset } from "../types";

type AssetEditorProps = {
  asset: LayoutAsset | null;
  onEdit: () => void;
  onChange: (patch: Partial<LayoutAsset>) => void;
  onDelete: () => void;
};

export function AssetEditor({ asset, onEdit, onChange, onDelete }: AssetEditorProps) {
  if (!asset) return null;

  return (
    <aside className="asset-editor">
      <div className="editor-title">{asset.type === "table" ? "Table" : "Text"}</div>
      {asset.type === "table" ? (
        <>
          <label>
            Label
            <input
              value={asset.label}
              onChange={(event) => onChange({ label: event.target.value } as Partial<LayoutAsset>)}
              onFocus={onEdit}
            />
          </label>
          <label>
            Rotation
            <input
              type="number"
              min="0"
              max="359"
              value={asset.rotation}
              onChange={(event) =>
                onChange({ rotation: Number(event.target.value) || 0 } as Partial<LayoutAsset>)
              }
            />
          </label>
        </>
      ) : (
        <label>
          Text
          <input
            value={asset.text}
            onChange={(event) => onChange({ text: event.target.value } as Partial<LayoutAsset>)}
            onFocus={onEdit}
          />
        </label>
      )}
      <button type="button" className="delete-button" onClick={onDelete}>
        <Trash2 size={15} aria-hidden="true" />
        Delete
      </button>
    </aside>
  );
}
