<template>
  <div>
    <div class="page-header">
      <div>
        <h2>Dashboard</h2>
        <p>Overview of all microservices</p>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="label">👥 Total Users</div>
        <div class="value">{{ stats.users }}</div>
        <div class="sub">Registered accounts</div>
      </div>
      <div class="stat-card">
        <div class="label">📦 Products</div>
        <div class="value">{{ stats.products }}</div>
        <div class="sub">In catalogue</div>
      </div>
      <div class="stat-card">
        <div class="label">🛒 Orders</div>
        <div class="value">{{ stats.orders }}</div>
        <div class="sub">All time</div>
      </div>
      <div class="stat-card">
        <div class="label">💳 Payments</div>
        <div class="value">{{ stats.payments }}</div>
        <div class="sub">Processed</div>
      </div>
    </div>

    <!-- Service health -->
    <div class="card mb-4">
      <div class="card-title">🩺 Service Health</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">
        <div v-for="svc in services" :key="svc.name"
             style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--border);border-radius:var(--radius)">
          <span style="font-size:1.4rem">{{ svc.icon }}</span>
          <div>
            <div style="font-weight:600;font-size:.875rem">{{ svc.name }}</div>
            <div :style="{ color: svc.status === 'ok' ? 'var(--success)' : 'var(--danger)', fontSize: '.8rem' }">
              {{ svc.status === 'ok' ? '● Online' : svc.status === 'loading' ? '○ Checking...' : '● Offline' }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent orders -->
    <div class="card">
      <div class="card-title">🛒 Recent Orders</div>
      <div v-if="recentOrders.length === 0" class="empty-state">
        <div class="icon">📭</div>No orders yet
      </div>
      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Product</th><th>Amount</th><th>Status</th><th>Date</th></tr>
          </thead>
          <tbody>
            <tr v-for="o in recentOrders" :key="o.id">
              <td>#{{ o.id }}</td>
              <td>Product #{{ o.product_id }} × {{ o.quantity }}</td>
              <td>${{ o.total_price }}</td>
              <td><span :class="`badge badge-${o.status}`">{{ o.status }}</span></td>
              <td>{{ fmtDate(o.created_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authApi, productApi, orderApi, paymentApi } from '../api'
import axios from 'axios'

const stats = ref({ users: 0, products: 0, orders: 0, payments: 0 })
const recentOrders = ref([])

const services = ref([
  { name: 'User Service',    icon: '👤', status: 'loading', url: '/api/users/health'    },
  { name: 'Order Service',   icon: '🛒', status: 'loading', url: '/api/orders/health'   },
  { name: 'Product Service', icon: '📦', status: 'loading', url: '/api/products/health' },
  { name: 'Payment Service', icon: '💳', status: 'loading', url: '/api/payments/health' },
])

async function checkHealth(svc) {
  try {
    await axios.get(svc.url)
    svc.status = 'ok'
  } catch {
    svc.status = 'error'
  }
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  services.value.forEach(checkHealth)

  try { stats.value.users    = (await authApi.users()).data.total } catch {}
  try { stats.value.products = (await productApi.list()).data.total } catch {}

  try {
    const { data } = await orderApi.list()
    stats.value.orders = data.total
    recentOrders.value = data.orders.slice(0, 5)
  } catch {}

  try { stats.value.payments = (await paymentApi.list()).data.total } catch {}
})
</script>
