<template>
  <div
    role="application"
    class="app-map"
  />
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
    type LeafletKeyboardEvent,
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
        layer.on('click',() => {
          //by default bind popup on each layer
          if(this.showPopup) {
            layer
            .bindPopup('<h1> Tower id:'+feature.properties?.id+'</h1><p>Flaeche:&nbsp'+feature.properties?.Flaeche+'</p>')
            .openPopup();
          }else {
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
          drawCircle: true,
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
        
        this.map.on("pm:drawstart",() => {
          //disable popup on polygon edit mode
          this.showPopup = false;
        })
        
        this.map.on("pm:remove",({ layer }) => {
          //this.showPopup = false
          //this.drawnItems.bringToBack();// bring this layer to back to facilate polygon selection
          //this.finishLayerEditing();
          this.layerGroup.removeLayer(layer);
          this.emitDrawnItemsGeolocation();
        })
        
        //this event called when a shape cut toolbar option selected
        this.map.on("pm:cut",({ layer, originalLayer }) => {
          //this.showPopup = false;
          //this.drawnItems.bringToBack();// bring this layer to back to facilate polygon selection
          //this.finishLayerEditing();
          this.layerGroup.removeLayer(originalLayer);
          this.layerGroup.addLayer(layer);
          this.emitDrawnItemsGeolocation();
        })

        // this.map.on('pm:edit',() =>{
        //   this.showPopup = true;
        // })

        //this event called when a shape is drawn/finished
        this.map.on("pm:create",({ layer }) => {
          this.showPopup = true; //set this flag to true after editing compelted
          this.layerGroup.addLayer(layer);
          this.emitDrawnItemsGeolocation();
          //set draw layer to front to show popup
          this.drawnItems.bringToFront();
        })

        //on toolbar click hide popup
        this.map.on("pm:buttonclick", () =>{
          this.showPopup = false;
          console.log('fired click', this.showPopup)
          this.drawnItems.bringToBack();
        })
        
        //on action completion show popup
        this.map.on("pm:actionclick", () =>{
          this.showPopup = true;
          this.drawnItems.bringToFront();
        })

        this.map.on('keydown', (e: L.LeafletEvent) => {
          const { originalEvent } = (e as LeafletKeyboardEvent);

          if (originalEvent.key === 'Escape') {
            //this.finishLayerEditing();
          }

          if (originalEvent.key === 'Enter' && this.isPolygonDrawingActive) {
            this.completePolygon();
          }
        });

        this.map.on('click', () => {
          //this.finishLayerEditing();
        });
      },
      emitDrawnItemsGeolocation() {
        const layerItems = this.layerGroup.getLayers() as MapLayer[];
        const layerGeometries = this.getGeometries(layerItems);
       
        const geolocation: GeoJSON.GeometryCollection = {
          type: 'GeometryCollection',
          geometries: layerGeometries,
        };

       this.$emit('input', geolocation?.geometries?.length ? geolocation : null);
      },
      getGeometries(geometry: MapLayer[]) {
        return geometry.map((layer) => layer.toGeoJSON().geometry)
      },
      setDrawButtonTooltipText(layerType: MapLayerType, text: string) {
        const { tooltipContent } = this.drawControlElementsMap[layerType];

        if (tooltipContent) {
          tooltipContent.textContent = text;
        }
      },
      completePolygon() {
        // here we need to access internal toolbar prop of Leaflet global object which is not described in interface
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        // eslint-disable-next-line no-underscore-dangle
        const polygonHandler = L.toolbar._toolbars.draw._activeMode.handler;
        polygonHandler.completeShape();
      },
    },
  });
</script>

