import { Trash2 } from "lucide-react";
import type { LayoutAsset, TableAsset } from "../types";

const TABLE_COLORS = [
  "#ffffff",
  "#fca5a5",
  "#fdba74",
  "#fde047",
  "#86efac",
  "#7dd3fc",
  "#a5b4fc",
  "#f0abfc",
];

type AssetEditorProps = {
  assets: LayoutAsset[];
  onEdit: () => void;
  onChange: (patch: Partial<LayoutAsset>) => void;
  onDelete: () => void;
};

export function AssetEditor({ assets, onEdit, onChange, onDelete }: AssetEditorProps) {
  if (assets.length === 0) return null;

  const asset = assets[0];
  const selectedTables = assets.filter((item): item is TableAsset => item.type === "table");
  const isMultiTableSelection = assets.length > 1 && selectedTables.length === assets.length;
  const sharedColor = isMultiTableSelection
    ? selectedTables.every((table) => (table.color ?? "#ffffff") === (selectedTables[0].color ?? "#ffffff"))
      ? selectedTables[0].color ?? "#ffffff"
      : null
    : asset.type === "table"
      ? asset.color ?? "#ffffff"
      : null;

  return (
    <aside className="asset-editor">
      <div className="editor-title">
        {isMultiTableSelection ? `${assets.length} Tables` : asset.type === "table" ? "Table" : "Text"}
      </div>
      {isMultiTableSelection ? (
        <>
          <label>
            Label
            <input aria-label="Multiple table labels" value="(multiple)" disabled />
          </label>
          <div className="field-group">
            <div className="field-label">Color</div>
            <div className="color-swatches" role="radiogroup" aria-label="Table color">
              {TABLE_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`color-swatch ${color === sharedColor ? "active" : ""}`}
                  style={{ backgroundColor: color }}
                  aria-label={`Set selected table color ${color}`}
                  aria-checked={color === sharedColor}
                  role="radio"
                  onClick={() => onChange({ color } as Partial<LayoutAsset>)}
                />
              ))}
            </div>
          </div>
        </>
      ) : asset.type === "table" ? (
        <>
          <label>
            Label
            <input
              aria-label="Table label"
              placeholder="Organization name"
              value={asset.label}
              onChange={(event) => onChange({ label: event.target.value } as Partial<LayoutAsset>)}
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
