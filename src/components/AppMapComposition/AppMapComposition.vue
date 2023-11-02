<template>
  <div role="application" class="app-map" ref="leaflet" />
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick, watch, type PropType } from 'vue'
import 'leaflet.fullscreen'
import { parseCollection } from '@/common/utils/MapUtils'
import {
  ATTRIBUTION_OPTIONS,
  ControlPosition,
  MAP_OPTIONS,
  POLYGON_SHAPE_OPTIONS,
  TILE_LAYER_OPTIONS,
  MAP_FULLSCREEN_OPTIONS,
  POLYGON_FILL_OPTIONS
} from '@/common/constants/mapConstants'
import L, { type MapOptions } from 'leaflet'
import { type MapLayer } from '@/common/types/MapTypes'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import type { Feature, GeoJsonProperties, Geometry } from 'geojson'

const OSM_URL =
  'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
const INTERACTIVE_SHAPE_CLASS_NAME = 'interactive-shape'
const ATTRIBUTION_TEXT = 'Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ'

const props = defineProps({
  value: {
    type: Object as () => GeoJSON.FeatureCollection | null,
    default: null
  },
  hasDraw: {
    type: Boolean,
    default: false
  },
  isShapesInteractive: {
    type: Boolean,
    default: true
  },
  isFullScreen: {
    type: Boolean,
    default: false
  },
  drawnItemsArray: {
    type: Array as PropType<Number[]>,
    default: () => []
  }
})

const emits = defineEmits(['input', 'is-edit-map', 'is-map-loaded'])

const showPopup = ref(false)
const tileLayerOptions = {
  ...TILE_LAYER_OPTIONS,
  attribution: ATTRIBUTION_TEXT
}
const layerGroup = ref(new L.LayerGroup());
const drawnItems = ref(new L.FeatureGroup());
const highlightedLayer = ref(new L.FeatureGroup());
const map = ref<L.Map | null>(null)
const leaflet = ref<HTMLElement | null>(null);

const initMap = () => {
  if (!leaflet.value) {
    return;
  }

  const mapOptions: MapOptions = {
    ...MAP_OPTIONS,
    ...(props.isFullScreen ? MAP_FULLSCREEN_OPTIONS : {})
  };

  map.value = L.map(leaflet.value, mapOptions);
  setBaseControls();

  if (props.value) {
    drawnItems.value = L.geoJSON(props.value,
      {
        pmIgnore: true,
        onEachFeature: bindPopup
      });
    const bounds = drawnItems.value.getBounds();
    map.value.fitBounds(bounds);
    drawnItems.value = parseCollection(drawnItems.value as L.FeatureGroup);
  } else {
    setDefaultView();
  }

  if (props.hasDraw) {
    initDraw();
  }

  // set styles for existed shapes
  drawnItems.value.setStyle({
    ...POLYGON_SHAPE_OPTIONS,
    className: props.isShapesInteractive ? INTERACTIVE_SHAPE_CLASS_NAME : '',
  });

  map.value.addLayer(drawnItems.value as L.FeatureGroup);
  //set color while editing polygon
  map.value.pm.enableDraw('Polygon', {
    pathOptions: {
      color: POLYGON_FILL_OPTIONS.color
    },
    templineStyle: {
      color: POLYGON_FILL_OPTIONS.color
    },
    hintlineStyle: {
      color: POLYGON_FILL_OPTIONS.color
    }
  })
  map.value.pm.disableDraw();
}

const setBaseControls = () => {
  if (!map.value) {
    return;
  }

  const attribution = L.control.attribution(ATTRIBUTION_OPTIONS);
  const osm: L.TileLayer = new L.TileLayer(OSM_URL, tileLayerOptions);

  attribution.addTo(map.value as L.Map);
  map.value.addLayer(osm);
  osm.on("load", () => {
    emits('is-map-loaded', true);
  })
}

const setDefaultView = () => {
  if (!map.value) {
    return;
  }

  const defaultCoordinates: L.LatLngExpression = [52, 8];
  const defaultZoom = 5;

  map.value.setView(defaultCoordinates, defaultZoom);
}

const bindPopup = (feature: GeoJSON.Feature, layer: L.Layer) => {
  layer.on('click', () => {
    //by default bind popup on each layer
    if (showPopup.value) {
      layer
        .bindPopup('<h1> Tower id:' + feature.properties?.id + '</h1><p>Flaeche:&nbsp' + feature.properties?.Flaeche + '</p>')
        .openPopup();
    } else {
      disableGeoJSONInteraction
    }
  })
}

const disableGeoJSONInteraction = (e: L.LeafletEvent) => {
  (e as any).originalEvent.stopPropagation(); // Prevent event from propagating
  (e as any).originalEvent.preventDefault(); // Prevent the default event behavior
}

const initDraw = () => {
  if (!map.value) {
    return;
  }

  getDrawToolbar();
  addHookHandlers();
}

//Show Draw toolbar on map & initialize options
const getDrawToolbar = () => {
  map.value?.pm.addControls({
    position: ControlPosition.BOTTOMRIGHT,
    drawCircleMarker: false,
    rotateMode: false,
    drawCircle: false,
    drawRectangle: false,
    drawMarker: false,
    cutPolygon: false,
    drawPolyline: false,
    drawText: false
  })
}

