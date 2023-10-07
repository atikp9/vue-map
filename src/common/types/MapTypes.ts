import L from 'leaflet';

export type MapLayer = MapPolygon | MapMarker;

export enum MapLayerType {
  MARKER = 'marker',
  POLYGON = 'polygon'
}

export interface MapLeafletEvent extends L.LeafletEvent {
  layerType: MapLayerType;
}

export interface MapDrawCreatedEvent extends MapLeafletEvent {
  layer: MapLayer;
}

export interface MapDrawEditEvent extends MapLeafletEvent {
  layer: MapLayer;
}

export interface MapDrawDeleteStartedEvent extends MapLeafletEvent {
  layer: MapLayer;
}

export interface MapPolygon extends L.Polygon {
  editing: {
    enable: () => void;
    disable: () => void;
  };
}

export interface MapMarker extends L.Marker {
  editing: {
    enable: () => void;
    disable: () => void;
  };
}

export interface MapDrawControlElements {
  button: Element | null;
  tooltipContent: Element | null;
}

export interface MapDrawElementOptions {
  buttonClass: string;
  tooltipTextKey: string;
  tooltipCancelTextKey: string;
  popupClass: string;
}
