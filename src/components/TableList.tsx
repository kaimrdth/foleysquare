import { useEffect, useRef } from "react";
import type { TableAsset } from "../types";

type TableListProps = {
  tables: TableAsset[];
  selectedIds: string[];
  hoveredId: string | null;
  onSelect: (id: string, additive?: boolean) => void;
  onHover: (id: string | null) => void;
  onRename: (id: string, label: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
};

export function TableList({
  tables,
  selectedIds,
  hoveredId,
  onSelect,
  onHover,
  onRename,
  onReorder,
}: TableListProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const splitIndex = Math.ceil(tables.length / 2);
  const columns = tables.length > 24 ? [tables.slice(0, splitIndex), tables.slice(splitIndex)] : [tables];

  function focusTableName(id: string) {
    window.requestAnimationFrame(() => {
      const input = inputRefs.current[id];
      input?.focus();
      input?.select();
    });
  }

  useEffect(() => {
    const lastSelectedId = selectedIds[selectedIds.length - 1];
    if (!lastSelectedId) return;

    rowRefs.current[lastSelectedId]?.scrollIntoView({
      block: "nearest",
      inline: "nearest",
    });
  }, [selectedIds]);

  function renderRows(columnTables: TableAsset[], offset: number) {
    if (tables.length === 0) {
      return <div className="table-list-empty">No organizations yet</div>;
    }

    return columnTables.map((table, columnIndex) => {
      const index = offset + columnIndex;

      return (
            <div
              ref={(row) => {
                rowRefs.current[table.id] = row;
              }}
              key={table.id}
              className={`table-list-row ${selectedIds.includes(table.id) ? "active" : ""} ${hoveredId === table.id ? "highlighted" : ""}`}
              draggable
              onClick={(event) => onSelect(table.id, event.metaKey || event.ctrlKey)}
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
                  onSelect(table.id, event.metaKey || event.ctrlKey);
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
      );
    });
  }

  return (
    <>
      {columns.map((columnTables, columnIndex) => {
        const offset = columnIndex === 0 ? 0 : splitIndex;
        return (
          <aside
            key={columnIndex}
            className={`table-list-panel ${columnIndex === 0 ? "left" : "right"}`}
            aria-label={columnIndex === 0 ? "Organizations" : "Organizations continued"}
          >
            <div className="table-list-header">
              <span>{columnIndex === 0 ? "Organizations" : "Organizations"}</span>
              <span>
                {tables.length === 0 ? "0" : `${offset + 1}-${offset + columnTables.length}`}
              </span>
            </div>
            <div className="table-list-scroll">{renderRows(columnTables, offset)}</div>
          </aside>
        );
      })}
    </>
  );
}
