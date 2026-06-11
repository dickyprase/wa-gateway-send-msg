// src/routes/send.js
import { Router } from 'express'
import { waClient } from '../wa.js'

const router = Router()

function validateApiKey(req, res, next) {
  const key = req.headers['x-api-key']
  if (!key || key !== process.env.WA_API_KEY) {
    return res.status(401).json({ success: false, error: 'Invalid API key' })
  }
  next()
}

/**
 * POST /api/send
 *
 * Mode 1: Kirim ke SATU nomor
 * { "to": "6281234567890", "message": "Teks pesan..." }
 *
 * Mode 2: Broadcast ke BANYAK nomor
 * { "recipients": ["6281234567890", "6289876543210"], "message": "Teks pesan..." }
 */
router.post('/', validateApiKey, async (req, res) => {
  const { to, recipients, message } = req.body

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, error: 'Field "message" wajib diisi' })
  }

  let targets = []
  if (recipients && Array.isArray(recipients)) {
    targets = recipients.filter(Boolean)
  } else if (to && typeof to === 'string') {
    targets = [to]
  }

  if (targets.length === 0) {
    return res.status(400).json({ success: false, error: 'Field "to" atau "recipients" wajib diisi' })
  }

  const results = []
  for (const phone of targets) {
    const result = await waClient.sendMessage(phone, message.trim())
    results.push(result)
    if (targets.length > 1) {
      await new Promise(r => setTimeout(r, 300))
    }
  }

  const sent = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  res.json({
    success: failed === 0,
    sent,
    failed,
    results,
  })
})

export default router
