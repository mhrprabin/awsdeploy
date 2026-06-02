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
              <td>
                <span style="font-weight:500">Order #{{ p.order_id }}</span>
              </td>
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
        <h3>Pay for an Order</h3>
        <div v-if="modalError" class="alert alert-error">{{ modalError }}</div>

        <!-- Order selection — only unpaid orders shown -->
        <div class="form-group">
          <label>Select Order *</label>
          <select v-model="form.order_id" @change="onOrderSelected">
            <option value="">-- choose a pending order --</option>
            <option v-for="o in pendingOrders" :key="o.id" :value="o.id">
              Order #{{ o.id }} — total ${{ Number(o.total_price).toFixed(2) }}
              · paid ${{ Number(o.paid_amount || 0).toFixed(2) }}
              · remaining ${{ remainingFor(o).toFixed(2) }}
            </option>
          </select>
          <div v-if="pendingOrders.length === 0"
               style="font-size:.8rem;color:var(--muted);margin-top:4px">
            No pending orders. Place an order first.
          </div>
        </div>

        <!-- Remaining balance indicator -->
        <div v-if="selectedOrder" style="margin-bottom:12px">
          <div style="display:flex;justify-content:space-between;font-size:.8rem;color:var(--muted);margin-bottom:4px">
            <span>Payment progress</span>
            <span>${{ Number(selectedOrder.paid_amount || 0).toFixed(2) }} of ${{ Number(selectedOrder.total_price).toFixed(2) }}</span>
          </div>
          <div style="height:6px;background:var(--border);border-radius:99px;overflow:hidden">
            <div :style="{
              width: Math.min(100, (Number(selectedOrder.paid_amount||0)/Number(selectedOrder.total_price))*100) + '%',
              height: '100%',
              background: 'var(--primary)',
              transition: 'width .3s'
            }"></div>
          </div>
        </div>

        <!-- Amount: defaults to remaining balance, user can enter less for partial -->
        <div class="grid-2">
          <div class="form-group">
            <label>
              Amount
              <span v-if="selectedOrder" style="color:var(--muted);font-size:.8rem">
                (max ${{ remainingFor(selectedOrder).toFixed(2) }})
              </span>
            </label>
            <input v-model="form.amount" type="number" step="0.01" min="0.01"
                   :max="selectedOrder ? remainingFor(selectedOrder) : undefined"
                   :placeholder="selectedOrder ? remainingFor(selectedOrder).toFixed(2) : 'Amount'" />
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

        <!-- What happens after payment -->
        <div v-if="form.order_id" style="background:#f0f4ff;border-radius:6px;padding:12px;font-size:.8rem;color:var(--muted);margin-bottom:4px">
          🔔 On <strong>Complete</strong>: order #{{ form.order_id }} will automatically move to <strong>confirmed</strong> via Kafka.
        </div>

        <div class="modal-actions">
          <button class="btn btn-outline" @click="modal = false">Cancel</button>
          <button class="btn btn-primary" @click="save" :disabled="saving || !form.order_id">
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
import { useOrderStore }   from '../stores/orders'
import { useAuthStore }    from '../stores/auth'

const store      = usePaymentStore()
const orderStore = useOrderStore()
const auth       = useAuthStore()

const modal        = ref(false)
const saving       = ref(false)
const modalError   = ref('')
const filterStatus = ref('')

const statuses = ['pending','processing','completed','failed','refunded']

const emptyForm = () => ({
  order_id: '',
  amount:   '',
  currency: 'USD',
  method:   'card',
  notes:    '',
})
const form = ref(emptyForm())

// Only show orders that haven't been paid yet (pending / not confirmed)
const pendingOrders = computed(() =>
  orderStore.items.filter(o => ['pending'].includes(o.status))
)

const filtered = computed(() =>
  !filterStatus.value ? store.items : store.items.filter(p => p.status === filterStatus.value)
)

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function onOrderSelected() {
  const order = orderStore.items.find(o => o.id === form.value.order_id)
  if (order) form.value.amount = order.total_price
}

function openModal() {
  modalError.value = ''
  form.value = emptyForm()
  modal.value = true
}

async function save() {
  if (!form.value.order_id) {
    modalError.value = 'Please select an order'; return
  }
  saving.value = true; modalError.value = ''
  try {
    // user_id is no longer sent — the payment-service reads it from X-User-Id gateway header
    await store.create({
      order_id: form.value.order_id,
      amount:   form.value.amount || undefined,
      currency: form.value.currency,
      method:   form.value.method,
      notes:    form.value.notes || undefined,
    })
    modal.value = false
  } catch (e) {
    modalError.value = e.response?.data?.error || 'Failed to create payment'
  } finally {
    saving.value = false
  }
}

async function updateStatus(id, status) {
  await store.setStatus(id, status)
  // Reload orders — status may have changed via Kafka
  setTimeout(() => orderStore.fetchAll(), 1500)
}

async function refund(id) {
  if (!confirm('Refund this payment?')) return
  try {
    await store.refund(id)
    setTimeout(() => orderStore.fetchAll(), 1500)
  } catch (e) {
    alert(e.response?.data?.error || 'Refund failed')
  }
}

onMounted(() => {
  store.fetchAll()
  orderStore.fetchAll()   // need orders to populate dropdown
})
</script>
