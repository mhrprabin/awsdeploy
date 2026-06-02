import axios from 'axios'

const api = axios.create({ baseURL: '/api' })

// Attach JWT to every request if present
api.interceptors.request.use(cfg => {
  const token = localStorage.getItem('token')
  if (token) cfg.headers.Authorization = `Bearer ${token}`
  return cfg
})

// Redirect to login on 401
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: data => api.post('/users/register', data),
  login:    data => api.post('/users/login', data),
  profile:  ()   => api.get('/users/profile'),
  users:    ()   => api.get('/users'),
}

export const productApi = {
  list:    (params) => api.get('/products', { params }),
  get:     id       => api.get(`/products/${id}`),
  create:  data     => api.post('/products', data),
  update:  (id, d)  => api.put(`/products/${id}`, d),
  remove:  id       => api.delete(`/products/${id}`),
}

export const orderApi = {
  list:       ()      => api.get('/orders'),
  my:         ()      => api.get('/orders/my'),
  get:        id      => api.get(`/orders/${id}`),
  create:     data    => api.post('/orders', data),
  setStatus:  (id, s) => api.patch(`/orders/${id}/status`, { status: s }),
  remove:     id      => api.delete(`/orders/${id}`),
}

export const paymentApi = {
  list:      ()      => api.get('/payments'),
  get:       id      => api.get(`/payments/${id}`),
  create:    data    => api.post('/payments', data),
  setStatus: (id, s) => api.patch(`/payments/${id}/status`, { status: s }),
  refund:    id      => api.post(`/payments/${id}/refund`),
  byOrder:   ordId   => api.get(`/payments/order/${ordId}`),
}
