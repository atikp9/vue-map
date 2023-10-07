import L from 'leaflet';
// fix issue with extended L.Control.DrawOptions
import 'leaflet-draw';
import { parse, stringify } from 'wellknown';
import { MapLayerType, type MapLayer } from '@/common/types/MapTypes';
import { POLYGON_SHAPE_OPTIONS } from '@/common/constants/mapConstants';

export const parseWktToGeoJson = parse;

export const stringifyGeoJsonToWkt = stringify;

export const parseCollection = (sourceLayer: L.Layer): L.FeatureGroup => {
  const targetGroup = new L.FeatureGroup();

  // Would benefit from https://github.com/Leaflet/Leaflet/issues/4461
  const addNonGroupLayers = (source: L.Layer, target: L.FeatureGroup) => {
    if (source instanceof L.LayerGroup) {
      source.eachLayer((layer) => {
        addNonGroupLayers(layer, target);
      });
    } else {
      target.addLayer(source);
    }
  };

  addNonGroupLayers(sourceLayer, targetGroup);

  return targetGroup;
};

export const getLayerType = (layer: MapLayer): MapLayerType => (
  layer instanceof L.Polygon ? MapLayerType.POLYGON : MapLayerType.MARKER
);

export const addTooltipToElement = (element: Element | null, tooltipText: string): HTMLElement | null => {
  if (!element) {
    return null;
  }

  element.removeAttribute('title');

  const tooltip = document.createElement('div');
  tooltip.className = 'control-tooltip';

  const tooltipContent = document.createElement('div');
  tooltipContent.className = 'control-tooltip-content';
  tooltipContent.textContent = tooltipText;

  const parent = element.parentNode;

  if (parent) {
    parent.insertBefore(tooltip, element);
  }

  tooltip.appendChild(tooltipContent);
  tooltip.appendChild(element);

  return tooltipContent;
};

export const getDrawOptions = (className = ''): L.Control.DrawOptions => ({
  polyline: false,
  rectangle: false,
  circle: false,
  circlemarker: false,
  polygon: {
    icon: new L.DivIcon({
      iconSize: new L.Point(7, 7),
      className: 'polygon-marker',
    }),
    shapeOptions: {
      ...POLYGON_SHAPE_OPTIONS,
      className,
    },
    guidelineDistance: 10,
  },
});
