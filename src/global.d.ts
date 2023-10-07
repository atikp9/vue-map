declare module 'wellknown' {
  import type { GeoJSON } from 'geojson';

  export function parse(wkt: string): GeoJSON.Geometry;
  export function stringify(geoJson: GeoJSON.Geometry): string;
}

declare module 'vue-content-loader'