<style lang="scss">
  @import '@/styles/utilities/all';
  
  .app-map {
    position: relative;
    height: 512px;
    width: 640px;

    /* toolbar */
    .leaflet-pane {
      z-index: 1;
    }

    /* attribution */
    .leaflet-control-attribution {
      @include apply-styles($text-caption);

      color: $color-grey-darker;
    }

    .leaflet-control-attribution a {
      text-decoration: none;
    }

    /* size and position */
    .leaflet-bar {
      box-sizing: content-box;
      border: 0;
      border-radius: $border-radius;
    }

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

    .leaflet-draw-actions {
      display: none !important;
    }
   
    .leaflet-bottom .leaflet-control-zoom {
      margin-bottom: spacing-unit(3);
    }

    .leaflet-right .leaflet-control {
      margin-right: spacing-unit(3);
    }

    /* zoom */
    .leaflet-control-zoom-in {
      border-top-left-radius: $border-radius;
      border-top-right-radius: $border-radius;

      &:hover {
        background-color: $color-white;

        &::before {
          @include background-svg-icon-fill('plus', $color-primary);
        }
      }

      &::before {
        @include background-svg-icon-fill('plus', $color-grey-darker);

        background-size: contain;
        transition: background-image $transition-duration;
      }

      @include high-contrast {
        &::before {
          @include background-svg-icon-fill('plus', $color-white);
        }

        &:hover {
          background-color: $color-white;

          &::before {
            @include background-svg-icon-fill('plus', $color-grey);
          }
        }

        &:focus {
          outline: 2px solid $color-primary;
        }
      }
    }

    .leaflet-control-zoom-out {
      border-bottom-left-radius: $border-radius;
      border-bottom-right-radius: $border-radius;

      &:hover {
        background-color: $color-white;

        &::before {
          @include background-svg-icon-fill('minus', $color-primary);
        }
      }

      &::before {
        @include background-svg-icon-fill('minus', $color-grey-darker);

        background-size: contain;
        transition: background-image $transition-duration;
      }

      @include high-contrast {
        &::before {
          @include background-svg-icon-fill('minus', $color-white);
        }

        &:hover {
          background-color: $color-white;

          &::before {
            @include background-svg-icon-fill('minus', $color-grey);
          }
        }

        &:focus {
          outline: 2px solid $color-primary;
        }
      }
    }

    .leaflet-control-zoom-fullscreen {
      border-bottom-left-radius: $border-radius;
      border-bottom-right-radius: $border-radius;

      &:hover {
        background-color: $color-white;

        &::before {
          @include background-svg-icon-fill('fullscreen', $color-primary);
        }
      }

      &::before {
        @include background-svg-icon-fill('fullscreen', $color-grey-darker);

        background-size: contain;
        transition: background-image $transition-duration;
      }

      @include high-contrast {
        &::before {
          @include background-svg-icon-fill('fullscreen', $color-white);
        }

        &:hover {
          background-color: $color-white;

          &::before {
            @include background-svg-icon-fill('fullscreen', $color-grey);
          }
        }

        &:focus {
          outline: 2px solid $color-primary;
        }
      }
    }
    .leaflet-draw-tooltip {
      display: none;
    }

    // fix animation
    .leaflet-zoom-anim {
      .leaflet-zoom-animated {
        transition: transform $transition-duration;
      }
    }

    /* polygon points */
    @mixin polygon-marker {
      border-radius: 50%;
      background-color: $color-white;
      border: 1px solid $color-blue;
      opacity: 1 !important;
    }

    .polygon-marker {
      @include polygon-marker;
    }

    .leaflet-mouse-marker,
    .leaflet-editing-icon {
      @include polygon-marker;

      height: 8px !important;
      width: 8px !important;
      margin-top: -4px !important;
      margin-left: -4px !important;
    }

    .leaflet-mouse-marker {
      border-width: 3px;
      height: 10px !important;
      width: 10px !important;
      margin-top: -5px !important;
      margin-left: -5px !important;

      + .polygon-marker {
        border: unset;
        outline: 5px solid $color-primary;
        padding: spacing-unit(1);
      }
    }

    .leaflet-draw-guide-dash {
      border-radius: 50%;
      height: 2px;
      width: 2px;
      opacity: 1;
    }

    /* polygon */
    .leaflet-interactive {
      transition: fill-opacity $transition-duration;
      cursor: pointer;

      &.interactive-shape {
        &:hover {
          fill-opacity: 0.5;
        }
      }
    }

    /* marker */
    .map-marker {
      @include background-svg-icon-fill('point', $color-primary);

      transition: opacity $transition-duration, background-image $transition-duration;
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      width: auto !important;
      min-width: 25px;

      &.interactive-shape {
        cursor: pointer;

        &:hover {
          @include background-svg-icon-fill('point', $color-primary-dark);
        }
      }

      @include high-contrast {
        @include background-svg-icon-fill('point', $color-grey-darker);

        &.interactive-shape:hover {
          @include background-svg-icon-fill('point', $color-grey-dark);
        }
      }
    }

    .leaflet-edit-marker-selected {
      outline: 1px dashed $color-blue !important;
      border: 0;
      background-color: rgba($color-blue, 0.5);
      border-radius: 0;

      // to avoid marker jumping in edit mode
      margin-left: -13px !important;
      margin-top: -42px !important;
    }

    /* clustering */
    .leaflet-marker-cluster {
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      border: 3px solid $color-blue;
      background-color: rgba($color-white, 0.6);
      transition: background-color $transition-duration;
      cursor: pointer;

      &:hover {
        background-color: $color-white;
      }
    }

    .leaflet-cluster-anim {
      .leaflet-marker-icon,
      .leaflet-marker-shadow {
        transition: transform 0.3s ease-out, opacity 0.3s ease-in, opacity 0.3s ease-out;
      }
    }

    .leaflet-cluster-spider-leg {
      transition: stroke-dashoffset 0.3s ease-out, stroke-opacity 0.3s ease-in;
    }
  }
</style>