<template>
  <div>
    <div class="page-header">
      <div>
        <h2>👥 Users</h2>
        <p>Registered accounts</p>
      </div>
      <button class="btn btn-outline" @click="load">Refresh</button>
    </div>

    <div v-if="loading" class="spinner"></div>
    <div v-else-if="users.length === 0" class="empty-state">
      <div class="icon">👤</div>No users yet
    </div>

    <div v-else class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Joined</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>#{{ u.id }}</td>
              <td style="font-weight:500">{{ u.name }}</td>
              <td>{{ u.email }}</td>
              <td>
                <span :class="u.role === 'admin' ? 'badge badge-confirmed' : 'badge badge-pending'">
                  {{ u.role }}
                </span>
              </td>
              <td>{{ fmtDate(u.created_at) }}</td>
              <td>
                <button class="btn btn-outline btn-sm" @click="openEdit(u)">Edit</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="modal" class="modal-overlay" @click.self="modal = false">
      <div class="modal">
        <h3>Edit User</h3>
        <div v-if="modalError" class="alert alert-error">{{ modalError }}</div>
        <div class="form-group">
          <label>Name</label>
          <input v-model="form.name" placeholder="Full name" />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" placeholder="email@example.com" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modal = false">Cancel</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">
            {{ saving ? 'Saving...' : 'Save' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authApi } from '../api'
import axios from 'axios'

const users      = ref([])
const loading    = ref(false)
const modal      = ref(false)
const saving     = ref(false)
const modalError = ref('')
const form       = ref({ id: null, name: '', email: '' })

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

async function load() {
  loading.value = true
  try { users.value = (await authApi.users()).data.users }
  finally { loading.value = false }
}

function openEdit(u) {
  modalError.value = ''
  form.value = { id: u.id, name: u.name, email: u.email }
  modal.value = true
}

async function save() {
  saving.value = true; modalError.value = ''
  try {
    await axios.put(`/api/users/${form.value.id}`, form.value, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
    })
    modal.value = false
    await load()
  } catch (e) {
    modalError.value = e.response?.data?.error || 'Update failed'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
