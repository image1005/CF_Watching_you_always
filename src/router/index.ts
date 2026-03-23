import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: Array<RouteRecordRaw> = [
    { path: '/', name: 'home', component: () => import('@/views/Home.vue') },
    { path: '/setting', name: 'setting', component: () => import('@/views/Setting.vue') }
]

const router = createRouter({
    history: createWebHashHistory(), 
    routes,
})

export default router