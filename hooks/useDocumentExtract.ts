/**
 * useDocumentExtract.ts
 *
 * OrderDetail component-dən istifadə nümunəsi.
 * Hər iki sənəd (document_url + delivery_document_url) URL-dən fetch edilib
 * API-yə göndərilir.
 */

export type ExtractedDoc = {
  filename: string;
  content_type: string;
  size_bytes: number;
  text: string;
};

export type ExtractResult = {
  sender: ExtractedDoc;
  receiver: ExtractedDoc;
};

/**
 * İki Firebase Storage URL-indən faylları yükləyib
 * /api/documents/extract endpoint-inə göndər.
 *
 * @param senderUrl    - order.document_url          (göndərilmə sənədi)
 * @param receiverUrl  - order.delivery_document_url (qəbul sənədi)
 */
export async function extractDocuments(
  senderUrl: string,
  receiverUrl: string
): Promise<ExtractResult> {
  // 1. Faylları fetch et
  const [senderBlob, receiverBlob] = await Promise.all([
    fetch(senderUrl).then((r) => r.blob()),
    fetch(receiverUrl).then((r) => r.blob()),
  ]);

  // Fayl adını URL-dən çıxar (sonuncu path segment)
  const nameOf = (url: string, fallback: string) => {
    try {
      const u = new URL(url);
      const seg = u.pathname.split("/").pop();
      return seg ? decodeURIComponent(seg) : fallback;
    } catch {
      return fallback;
    }
  };

  const senderFile = new File(
    [senderBlob],
    nameOf(senderUrl, "sender_document.pdf"),
    { type: senderBlob.type }
  );
  const receiverFile = new File(
    [receiverBlob],
    nameOf(receiverUrl, "receiver_document.pdf"),
    { type: receiverBlob.type }
  );

  // 2. FormData yarat
  const form = new FormData();
  form.append("sender_document", senderFile);
  form.append("receiver_document", receiverFile);

  // 3. Next.js API route-una göndər
  const res = await fetch("/api/documents/extract", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Sənəd çıxarılması uğursuz oldu");
  }

  return res.json() as Promise<ExtractResult>;
}

// ─── OrderDetail-də istifadə nümunəsi ─────────────────────────────────────────
/*
  import { extractDocuments } from '@/hooks/useDocumentExtract';

  // "accepted" statusuna keçəndə çağır:
  const handleSendToAI = async () => {
    if (!order.document_url || !order.delivery_document_url) return;

    const result = await extractDocuments(
      order.document_url,
      order.delivery_document_url
    );

    // n8n webhook-una göndər:
    await fetch(process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order_id:  order.id,
        supplier:  order.supplier_name,
        product:   order.product_name,
        sender:    result.sender,    // { filename, text, ... }
        receiver:  result.receiver,  // { filename, text, ... }
      }),
    });
  };
*/