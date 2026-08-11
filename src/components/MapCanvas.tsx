import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { loadGoogleMaps } from "../lib/googleMaps";
import {
  normalizeDegrees,
  TABLE_DEPTH_METERS,
  TABLE_WIDTH_METERS,
} from "../lib/tableGeometry";
import type { LatLngLiteral, LayoutAsset, LayoutState } from "../types";

type MapCanvasProps = {
  layout: LayoutState;
  selectedId: string | null;
  selectedIds: string[];
  editingId: string | null;
  hoveredTableId: string | null;
  readOnly?: boolean;
  onMapReady: (map: google.maps.Map) => void;
  onMapChanged: (map: LayoutState["map"]) => void;
  onSelect: (id: string | null, additive?: boolean, anchor?: { x: number; y: number }) => void;
  onHoverTable: (id: string | null) => void;
  onEdit: (id: string | null) => void;
  onUpdateAsset: (id: string, patch: Partial<LayoutAsset>) => void;
  onFinishEdit: () => void;
};

type OverlayState = {
  container: HTMLDivElement;
  projection: google.maps.MapCanvasProjection;
};

type DragState = {
  id: string;
  startPointer: { x: number; y: number };
  startPixel: google.maps.Point;
};

type RotateState = {
  id: string;
};

type AssetOverlayInstance = google.maps.OverlayView & {
  container: HTMLDivElement;
};

function pointFromLatLng(projection: google.maps.MapCanvasProjection, position: LatLngLiteral) {
  return projection.fromLatLngToDivPixel(new google.maps.LatLng(position.lat, position.lng))!;
}

function latLngFromPoint(projection: google.maps.MapCanvasProjection, point: google.maps.Point) {
  const latLng = projection.fromDivPixelToLatLng(point)!;
  return { lat: latLng.lat(), lng: latLng.lng() };
}

function destinationPixel(
  projection: google.maps.MapCanvasProjection,
  position: LatLngLiteral,
  meters: number,
  heading: number,
) {
  const origin = new google.maps.LatLng(position.lat, position.lng);
  const destination = google.maps.geometry.spherical.computeOffset(origin, meters, heading);
  return projection.fromLatLngToDivPixel(destination)!;
}

