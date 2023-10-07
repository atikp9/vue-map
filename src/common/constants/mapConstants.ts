import {
  Control, type MapOptions, type PathOptions, type TileLayerOptions,
} from 'leaflet';
import { type MapDrawElementOptions, MapLayerType } from '@/common/types/MapTypes';

export enum ControlPosition {
  TOPLEFT = 'topleft',
  TOPRIGHT = 'topright',
  BOTTOMLEFT = 'bottomleft',
  BOTTOMRIGHT = 'bottomright'
}

export const MAP_OPTIONS: MapOptions = {
  zoomControl: false,
  attributionControl: false,
};

export const MAP_READ_ONLY_OPTIONS: MapOptions = {
  scrollWheelZoom: false,
  dragging: false,
  tap: false,
};

export const ATTRIBUTION_OPTIONS: Control.AttributionOptions = {
  prefix: '',
  position: ControlPosition.BOTTOMLEFT,
};

export const ZOOM_OPTIONS: Control.ZoomOptions = {
  position: ControlPosition.BOTTOMRIGHT,
  zoomInText: '',
  zoomOutText: '',
};

export const TILE_LAYER_OPTIONS: TileLayerOptions = {
  minZoom: 2,
  maxZoom: 19,
  crossOrigin: 'anonymous',
};

export const POLYGON_SHAPE_OPTIONS: PathOptions = {
  color: '#00A0DE',
  weight: 1,
  opacity: 1,
  dashArray: '6 3',
  fillOpacity: 0.25,
};

export const DRAW_ELEMENT_OPTIONS: {[k in MapLayerType]: MapDrawElementOptions} = {
  [MapLayerType.MARKER]: {
    buttonClass: 'leaflet-draw-draw-marker',
    tooltipTextKey: 'markerTooltip',
    tooltipCancelTextKey: 'cancelMarker',
    popupClass: 'is-marker',
  },
  [MapLayerType.POLYGON]: {
    buttonClass: 'leaflet-draw-draw-polygon',
    tooltipTextKey: 'polygonTooltip',
    tooltipCancelTextKey: 'cancelOutline',
    popupClass: 'is-polygon',
  },
};
