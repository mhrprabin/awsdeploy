import { defineStore } from 'pinia'
import { ref } from 'vue'
import { orderApi } from '../api'

export const useOrderStore = defineStore('orders', () => {
  const items   = ref([])
  const loading = ref(false)
  const error   = ref(null)

  async function fetchAll() {
    loading.value = true; error.value = null
    try { items.value = (await orderApi.list()).data.orders }
    catch (e) { error.value = e.response?.data?.error || 'Failed to load orders' }
    finally { loading.value = false }
  }

  async function create(data) {
    const { data: created } = await orderApi.create(data)
    items.value.unshift(created)
    return created
  }

  async function setStatus(id, status) {
    await orderApi.setStatus(id, status)
    const item = items.value.find(o => o.id === id)
    if (item) item.status = status
  }

  async function remove(id) {
    await orderApi.remove(id)
    items.value = items.value.filter(o => o.id !== id)
  }

  return { items, loading, error, fetchAll, create, setStatus, remove }
})
