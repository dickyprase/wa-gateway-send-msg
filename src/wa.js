// src/wa.js
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  Browsers
} from '@itsliaaa/baileys'
import pino from 'pino'
import { existsSync } from 'fs'
import { rm } from 'fs/promises'
import qrcode from 'qrcode'

const AUTH_FOLDER = './auth_info'

class WAClient {
  constructor() {
    this.sock = null
    this.io = null
    this.status = 'disconnected'
    this.connectedPhone = null
    this.currentQR = null
  }

  setIO(io) {
    this.io = io
  }

  emit(event, data) {
    this.io?.emit(event, data)
  }

  async connect() {
    if (this.status === 'connected' || this.status === 'connecting') return

    this.status = 'connecting'
    this.emit('status', { status: 'connecting' })

    const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER)

    this.sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }),
      browser: Browsers.ubuntu('Chrome'),
      connectTimeoutMs: 60_000,
      retryRequestDelayMs: 2000,
      maxMsgRetryCount: 3,
      getMessage: async () => undefined,
    })

    this.sock.ev.on('creds.update', saveCreds)

    this.sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        this.status = 'qr_ready'
        this.currentQR = await qrcode.toDataURL(qr)
        this.emit('status', { status: 'qr_ready', qr: this.currentQR })
      }

      if (connection === 'open') {
        this.status = 'connected'
        this.connectedPhone = this.sock.user?.id?.split(':')[0] ?? null
        this.currentQR = null
        this.emit('status', { status: 'connected', phone: this.connectedPhone })
        console.log(`[WA] Connected as ${this.connectedPhone}`)
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = code !== DisconnectReason.loggedOut

        console.log(`[WA] Connection closed. Code: ${code}. Reconnect: ${shouldReconnect}`)

        this.status = 'disconnected'
        this.connectedPhone = null
        this.currentQR = null
        this.emit('status', { status: 'disconnected' })

        if (shouldReconnect) {
          setTimeout(() => this.connect(), 3000)
        } else {
          await this._clearSession()
        }
      }
    })
  }

  async disconnect() {
    try {
      await this.sock?.logout()
    } catch (_) {}
    await this._clearSession()
    this.sock = null
    this.status = 'disconnected'
    this.connectedPhone = null
    this.currentQR = null
    this.emit('status', { status: 'disconnected' })
  }

  async _clearSession() {
    if (existsSync(AUTH_FOLDER)) {
      await rm(AUTH_FOLDER, { recursive: true, force: true })
    }
  }

  async sendMessage(phone, message) {
    if (this.status !== 'connected' || !this.sock) {
      return { success: false, phone, error: 'WA not connected' }
    }

    const jid = this._normalizePhone(phone)
    if (!jid) {
      return { success: false, phone, error: 'Invalid phone number format' }
    }

    try {
      await this.sock.sendMessage(jid, { text: message })
      return { success: true, phone: jid }
    } catch (err) {
      console.error(`[WA] Failed to send to ${jid}:`, err.message)
      return { success: false, phone: jid, error: err.message }
    }
  }

  _normalizePhone(phone) {
    const digits = phone.replace(/\D/g, '')
    if (!digits) return null
    let normalized = digits
    if (digits.startsWith('0')) {
      normalized = '62' + digits.slice(1)
    } else if (!digits.startsWith('62')) {
      normalized = '62' + digits
    }
    return normalized + '@s.whatsapp.net'
  }

  getStatus() {
    return {
      status: this.status,
      phone: this.connectedPhone,
      qr: this.currentQR,
    }
  }
}

export const waClient = new WAClient()
