<template>
  <div>
    <div class="page-header">
      <div>
        <h2>🛒 Orders</h2>
        <p>Create and manage orders</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">+ New Order</button>
    </div>

    <!-- Filter -->
    <div class="card mb-4" style="padding:16px">
      <div style="display:flex;gap:12px;align-items:center">
        <select v-model="filterStatus" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);outline:none">
          <option value="">All statuses</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
        <button class="btn btn-outline" @click="orderStore.fetchAll()">Refresh</button>
        <span style="margin-left:auto;color:var(--muted);font-size:.875rem">{{ filtered.length }} orders</span>
      </div>
    </div>

    <div v-if="orderStore.loading" class="spinner"></div>
    <div v-else-if="filtered.length === 0" class="empty-state">
      <div class="icon">🛒</div>No orders yet
    </div>

    <div v-else class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>User</th><th>Product</th><th>Qty</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-for="o in filtered" :key="o.id">
              <td>#{{ o.id }}</td>
              <td>User #{{ o.user_id }}</td>
              <td>Product #{{ o.product_id }}</td>
              <td>{{ o.quantity }}</td>
              <td style="font-weight:600">${{ Number(o.total_price).toFixed(2) }}</td>
              <td><span :class="`badge badge-${o.status}`">{{ o.status }}</span></td>
              <td>{{ fmtDate(o.created_at) }}</td>
              <td>
                <div class="actions">
                  <select class="btn btn-outline btn-sm" style="padding:4px 6px"
                          @change="e => changeStatus(o.id, e.target.value)" :value="o.status">
                    <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
                  </select>
                  <button class="btn btn-danger btn-sm" @click="remove(o.id)">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- New Order Modal -->
    <div v-if="modal" class="modal-overlay" @click.self="modal = false">
      <div class="modal">
        <h3>Create Order</h3>
        <div v-if="modalError" class="alert alert-error">{{ modalError }}</div>
        <div class="form-group">
          <label>Product</label>
          <select v-model="form.product_id">
            <option value="">Select product...</option>
            <option v-for="p in productStore.items" :key="p.id" :value="p.id">
              {{ p.name }} — ${{ Number(p.price).toFixed(2) }}
            </option>
          </select>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Quantity</label>
            <input v-model.number="form.quantity" type="number" min="1" placeholder="1" @change="calcTotal" />
          </div>
          <div class="form-group">
            <label>Total Price</label>
            <input v-model="form.total_price" type="number" step="0.01" placeholder="0.00" />
          </div>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <input v-model="form.notes" placeholder="Optional notes..." />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modal = false">Cancel</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">
            {{ saving ? 'Creating...' : 'Create Order' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useOrderStore }   from '../stores/orders'
import { useProductStore } from '../stores/products'

const orderStore   = useOrderStore()
const productStore = useProductStore()
const modal        = ref(false)
const saving       = ref(false)
const modalError   = ref('')
const filterStatus = ref('')

const statuses = ['pending','confirmed','shipped','delivered','cancelled']
const emptyForm = () => ({ product_id: '', quantity: 1, total_price: '', notes: '' })
const form = ref(emptyForm())

const filtered = computed(() =>
  !filterStatus.value ? orderStore.items : orderStore.items.filter(o => o.status === filterStatus.value)
)

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

watch([() => form.value.product_id, () => form.value.quantity], () => calcTotal())

function calcTotal() {
  const p = productStore.items.find(p => p.id == form.value.product_id)
  if (p && form.value.quantity) {
    form.value.total_price = (Number(p.price) * form.value.quantity).toFixed(2)
  }
}

function openModal() {
  modalError.value = ''
  form.value = emptyForm()
  modal.value = true
}

async function save() {
  if (!form.value.product_id || !form.value.quantity || !form.value.total_price) {
    modalError.value = 'Product, quantity, and total price are required'; return
  }
  saving.value = true; modalError.value = ''
  try {
    await orderStore.create(form.value)
    modal.value = false
  } catch (e) {
    modalError.value = e.response?.data?.error || 'Failed to create order'
  } finally {
    saving.value = false
  }
}

async function changeStatus(id, status) {
  await orderStore.setStatus(id, status)
}

async function remove(id) {
  if (!confirm('Delete this order?')) return
  await orderStore.remove(id)
}

onMounted(() => {
  orderStore.fetchAll()
  if (!productStore.items.length) productStore.fetchAll()
})
</script>
