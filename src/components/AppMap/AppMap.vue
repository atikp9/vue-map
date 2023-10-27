<template>
  <div role="application" class="app-map" />
</template>

<script lang="ts">
import { defineComponent } from 'vue';
import 'leaflet.fullscreen';
import 'leaflet-draw';
import 'leaflet.markercluster';
import type { GeoJSON } from 'geojson';
import {
  parseCollection,
} from '@/common/utils/MapUtils';
import {
  ATTRIBUTION_OPTIONS,
  ControlPosition,
  MAP_OPTIONS,
  POLYGON_SHAPE_OPTIONS,
  TILE_LAYER_OPTIONS,
  ZOOM_OPTIONS,
  MAP_READ_ONLY_OPTIONS,
  MAP_FULLSCREEN_OPTIONS
} from '@/common/constants/mapConstants';
import L, {
  type TileLayerOptions,
  type MapOptions,
} from 'leaflet';
import {
  type MapDrawControlElements,
  MapLayerType,
  type MapLayer,
} from '@/common/types/MapTypes';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';

interface IMapData {
  map: L.Map | null;
  editingLayer: MapLayer | null;
  drawnItems: L.FeatureGroup;
  searchTempItem: L.FeatureGroup;
  url: string;
  tileLayerOptions: TileLayerOptions;
  drawControlElementsMap: { [k in MapLayerType]: MapDrawControlElements };
  isPolygonDrawingActive: boolean;
  currentSearchString: string;
  layerGroup: L.LayerGroup;
  showPopup: boolean
}

const OSM_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
const INTERACTIVE_SHAPE_CLASS_NAME = 'interactive-shape';
const ATTRIBUTION_TEXT = "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ";

