<template>
  <div v-if="isPublicRoute">
    <RouterView />
  </div>

  <div v-else class="layout">
    <aside class="sidebar">
      <div class="sidebar-logo">🚀 MicroApp</div>
      <nav>
        <RouterLink to="/dashboard">📊 Dashboard</RouterLink>
        <RouterLink to="/products">📦 Products</RouterLink>
        <RouterLink to="/orders">🛒 Orders</RouterLink>
        <RouterLink to="/payments">💳 Payments</RouterLink>
        <RouterLink to="/users">👥 Users</RouterLink>
      </nav>
      <div class="sidebar-footer">
        <div style="font-size:.8rem; color:var(--muted); margin-bottom:8px">
          {{ auth.user?.name }}<br>
          <span style="font-size:.75rem">{{ auth.user?.role }}</span>
        </div>
        <button class="btn btn-outline btn-sm" style="width:100%" @click="handleLogout">
          Sign out
        </button>
      </div>
    </aside>
    <main class="main">
      <RouterView />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const isPublicRoute = computed(() => route.meta.public)

function handleLogout() {
  auth.logout()
  router.push('/login')
}
</script>
