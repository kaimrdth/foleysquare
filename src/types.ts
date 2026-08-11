export type LatLngLiteral = {
  lat: number;
  lng: number;
};

export type TableAsset = {
  id: string;
  type: "table";
  position: LatLngLiteral;
  widthFt: 6;
  depthFt: 2.5;
  rotation: number;
  label: string;
  color?: string;
};

export type TextAsset = {
  id: string;
  type: "text";
  position: LatLngLiteral;
  text: string;
};

export type LayoutAsset = TableAsset | TextAsset;

export type LayoutSettings = {
  mapNumberFontSize: number;
  organizationFontSize: number;
  organizationPanelPositions?: {
    left?: { x: number; y: number };
    right?: { x: number; y: number };
  };
  organizationPanelSizes?: {
    left?: { width: number; height: number };
    right?: { width: number; height: number };
  };
};

export type LayoutState = {
  version: 1;
  assets: LayoutAsset[];
  map: {
    center: LatLngLiteral;
    zoom: number;
    heading?: number;
    tilt?: number;
  };
  settings?: LayoutSettings;
};
