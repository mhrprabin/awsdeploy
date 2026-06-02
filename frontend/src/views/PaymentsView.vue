<template>
  <div>
    <div class="page-header">
      <div>
        <h2>💳 Payments</h2>
        <p>Process and track payments</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">+ New Payment</button>
    </div>

    <!-- Filter -->
    <div class="card mb-4" style="padding:16px">
      <div style="display:flex;gap:12px;align-items:center">
        <select v-model="filterStatus" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);outline:none">
          <option value="">All statuses</option>
          <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
        </select>
        <button class="btn btn-outline" @click="store.fetchAll()">Refresh</button>
      </div>
    </div>

    <div v-if="store.loading" class="spinner"></div>
    <div v-else-if="filtered.length === 0" class="empty-state">
      <div class="icon">💳</div>No payments yet
    </div>

    <div v-else class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Order</th><th>Amount</th><th>Method</th><th>Status</th><th>Ref</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id">
              <td>#{{ p.id }}</td>
              <td>Order #{{ p.order_id }}</td>
              <td style="font-weight:600">{{ p.currency }} ${{ Number(p.amount).toFixed(2) }}</td>
              <td style="text-transform:capitalize">{{ p.method }}</td>
              <td><span :class="`badge badge-${p.status}`">{{ p.status }}</span></td>
              <td style="font-size:.75rem;color:var(--muted)">{{ p.transaction_ref }}</td>
              <td>{{ fmtDate(p.created_at) }}</td>
              <td>
                <div class="actions">
                  <button v-if="p.status === 'pending'"
                          class="btn btn-success btn-sm"
                          @click="updateStatus(p.id, 'completed')">Complete</button>
                  <button v-if="p.status === 'completed'"
                          class="btn btn-outline btn-sm"
                          @click="refund(p.id)">Refund</button>
                  <button v-if="p.status === 'pending'"
                          class="btn btn-danger btn-sm"
                          @click="updateStatus(p.id, 'failed')">Fail</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- New Payment Modal -->
    <div v-if="modal" class="modal-overlay" @click.self="modal = false">
      <div class="modal">
        <h3>Create Payment</h3>
        <div v-if="modalError" class="alert alert-error">{{ modalError }}</div>
        <div class="grid-2">
          <div class="form-group">
            <label>Order ID *</label>
            <input v-model.number="form.order_id" type="number" placeholder="1" />
          </div>
          <div class="form-group">
            <label>User ID *</label>
            <input v-model.number="form.user_id" type="number" placeholder="1" />
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Amount *</label>
            <input v-model="form.amount" type="number" step="0.01" placeholder="99.99" />
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select v-model="form.currency">
              <option>USD</option><option>EUR</option><option>GBP</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Payment Method</label>
          <select v-model="form.method">
            <option value="card">Card</option>
            <option value="bank_transfer">Bank Transfer</option>
            <option value="wallet">Wallet</option>
            <option value="cash">Cash</option>
          </select>
        </div>
        <div class="form-group">
          <label>Notes</label>
          <input v-model="form.notes" placeholder="Optional notes..." />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modal = false">Cancel</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">
            {{ saving ? 'Processing...' : 'Create Payment' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { usePaymentStore } from '../stores/payments'

const store        = usePaymentStore()
const modal        = ref(false)
const saving       = ref(false)
const modalError   = ref('')
const filterStatus = ref('')

const statuses = ['pending','processing','completed','failed','refunded']
const emptyForm = () => ({ order_id: '', user_id: '', amount: '', currency: 'USD', method: 'card', notes: '' })
const form = ref(emptyForm())

const filtered = computed(() =>
  !filterStatus.value ? store.items : store.items.filter(p => p.status === filterStatus.value)
)

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openModal() {
  modalError.value = ''
  form.value = emptyForm()
  modal.value = true
}

async function save() {
  if (!form.value.order_id || !form.value.user_id || !form.value.amount) {
    modalError.value = 'Order ID, User ID, and amount are required'; return
  }
  saving.value = true; modalError.value = ''
  try {
    await store.create(form.value)
    modal.value = false
  } catch (e) {
    modalError.value = e.response?.data?.error || 'Failed to create payment'
  } finally {
    saving.value = false
  }
}

async function updateStatus(id, status) {
  await store.setStatus(id, status)
}

async function refund(id) {
  if (!confirm('Refund this payment?')) return
  try {
    await store.refund(id)
  } catch (e) {
    alert(e.response?.data?.error || 'Refund failed')
  }
}

onMounted(() => store.fetchAll())
</script>
