"""
Document Extraction Service
============================
POST /extract-documents
  - multipart/form-data
  - Fields: sender_document (file), receiver_document (file)
  - Returns: { sender: { filename, text, ... }, receiver: { filename, text, ... } }

Dəstəklənən formatlar: PDF, JPG, JPEG, PNG, DOC, DOCX
"""

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pdfplumber
import pytesseract
from PIL import Image
from docx import Document
import io
import os
import tempfile
import uvicorn
from typing import Optional

app = FastAPI(title="Document Extraction Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production-da Next.js URL-ini qoy
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Text extractors ────────────────────────────────────────────────────────────

def extract_from_pdf(data: bytes) -> str:
    """PDF-dən pdfplumber ilə text çıxar. Boş çıxarsa Tesseract OCR işlət."""
    text_parts = []
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            t = page.extract_text()
            if t:
                text_parts.append(t)
            else:
                # Scanned PDF: page-i image-ə çevir, OCR et
                img = page.to_image(resolution=200).original
                ocr_text = pytesseract.image_to_string(img, lang="eng+aze")
                text_parts.append(ocr_text)
    return "\n".join(text_parts).strip()


def extract_from_image(data: bytes) -> str:
    """JPG/PNG → Tesseract OCR."""
    img = Image.open(io.BytesIO(data))
    # RGB-ə çevir (RGBA və ya palette image-lər üçün)
    if img.mode not in ("RGB", "L"):
        img = img.convert("RGB")
    text = pytesseract.image_to_string(img, lang="eng+aze")
    return text.strip()


def extract_from_docx(data: bytes) -> str:
    """DOCX faylından text çıxar."""
    doc = Document(io.BytesIO(data))
    paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
    # Cədvəlləri də al
    table_rows = []
    for table in doc.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                table_rows.append(" | ".join(cells))
    all_text = paragraphs + table_rows
    return "\n".join(all_text).strip()


def extract_text(filename: str, data: bytes) -> str:
    """Fayl adına görə uyğun extractor seç."""
    ext = os.path.splitext(filename.lower())[1]
    if ext == ".pdf":
        return extract_from_pdf(data)
    elif ext in (".jpg", ".jpeg", ".png"):
        return extract_from_image(data)
    elif ext in (".docx", ".doc"):
        try:
            return extract_from_docx(data)
        except Exception:
            # .doc (köhnə format) üçün LibreOffice yoxdursa boş qaytar
            return "[Köhnə .doc formatı dəstəklənmir — DOCX olaraq yükləyin]"
    else:
        raise HTTPException(
            status_code=415,
            detail=f"Dəstəklənməyən fayl formatı: {ext}. PDF, JPG, PNG, DOCX göndərin."
        )


# ── Endpoints ──────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "document-extraction"}


@app.post("/extract-documents")
async def extract_documents(
    sender_document: UploadFile = File(..., description="Göndərilmə sənədi (PDF/JPG/PNG/DOCX)"),
    receiver_document: UploadFile = File(..., description="Qəbul sənədi (PDF/JPG/PNG/DOCX)"),
):
    """
    İki sənədi qəbul edib hər birindən text çıxarır.

    Returns:
        {
          "sender": {
            "filename": "...",
            "content_type": "...",
            "size_bytes": 12345,
            "text": "Sənədin tam mətni..."
          },
          "receiver": {
            "filename": "...",
            "content_type": "...",
            "size_bytes": 12345,
            "text": "Sənədin tam mətni..."
          }
        }
    """
    results = {}

    for role, upload in [("sender", sender_document), ("receiver", receiver_document)]:
        data = await upload.read()
        if not data:
            raise HTTPException(status_code=400, detail=f"{role} sənədi boşdur.")

        try:
            text = extract_text(upload.filename or "file.pdf", data)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"{role} sənədi oxunarkən xəta: {str(e)}"
            )

        results[role] = {
            "filename":     upload.filename,
            "content_type": upload.content_type,
            "size_bytes":   len(data),
            "text":         text,
        }

    return results


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)