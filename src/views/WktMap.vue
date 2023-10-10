<template>
  <div class="wrapper">
    <aside class="control-wrapper">
      <h3>GeoJSON MAP</h3>
      <div>Show Polygon Selection Control:</div>
      <div v-if="selectedGeometry">
        <em>Selected coordinates are</em>
        <pre>{{  selectedGeometry }}</pre>
      </div>
    </aside>
    <AppMapWkt 
      class="map-wrapper"
      :key="mapKey /* reinit map on demand when new data is appended */"
      :has-draw="true"
      :is-full-screen="true"
      :value="geoJsonData"
      @is-map-loaded="handleLoading"
      @input="handleSelectedGeometry"
    />
  </div>
</template>

<script setup lang="ts">
  import AppMapWkt from '@/components/AppMap/AppMap.vue';
  import { computed, ref } from 'vue'
  // @ts-ignore
  import { dt } from '@/geojson/germany'
  
  const isLoading = ref(false);
  const geoJsonData = ref(dt);
  const mapKey = ref(0);
  const selectedGeometry = ref<string | null>(null)

  const updateMapKey = (): void => {
    mapKey.value += 1;
  }
  const handleLoading = () => {
    isLoading.value = false;
  }
  const handleSelectedGeometry = (value:string | null) => {
    selectedGeometry.value = value;
  }
</script>
<style scoped lang="scss">
.wrapper {
  display: flex;
  width: 100vw;
  height: 100vh;
  .control-wrapper {
    width: 20%;
    overflow-y: auto;
    min-height: 100%;
    padding: 20px 10px 20px 15px;
  }
  .map-wrapper {
    width: 80%;
    height: 100vh;
  }
}
</style>
./geojson/germany.js