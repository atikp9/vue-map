import { createRouter, createWebHistory } from 'vue-router'
import WktMap from '../views/WktMap.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Wkt',
      component: WktMap,
      meta: {
        layout: 'default'
      }
    },
  ]
})

export default router
