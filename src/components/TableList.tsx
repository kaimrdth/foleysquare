import type { TableAsset } from "../types";

type TableListProps = {
  tables: TableAsset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
};

export function TableList({ tables, selectedId, onSelect, onHover }: TableListProps) {
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
            <button
              key={table.id}
              type="button"
              className={`table-list-row ${table.id === selectedId ? "active" : ""}`}
              onClick={() => onSelect(table.id)}
              onMouseEnter={() => onHover(table.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(table.id)}
              onBlur={() => onHover(null)}
            >
              <span className="table-list-number">{index + 1}</span>
              <span
                className="table-list-swatch"
                style={{ backgroundColor: table.color ?? "#ffffff" }}
                aria-hidden="true"
              />
              <span className="table-list-label">{table.label || `Table ${index + 1}`}</span>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}
