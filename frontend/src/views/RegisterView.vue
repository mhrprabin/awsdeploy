<template>
  <div class="auth-page">
    <div class="auth-box">
      <h1>Create account</h1>
      <p>Join the Microservices Dashboard</p>

      <div v-if="error" class="alert alert-error">{{ error }}</div>
      <div v-if="success" class="alert alert-success">{{ success }}</div>

      <form @submit.prevent="submit">
        <div class="form-group">
          <label>Full Name</label>
          <input v-model="form.name" type="text" placeholder="Alice Smith" required />
        </div>
        <div class="form-group">
          <label>Email</label>
          <input v-model="form.email" type="email" placeholder="alice@example.com" required />
        </div>
        <div class="form-group">
          <label>Password</label>
          <input v-model="form.password" type="password" placeholder="Min 6 characters" minlength="6" required />
        </div>
        <button class="btn btn-primary" style="width:100%;justify-content:center" :disabled="loading">
          {{ loading ? 'Creating account...' : 'Create account' }}
        </button>
      </form>

      <p class="mt-4 text-muted" style="font-size:.875rem;text-align:center">
        Already have an account?
        <RouterLink to="/login" style="color:var(--primary)">Sign in</RouterLink>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router  = useRouter()
const auth    = useAuthStore()
const error   = ref('')
const success = ref('')
const loading = ref(false)
const form    = ref({ name: '', email: '', password: '' })

async function submit() {
  error.value = ''
  loading.value = true
  try {
    await auth.register(form.value.name, form.value.email, form.value.password)
    router.push('/dashboard')
  } catch (e) {
    error.value = e.response?.data?.error || 'Registration failed'
  } finally {
    loading.value = false
  }
}
</script>
