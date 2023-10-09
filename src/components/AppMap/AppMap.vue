<template>
  <div
    role="application"
    class="app-map"
  />
</template>

<script lang="ts">
  import { defineComponent } from 'vue';
  import L, {
    type LeafletKeyboardEvent,
    type TileLayerOptions,
    type MapOptions,
  } from 'leaflet';
  import 'leaflet-draw';
  import 'leaflet.markercluster';
  import type { GeoJSON } from 'geojson';
  import {
    addTooltipToElement,
    getDrawOptions,
    getLayerType,
    parseCollection,
  } from '@/common/utils/MapUtils';
  import {
    ATTRIBUTION_OPTIONS,
    ControlPosition,
    DRAW_ELEMENT_OPTIONS,
    MAP_OPTIONS,
    POLYGON_SHAPE_OPTIONS,
    TILE_LAYER_OPTIONS,
    ZOOM_OPTIONS,
    MAP_READ_ONLY_OPTIONS,
  } from '@/common/constants/mapConstants';
  import {
    type MapDrawControlElements,
    type MapDrawCreatedEvent, type MapDrawDeleteStartedEvent, type MapDrawEditEvent,
    type MapLeafletEvent,
    MapLayerType,
    type MapLayer,
  } from '@/common/types/MapTypes';
  import 'leaflet/dist/leaflet.css';
  import 'leaflet-draw/dist/leaflet.draw.css';

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
  }

  enum PopupAction {
    EDIT = 'EDIT',
    DELETE = 'DELETE'
  }

  const OSM_URL = 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png';
  const OSM_SITE_LINK = 'https://www.openstreetmap.de/';
  const INTERACTIVE_SHAPE_CLASS_NAME = 'interactive-shape';

  export default defineComponent({
    props: {
      value: {
        // TODO reinit map after change value
        // eslint-disable-next-line no-undef
        type: Object as () => GeoJSON.GeometryCollection,
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
    },
    data(): IMapData {
      return {
        map: null,
        editingLayer: null,
        drawnItems: new L.FeatureGroup(),
        searchTempItem: new L.FeatureGroup(),
        url: OSM_URL,
        tileLayerOptions: {
          ...TILE_LAYER_OPTIONS,
          attribution: `&copy; <a href="${OSM_SITE_LINK}" target='_blank'>OpenStreetMap</a>${('legal')}`,
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
      };
    },
    computed: {
      drawOptions(): L.Control.DrawOptions {
        return getDrawOptions(this.isShapesInteractive ? INTERACTIVE_SHAPE_CLASS_NAME : '');
      },
      markerClass(): string {
        return this.isShapesInteractive
          ? `map-marker ${INTERACTIVE_SHAPE_CLASS_NAME}`
          : 'map-marker';
      },
      markerIcon(): L.DivIcon {
        const { options } = L.Icon.Default.prototype;

        return L.divIcon({
          ...options,
          shadowSize: [0, 0],
          className: this.markerClass,
        });
      },
    },
    mounted() {
      this.$nextTick(this.initMap);
    },
    methods: {
      initMap() {
        if (!this.$el) {
          return;
        }

        L.Marker.prototype.options.icon = this.markerIcon;

        const mapOptions: MapOptions = {
          ...MAP_OPTIONS,
          ...(this.isStatic ? MAP_READ_ONLY_OPTIONS : {}),
        };

        this.map = L.map(this.$el as HTMLElement, mapOptions);
        this.setBaseControls();

        if (this.value) {
          this.drawnItems = L.geoJSON(this.value);
          const bounds = this.drawnItems.getBounds();
          this.map.fitBounds(bounds);
          this.drawnItems = parseCollection(this.drawnItems as any);
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

        this.map.addLayer(this.isMarkerClustering ? this.getClusteredShapes() : this.drawnItems as any);
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

        // override default draw marker icon
        L.Draw.Marker.prototype.setOptions({
          icon: this.markerIcon,
        });

        this.extendDrawControlHandler();

        const drawToolbar = this.getDrawToolbar();

        this.map.addControl(drawToolbar);
        this.setDrawElementOptions(MapLayerType.MARKER);
        this.setDrawElementOptions(MapLayerType.POLYGON);
        this.drawnItems.getLayers().forEach((layer) => {
          this.bindActionPopupToLayer(layer as MapLayer);
        });
        this.addHookHandlers();
      },
      extendDrawControlHandler() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const mapComponent = this;
        // override leaflet method
        L.Draw.Feature.include({
          enable() {
            if (mapComponent.editingLayer) {
              mapComponent.finishLayerEditing();
              return;
            }

            // eslint-disable-next-line no-underscore-dangle
            if (this._enabled) {
              // eslint-disable-next-line no-underscore-dangle
              this._map.fire('draw:canceled', { layerType: this.type });
              this.disable();
              return;
            }

            L.Handler.prototype.enable.call(this);
            this.fire('enabled', { handler: this.type });
            // eslint-disable-next-line no-underscore-dangle
            this._map.fire(L.Draw.Event.DRAWSTART, { layerType: this.type });
          },
        });
      },
      getDrawToolbar() {
        return new L.Control.Draw({
          position: ControlPosition.BOTTOMRIGHT,
          draw: this.drawOptions,
          edit: {
            featureGroup: this.drawnItems as any,
            edit: false,
            remove: false,
          },
        });
      },
      setDrawElementOptions(layerType: MapLayerType) {
        const element = this.drawControlElementsMap[layerType];
        const { buttonClass, tooltipTextKey } = DRAW_ELEMENT_OPTIONS[layerType];

        element.button = document.querySelector(`.${buttonClass}`);
        element.tooltipContent = addTooltipToElement(element.button, String((tooltipTextKey)));
      },
      bindActionPopupToLayer(layer: MapLayer, actions: PopupAction[] = [PopupAction.EDIT, PopupAction.DELETE]) {
        const layerType = getLayerType(layer);
        const isMultiPolygon = layer.toGeoJSON().geometry.type === 'MultiPolygon';
        const buttonContainer = document.createElement('div');
        const buttons = [];

        if (actions.indexOf(PopupAction.DELETE) > -1) {
          buttons.push(this.makePopupDeleteButton(layer, layerType));
        }

        if (actions.indexOf(PopupAction.EDIT) > -1 && !isMultiPolygon) {
          buttons.push(this.makePopupEditButton(layer, layerType));
        }

        buttonContainer.className = 'leaflet-popup-control-container';
        buttons.forEach((button) => {
          buttonContainer.appendChild(button);
        });

        const { popupClass } = DRAW_ELEMENT_OPTIONS[layerType];

        layer.bindPopup(buttonContainer, { closeButton: false, closeOnClick: true, className: popupClass });
      },
      makePopupDeleteButton(layer: MapLayer, layerType: MapLayerType) {
        const buttonRemove = document.createElement('div');

        buttonRemove.className = 'leaflet-popup-control is-delete';
        buttonRemove.addEventListener('click', () => {
          if (this.map) {
            this.map.fire(L.Draw.Event.DELETESTART, { layer, layerType });
          }
        });

        return buttonRemove;
      },
      makePopupEditButton(layer: MapLayer, layerType: MapLayerType) {
        const buttonEdit = document.createElement('div');

        buttonEdit.className = 'leaflet-popup-control is-edit';
        buttonEdit.addEventListener('click', () => {
          if (this.map) {
            this.map.fire(L.Draw.Event.EDITSTART, { layer, layerType });
          }
        });

        return buttonEdit;
      },
      addHookHandlers() {
        if (!this.map) {
          return;
        }

        this.map.on(L.Draw.Event.DRAWSTART, (event: L.LeafletEvent) => {
          const { layerType } = (event as MapLeafletEvent);

          if (layerType === MapLayerType.POLYGON) {
            this.isPolygonDrawingActive = true;
          }

          this.setDrawingButtonActivity(layerType, true);

          const textKey = DRAW_ELEMENT_OPTIONS[layerType].tooltipCancelTextKey;

          this.setDrawButtonTooltipText(layerType, String((textKey)));
        });

        this.map.on(L.Draw.Event.DRAWSTOP, (event: L.LeafletEvent) => {
          const { layerType } = (event as MapLeafletEvent);

          if (layerType === MapLayerType.POLYGON) {
            this.isPolygonDrawingActive = false;
          }

          this.setDrawingButtonActivity(layerType, false);

          const textKey = DRAW_ELEMENT_OPTIONS[layerType].tooltipTextKey;

          this.setDrawButtonTooltipText(layerType, String((textKey)));
        });

        this.map.on(L.Draw.Event.CREATED, (event: L.LeafletEvent) => {
          const { layer } = (event as MapDrawCreatedEvent);

          this.drawnItems.addLayer(layer);
          this.emitDrawnItemsGeolocation();
          this.bindActionPopupToLayer(layer);
        });

        this.map.on(L.Draw.Event.EDITSTART, (event: L.LeafletEvent) => {
          const { layer, layerType } = (event as MapDrawEditEvent);

          layer.closePopup();
          this.finishLayerEditing();
          layer.editing.enable();
          this.setDrawingButtonActivity(layerType, true);

          const textKey = DRAW_ELEMENT_OPTIONS[layerType].tooltipCancelTextKey;

          this.setDrawButtonTooltipText(layerType, String((textKey)));
          this.editingLayer = layer;
          layer.unbindPopup();
          this.bindActionPopupToLayer(layer, [PopupAction.DELETE]);
        });

        this.map.on(L.Draw.Event.EDITED, (event: L.LeafletEvent) => {
          const { layer, layerType } = (event as MapDrawEditEvent);

          this.setDrawingButtonActivity(layerType, false);

          const textKey = DRAW_ELEMENT_OPTIONS[layerType].tooltipTextKey;

          this.setDrawButtonTooltipText(layerType, String((textKey)));
          this.emitDrawnItemsGeolocation();
          layer.unbindPopup();
          this.bindActionPopupToLayer(layer);
        });

        this.map.on(L.Draw.Event.DELETESTART, (event: L.LeafletEvent) => {
          const { layer, layerType } = (event as MapDrawDeleteStartedEvent);

          layer.closePopup();
          this.finishLayerEditing();
          this.setDrawingButtonActivity(layerType, false);
          this.drawnItems.removeLayer(layer);
          this.emitDrawnItemsGeolocation();
        });

        this.map.on('keydown', (e: L.LeafletEvent) => {
          const { originalEvent } = (e as LeafletKeyboardEvent);

          if (originalEvent.key === 'Escape') {
            this.finishLayerEditing();
          }

          if (originalEvent.key === 'Enter' && this.isPolygonDrawingActive) {
            this.completePolygon();
          }
        });

        this.map.on('click', () => {
          this.finishLayerEditing();
        });
      },
      emitDrawnItemsGeolocation() {
        const drawnItems = this.drawnItems.getLayers() as MapLayer[];
        const geometries = drawnItems.map((layer) => layer.toGeoJSON().geometry);
        const geolocation: GeoJSON.GeometryCollection = {
          type: 'GeometryCollection',
          geometries,
        };

        this.$emit('input', geolocation?.geometries?.length ? geolocation : null);
      },
      setDrawButtonTooltipText(layerType: MapLayerType, text: string) {
        const { tooltipContent } = this.drawControlElementsMap[layerType];

        if (tooltipContent) {
          tooltipContent.textContent = text;
        }
      },
      setDrawingButtonActivity(layerType: MapLayerType, isActive: boolean) {
        const buttonElement = this.drawControlElementsMap[layerType].button;
        const className = 'is-active';

        if (!buttonElement) {
          return;
        }

        if (isActive) {
          buttonElement.classList.add(className);
          this.$emit('is-edit-map', true);

          return;
        }

        buttonElement.classList.remove(className);
        this.$emit('is-edit-map', false);
      },
      finishLayerEditing() {
        if (!this.editingLayer) {
          return;
        }

        this.editingLayer.editing.disable();
        const layerType = getLayerType(this.editingLayer as any);

        if (this.map) {
          this.map.fire(L.Draw.Event.EDITED, { layerType, layer: this.editingLayer });
        }

        this.editingLayer = null;
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

  $leaflet-popup-height: 36px;
  $leaflet-popup-control-size: 20px;
  $leaflet-popup-separator-width: 0.5px;
  $leaflet-popup-content-wrapper-bottom-polygon: - ($leaflet-popup-height + 45px);
  $leaflet-popup-content-wrapper-bottom-marker: - ($leaflet-popup-height + 60px);
  $leaflet-popup-arrow-height: spacing-unit(3);
  $leaflet-popup-arrow-width: spacing-unit(3);
  $leaflet-popup-arrow-bottom-polygon: - ($leaflet-popup-height + 9px);
  $leaflet-popup-arrow-bottom-marker: - ($leaflet-popup-height + 24px);
  
  .app-map {
    position: relative;
    height: 512px;
    width: 640px;
    font-family: $font-primary;

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

    .leaflet-draw {
      margin-bottom: 0;
    }

    .leaflet-draw-toolbar {
      margin-top: 0;
      box-shadow: none;
      display: flex;
      flex-direction: column-reverse;

      a {
        margin-bottom: spacing-unit(2);
        border-bottom: 0;
        border-radius: $border-radius;
        background: $color-white;
        transition: background $transition-duration;
      }

      .leaflet-draw-draw-marker {
        font-size: 0;
        transition: background-color $transition-duration;

        &::before {
          @include background-svg-icon-fill('marker', $color-grey-darker);

          transition: background-image $transition-duration;
        }

        &:hover {
          &::before {
            @include background-svg-icon-fill('marker', $color-primary);
          }
        }

        &.is-active {
          background-color: $color-blue;

          &::before {
            @include background-svg-icon-fill('marker', $color-white);
          }
        }

        @include high-contrast {
          &::before {
            @include background-svg-icon-fill('marker', $color-white);
          }

          &:hover {
            background-color: $color-white;

            &::before {
              @include background-svg-icon-fill('marker', $color-grey);
            }
          }

          &:focus {
            outline: 2px solid $color-primary;
          }

          &.is-active {
            background-color: $color-grey-light;
          }
        }
      }

      .leaflet-draw-draw-polygon {
        font-size: 0;
        transition: background-color $transition-duration;

        &::before {
          @include background-svg-icon-fill('polygon', $color-grey-darker);

          transition: background-image $transition-duration;
        }

        &:hover {
          &::before {
            @include background-svg-icon-fill('polygon', $color-primary);
          }
        }

        &.is-active {
          background-color: $color-blue;

          &::before {
            @include background-svg-icon-fill('polygon', $color-white);
          }
        }

        @include high-contrast {
          &::before {
            @include background-svg-icon-fill('polygon', $color-white);
          }

          &:hover {
            background-color: $color-white;

            &::before {
              @include background-svg-icon-fill('polygon', $color-grey);
            }
          }

          &:focus {
            outline: 2px solid $color-primary;
          }

          &.is-active {
            background-color: $color-grey-light;
          }
        }
      }

      .leaflet-draw-edit-remove {
        &::before {
          @include background-svg-icon-fill('close', $color-white);
        }
      }

      .leaflet-draw-edit-edit {
        &::before {
          @include background-svg-icon-fill('edit', $color-white);
        }
      }

      .control-tooltip {
        position: relative;
        display: inline-flex;
        cursor: default;
        z-index: 2;

        &:hover {
          &::before,
          .control-tooltip-content {
            visibility: visible;
            opacity: 1;
          }
        }

        .control-tooltip-content {
          @include apply-styles($text-body-small);

          opacity: 0;
          visibility: hidden;
          position: absolute;
          padding: spacing-unit(2) spacing-unit(3);
          background: $color-grey-darker;
          color: $color-white;
          border-radius: $border-radius;
          transition: $transition-duration;
          white-space: nowrap;
          right: spacing-unit(13);
          bottom: 9px;
          top: 1px;
        }

        &::before {
          content: '';
          position: absolute;
          border-top: 12px solid $color-grey-darker;
          border-left: 6px solid transparent;
          border-right: 6px solid transparent;
          visibility: hidden;
          opacity: 0;
          transition: $transition-duration;
          bottom: 18px;
          left: -16px;
          transform: rotate(270deg);
        }
      }
    }

    // popup overrides
    .leaflet-popup {
      .leaflet-popup-content {
        margin: 0;
        padding: spacing-unit(2);
        width: auto !important;
      }

      .leaflet-popup-content-wrapper {
        position: absolute;
        background: $color-grey-darker;
        bottom: calc(150%);
        color: $color-white;
        border-radius: $border-radius;
        transition: $transition-duration;
        padding: 0;
        opacity: 1;
        visibility: visible;
        height: $leaflet-popup-height;
        transform: translateX(-50%);
      }

      &.is-polygon {
        .leaflet-popup-content-wrapper {
          bottom: $leaflet-popup-content-wrapper-bottom-polygon;
        }

        .leaflet-popup-tip-container {
          bottom: $leaflet-popup-arrow-bottom-polygon;
        }
      }

      &.is-marker {
        .leaflet-popup-content-wrapper {
          bottom: $leaflet-popup-content-wrapper-bottom-marker;
        }

        .leaflet-popup-tip-container {
          bottom: $leaflet-popup-arrow-bottom-marker;
        }
      }

      .leaflet-popup-tip {
        @include absolute-x-center;

        width: auto;
        height: auto;
        margin: 0;
        padding: 0;
        border-top: 0;
        border-bottom: $leaflet-popup-arrow-height solid $color-grey-darker;
        border-left: $leaflet-popup-arrow-width / 2 solid transparent;
        border-right: $leaflet-popup-arrow-width / 2 solid transparent;
        box-shadow: none;
        bottom: 0;
        background: transparent;
      }

      .leaflet-popup-control {
        width: $leaflet-popup-control-size;
        height: $leaflet-popup-control-size;
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        cursor: pointer;
        transition: background-image $transition-duration;

        &.is-delete {
          @include background-svg-icon-fill('close', $color-white);

          &:hover {
            @include background-svg-icon-fill('close', $color-grey);
          }
        }

        &.is-edit {
          @include background-svg-icon-fill('edit', $color-white);

          &:hover {
            @include background-svg-icon-fill('edit', $color-grey);
          }
        }

        &-container {
          display: flex;

          .leaflet-popup-control {
            position: relative;
            margin-right: spacing-unit(4);

            &::before {
              content: '';
              position: absolute;
              width: $leaflet-popup-separator-width;
              height: 24px;
              background-color: $color-grey-dark;
              top: -2px;
              left: (-($leaflet-popup-control-size) / 2) + 1px;
            }

            &:last-child {
              margin-right: 0;
            }

            &:first-child {
              &::before {
                content: none;
              }
            }
          }
        }
      }
    }

    .leaflet-popup-pane {
      position: relative;
    }

    .leaflet-draw-actions {
      display: none !important;
    }

    .leaflet-bottom {
      // decrease z-index due to resolve date-range picker overriding issue
      z-index: 1;
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