const addHookHandlers = () => {
  if (!map.value) {
    return;
  }

  map.value.on("pm:drawstart", () => {
    //disable popup on polygon edit mode
    showPopup.value = false;
  })

  map.value.on("pm:remove", ({ layer }) => {
    layerGroup.value.removeLayer(layer);
    emitDrawnItemsGeolocation();
  })

  //this event called when a shape cut toolbar option selected
  map.value.on("pm:cut", ({ layer, originalLayer }) => {

    layerGroup.value.removeLayer(originalLayer);
    layerGroup.value.addLayer(layer);
    emitDrawnItemsGeolocation();
  })

  //this event called when a shape is drawn/finished
  map.value.on("pm:create", ({ layer }) => {
    showPopup.value = true; //set this flag to true after editing compelted
    layerGroup.value.addLayer(layer);

    layer.on('pm:dragdisable', ({ layer }) => {
      layerGroup.value.addLayer(layer);
      emitDrawnItemsGeolocation();
    });

    layer.on('pm:disable', ({ layer }) => {
      layerGroup.value.addLayer(layer);
      emitDrawnItemsGeolocation();
    })

    emitDrawnItemsGeolocation();
    //set draw layer to front to show popup
    drawnItems.value.bringToFront();
  })

  //on toolbar click hide popup
  map.value.on("pm:buttonclick", () => {
    showPopup.value = false;
    drawnItems.value.bringToBack();
  })

  //on action completion show popup
  map.value.on("pm:actionclick", () => {
    showPopup.value = true;
    drawnItems.value.bringToFront();
  })
}

const emitDrawnItemsGeolocation = () => {
  const layerItems = layerGroup.value.getLayers() as MapLayer[];
  const layerGeometries = getGeometries(layerItems);

  const geolocation: GeoJSON.GeometryCollection = {
    type: 'GeometryCollection',
    geometries: layerGeometries,
  };

  emits('input', geolocation?.geometries?.length ? geolocation : null);
}

const getGeometries = (geometry: MapLayer[]) => {
  return geometry.map((layer) => layer.toGeoJSON().geometry)
}

watch(() => props.drawnItemsArray, (val) => {
  if (val) {
    highlightedLayer.value.remove()
    
    const drawnLayer = props.value?.features.filter(item => val.includes(item?.properties?.id));
    
    const polygonFeature: GeoJSON.FeatureCollection = {
      "type": "FeatureCollection",
      features: drawnLayer as Array<Feature<Geometry,GeoJsonProperties>>
    }

    const customPolygonStyle = POLYGON_FILL_OPTIONS;

    highlightedLayer.value = L.geoJSON(polygonFeature, {
      style: customPolygonStyle,
      pmIgnore: true,
    })

    highlightedLayer.value.addTo(map.value as L.Map)
    highlightedLayer.value.bringToBack();
  } else {
    highlightedLayer.value.remove();
  }
})

onMounted(() => {
  nextTick(() => initMap());
})
</script>

<style lang="scss">
// @import '@/styles/utilities/all';
$border-radius: 4px;
$icons-path: '@/assets/icons' !default;

@mixin absolute-y-center {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

@mixin absolute-x-center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

@mixin absolute-xy-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

@mixin absolute-fit {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
}

@mixin background-cover {
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
}

@mixin background-contain {
  background-repeat: no-repeat;
  background-position: center center;
  background-size: contain;
}

// svg-transform-loader is required for this mixin
@mixin background-svg-icon-fill($icon-name, $fill-color) {
  $base-color: str-slice(inspect($fill-color), 2);

  background-image: unquote('url("#{$icons-path}/#{$icon-name}.svg?fill=%23#{$base-color}")');
}

.app-map {
  position: relative;
  height: 512px;
  width: 640px;

  /* zoom */
  .leaflet-bar a {
    width: 36px;
    height: 36px;
    line-height: 36px;
    position: relative;

    &::before {
      content: '';
      width: 20px;
      height: 20px;

      @include absolute-xy-center;
    }
  }

  .leaflet-control-zoom-in {
    border-top-left-radius: $border-radius;
    border-top-right-radius: $border-radius;

    &:hover {
      background-color: #ffffff;

      &::before {
        @include background-svg-icon-fill('plus', #ffcc00);
      }
    }

    &::before {
      @include background-svg-icon-fill('plus', #000000);

      background-size: contain;
      transition: background-image 0.2s;
    }
  }

  .leaflet-control-zoom-out {
    border-bottom-left-radius: $border-radius;
    border-bottom-right-radius: $border-radius;

    &:hover {
      background-color: #ffffff;

      &::before {
        @include background-svg-icon-fill('minus', #ffcc00);
      }
    }

    &::before {
      @include background-svg-icon-fill('minus', #000000);

      background-size: contain;
      transition: background-image 0.2s;
    }
  }

  .leaflet-control-zoom-fullscreen {
    border-bottom-left-radius: $border-radius;
    border-bottom-right-radius: $border-radius;

    &:hover {
      background-color: #ffffff;

      &::before {
        @include background-svg-icon-fill('fullscreen', #ffcc00);
      }
    }

    &::before {
      @include background-svg-icon-fill('fullscreen', #000000);

      background-size: contain;
      transition: background-image 0.2s;
    }
  }
}
</style>
