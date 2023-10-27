<template>
  <div class="wrapper">
    <aside class="control-wrapper">
      <h3>GeoJSON MAP</h3>
      <div>Show Polygon Selection Control:</div>
      <div v-if="tcids">
        <em>Selected coordinates are</em>
        <pre>{{  tcids }}</pre>
      </div>
    </aside>
    <AppMapWkt 
      class="map-wrapper"
      :key="mapKey /* reinit map on demand when new data is appended */"
      :has-draw="true"
      :is-full-screen="true"
      :value="geoJsonData"
      :selected-layer="selectedLayer"
      @is-map-loaded="handleLoading"
      @input="handleSelectedGeometry"
    />
  </div>
</template>

<script setup lang="ts">
  import AppMapWkt from '@/components/AppMap/AppMap.vue';
  import { computed, ref } from 'vue';
  import { stringifyGeoJsonToWkt } from '@/common/utils/MapUtils';
  // @ts-ignore
  import { dt } from '@/geojson/germany'
  
  const isLoading = ref(false);
  const geoJsonData = ref(dt);
  const mapKey = ref(0);
  const selectedLayer = ref<GeoJSON.GeometryCollection | null>(null);
  const tcids = ref<string[]>([]);

  const updateMapKey = (): void => {
    mapKey.value += 1;
  }
  const handleLoading = () => {
    isLoading.value = false;
  }
  const handleSelectedGeometry = (value:GeoJSON.GeometryCollection | null) => {
    if(value) {
      const geometry = stringifyGeoJsonToWkt(value)
      const payload = {
        "polygon": geometry
      }

      fetch('http://localhost:8080/dih-api/dih-geo-search/v2/search',
      {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify(payload)
        }
      )
      .then(res => res.json())
      .then(data =>{
        selectedLayer.value = data;
        const result = data.map((dt: any) => dt.id);
        tcids.value = result;
      })

      return
    }

    tcids.value = [];
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