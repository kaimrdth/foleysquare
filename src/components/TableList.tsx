import { useRef } from "react";
import type { TableAsset } from "../types";

type TableListProps = {
  tables: TableAsset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onRename: (id: string, label: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
};

export function TableList({
  tables,
  selectedId,
  onSelect,
  onHover,
  onRename,
  onReorder,
}: TableListProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function focusTableName(id: string) {
    window.requestAnimationFrame(() => {
      const input = inputRefs.current[id];
      input?.focus();
      input?.select();
    });
  }

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
              draggable
              onClick={() => onSelect(table.id)}
              onMouseEnter={() => onHover(table.id)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(table.id)}
              onBlur={() => onHover(null)}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", table.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const draggedId = event.dataTransfer.getData("text/plain");
                if (draggedId && draggedId !== table.id) {
                  onReorder(draggedId, table.id);
                }
              }}
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
                ref={(input) => {
                  inputRefs.current[table.id] = input;
                }}
                className="table-list-input"
                value={table.label}
                style={{ "--label-length": Math.max(table.label.length, 12) } as React.CSSProperties}
                aria-label={`Table ${index + 1} name`}
                placeholder={`Table ${index + 1}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(table.id);
                }}
                onMouseDown={(event) => event.stopPropagation()}
                draggable={false}
                onFocus={() => {
                  onHover(table.id);
                  onSelect(table.id);
                }}
                onChange={(event) => onRename(table.id, event.target.value)}
                onKeyDown={(event) => {
                  event.stopPropagation();
                  if (event.key === "Enter") {
                    event.preventDefault();
                    const nextTable = tables[index + 1];
                    if (nextTable) {
                      onSelect(nextTable.id);
                      onHover(nextTable.id);
                      focusTableName(nextTable.id);
                    } else {
                      event.currentTarget.blur();
                    }
                  }
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
