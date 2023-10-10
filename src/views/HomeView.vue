<template>
  <div class="wrapper">
    <aside class="control-wrapper">
      <h3>Map Controls</h3>
      <div>Show Polygon Selection Control:</div>
      <div class="form-row">
        <input type="radio" id="yes" :value="true" v-model="isPolygonControlVisible" />
        <label for="yes">Yes</label>
      </div>

      <div class="form-row">
        <input type="radio" id="no" :value="false" v-model="isPolygonControlVisible" />
        <label for="no">No</label>
      </div>      
      <br/>

      <div>Show Full-Screen Control:</div>
      <div class="form-row">
        <input type="radio" id="yes" :value="true" v-model="isFullScreenControlVisible" />
        <label for="yes">Yes</label>   
      </div>

      <div class="form-row">
        <input type="radio" id="no" :value="false" v-model="isFullScreenControlVisible" />
        <label for="no">No</label>
      </div>
      <br />
    </aside>
    <AppMap 
      class="map-wrapper"
      :key="mapKey /* reinit map on demand when new data is appended */"
      v-model:has-draw="isPolygonControlVisible"
      v-model:is-full-screen="isFullScreenControlVisible"
    />
   
  </div>
</template>

<script setup lang="ts">
  import AppMap from '@/components/AppMap/AppMap.vue';
  import { ref, watch } from 'vue'
  
  const isPolygonControlVisible = ref(false);
  const isFullScreenControlVisible = ref(true);
  const mapKey = ref(0);

  const updateMapKey = (): void => {
    mapKey.value += 1;
  }

  watch([isPolygonControlVisible, isFullScreenControlVisible] , () =>{
    updateMapKey();
  })
</script>
<style scoped lang="scss">
 .wrapper {
  display: flex;
  width: 100vw;
  height: 100vh;
}

.control-wrapper {
  width: 20%;
  padding: 20px 10px 20px 20px;
}

.map-wrapper {
  width: 80%;
  height: 100vh;
}
</style>
./geojson/germany.js