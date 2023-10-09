<template>
  <div class="wrapper">
    <aside class="control-wrapper">
      <h3>Map Controls</h3>
      <div>Show Polygon Control:</div>

      <input type="radio" id="yes" :value="true" v-model="showPolygonControl" />
      <label for="yes">Yes</label>
      
      <input type="radio" id="no" :value="false" v-model="showPolygonControl" />
      <label for="no">No</label>
    </aside>
    <AppMap 
      class="map-wrapper"
      v-model:has-draw="showPolygonControl"
    />
  </div>
</template>

<script lang="ts">
  import AppMap from './components/AppMap/AppMap.vue';
  
  export default {
  components: {
    AppMap
  },
  data() {
    return {
      showPolygonControl: true
    }
  }
};
</script>
<style scoped lang="scss">
.wrapper {
  display: flex;
  width: 100vw;
  height: 100vh;
  .control-wrapper {
    width: 20%;
  }
  .map-wrapper {
    width: 80%;
  }
}
</style>
