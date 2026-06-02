import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  { path: '/',          redirect: '/dashboard' },
  { path: '/login',     component: () => import('../views/LoginView.vue'),     meta: { public: true } },
  { path: '/register',  component: () => import('../views/RegisterView.vue'),  meta: { public: true } },
  { path: '/dashboard', component: () => import('../views/DashboardView.vue') },
  { path: '/products',  component: () => import('../views/ProductsView.vue')  },
  { path: '/orders',    component: () => import('../views/OrdersView.vue')    },
  { path: '/payments',  component: () => import('../views/PaymentsView.vue')  },
  { path: '/users',         component: () => import('../views/UsersView.vue')         },
  { path: '/notifications', component: () => import('../views/NotificationsView.vue') },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(to => {
  const token = localStorage.getItem('token')
  if (!to.meta.public && !token) return '/login'
  if (to.meta.public && token && (to.path === '/login' || to.path === '/register')) return '/dashboard'
})

export default router
