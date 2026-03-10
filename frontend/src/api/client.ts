import axios from 'axios'

const client = axios.create({
  baseURL: '/familymanager/api',
  timeout: 15000,
})

export default client
