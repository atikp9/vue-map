import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/HomeView.vue';
import WktMap from '../views/WktMap.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home,
      meta: {
        layout: 'default'
      }
    },
    {
      path: '/wkt',
      name: 'Wkt',
      component: WktMap,
      meta: {
        layout: 'default'
      }
    },
  ]
})

export default router