function tablePixelSize(
  projection: google.maps.MapCanvasProjection,
  position: LatLngLiteral,
  rotation: number,
) {
  const center = pointFromLatLng(projection, position);
  const widthEnd = destinationPixel(projection, position, TABLE_WIDTH_METERS, rotation + 90);
  const depthEnd = destinationPixel(projection, position, TABLE_DEPTH_METERS, rotation);

  return {
    width: Math.hypot(widthEnd.x - center.x, widthEnd.y - center.y),
    height: Math.hypot(depthEnd.x - center.x, depthEnd.y - center.y),
  };
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function MapCanvas({
  layout,
  selectedId,
  selectedIds,
  editingId,
  hoveredTableId,
  readOnly = false,
  onMapReady,
  onMapChanged,
  onSelect,
  onHoverTable,
  onEdit,
  onUpdateAsset,
  onFinishEdit,
}: MapCanvasProps) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [overlayState, setOverlayState] = useState<OverlayState | null>(null);
  const [drawTick, setDrawTick] = useState(0);
  const dragState = useRef<DragState | null>(null);
  const rotateState = useRef<RotateState | null>(null);
  const layoutRef = useLatest(layout);
  const selectedIdRef = useLatest(selectedId);
  const onMapReadyRef = useLatest(onMapReady);
  const onMapChangedRef = useLatest(onMapChanged);
  const onUpdateAssetRef = useLatest(onUpdateAsset);
  const onSelectRef = useLatest(onSelect);

  useEffect(() => {
    let disposed = false;
    let overlay: AssetOverlayInstance | null = null;
    let listeners: google.maps.MapsEventListener[] = [];

    loadGoogleMaps()
      .then(() => {
        if (disposed || !mapElementRef.current) return;

        class AssetOverlay extends google.maps.OverlayView {
          container = document.createElement("div");
          onDraw: (projection: google.maps.MapCanvasProjection) => void;

          constructor(onDraw: (projection: google.maps.MapCanvasProjection) => void) {
            super();
            this.onDraw = onDraw;
            this.container.className = "asset-overlay-layer";
          }

          onAdd() {
            this.getPanes()?.overlayMouseTarget.appendChild(this.container);
          }

          draw() {
            const projection = this.getProjection();
            if (projection) this.onDraw(projection);
          }

          onRemove() {
            this.container.remove();
          }
        }

        const map = new google.maps.Map(mapElementRef.current, {
          center: layoutRef.current.map.center,
          zoom: layoutRef.current.map.zoom,
          heading: layoutRef.current.map.heading ?? 0,
          tilt: layoutRef.current.map.tilt ?? 0,
          mapTypeId: "roadmap",
          styles: [
            {
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "transit",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
          clickableIcons: false,
          gestureHandling: "greedy",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        mapRef.current = map;
        onMapReadyRef.current(map);

        overlay = new AssetOverlay((projection) => {
          setOverlayState({ container: overlay!.container, projection });
          setDrawTick((tick) => tick + 1);
        });
        overlay.setMap(map);

        listeners = [
          map.addListener("click", () => onSelectRef.current(null)),
          map.addListener("idle", () => {
            const center = map.getCenter()?.toJSON() ?? layoutRef.current.map.center;
            onMapChangedRef.current({
              center,
              zoom: map.getZoom() ?? layoutRef.current.map.zoom,
              heading: map.getHeading() ?? 0,
              tilt: map.getTilt() ?? 0,
            });
          }),
        ];
      })
      .catch((error: Error) => setLoadError(error.message));

    return () => {
      disposed = true;
      listeners.forEach((listener) => listener.remove());
      overlay?.setMap(null);
    };
  }, [layoutRef, onMapChangedRef, onMapReadyRef, onSelectRef]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      if (!overlayState) return;

      if (dragState.current) {
        const drag = dragState.current;
        const nextPoint = new google.maps.Point(
          drag.startPixel.x + event.clientX - drag.startPointer.x,
          drag.startPixel.y + event.clientY - drag.startPointer.y,
        );
        onUpdateAssetRef.current(drag.id, {
          position: latLngFromPoint(overlayState.projection, nextPoint),
        } as Partial<LayoutAsset>);
      }

      if (rotateState.current) {
        const asset = layoutRef.current.assets.find((item) => item.id === rotateState.current?.id);
        if (!asset || asset.type !== "table") return;

        const center = pointFromLatLng(overlayState.projection, asset.position);
        const bounds = overlayState.container.getBoundingClientRect();
        const pointer = {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        };
        const angle = (Math.atan2(pointer.x - center.x, -(pointer.y - center.y)) * 180) / Math.PI;
        onUpdateAssetRef.current(asset.id, {
          rotation: normalizeDegrees(angle),
        } as Partial<LayoutAsset>);
      }
    };

    const onPointerUp = () => {
      dragState.current = null;
      rotateState.current = null;
      document.body.classList.remove("is-map-asset-dragging");
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [layoutRef, onUpdateAssetRef, overlayState]);

  const startDrag = useCallback(
    (event: React.PointerEvent, asset: LayoutAsset) => {
      if (!overlayState) return;

      event.preventDefault();
      event.stopPropagation();
      onSelect(asset.id, event.metaKey || event.ctrlKey, { x: event.clientX, y: event.clientY });
      if (readOnly) return;
      onEdit(null);

      const point = pointFromLatLng(overlayState.projection, asset.position);
      dragState.current = {
        id: asset.id,
        startPointer: { x: event.clientX, y: event.clientY },
        startPixel: point,
      };
      document.body.classList.add("is-map-asset-dragging");
    },
    [onEdit, onSelect, overlayState],
  );

  const startRotate = useCallback(
    (event: React.PointerEvent, asset: LayoutAsset) => {
      if (asset.type !== "table") return;

      event.preventDefault();
      event.stopPropagation();
      onSelect(asset.id);
      rotateState.current = { id: asset.id };
      document.body.classList.add("is-map-asset-dragging");
    },
    [onSelect],
  );

  const renderedAssets = useMemo(() => {
    if (!overlayState) return null;

    return layout.assets.map((asset) => {
      const point = pointFromLatLng(overlayState.projection, asset.position);
      const selected = selectedIds.includes(asset.id);
      const editing = asset.id === editingId;
      const highlighted = asset.id === hoveredTableId;

      if (asset.type === "table") {
        const size = tablePixelSize(overlayState.projection, asset.position, asset.rotation);
        const tableNumber =
          layout.assets.filter((item) => item.type === "table").findIndex((table) => table.id === asset.id) + 1;

        return (
          <div
            key={`${asset.id}-${drawTick}`}
            className={`map-asset table-asset ${selected ? "selected" : ""} ${highlighted ? "highlighted" : ""}`}
            style={{
              left: point.x,
              top: point.y,
              width: size.width,
              height: size.height,
              backgroundColor: asset.color ?? "#ffffff",
              "--counter-rotation": `${-asset.rotation}deg`,
              transform: `translate(-50%, -50%) rotate(${asset.rotation}deg)`,
            } as React.CSSProperties}
            onPointerDown={(event) => startDrag(event, asset)}
            onMouseEnter={() => onHoverTable(asset.id)}
            onMouseLeave={() => onHoverTable(null)}
            onClick={(event) => {
              event.stopPropagation();
            }}
            onDoubleClick={(event) => {
              event.stopPropagation();
              if (readOnly) return;
              onEdit(asset.id);
            }}
            role="button"
            tabIndex={0}
            aria-label={`Table ${asset.label}`}
          >
            <span className="table-number-badge">{tableNumber}</span>
            {selected && !readOnly && (
              <button
                type="button"
                className="rotation-handle"
                aria-label="Rotate table"
                onPointerDown={(event) => startRotate(event, asset)}
              />
            )}
            {editing ? (
              <InlineEditor
                value={asset.label}
                className="table-input"
                onCommit={(label) => {
                  onUpdateAsset(asset.id, { label } as Partial<LayoutAsset>);
                  onFinishEdit();
                }}
                onCancel={onFinishEdit}
              />
            ) : null}
            {!editing && <span className="table-hover-label">{asset.label}</span>}
          </div>
        );
      }

      return (
        <div
          key={`${asset.id}-${drawTick}`}
          className={`map-asset text-asset ${selected ? "selected" : ""}`}
          style={{ left: point.x, top: point.y }}
          onPointerDown={(event) => startDrag(event, asset)}
          onClick={(event) => {
            event.stopPropagation();
          }}
          onDoubleClick={(event) => {
            event.stopPropagation();
            if (readOnly) return;
            onEdit(asset.id);
          }}
          role="button"
          tabIndex={0}
          aria-label={`Text ${asset.text}`}
        >
          {editing ? (
            <InlineEditor
              value={asset.text}
              className="text-input"
              onCommit={(text) => {
                onUpdateAsset(asset.id, { text } as Partial<LayoutAsset>);
                onFinishEdit();
              }}
              onCancel={onFinishEdit}
            />
          ) : (
            asset.text
          )}
        </div>
      );
    });
  }, [
    drawTick,
    editingId,
    layout.assets,
    onEdit,
    onFinishEdit,
    onHoverTable,
    onSelect,
    onUpdateAsset,
    overlayState,
    hoveredTableId,
    selectedId,
    selectedIds,
    startDrag,
    startRotate,
  ]);

  return (
    <section className="map-shell" aria-label="Foley Square map layout editor">
      <div ref={mapElementRef} className="map-canvas" />
      {!import.meta.env.VITE_GOOGLE_MAPS_API_KEY && (
        <div className="map-message">
          Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to <code>.env</code> to load Google Maps.
        </div>
      )}
      {loadError && <div className="map-message">{loadError}</div>}
      {overlayState && createPortal(renderedAssets, overlayState.container)}
    </section>
  );
}

function InlineEditor({
  value,
  className,
  onCommit,
  onCancel,
}: {
  value: string;
  className: string;
  onCommit: (value: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <input
      ref={inputRef}
      className={className}
      value={draft}
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => onCommit(draft.trim() || value)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          onCommit(draft.trim() || value);
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancel();
        }
      }}
    />
  );
}
