import { Trash2 } from "lucide-react";
import type { LayoutAsset } from "../types";

const TABLE_COLORS = [
  "#ffffff",
  "#fee2e2",
  "#ffedd5",
  "#fef3c7",
  "#dcfce7",
  "#dbeafe",
  "#ede9fe",
  "#fce7f3",
];

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
              aria-label="Table label"
              placeholder="Organization name"
              value={asset.label}
              onChange={(event) => onChange({ label: event.target.value } as Partial<LayoutAsset>)}
              onFocus={onEdit}
            />
          </label>
          <div className="field-group">
            <div className="field-label">Color</div>
            <div className="color-swatches" role="radiogroup" aria-label="Table color">
              {TABLE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch ${color === (asset.color ?? "#ffffff") ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Set table color ${color}`}
                  aria-checked={color === (asset.color ?? "#ffffff")}
                  role="radio"
                  onClick={() => onChange({ color } as Partial<LayoutAsset>)}
                />
              ))}
            </div>
          </div>
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
