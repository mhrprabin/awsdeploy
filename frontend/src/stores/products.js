import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { productApi } from '../api'

export const useProductStore = defineStore('products', () => {
  const items   = ref([])
  const loading = ref(false)
  const error   = ref(null)

  const categories = computed(() => [...new Set(items.value.map(p => p.category).filter(Boolean))])

  async function fetchAll(params = {}) {
    loading.value = true; error.value = null
    try { items.value = (await productApi.list(params)).data.products }
    catch (e) { error.value = e.response?.data?.error || 'Failed to load products' }
    finally { loading.value = false }
  }

  async function create(data) {
    const { data: created } = await productApi.create(data)
    items.value.unshift(created)
    return created
  }

  async function update(id, data) {
    await productApi.update(id, data)
    const idx = items.value.findIndex(p => p.id === id)
    if (idx !== -1) items.value[idx] = { ...items.value[idx], ...data }
  }

  async function remove(id) {
    await productApi.remove(id)
    items.value = items.value.filter(p => p.id !== id)
  }

  return { items, loading, error, categories, fetchAll, create, update, remove }
})
