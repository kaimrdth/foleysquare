import type { TableAsset } from "../types";

type TableListProps = {
  tables: TableAsset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onRename: (id: string, label: string) => void;
};

export function TableList({ tables, selectedId, onSelect, onHover, onRename }: TableListProps) {
  return (
    <aside className="table-list-panel" aria-label="Tables">
      <div className="table-list-header">
        <span>Tables</span>
        <span>{tables.length}</span>
      </div>
      <div className="table-list-scroll">
        {tables.length === 0 ? (
          <div className="table-list-empty">No tables yet</div>
        ) : (
          tables.map((table, index) => (
            <div
              key={table.id}
              className={`table-list-row ${table.id === selectedId ? "active" : ""}`}
              onClick={() => onSelect(table.id)}
              onMouseEnter={() => onHover(table.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(table.id)}
              onBlur={() => onHover(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(table.id);
                }
              }}
            >
              <span className="table-list-number">{index + 1}</span>
              <span
                className="table-list-swatch"
                style={{ backgroundColor: table.color ?? "#ffffff" }}
                aria-hidden="true"
              />
              <input
                className="table-list-input"
                value={table.label}
                aria-label={`Table ${index + 1} name`}
                placeholder={`Table ${index + 1}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(table.id);
                }}
                onFocus={() => {
                  onHover(table.id);
                  onSelect(table.id);
                }}
                onChange={(event) => onRename(table.id, event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Escape") {
                    event.currentTarget.blur();
                  }
                }}
              />
            </div>
          ))
        )}
      </div>
    </aside>
  );
}
