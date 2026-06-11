// src/routes/gateway.js
import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { waClient } from '../wa.js'

const router = Router()

router.use(requireAuth)

router.get('/status', (req, res) => {
  res.json({ success: true, ...waClient.getStatus() })
})

router.post('/connect', async (req, res) => {
  await waClient.connect()
  res.json({ success: true, message: 'Connecting... Cek QR di dashboard' })
})

router.post('/disconnect', async (req, res) => {
  await waClient.disconnect()
  res.json({ success: true, message: 'Disconnected' })
})

router.post('/refresh-qr', async (req, res) => {
  await waClient.disconnect()
  await waClient.connect()
  res.json({ success: true, message: 'Refreshing QR...' })
})

export default router
