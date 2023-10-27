<template>
  <AppMap
    class="app-map-wkt"
    v-bind="$attrs"
    :value="formattedValue"
    @input="$emit('input', $event)"
    @is-map-loaded="$emit('is-map-loaded', $event)"
  />
</template>

<script setup lang="ts">
  import AppMap from '@/components/AppMap/AppMap.vue';
  import { stringifyGeoJsonToWkt, parseWktToGeoJson } from '@/common/utils/MapUtils';
  import { computed } from 'vue';
  
  const emit = defineEmits(['input','is-map-loaded']);
  
  export interface Props {
    value: string
  }

  const props = withDefaults(defineProps<Props>(), {
    value: ''
  })

  const formattedValue = computed((): GeoJSON.GeometryCollection | null => {
    return props.value === null ? null : parseWktToGeoJson(props.value)
  })

  const emitInput = (value: GeoJSON.GeometryCollection | null) => {
    emit('input', value === null ? null : stringifyGeoJsonToWkt(value))
  }
</script>
