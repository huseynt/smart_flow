/**
 * app/api/documents/extract/route.ts
 *
 * Distributor tracking page-dən iki sənəd alır:
 *   - sender_document   (göndərilmə sənədi / document_url)
 *   - receiver_document (qəbul sənədi / delivery_document_url)
 *
 * Python FastAPI service-ə forward edir → sender/receiver JSON qaytarır.
 *
 * İstifadə: FormData ilə POST /api/documents/extract
 */

import { NextRequest, NextResponse } from "next/server";

const PYTHON_SERVICE_URL =
  process.env.DOCUMENT_EXTRACTION_SERVICE_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const senderDoc = formData.get("sender_document");
    const receiverDoc = formData.get("receiver_document");

    if (!senderDoc || !(senderDoc instanceof File)) {
      return NextResponse.json(
        { error: "sender_document tələb olunur" },
        { status: 400 }
      );
    }
    if (!receiverDoc || !(receiverDoc instanceof File)) {
      return NextResponse.json(
        { error: "receiver_document tələb olunur" },
        { status: 400 }
      );
    }

    // Python service-ə forward et
    const upstream = new FormData();
    upstream.append("sender_document", senderDoc, senderDoc.name);
    upstream.append("receiver_document", receiverDoc, receiverDoc.name);

    const pythonRes = await fetch(`${PYTHON_SERVICE_URL}/extract-documents`, {
      method: "POST",
      body: upstream,
    });

    if (!pythonRes.ok) {
      const detail = await pythonRes.text();
      return NextResponse.json(
        { error: "Sənəd çıxarılması uğursuz oldu", detail },
        { status: pythonRes.status }
      );
    }

    const result = await pythonRes.json();

    /*
      result formatı:
      {
        sender: {
          filename: string,
          content_type: string,
          size_bytes: number,
          text: string          ← bütün mətni n8n-ə göndərəcəksiniz
        },
        receiver: {
          filename: string,
          content_type: string,
          size_bytes: number,
          text: string
        }
      }
    */
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("[/api/documents/extract] xəta:", err);
    return NextResponse.json(
      { error: "Server xətası", detail: String(err) },
      { status: 500 }
    );
  }
}

// Fayl upload üçün body limit-i artır (default 4 MB)
// export const config = {
//   api: { bodyParser: false },
// };