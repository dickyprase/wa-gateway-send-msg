// src/index.js
import 'dotenv/config'
import { createServer } from 'http'
import express from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { waClient } from './wa.js'
import authRoutes from './routes/auth.js'
import gatewayRoutes from './routes/gateway.js'
import sendRoutes from './routes/send.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 3001

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer, {
  cors: { origin: '*' }
})

waClient.setIO(io)

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/gateway', gatewayRoutes)
app.use('/api/send', sendRoutes)

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'views/index.html'))
})

io.on('connection', (socket) => {
  socket.emit('status', waClient.getStatus())
})

httpServer.listen(PORT, () => {
  console.log(`[Gateway] Running at http://localhost:${PORT}`)

  if (existsSync('./auth_info/creds.json')) {
    console.log('[Gateway] Session ditemukan, auto-connecting...')
    waClient.connect()
  } else {
    console.log('[Gateway] Belum ada session. Buka dashboard untuk scan QR.')
  }
})
