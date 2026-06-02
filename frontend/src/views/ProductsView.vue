<template>
  <div>
    <div class="page-header">
      <div>
        <h2>📦 Products</h2>
        <p>Manage your product catalogue</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">+ Add Product</button>
    </div>

    <!-- Search / Filter -->
    <div class="card mb-4" style="padding:16px">
      <div style="display:flex;gap:12px;align-items:center">
        <input v-model="search" placeholder="Search products..." style="flex:1;padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);outline:none" />
        <select v-model="filterCategory" style="padding:8px 12px;border:1px solid var(--border);border-radius:var(--radius);outline:none">
          <option value="">All categories</option>
          <option v-for="c in store.categories" :key="c" :value="c">{{ c }}</option>
        </select>
        <button class="btn btn-outline" @click="store.fetchAll()">Refresh</button>
      </div>
    </div>

    <div v-if="store.loading" class="spinner"></div>
    <div v-else-if="!store.loading && filtered.length === 0" class="empty-state">
      <div class="icon">📭</div>No products found
    </div>

    <div v-else class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>ID</th><th>Name</th><th>Category</th><th>Price</th><th>Stock</th><th>Actions</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in filtered" :key="p.id">
              <td>#{{ p.id }}</td>
              <td>
                <div style="font-weight:500">{{ p.name }}</div>
                <div style="font-size:.78rem;color:var(--muted)">{{ p.description?.slice(0,50) }}</div>
              </td>
              <td><span v-if="p.category" class="badge badge-confirmed">{{ p.category }}</span><span v-else class="text-muted">—</span></td>
              <td style="font-weight:600">${{ Number(p.price).toFixed(2) }}</td>
              <td :style="{ color: p.stock < 5 ? 'var(--danger)' : 'inherit' }">{{ p.stock }}</td>
              <td>
                <div class="actions">
                  <button class="btn btn-outline btn-sm" @click="openModal(p)">Edit</button>
                  <button class="btn btn-danger btn-sm" @click="remove(p.id)">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal -->
    <div v-if="modal" class="modal-overlay" @click.self="modal = false">
      <div class="modal">
        <h3>{{ form.id ? 'Edit Product' : 'New Product' }}</h3>
        <div v-if="modalError" class="alert alert-error">{{ modalError }}</div>
        <div class="grid-2">
          <div class="form-group">
            <label>Name *</label>
            <input v-model="form.name" placeholder="Laptop Pro" required />
          </div>
          <div class="form-group">
            <label>Category</label>
            <input v-model="form.category" placeholder="Electronics" />
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label>Price *</label>
            <input v-model="form.price" type="number" step="0.01" placeholder="99.99" required />
          </div>
          <div class="form-group">
            <label>Stock</label>
            <input v-model="form.stock" type="number" placeholder="100" />
          </div>
        </div>
        <div class="form-group">
          <label>Description</label>
          <input v-model="form.description" placeholder="Short description..." />
        </div>
        <div class="form-group">
          <label>Image URL</label>
          <input v-model="form.image_url" placeholder="https://..." />
        </div>
        <div class="modal-actions">
          <button class="btn btn-outline" @click="modal = false">Cancel</button>
          <button class="btn btn-primary" @click="save" :disabled="saving">
            {{ saving ? 'Saving...' : (form.id ? 'Update' : 'Create') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProductStore } from '../stores/products'

const store          = useProductStore()
const modal          = ref(false)
const saving         = ref(false)
const modalError     = ref('')
const search         = ref('')
const filterCategory = ref('')

const emptyForm = () => ({ id: null, name: '', description: '', price: '', stock: 0, category: '', image_url: '' })
const form = ref(emptyForm())

const filtered = computed(() => store.items.filter(p => {
  const q = search.value.toLowerCase()
  const matchSearch   = !q || p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
  const matchCategory = !filterCategory.value || p.category === filterCategory.value
  return matchSearch && matchCategory
}))

function openModal(p = null) {
  modalError.value = ''
  form.value = p ? { ...p } : emptyForm()
  modal.value = true
}

async function save() {
  if (!form.value.name || !form.value.price) { modalError.value = 'Name and price are required'; return }
  saving.value = true; modalError.value = ''
  try {
    if (form.value.id) await store.update(form.value.id, form.value)
    else               await store.create(form.value)
    modal.value = false
  } catch (e) {
    modalError.value = e.response?.data?.error || 'Save failed'
  } finally {
    saving.value = false
  }
}

async function remove(id) {
  if (!confirm('Delete this product?')) return
  await store.remove(id)
}

onMounted(() => store.fetchAll())
</script>
