<template>
  <div role="application" class="app-map" ref="leaflet" />
</template>

<script setup lang="ts">
  import { onMounted, ref, nextTick } from 'vue';
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

  const OSM_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}';
  const INTERACTIVE_SHAPE_CLASS_NAME = 'interactive-shape';
  const ATTRIBUTION_TEXT = "Tiles &copy; Esri &mdash; Esri, DeLorme, NAVTEQ";
  
  const props = defineProps({
    value:{
      type: Object as () => GeoJSON.GeometryCollection | null,
      default: null
    },
    hasDraw: {
      type: Boolean,
      default: false
    },
    isMarkerClustering: {
      type: Boolean,
      default: false
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
  })

  const emit = defineEmits(['input','is-edit-map','is-map-loaded']);

  const showPopup = ref(false);
  const isPolygonDrawingActive = ref(false);
  const tileLayerOptions = {
    ...TILE_LAYER_OPTIONS,
    attribution: ATTRIBUTION_TEXT,
  };
  const drawControlElementsMap = { 
    [MapLayerType.MARKER]: {
      button: null,
      tooltipContent: null,
    },
    [MapLayerType.POLYGON]: {
      button: null,
      tooltipContent: null,
    },
  }
  const layerGroup = ref(new L.LayerGroup());
  const drawnItems = ref(new L.FeatureGroup());
  const map = ref<L.Map | null>(null);

  const leaflet = ref<HTMLElement | null>(null);

  //Intialize Map
  const initMap = () => {
    if(!leaflet.value) {
      return;
    }

    const mapOptions: MapOptions = {
      ...MAP_OPTIONS,
      ...(props.isStatic ? MAP_READ_ONLY_OPTIONS : {}),
      ...(props.isFullScreen ? MAP_FULLSCREEN_OPTIONS : {})
    };

    map.value = L.map(leaflet.value, mapOptions);
    setBaseControls();

    if (props.value) {
      drawnItems.value = L.geoJSON(props.value,
        {
          pmIgnore: true,
          // onEachFeature: props.bindPopup
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

    map.value.addLayer(props.isMarkerClustering ? getClusteredShapes() : drawnItems.value as L.FeatureGroup);
  }

  //Init Draw
  const initDraw = () => {
    if (!map.value) {
      return;
    }
    
    getDrawToolbar();
    addHookHandlers();
  }
  const getDrawToolbar = () => {}
  const addHookHandlers = () => {}
  const getClusteredShapes = () => {}
  //set base controls
  const setBaseControls = ()  => {
    if (!map.value) {
      return;
    }

    const attribution = L.control.attribution(ATTRIBUTION_OPTIONS);
    const osm: L.TileLayer = new L.TileLayer(OSM_URL, tileLayerOptions);

    if (!props.isStatic) {
      const zoom = L.control.zoom(ZOOM_OPTIONS).addTo(map.value as any);
      zoom.addTo(map.value as L.Map);
    }

    attribution.addTo(map.value as L.Map);
    map.value.addLayer(osm);
    osm.on("load", () => {
      emit('is-map-loaded', true);
    })
  }
      
  const setDefaultView = ()  => {
    if (!map.value) {
      return;
    }

    const defaultCoordinates: L.LatLngExpression = [52, 8];
    const defaultZoom = 5;

    map.value.setView(defaultCoordinates, defaultZoom);
  }

  onMounted(() =>{
    nextTick(()=> initMap());
  })
  //   methods: {



  
  //     },
  
  
  //     getClusteredShapes() {
  //       const shapes = L.markerClusterGroup({
  //         spiderfyOnMaxZoom: false,
  //         showCoverageOnHover: false,
  //         iconCreateFunction(cluster: L.MarkerCluster) {
  //           return L.divIcon({
  //             className: 'leaflet-marker-cluster',
  //             iconSize: L.point(57, 57),
  //             html: `${cluster.getChildCount()}`,
  //           });
  //         },
  //       });

  //       this.drawnItems.getLayers().forEach((layer) => {
  //         shapes.addLayer(layer);
  //       });

  //       return shapes;
  //     },
  
  //     bindPopup(feature: GeoJSON.Feature, layer: L.Layer) {
  //       layer.on('click',() => {
  //         //by default bind popup on each layer
  //         if(this.showPopup) {
  //           layer
  //           .bindPopup('<h1> Tower id:'+feature.properties?.id+'</h1><p>Flaeche:&nbsp'+feature.properties?.Flaeche+'</p>')
  //           .openPopup();
  //         }else {
  //           this.disableGeoJSONInteraction
  //         }
  //       })
  //     },
  //     getDrawToolbar() {
  //       if (!this.map) {
  //         return;
  //       }

  //       this.map.pm.addControls({
  //         position: ControlPosition.BOTTOMRIGHT,
  //         drawCircleMarker: false,
  //         rotateMode: false,
  //         drawCircle: true,
  //         cutPolygon: false,
  //         drawPolyline: false,
  //         drawText: false
  //       })
  //     },
  //     disableGeoJSONInteraction(e: L.LeafletEvent) {
  //       (e as any).originalEvent.stopPropagation(); // Prevent event from propagating
  //       (e as any).originalEvent.preventDefault(); // Prevent the default event behavior
  //     },
  //     addHookHandlers() {
  //       if (!this.map) {
  //         return;
  //       }

  //       this.map.on("pm:drawstart",() => {
  //         //disable popup on polygon edit mode
  //         this.showPopup = false;
  //       })

  //       this.map.on("pm:remove",({ layer }) => {
  //         //this.showPopup = false
  //         //this.drawnItems.bringToBack();// bring this layer to back to facilate polygon selection
  //         //this.finishLayerEditing();
  //         this.layerGroup.removeLayer(layer);
  //         this.emitDrawnItemsGeolocation();
  //       })

  //       //this event called when a shape cut toolbar option selected
  //       this.map.on("pm:cut",({ layer, originalLayer }) => {
  //         //this.showPopup = false;
  //         //this.drawnItems.bringToBack();// bring this layer to back to facilate polygon selection
  //         //this.finishLayerEditing();
  //         this.layerGroup.removeLayer(originalLayer);
  //         this.layerGroup.addLayer(layer);
  //         this.emitDrawnItemsGeolocation();
  //       })

  //       // this.map.on('pm:edit',() =>{
  //       //   this.showPopup = true;
  //       // })

  //       //this event called when a shape is drawn/finished
  //       this.map.on("pm:create",({ layer }) => {
  //         this.showPopup = true; //set this flag to true after editing compelted
  //         this.layerGroup.addLayer(layer);
  //         this.emitDrawnItemsGeolocation();
  //         //set draw layer to front to show popup
  //         this.drawnItems.bringToFront();
  //       })

  //       //on toolbar click hide popup
  //       this.map.on("pm:buttonclick", () =>{
  //         this.showPopup = false;
  //         console.log('fired click', this.showPopup)
  //         this.drawnItems.bringToBack();
  //       })

  //       //on action completion show popup
  //       this.map.on("pm:actionclick", () =>{
  //         this.showPopup = true;
  //         this.drawnItems.bringToFront();
  //       })

  //       this.map.on('keydown', (e: L.LeafletEvent) => {
  //         const { originalEvent } = (e as LeafletKeyboardEvent);

  //         if (originalEvent.key === 'Escape') {
  //           //this.finishLayerEditing();
  //         }

  //         if (originalEvent.key === 'Enter' && this.isPolygonDrawingActive) {
  //           this.completePolygon();
  //         }
  //       });

  //       this.map.on('click', () => {
  //         //this.finishLayerEditing();
  //       });
  //     },
  //     emitDrawnItemsGeolocation() {
  //       const layerItems = this.layerGroup.getLayers() as MapLayer[];
  //       const layerGeometries = this.getGeometries(layerItems);

  //       const geolocation: GeoJSON.GeometryCollection = {
  //         type: 'GeometryCollection',
  //         geometries: layerGeometries,
  //       };

  //      this.$emit('input', geolocation?.geometries?.length ? geolocation : null);
  //     },
  //     getGeometries(geometry: MapLayer[]) {
  //       return geometry.map((layer) => layer.toGeoJSON().geometry)
  //     },
  //     setDrawButtonTooltipText(layerType: MapLayerType, text: string) {
  //       const { tooltipContent } = this.drawControlElementsMap[layerType];

  //       if (tooltipContent) {
  //         tooltipContent.textContent = text;
  //       }
  //     },
  //     completePolygon() {
  //       // here we need to access internal toolbar prop of Leaflet global object which is not described in interface
  //       // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  //       // @ts-ignore
  //       // eslint-disable-next-line no-underscore-dangle
  //       const polygonHandler = L.toolbar._toolbars.draw._activeMode.handler;
  //       polygonHandler.completeShape();
  //     },
  //   },
  // });
</script>
