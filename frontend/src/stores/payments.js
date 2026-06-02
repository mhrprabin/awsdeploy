import { defineStore } from 'pinia'
import { ref } from 'vue'
import { paymentApi } from '../api'

export const usePaymentStore = defineStore('payments', () => {
  const items   = ref([])
  const loading = ref(false)
  const error   = ref(null)

  async function fetchAll() {
    loading.value = true; error.value = null
    try { items.value = (await paymentApi.list()).data.payments }
    catch (e) { error.value = e.response?.data?.error || 'Failed to load payments' }
    finally { loading.value = false }
  }

  async function create(data) {
    const { data: created } = await paymentApi.create(data)
    items.value.unshift(created)
    return created
  }

  async function setStatus(id, status) {
    await paymentApi.setStatus(id, status)
    const item = items.value.find(p => p.id === id)
    if (item) item.status = status
  }

  async function refund(id) {
    await paymentApi.refund(id)
    const item = items.value.find(p => p.id === id)
    if (item) item.status = 'refunded'
  }

  return { items, loading, error, fetchAll, create, setStatus, refund }
})