export default defineComponent({
  props: {
    value: {
      // TODO reinit map after change value
      // eslint-disable-next-line no-undef
      type: Object as () => GeoJSON.GeometryCollection | null,
      default: null,
    },
    selecteLayer: {
      // TODO reinit map after change value
      // eslint-disable-next-line no-undef
      type: Object as () => GeoJSON.GeometryCollection | null,
      default: null,
    },
    hasDraw: {
      type: Boolean,
      default: false,
    },
    isMarkerClustering: {
      type: Boolean,
      default: false,
    },
    isShapesInteractive: {
      type: Boolean,
      default: true,
    },
    isStatic: {
      type: Boolean,
      default: false,
    },
    isFullScreen: {
      type: Boolean,
      default: false
    },
  },
  data(): IMapData {
    return {
      map: null,
      editingLayer: null,
      drawnItems: new L.FeatureGroup(),
      searchTempItem: new L.FeatureGroup(),
      layerGroup: new L.LayerGroup(),
      url: OSM_URL,
      tileLayerOptions: {
        ...TILE_LAYER_OPTIONS,
        attribution: ATTRIBUTION_TEXT,
      },
      drawControlElementsMap: {
        [MapLayerType.MARKER]: {
          button: null,
          tooltipContent: null,
        },
        [MapLayerType.POLYGON]: {
          button: null,
          tooltipContent: null,
        },
      },
      isPolygonDrawingActive: false,
      currentSearchString: '',
      showPopup: true
    };
  },
  mounted() {
    this.$nextTick(this.initMap);
  },
  methods: {
    initMap() {
      if (!this.$el) {
        return;
      }

      const mapOptions: MapOptions = {
        ...MAP_OPTIONS,
        ...(this.isStatic ? MAP_READ_ONLY_OPTIONS : {}),
        ...(this.isFullScreen ? MAP_FULLSCREEN_OPTIONS : {})
      };

      this.map = L.map(this.$el as HTMLElement, mapOptions);
      this.setBaseControls();

      if (this.value) {
        this.drawnItems = L.geoJSON(this.value,
          {
            pmIgnore: true,
            onEachFeature: this.bindPopup
          });
        const bounds = this.drawnItems.getBounds();
        this.map.fitBounds(bounds);
        this.drawnItems = parseCollection(this.drawnItems as L.FeatureGroup);
      } else {
        this.setDefaultView();
      }

      if (this.hasDraw) {
        this.initDraw();
      }

      // set styles for existed shapes
      this.drawnItems.setStyle({
        ...POLYGON_SHAPE_OPTIONS,
        className: this.isShapesInteractive ? INTERACTIVE_SHAPE_CLASS_NAME : '',
      });

      this.map.addLayer(this.isMarkerClustering ? this.getClusteredShapes() : this.drawnItems as L.FeatureGroup);
    },
    setBaseControls() {
      if (!this.map) {
        return;
      }

      const attribution = L.control.attribution(ATTRIBUTION_OPTIONS);
      const osm: L.TileLayer = new L.TileLayer(OSM_URL, this.tileLayerOptions);

      if (!this.isStatic) {
        const zoom = L.control.zoom(ZOOM_OPTIONS).addTo(this.map as any);
        zoom.addTo(this.map as L.Map);
      }

      attribution.addTo(this.map as L.Map);
      this.map.addLayer(osm);
      osm.on("load", () => {
        this.$emit('is-map-loaded', true);
      })
    },
    setDefaultView() {
      if (!this.map) {
        return;
      }

      const defaultCoordinates: L.LatLngExpression = [52, 8];
      const defaultZoom = 5;

      this.map.setView(defaultCoordinates, defaultZoom);
    },
    getClusteredShapes() {
      const shapes = L.markerClusterGroup({
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        iconCreateFunction(cluster: L.MarkerCluster) {
          return L.divIcon({
            className: 'leaflet-marker-cluster',
            iconSize: L.point(57, 57),
            html: `${cluster.getChildCount()}`,
          });
        },
      });

      this.drawnItems.getLayers().forEach((layer) => {
        shapes.addLayer(layer);
      });

      return shapes;
    },
    initDraw() {
      if (!this.map) {
        return;
      }

      this.getDrawToolbar();
      this.addHookHandlers();
    },
    bindPopup(feature: GeoJSON.Feature, layer: L.Layer) {
      layer.on('click', () => {
        //by default bind popup on each layer
        if (this.showPopup) {
          layer
            .bindPopup('<h1> Tower id:' + feature.properties?.id + '</h1><p>Flaeche:&nbsp' + feature.properties?.Flaeche + '</p>')
            .openPopup();
        } else {
          this.disableGeoJSONInteraction
        }
      })
    },
    getDrawToolbar() {
      if (!this.map) {
        return;
      }

      this.map.pm.addControls({
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
    },
    disableGeoJSONInteraction(e: L.LeafletEvent) {
      (e as any).originalEvent.stopPropagation(); // Prevent event from propagating
      (e as any).originalEvent.preventDefault(); // Prevent the default event behavior
    },
    addHookHandlers() {
      if (!this.map) {
        return;
      }

      this.map.on("pm:drawstart", ({ workingLayer}) => {
        //disable popup on polygon edit mode
        this.showPopup = false;
      })

      this.map.on("pm:remove", ({ layer }) => {
        this.layerGroup.removeLayer(layer);
        this.emitDrawnItemsGeolocation();
      })

      //this event called when a shape cut toolbar option selected
      this.map.on("pm:cut", ({ layer, originalLayer }) => {

        this.layerGroup.removeLayer(originalLayer);
        this.layerGroup.addLayer(layer);
        this.emitDrawnItemsGeolocation();
      })


      //this event called when a shape is drawn/finished
      this.map.on("pm:create", ({ layer }) => {
        this.showPopup = true; //set this flag to true after editing compelted
        this.layerGroup.addLayer(layer);

        layer.on('pm:dragdisable', ({ layer }) => {
          this.layerGroup.addLayer(layer);
          this.emitDrawnItemsGeolocation();
        });

        layer.on('pm:disable', ({ layer }) => {
          this.layerGroup.addLayer(layer);
          this.emitDrawnItemsGeolocation();
        })

        this.emitDrawnItemsGeolocation();
        //set draw layer to front to show popup
        this.drawnItems.bringToFront();
      })

      //on toolbar click hide popup
      this.map.on("pm:buttonclick", () => {
        this.showPopup = false;
        this.drawnItems.bringToBack();
      })

      //on action completion show popup
      this.map.on("pm:actionclick", () => {
        this.showPopup = true;
        this.drawnItems.bringToFront();
      })
    },

    emitDrawnItemsGeolocation() {
      const layerItems = this.layerGroup.getLayers() as MapLayer[];
      const layerGeometries = this.getGeometries(layerItems);

      const geolocation: GeoJSON.GeometryCollection = {
        type: 'GeometryCollection',
        geometries: layerGeometries,
      };

      console.log('emitted');
      this.$emit('input', geolocation?.geometries?.length ? geolocation : null);
    },
    getGeometries(geometry: MapLayer[]) {
      return geometry.map((layer) => layer.toGeoJSON().geometry)
    },
  },
});
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