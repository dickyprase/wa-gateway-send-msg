# WA Gateway Send Msg

WhatsApp Gateway untuk mengirim pesan otomatis via API. Ringan, standalone, tanpa database.

## Fitur

- Kirim pesan WA ke 1 nomor atau broadcast ke banyak nomor sekaligus
- Dashboard web dengan QR code scanning (realtime via Socket.IO)
- Refresh QR code tanpa restart server
- Auto-reconnect jika koneksi terputus
- API Key auth untuk endpoint kirim pesan
- JWT auth untuk dashboard
- Responsive, mobile-first UI (dark theme, ~19KB)
- Zero database — session disimpan di file

## Arsitektur

```
[Aplikasi Kamu]  ──HTTP POST──▶  [WA Gateway]  ──▶  [WhatsApp]
   Kirim nomor + pesan              Terima & kirim WA
```

Gateway hanya punya 2 tanggung jawab:
1. Menjaga koneksi WhatsApp tetap hidup
2. Menerima request → forward ke WhatsApp

## Install

```bash
git clone https://github.com/dickyprase/wa-gateway-send-msg.git
cd wa-gateway-send-msg
npm install
cp .env.example .env
```

Edit `.env` sesuai kebutuhan:

```env
PORT=3001
JWT_SECRET=random_string_min_32_karakter
JWT_EXPIRES_IN=24h
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=your_password
WA_API_KEY=your_api_key_for_send
```

Jalankan:

```bash
npm run dev
```

Buka `http://localhost:3001` → login → klik **Connect & Scan QR**.

## API Endpoint

| Method | Endpoint | Auth | Keterangan |
|--------|----------|------|------------|
| `GET` | `/` | - | Dashboard web |
| `POST` | `/api/auth/login` | - | Login, dapat JWT token |
| `GET` | `/api/gateway/status` | JWT | Status koneksi WA |
| `POST` | `/api/gateway/connect` | JWT | Mulai connect & tampilkan QR |
| `POST` | `/api/gateway/disconnect` | JWT | Logout & hapus session |
| `POST` | `/api/gateway/refresh-qr` | JWT | Generate QR baru |
| `POST` | `/api/send` | API Key | **Kirim pesan WA** |

## Cara Pakai

### Kirim ke 1 nomor

```bash
curl -X POST http://localhost:3001/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{"to":"6281234567890","message":"Halo dari gateway"}'
```

### Broadcast ke banyak nomor

```bash
curl -X POST http://localhost:3001/api/send \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{
    "recipients": ["6281234567890", "6289876543210"],
    "message": "Pesan broadcast"
  }'
```

### Response

```json
{
  "success": true,
  "sent": 2,
  "failed": 0,
  "results": [
    { "success": true, "phone": "6281234567890@s.whatsapp.net" },
    { "success": true, "phone": "6289876543210@s.whatsapp.net" }
  ]
}
```

## Contoh Integrasi PHP

```php
function send_wa($recipients, $message) {
    $payload = ['message' => $message];
    if (is_array($recipients)) {
        $payload['recipients'] = array_values(array_filter($recipients));
    } else {
        $payload['to'] = $recipients;
    }

    $ch = curl_init('http://localhost:3001/api/send');
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT        => 5,
        CURLOPT_CONNECTTIMEOUT => 3,
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'x-api-key: YOUR_API_KEY',
        ],
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    if (!$response) return false;
    $data = json_decode($response, true);
    return !empty($data['success']);
}

// Contoh
send_wa('6281234567890', 'Halo!');
send_wa(['628111', '628222'], 'Pesan broadcast');
```

## Tips

- Format nomor: `08xx`, `628xx`, atau `8xx` — auto normalisasi ke internasional
- Pesan mendukung format WA: `*bold*`, `_italic_`, `~strikethrough~`
- Auto-reconnect: koneksi terputus → reconnect otomatis dalam 3 detik
- Session tersimpan di `auth_info/` — sudah di `.gitignore`
- Jeda 300ms antar pesan saat broadcast untuk hindari rate limit

## Tech Stack

- **Runtime:** Node.js >= 20
- **Framework:** Express.js
- **WA Library:** [@itsliaaa/baileys](https://github.com/itsliaaa/baileys) (Baileys v7)
- **Realtime:** Socket.IO
- **Auth:** JWT + API Key
- **Zero Database**

## License

MIT
