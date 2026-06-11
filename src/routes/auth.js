// src/routes/auth.js
import { Router } from 'express'
import jwt from 'jsonwebtoken'

const router = Router()

router.post('/login', (req, res) => {
  const { username, password } = req.body

  if (
    username !== process.env.DASHBOARD_USERNAME ||
    password !== process.env.DASHBOARD_PASSWORD
  ) {
    return res.status(401).json({ success: false, error: 'Username atau password salah' })
  }

  const token = jwt.sign(
    { username },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  )

  res.json({ success: true, token })
})

export default router
