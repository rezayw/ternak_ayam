# Security Checker - Farm App

Python CLI untuk menguji skenario keamanan API ternak ayam (auth, CSRF, upload, akses kontrol, validasi input, payload berbahaya).

## Persiapan
1) Opsional: buat virtualenv
```bash
python -m venv .venv
source .venv/bin/activate
```

2) Install dependensi
```bash
pip install -r requirements.txt
```

3) Siapkan server target di `http://localhost:4321` atau override dengan `--base-url`.

## Menjalankan
Jalankan semua skenario:
```bash
python src/main.py
```

Pilih skenario tertentu (pisah koma):
```bash
python src/main.py --only auth_wrong_password,csrf_missing_token
```

Lihat daftar skenario tanpa eksekusi:
```bash
python src/main.py --list
```

Tambah detail body respons:
```bash
python src/main.py --verbose
```

Override konfigurasi via YAML (opsional):
```yaml
base_url: "http://localhost:4321"
headers:
  x-custom: demo
cookies:
  extra: demo-cookie
```

Gunakan:
```bash
python src/main.py --config config.yaml
```

## Payload
Payload uji berada di `data/payloads/`:
- malware.exe: placeholder untuk uji MIME block
- evil.txt: placeholder untuk nama file traversal
- image.png: placeholder untuk uji RBAC upload

## Skenario
- Auth: wrong password (401), pending approval (403 + body PENDING_APPROVAL), captcha salah (400), SQLi-style login (401)
- CSRF: tanpa token (403), token kadaluarsa (403)
- Upload: blok .exe (400/415), RBAC user (401/403), nama ../evil.sh aman (200-202 + body tidak memuat "../"), spoof MIME exe jadi png (400/415)
- Access control: IDOR download (401/403), user eskalasi update farm (302/401/403)
- Validasi input: angka disalahgunakan (400/422)
- Payload berbahaya: notes XSS disanitasi (400/403/422/302 atau respons tanpa `<script`)
