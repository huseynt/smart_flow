# Document Extraction Service

## Fayllar

| Fayl | Yer | Məqsəd |
|------|-----|--------|
| `main.py` | Python server | PDF/JPG/PNG/DOCX → text |
| `requirements.txt` | Python | Dependencies |
| `route.ts` | `app/api/documents/extract/route.ts` | Next.js API proxy |
| `useDocumentExtract.ts` | `hooks/` | Frontend helper |

---

## 1. Python Service Qurulumu

```bash
# Tesseract OCR qur (sistem paketi)
# Ubuntu/Debian:
sudo apt install tesseract-ocr tesseract-ocr-aze

# macOS:
brew install tesseract

# Python dependencies
pip install -r requirements.txt

# Servisi işlət
python main.py
# → http://localhost:8000
```

---

## 2. Next.js `.env.local`

```env
DOCUMENT_EXTRACTION_SERVICE_URL=http://localhost:8000
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n.com/webhook/xxx
```

---

## 3. `route.ts` Yerləşdir

```
app/
  api/
    documents/
      extract/
        route.ts   ← bu fayl
```

---

## 4. API Response Formatı

```json
{
  "sender": {
    "filename": "gondermə_senədi.pdf",
    "content_type": "application/pdf",
    "size_bytes": 45231,
    "text": "GÖNDƏRMƏ AKTI\n\nTəchizatçı: Azər Food MMC\nTarix: 12.05.2025\n..."
  },
  "receiver": {
    "filename": "qebul_akti.jpg",
    "content_type": "image/jpeg",
    "size_bytes": 238900,
    "text": "QƏBUL AKTI\n\nDistributor: Bravo Supermarket\nTarix: 14.05.2025\n..."
  }
}
```

---

## 5. n8n Webhook İnteqrasiyası

n8n-də **Webhook** node → **HTTP Request** node axını:

```
Webhook (POST gözlə)
  ↓
Code node: sender.text + receiver.text ayır
  ↓
AI Agent (Claude/GPT): sənədləri müqayisə et, uyğunsuzluq tap
  ↓
Respond to Webhook (nəticəni qaytar)
```

Frontend-dən göndərin:

```typescript
await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    order_id: order.id,
    sender:   result.sender,    // tam text daxil
    receiver: result.receiver,
  }),
});
```

---

## Production

Python service-i Docker ilə deploy et:

```dockerfile
FROM python:3.11-slim
RUN apt-get update && apt-get install -y tesseract-ocr tesseract-ocr-aze
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY main.py .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```