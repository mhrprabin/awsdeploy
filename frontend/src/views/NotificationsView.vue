<template>
  <div>
    <div class="page-header">
      <div>
        <h2>🔔 Notifications</h2>
        <p>System and user notifications</p>
      </div>
      <div style="display:flex;gap:10px">
        <button class="btn btn-outline" @click="markAllRead" :disabled="!unread">
          Mark all read ({{ unread }})
        </button>
        <button class="btn btn-primary" @click="openModal()">+ Send Notification</button>
      </div>
    </div>

    <!-- Filter -->
    <div class="card mb-4" style="padding:16px">
      <div style="display:flex;gap:12px;align-items:center">
        <select v-model="filterType" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);outline:none">
          <option value="">All types</option>
          <option v-for="t in types" :key="t" :value="t">{{ t.replace(/_/g,' ') }}</option>
        </select>
        <select v-model="filterRead" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);outline:none">
          <option value="">All</option>
          <option value="unread">Unread</option>
          <option value="read">Read</option>
        </select>
        <button class="btn btn-outline" @click="load">Refresh</button>
        <span style="margin-left:auto;font-size:.875rem;color:var(--muted)">{{ filtered.length }} notifications</span>
      </div>
    </div>

    <div v-if="loading" class="spinner"></div>
    <div v-else-if="filtered.length === 0" class="empty-state">
      <div class="icon">🔔</div>No notifications
    </div>

    <div v-else class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>User</th><th>Type</th><th>Title</th><th>Message</th><th>Status</th><th>Date</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-for="n in filtered" :key="n.id" :style="{ background: n.isRead ? '' : '#f0f4ff' }">
              <td>#{{ n.id }}</td>
              <td>User #{{ n.userId }}</td>
              <td><span class="badge badge-confirmed" style="font-size:.7rem">{{ n.type.replace(/_/g,' ') }}</span></td>
              <td style="font-weight:500">{{ n.title }}</td>
              <td style="color:var(--muted);font-size:.85rem">{{ n.message.slice(0,60) }}{{ n.message.length > 60 ? '…' : '' }}</td>
              <td>
                <span :class="n.isRead ? 'badge badge-delivered' : 'badge badge-pending'">
                  {{ n.isRead ? 'read' : 'unread' }}
                </span>
              </td>
              <td>{{ fmtDate(n.createdAt) }}</td>
              <td>
                <div class="actions">
                  <button v-if="!n.isRead" class="btn btn-outline btn-sm" @click="markOne(n.id)">✓ Read</button>
                  <button class="btn btn-danger btn-sm" @click="remove(n.id)">✕</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Create Modal -->
    <div v-if="modal" class="modal-overlay" @click.self="modal = false">
      <div class="modal">
        <h3>Send Notification</h3>
        <div v-if="modalError" class="alert alert-error">{{ modalError }}</div>
        <div class="grid-2">
          <div class="form-group">
            <label>User ID *</label>
            <input v-model.number="form.userId" type="number" placeholder="1" />
          </div>
          <div class="form-group">
            <label>Type</label>
            <select v-model="form.type">
              <option v-for="t in types" :key="t" :value="t">{{ t.replace(/_/g,' ') }}</option>
            </select>
          </div>
        </div>
        <div class="form-group">
          <label>Title *</label>
          <input v-model="form.title" placeholder="Your order has been placed" />
        </div>
        <div class="form-group">
          <label>Message *</label>
          <input v-model="form.message" placeholder="Order #123 is confirmed and being processed." />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Reference ID</label>
            <input v-model.number="form.referenceId" type="number" placeholder="123" />
          </div>
          <div class="form-group">
            <label>Reference Type</label>
            <select v-model="form.referenceType">
              <option value="">—</option>
              <option value="order">order</option>
              <option value="payment">payment</option>
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modal = false">Cancel</button>
          <button class="btn btn-primary" @click="send" :disabled="saving">
            {{ saving ? 'Sending...' : 'Send' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/auth'
import { notificationApi } from '../api'

const auth        = useAuthStore()
const notifications = ref([])
const loading     = ref(false)
const modal       = ref(false)
const saving      = ref(false)
const modalError  = ref('')
const filterType  = ref('')
const filterRead  = ref('')

const types = [
  'order_placed','order_confirmed','order_shipped','order_delivered',
  'payment_success','payment_failed','payment_refunded','system',
]

const emptyForm = () => ({
  userId: auth.user?.id || '',
  type: 'system',
  title: '',
  message: '',
  referenceId: null,
  referenceType: '',
})
const form = ref(emptyForm())

const unread = computed(() => notifications.value.filter(n => !n.isRead).length)

const filtered = computed(() => notifications.value.filter(n => {
  const matchType = !filterType.value || n.type === filterType.value
  const matchRead = !filterRead.value ||
    (filterRead.value === 'unread' && !n.isRead) ||
    (filterRead.value === 'read'   &&  n.isRead)
  return matchType && matchRead
}))

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function load() {
  loading.value = true
  try { notifications.value = (await notificationApi.list()).data.notifications }
  finally { loading.value = false }
}

function openModal() {
  modalError.value = ''
  form.value = emptyForm()
  modal.value = true
}

async function send() {
  if (!form.value.userId || !form.value.title || !form.value.message) {
    modalError.value = 'User ID, title, and message are required'; return
  }
  saving.value = true; modalError.value = ''
  try {
    await notificationApi.create(form.value)
    modal.value = false
    await load()
  } catch (e) {
    modalError.value = e.response?.data?.error || 'Failed to send'
  } finally {
    saving.value = false
  }
}

async function markOne(id) {
  await notificationApi.markRead(id)
  const n = notifications.value.find(n => n.id === id)
  if (n) n.isRead = true
}

async function markAllRead() {
  if (!auth.user?.id) return
  await notificationApi.markAllRead(auth.user.id)
  notifications.value.forEach(n => { if (n.userId === auth.user.id) n.isRead = true })
}

async function remove(id) {
  if (!confirm('Delete this notification?')) return
  await notificationApi.remove(id)
  notifications.value = notifications.value.filter(n => n.id !== id)
}

onMounted(load)
</script>
