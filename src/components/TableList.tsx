import { useEffect, useRef } from "react";
import type { TableAsset } from "../types";

type TableListProps = {
  tables: TableAsset[];
  selectedIds: string[];
  hoveredId: string | null;
  panelPositions: {
    left?: { x: number; y: number };
    right?: { x: number; y: number };
  };
  panelSizes: {
    left?: { width: number; height: number };
    right?: { width: number; height: number };
  };
  onSelect: (id: string, additive?: boolean) => void;
  onHover: (id: string | null) => void;
  onRename: (id: string, label: string) => void;
  onReorder: (draggedId: string, targetId: string) => void;
  onMovePanel: (panel: "left" | "right", position: { x: number; y: number }) => void;
  onResizePanel: (panel: "left" | "right", size: { width: number; height: number }) => void;
};

export function TableList({
  tables,
  selectedIds,
  hoveredId,
  panelPositions,
  panelSizes,
  onSelect,
  onHover,
  onRename,
  onReorder,
  onMovePanel,
  onResizePanel,
}: TableListProps) {
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const panelRefs = useRef<Record<"left" | "right", HTMLElement | null>>({ left: null, right: null });
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

  function startPanelDrag(event: React.PointerEvent, panel: "left" | "right") {
    const panelElement = panelRefs.current[panel];
    const parentElement = panelElement?.offsetParent as HTMLElement | null;
    if (!panelElement || !parentElement) return;

    event.preventDefault();
    panelElement.setPointerCapture(event.pointerId);

    const panelRect = panelElement.getBoundingClientRect();
    const parentRect = parentElement.getBoundingClientRect();
    const start = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      x: panelRect.left - parentRect.left,
      y: panelRect.top - parentRect.top,
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      const nextX = start.x + moveEvent.clientX - start.pointerX;
      const nextY = start.y + moveEvent.clientY - start.pointerY;
      onMovePanel(panel, {
        x: Math.min(Math.max(8, nextX), parentRect.width - panelRect.width - 8),
        y: Math.min(Math.max(8, nextY), parentRect.height - panelRect.height - 8),
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  function startPanelResize(event: React.PointerEvent, panel: "left" | "right") {
    const panelElement = panelRefs.current[panel];
    const parentElement = panelElement?.offsetParent as HTMLElement | null;
    if (!panelElement || !parentElement) return;

    event.preventDefault();
    event.stopPropagation();
    panelElement.setPointerCapture(event.pointerId);

    const panelRect = panelElement.getBoundingClientRect();
    const parentRect = parentElement.getBoundingClientRect();
    const start = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      width: panelRect.width,
      height: panelRect.height,
    };

    const onPointerMove = (moveEvent: PointerEvent) => {
      onResizePanel(panel, {
        width: Math.min(Math.max(260, start.width + moveEvent.clientX - start.pointerX), parentRect.width - 16),
        height: Math.min(Math.max(180, start.height + moveEvent.clientY - start.pointerY), parentRect.height - 16),
      });
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  return (
    <>
      {columns.map((columnTables, columnIndex) => {
        const offset = columnIndex === 0 ? 0 : splitIndex;
        const panel = columnIndex === 0 ? "left" : "right";
        const position = panelPositions[panel];
        const size = panelSizes[panel];
        return (
          <aside
            key={columnIndex}
            ref={(element) => {
              panelRefs.current[panel] = element;
            }}
            className={`table-list-panel ${panel}`}
            style={{
              ...(position ? { left: position.x, top: position.y, right: "auto" } : {}),
              ...(size ? { width: size.width, height: size.height, maxHeight: "none" } : {}),
            }}
            aria-label={columnIndex === 0 ? "Organizations" : "Organizations continued"}
          >
            <div className="table-list-header" onPointerDown={(event) => startPanelDrag(event, panel)}>
              <span>{columnIndex === 0 ? "Organizations" : "Organizations"}</span>
              <span>
                {tables.length === 0 ? "0" : `${offset + 1}-${offset + columnTables.length}`}
              </span>
            </div>
            <div className="table-list-scroll">{renderRows(columnTables, offset)}</div>
            <button
              type="button"
              className="panel-resize-handle"
              aria-label="Resize organization panel"
              onPointerDown={(event) => startPanelResize(event, panel)}
            />
          </aside>
        );
      })}
    </>
  );
}
