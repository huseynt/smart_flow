'use client';

/**
 * Distribution → Tracking (M3 — Distributor tərəfi)
 * Yerləşdir: app/(dashboard)/distribution/supply/product/tracking/page.tsx
 *
 * Axın (accepted statusunda):
 *   1. Fayl Firebase Storage-a yüklənir
 *   2. document_url + delivery_document_url → n8n /webhook/doc_checker → Gemini AI (image render)
 *   3. "OK"  → updateSupplierProductStock() çağrılır, stok yenilənir
 *   4. "SƏHV" → Modal açılır, uyğunsuzluqlar göstərilir, manual qəbul seçimi təklif edilir
 */

import { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection, onSnapshot, doc, updateDoc, arrayUnion,
  getDocs, query, where, increment, addDoc, setDoc,
} from 'firebase/firestore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';
import {
  Truck, Package, CheckCircle, Clock, ChevronRight, ChevronLeft,
  Upload, Hash, Tag, Box, BarChart3, Loader2, AlertTriangle,
  FileText, MapPin, Sparkles, ShoppingCart, ExternalLink, Copy,
  Check, PackageCheck, Building2, Activity, X, ShieldAlert, ShieldCheck,
} from 'lucide-react';

const storage = getStorage();

const N8N_WEBHOOK = 'https://huseynpjt.app.n8n.cloud/webhook/doc_checker';

// ─── Types ────────────────────────────────────────────────────────────────────

type ShipmentStatus = 'pending_shipment' | 'ready' | 'shipped' | 'delivered' | 'accepted';

type TrackingEvent = {
  status: ShipmentStatus;
  timestamp: string;
  note?: string;
};

type SupplyChainOrder = {
  id: string;
  promote_id: string;
  product_id: string;
  barcode: string;
  product_name: string;
  product_category: string;
  uom_conversion: { order_uom: string; units_per_case: number };
  stock_status: {
    supplier_atp_case: number;
    supplier_atp_piece: number;
    bravo_current_stock_piece: number;
    bravo_reorder_point_piece: number;
    health_indicator: string;
    health_order: number;
  };
  logistics: { moq_case: number; lead_time_days: number };
  supplier_id: string;
  supplier_name: string;
  supplier_category?: string;
  ordered_quantity_piece: number;
  ordered_quantity_case: number;
  distributor_note: string | null;
  status: ShipmentStatus;
  tracking_number: string | null;
  tracking_events: TrackingEvent[];
  document_url: string | null;
  delivery_document_url: string | null;
  created_at: string;
  updated_at: string;
};

type SupplierSummary = {
  supplier_id: string;
  supplier_name: string;
  orders: SupplyChainOrder[];
};

type CheckResult =
  | { ok: true }
  | { ok: false; raw: string; supplier_name: string; product_name: string };

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STEPS: { key: ShipmentStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'pending_shipment', label: 'Hazırlanır',   icon: <Clock className="h-4 w-4" /> },
  { key: 'ready',            label: 'Hazır',        icon: <PackageCheck className="h-4 w-4" /> },
  { key: 'shipped',          label: 'Göndərildi',   icon: <Truck className="h-4 w-4" /> },
  { key: 'delivered',        label: 'Çatdı',        icon: <MapPin className="h-4 w-4" /> },
  { key: 'accepted',         label: 'Qəbul edildi', icon: <CheckCircle className="h-4 w-4" /> },
];

const STATUS_ORDER: Record<ShipmentStatus, number> = {
  pending_shipment: 0, ready: 1, shipped: 2, delivered: 3, accepted: 4,
};

const STATUS_BADGE: Record<ShipmentStatus, string> = {
  pending_shipment: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  ready:            'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
  shipped:          'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  delivered:        'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300',
  accepted:         'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
};

// ─── Health helper ────────────────────────────────────────────────────────────

function calcHealth(current: number, reorder: number): {
  health_indicator: 'OUT_OF_STOCK' | 'CRITICAL_LOW' | 'LOW' | 'HEALTHY' | 'OVERSTOCK';
  health_order: number;
} {
  if (current === 0)            return { health_indicator: 'OUT_OF_STOCK', health_order: 0 };
  if (current < reorder * 0.5) return { health_indicator: 'CRITICAL_LOW', health_order: 1 };
  if (current < reorder)       return { health_indicator: 'LOW',          health_order: 2 };
  if (current <= reorder * 2)  return { health_indicator: 'HEALTHY',      health_order: 3 };
  return                              { health_indicator: 'OVERSTOCK',    health_order: 4 };
}

// ─── Stock update ─────────────────────────────────────────────────────────────
// DƏYIŞIKLIK 1: overrideQty parametri əlavə edildi (manual qəbul üçün)

async function updateSupplierProductStock(order: SupplyChainOrder, overrideQty?: number): Promise<void> {
  const nowISO = new Date().toISOString();
  const qty = overrideQty ?? order.ordered_quantity_piece;
  const suppliersRef = collection(db, 'suppliers');
  const supplierSnap = await getDocs(query(suppliersRef, where('supplier_id', '==', order.supplier_id)));

  let supplierDocId: string;

  if (supplierSnap.empty) {
    const newRef = doc(suppliersRef);
    await setDoc(newRef, {
      supplier_id:       order.supplier_id,
      supplier_name:     order.supplier_name,
      supplier_category: order.supplier_category ?? order.product_category?.split(' / ')[0] ?? '',
      total_active_skus: 0,
      last_sync_date:    nowISO,
      created_at:        nowISO,
      updated_at:        nowISO,
    });
    supplierDocId = newRef.id;
  } else {
    supplierDocId = supplierSnap.docs[0].id;
  }

  const productsRef = collection(db, 'suppliers', supplierDocId, 'products');
  const productSnap = await getDocs(query(productsRef, where('barcode', '==', order.barcode)));

  if (productSnap.empty) {
    const reorder  = order.stock_status.bravo_reorder_point_piece;
    const newStock = qty;
    const health   = calcHealth(newStock, reorder);
    await addDoc(productsRef, {
      barcode: order.barcode, product_id: order.product_id, product_name: order.product_name,
      uom_conversion: { order_uom: order.uom_conversion.order_uom, units_per_case: order.uom_conversion.units_per_case },
      stock_status: {
        bravo_current_stock_piece: newStock, bravo_reorder_point_piece: reorder,
        health_indicator: health.health_indicator, health_order: health.health_order,
        supplier_atp_case: order.stock_status.supplier_atp_case, supplier_atp_piece: order.stock_status.supplier_atp_piece,
      },
      logistics: { lead_time_days: order.logistics.lead_time_days, moq_case: order.logistics.moq_case },
      created_at: nowISO, updated_at: nowISO,
    });
    await updateDoc(doc(db, 'suppliers', supplierDocId), {
      total_active_skus: increment(1), last_sync_date: nowISO, updated_at: nowISO,
    });
  } else {
    await Promise.all(productSnap.docs.map((productDoc) => {
      const data    = productDoc.data();
      const reorder = data.stock_status?.bravo_reorder_point_piece ?? 0;
      const current = (data.stock_status?.bravo_current_stock_piece ?? 0) + qty;
      const health  = calcHealth(current, reorder);
      return updateDoc(productDoc.ref, {
        'stock_status.bravo_current_stock_piece': increment(qty),
        'stock_status.health_indicator':          health.health_indicator,
        'stock_status.health_order':              health.health_order,
        updated_at: nowISO,
      });
    }));
    await updateDoc(doc(db, 'suppliers', supplierDocId), { last_sync_date: nowISO, updated_at: nowISO });
  }
}

// ─── AI check (OCR-siz) ───────────────────────────────────────────────────────
// DƏYIŞIKLIK 2: Python OCR tamamilə silindi.
// sender_url + receiver_url birbaşa n8n-ə göndərilir, Gemini orada image render edir.

async function runDocumentCheck(
  senderUrl: string,
  receiverUrl: string,
  order: SupplyChainOrder,
): Promise<CheckResult> {
  const n8nRes = await fetch(N8N_WEBHOOK, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      body: {
        sender_url:   senderUrl,
        receiver_url: receiverUrl,
      },
    }),
  });
  if (!n8nRes.ok) throw new Error(`n8n xətası: ${n8nRes.status}`);

  const n8nData = await n8nRes.json();
  const raw: string = (n8nData?.output ?? n8nData?.result ?? JSON.stringify(n8nData)).trim();

  if (raw.toUpperCase().startsWith('OK')) {
    return { ok: true };
  }
  return {
    ok:            false,
    raw,
    supplier_name: order.supplier_name,
    product_name:  order.product_name,
  };
}

// ─── Uyğunsuzluq Modal ────────────────────────────────────────────────────────
// DƏYIŞIKLIK 3: order + onForceAccept prop-ları əlavə edildi.
// Modal altında manual qəbul bölməsi: say dəyişdirmə + "Yenə Qəbul Et" düyməsi.

function MismatchModal({ result, order, onClose, onForceAccept }: {
  result: Extract<CheckResult, { ok: false }>;
  order: SupplyChainOrder;
  onClose: () => void;
  onForceAccept: (qty: number) => Promise<void>;
}) {
  const [manualQty, setManualQty] = useState(order.ordered_quantity_piece);
  const [accepting, setAccepting] = useState(false);

  const lines = result.raw
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('-'));

  const handleForceAccept = async () => {
    setAccepting(true);
    await onForceAccept(manualQty);
    setAccepting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-6 py-5 bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
              <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-700 dark:text-red-300">Sənəd uyğunsuzluğu aşkar edildi</p>
              <p className="text-xs text-red-600/70 dark:text-red-400/70 mt-0.5">Stok yenilənmədi — təchizatçı ilə yoxlayın</p>
            </div>
          </div>
          <button onClick={onClose} className="text-red-400 hover:text-red-600 transition mt-0.5">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Supplier / product info */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/40">
          <div className="flex items-center gap-3">
            <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">{result.supplier_name}</span>
            <span className="text-gray-300 dark:text-gray-600">·</span>
            <span className="text-sm text-gray-500 dark:text-gray-400 truncate">{result.product_name}</span>
          </div>
        </div>

        {/* Uyğunsuzluqlar */}
        <div className="px-6 py-4 space-y-2 max-h-52 overflow-y-auto">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Aşkar edilən fərqlər</p>
          {lines.length > 0 ? lines.map((line, i) => {
            const body = line.replace(/^-\s*/, '');
            const colonIdx = body.indexOf(':');
            const productPart = colonIdx !== -1 ? body.slice(0, colonIdx).trim() : body;
            const detailPart  = colonIdx !== -1 ? body.slice(colonIdx + 1).trim() : '';
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-red-700 dark:text-red-300 leading-tight">{productPart}</p>
                  {detailPart && <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">{detailPart}</p>}
                </div>
              </div>
            );
          }) : (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900">
              <pre className="text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap font-mono">{result.raw}</pre>
            </div>
          )}
        </div>

        {/* Manual qəbul bölməsi */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-amber-50/60 dark:bg-amber-950/10 space-y-3">
          <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />Manual qəbul
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Problemi qismən qəbul etmək istəyirsinizsə, faktiki qəbul edilən miqdarı daxil edin.
          </p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">
                Qəbul edilən miqdar (ədəd)
              </label>
              <input
                type="number"
                min={1}
                max={order.ordered_quantity_piece}
                value={manualQty}
                onChange={(e) =>
                  setManualQty(Math.max(1, Math.min(order.ordered_quantity_piece, Number(e.target.value))))
                }
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
              <p className="text-[10px] text-gray-400 mt-1">
                Sifariş: {order.ordered_quantity_piece} ədəd
                {manualQty !== order.ordered_quantity_piece && (
                  <span className="text-amber-600 dark:text-amber-400 ml-2">
                    · Fərq: {order.ordered_quantity_piece - manualQty} ədəd
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleForceAccept}
              disabled={accepting || manualQty <= 0}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium transition shadow-sm"
            >
              {accepting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <CheckCircle className="h-4 w-4" />}
              {accepting ? 'Saxlanır...' : 'Yenə Qəbul Et'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">Sənədləri yenidən yükləmək üçün bağlayın.</p>
          <button onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-sm font-medium hover:opacity-90 transition">
            Bağla
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const step = STATUS_STEPS.find((s) => s.key === status)!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status]}`}>
      {step.icon}{step.label}
    </span>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-44 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{value}</span>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr>
      {[40, 10, 24, 16, 8].map((w, i) => (
        <td key={i} className="px-5 py-4">
          <div className={`h-4 w-${w} rounded bg-gray-200 dark:bg-gray-700 animate-pulse`} />
        </td>
      ))}
    </tr>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="ml-1.5 text-gray-400 hover:text-indigo-500 transition-colors">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function DocDisplay({ url, label }: { url: string; label: string }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800">
      <FileText className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-green-700 dark:text-green-400">{label}</p>
        <p className="text-xs text-green-600/60 dark:text-green-500/60 truncate">{url}</p>
      </div>
      <a href={url} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition">
        <ExternalLink className="h-3.5 w-3.5" />Aç
      </a>
    </div>
  );
}

// ─── Tracking Stepper ─────────────────────────────────────────────────────────

function TrackingStepper({ status, events }: { status: ShipmentStatus; events: TrackingEvent[] }) {
  const currentIdx = STATUS_ORDER[status];
  const total = STATUS_STEPS.length - 1;
  return (
    <div className="relative">
      <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 dark:bg-gray-700" />
      <div className="absolute top-5 left-5 h-0.5 bg-indigo-500 transition-all duration-700"
        style={{ width: `${(currentIdx / total) * 100}%`, maxWidth: 'calc(100% - 2.5rem)' }} />
      <div className="relative flex justify-between">
        {STATUS_STEPS.map((step, idx) => {
          const done  = idx <= currentIdx;
          const event = events.find((e) => e.status === step.key);
          return (
            <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10
                ${done
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600'}
                ${idx === currentIdx ? 'ring-4 ring-indigo-100 dark:ring-indigo-900/40' : ''}`}>
                {done && idx < currentIdx ? <Check className="h-4 w-4" /> : step.icon}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${done ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>{step.label}</p>
                {event && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(event.timestamp).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Upload Zone ──────────────────────────────────────────────────────────────

function UploadZone({ onFile, uploading, hint }: { onFile: (f: File) => void; uploading: boolean; hint?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  return (
    <>
      <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${dragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Yüklənir və yoxlanılır...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <Upload className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Sənədi bura sürükləyin</p>
              <p className="text-xs text-gray-400 mt-0.5">və ya <span className="text-indigo-500">seçin</span> · PDF, JPG, PNG, DOC</p>
            </div>
            {hint && (
              <div className="flex items-center gap-2 mt-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />{hint}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

// ─── Order Detail ─────────────────────────────────────────────────────────────

function OrderDetail({ order, onBack, onUpdated }: {
  order: SupplyChainOrder;
  onBack: () => void;
  onUpdated: (msg: string) => void;
}) {
  const [markingDelivered,  setMarkingDelivered]  = useState(false);
  const [uploadingDelivery, setUploadingDelivery] = useState(false);
  const [checkStep,         setCheckStep]         = useState<string>('');
  const [mismatch,          setMismatch]          = useState<Extract<CheckResult, { ok: false }> | null>(null);

  const nowISO = () => new Date().toISOString();
  const s = order.status;

  const handleMarkDelivered = async () => {
    setMarkingDelivered(true);
    try {
      await updateDoc(doc(db, 'supply_chain', order.id), {
        status: 'delivered', updated_at: nowISO(),
        tracking_events: arrayUnion({ status: 'delivered', timestamp: nowISO() }),
      });
      onUpdated('Çatdı kimi işarələndi');
    } catch (err) { console.error(err); }
    finally { setMarkingDelivered(false); }
  };

  const handleDeliveryDocument = async (file: File) => {
    if (!order.document_url) {
      alert('Göndərilmə sənədi (document_url) tapılmadı. Əvvəlcə təchizatçı sənədi yükləməlidir.');
      return;
    }

    setUploadingDelivery(true);
    try {
      // 1. Qəbul sənədini Firebase-ə yüklə
      setCheckStep('Sənəd yüklənir...');
      const storageRef = ref(storage, `supply_chain/${order.id}/delivery_${file.name}`);
      await uploadBytes(storageRef, file);
      const deliveryURL = await getDownloadURL(storageRef);

      // 2. Firestore-a delivery_document_url yaz
      await updateDoc(doc(db, 'supply_chain', order.id), {
        delivery_document_url: deliveryURL,
        updated_at: nowISO(),
      });

      // 3. n8n → Gemini AI yoxlama (OCR-siz, birbaşa URL)
      setCheckStep('Sənədlər AI ilə yoxlanılır...');
      let checkResult: CheckResult;
      try {
        checkResult = await runDocumentCheck(order.document_url, deliveryURL, order);
      } catch (err) {
        console.error('Document check xətası:', err);
        checkResult = { ok: true };
      }

      // 4a. OK → status accepted, stoku yenilə
      if (checkResult.ok) {
        setCheckStep('Stok yenilənir...');
        await updateDoc(doc(db, 'supply_chain', order.id), {
          status: 'accepted', updated_at: nowISO(),
          tracking_events: arrayUnion({
            status: 'accepted', timestamp: nowISO(),
            note: `Qəbul sənədi: ${file.name} — AI yoxlama: OK`,
          }),
        });
        await updateSupplierProductStock(order);
        onUpdated('✓ Sənədlər uyğundur — sifariş tamamlandı, stok yeniləndi');
      } else {
        // 4b. SƏHV → status accepted, stok yenilənmir, modal açılır
        await updateDoc(doc(db, 'supply_chain', order.id), {
          status: 'accepted', updated_at: nowISO(),
          tracking_events: arrayUnion({
            status: 'accepted', timestamp: nowISO(),
            note: `Qəbul sənədi: ${file.name} — AI yoxlama: UYĞUNSUZLUQ`,
          }),
        });
        setMismatch(checkResult);
      }
    } catch (err) {
      console.error('handleDeliveryDocument:', err);
    } finally {
      setUploadingDelivery(false);
      setCheckStep('');
    }
  };

  // Manual qəbul: modal-dan gələn qty ilə stoku yenilə
  const handleForceAccept = async (qty: number) => {
    await updateDoc(doc(db, 'supply_chain', order.id), {
      tracking_events: arrayUnion({
        status:    'accepted',
        timestamp: nowISO(),
        note:      `Manual qəbul: ${qty} ədəd (sifariş: ${order.ordered_quantity_piece} ədəd)`,
      }),
      updated_at: nowISO(),
    });
    await updateSupplierProductStock(order, qty);
    setMismatch(null);
    onUpdated(`✓ Manual qəbul: ${qty} ədəd stoka əlavə edildi`);
  };

  return (
    <>
      {mismatch && (
        <MismatchModal
          result={mismatch}
          order={order}
          onClose={() => setMismatch(null)}
          onForceAccept={handleForceAccept}
        />
      )}

      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <ChevronLeft className="h-4 w-4" />Geri
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{order.product_name}</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">{order.supplier_name}</p>
          </div>
          <StatusBadge status={s} />
        </div>

        {/* Stepper */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">İzləmə vəziyyəti</p>
          <TrackingStepper status={s} events={order.tracking_events} />
          {order.tracking_number && (
            <div className="mt-5 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
              <Hash className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">Tracking nömrəsi:</span>
              <span className="font-mono text-sm font-bold text-indigo-700 dark:text-indigo-300">{order.tracking_number}</span>
              <CopyButton text={order.tracking_number} />
            </div>
          )}
        </div>

        {/* pending / ready */}
        {(s === 'pending_shipment' || s === 'ready') && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
            <Clock className="h-4 w-4 flex-shrink-0" />Təchizatçı sifarişi hazırlayır...
          </div>
        )}

        {/* shipped */}
        {s === 'shipped' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Çatdırılmanı təsdiqlə</span>
            </div>
            <div className="p-5 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Məhsul anbarınıza çatdıqda aşağıdakı düyməyə basın.</p>
                {order.document_url && (
                  <a href={order.document_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-500 hover:text-indigo-600 transition">
                    <FileText className="h-3.5 w-3.5" />Göndərilmə sənədinə bax
                  </a>
                )}
              </div>
              <button onClick={handleMarkDelivered} disabled={markingDelivered}
                className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm">
                {markingDelivered ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {markingDelivered ? 'Saxlanır...' : 'Çatdı ✓'}
              </button>
            </div>
          </div>
        )}

        {/* delivered: qəbul sənədi yüklə */}
        {s === 'delivered' && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30">
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Qəbul sənədini yüklə</span>
            </div>
            <div className="p-5">
              {checkStep && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-sm mb-4">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  {checkStep}
                </div>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Qəbul aktını yükləyin. Sənəd{' '}
                <strong className="text-indigo-600 dark:text-indigo-400">AI ilə avtomatik yoxlanılacaq</strong>{' '}
                — uyğunsa stok yenilənəcək, deyilsə fərqlər göstəriləcək.
              </p>
              <UploadZone
                onFile={handleDeliveryDocument}
                uploading={uploadingDelivery}
                hint="Göndərilmə + qəbul sənədi AI ilə müqayisə edilir"
              />
            </div>
          </div>
        )}

        {/* accepted */}
        {s === 'accepted' && (
          <div className="space-y-4">
            {order.document_url && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Göndərilmə sənədi</span>
                </div>
                <div className="p-5"><DocDisplay url={order.document_url} label="Göndərilmə sənədi" /></div>
              </div>
            )}
            {order.delivery_document_url && (
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Qəbul sənədi</span>
                </div>
                <div className="p-5"><DocDisplay url={order.delivery_document_url} label="Qəbul sənədi" /></div>
              </div>
            )}
            {(() => {
              const lastEvent = [...order.tracking_events].reverse().find((e) => e.status === 'accepted');
              const isOk      = lastEvent?.note?.includes('AI yoxlama: OK');
              const isMismatch = lastEvent?.note?.includes('UYĞUNSUZLUQ');
              const isManual  = lastEvent?.note?.includes('Manual qəbul');
              if (isOk) return (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  Sənədlər uyğundur — sifariş tamamlandı, stok yeniləndi
                </div>
              );
              if (isManual) return (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  {lastEvent?.note}
                </div>
              );
              if (isMismatch) return (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0" />
                  Sənəd uyğunsuzluğu qeydə alındı — stok yenilənmədi
                </div>
              );
              return (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Sifariş uğurla tamamlandı
                </div>
              );
            })()}
          </div>
        )}

        {/* Məhsul / Sifariş məlumatları */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Məhsul məlumatları</span>
            </div>
            <div className="px-5">
              <InfoRow icon={<Hash className="h-4 w-4" />} label="SKU / Barkod"
                value={<span>{order.product_id}<span className="text-gray-400 mx-1">·</span><span className="font-mono text-xs text-gray-500">{order.barcode}</span></span>} />
              <InfoRow icon={<Tag className="h-4 w-4" />} label="Kateqoriya"
                value={<span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">{order.product_category}</span>} />
              <InfoRow icon={<Box className="h-4 w-4" />} label="Qablaşdırma"
                value={`${order.uom_conversion.units_per_case} ədəd / ${order.uom_conversion.order_uom}`} />
              <InfoRow icon={<Truck className="h-4 w-4" />} label="Çatdırılma müddəti"
                value={`${order.logistics.lead_time_days} iş günü`} />
              <InfoRow icon={<BarChart3 className="h-4 w-4" />} label="Sifariş nöqtəsi"
                value={`${order.stock_status.bravo_reorder_point_piece.toLocaleString('az-AZ')} ədəd`} />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sifariş məlumatları</span>
            </div>
            <div className="px-5">
              <InfoRow icon={<ShoppingCart className="h-4 w-4" />} label="Sifariş (koli)"
                value={<span className="text-indigo-600 dark:text-indigo-400 font-bold">{order.ordered_quantity_case.toLocaleString('az-AZ')} koli</span>} />
              <InfoRow icon={<Package className="h-4 w-4" />} label="Sifariş (ədəd)"
                value={`${order.ordered_quantity_piece.toLocaleString('az-AZ')} ədəd`} />
              <InfoRow icon={<Sparkles className="h-4 w-4" />} label="Distributor qeydi"
                value={order.distributor_note ?? <span className="text-gray-400 text-xs italic">Qeyd yoxdur</span>} />
              <InfoRow icon={<Clock className="h-4 w-4" />} label="Sifariş tarixi"
                value={new Date(order.created_at).toLocaleDateString('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' })} />
            </div>
          </div>
        </div>

        {/* Hadisə jurnalı */}
        {order.tracking_events.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Hadisə jurnalı</span>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {[...order.tracking_events].reverse().map((ev, i) => {
                const step = STATUS_STEPS.find((st) => st.key === ev.status);
                return (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <span className={`mt-0.5 flex-shrink-0 p-1.5 rounded-full ${STATUS_BADGE[ev.status]}`}>{step?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{step?.label}</p>
                      {ev.note && <p className="text-xs text-gray-400 mt-0.5">{ev.note}</p>}
                    </div>
                    <span className="text-xs text-gray-400 flex-shrink-0">
                      {new Date(ev.timestamp).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── SupplierProducts ─────────────────────────────────────────────────────────

function SupplierProducts({ supplier, onBack, onUpdated }: {
  supplier: SupplierSummary; onBack: () => void; onUpdated: (msg: string) => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<SupplyChainOrder | null>(null);
  const needsAction = supplier.orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length;

  useEffect(() => {
    if (!selectedOrder) return;
    const updated = supplier.orders.find((o) => o.id === selectedOrder.id);
    if (updated) setSelectedOrder(updated);
  }, [supplier.orders]);

  if (selectedOrder) {
    return (
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-5">
          <button onClick={onBack} className="hover:text-indigo-500 transition-colors">Tracking</button>
          <ChevronRight className="h-3 w-3" />
          <button onClick={() => setSelectedOrder(null)} className="hover:text-indigo-500 transition-colors truncate max-w-[160px]">{supplier.supplier_name}</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700 dark:text-gray-200 font-medium truncate">{selectedOrder.product_name}</span>
        </nav>
        <OrderDetail order={selectedOrder} onBack={() => setSelectedOrder(null)}
          onUpdated={(msg) => { onUpdated(msg); setSelectedOrder(null); }} />
      </div>
    );
  }

  const sorted = [...supplier.orders].sort((a, b) => {
    const aA = a.status === 'shipped' || a.status === 'delivered' ? 0 : 1;
    const bA = b.status === 'shipped' || b.status === 'delivered' ? 0 : 1;
    return aA !== bA ? aA - bA : STATUS_ORDER[b.status] - STATUS_ORDER[a.status];
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <ChevronLeft className="h-4 w-4" />Geri
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500 flex-shrink-0" />{supplier.supplier_name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {supplier.orders.length} sifariş · {needsAction > 0 ? `${needsAction} addım gözləyir` : 'Aktiv əməliyyat yoxdur'}
          </p>
        </div>
        {needsAction > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />{needsAction} gözləyir
          </span>
        )}
      </div>
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Məhsullar</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-800">
                {['Məhsul','Tracking','Sifariş','Status','Tarix',''].map((h,i) => (
                  <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sorted.map((order) => {
                const actionNeeded = order.status === 'shipped' || order.status === 'delivered';
                const lastAccepted = [...order.tracking_events].reverse().find((e) => e.status === 'accepted');
                const hasMismatch  = lastAccepted?.note?.includes('UYĞUNSUZLUQ');
                return (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)}
                    className={`cursor-pointer transition-colors group
                      ${hasMismatch ? 'hover:bg-red-50 dark:hover:bg-red-950/20 bg-red-50/50 dark:bg-red-950/10'
                        : actionNeeded ? 'hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {hasMismatch && <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />}
                        {!hasMismatch && actionNeeded && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 animate-pulse" />}
                        <div className={actionNeeded || hasMismatch ? '' : 'ml-5'}>
                          <p className="font-medium text-gray-900 dark:text-white leading-tight">{order.product_name}</p>
                          <p className="text-xs text-gray-400 mt-0.5 font-mono">{order.product_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      {order.tracking_number
                        ? <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded">{order.tracking_number}</span>
                        : <span className="text-xs text-gray-400 italic">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{order.ordered_quantity_case} koli</span>
                        <span className="text-gray-400 mx-1">·</span>{order.ordered_quantity_piece} ədəd
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        {hasMismatch
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300">
                              <ShieldAlert className="h-3 w-3" />Uyğunsuzluq
                            </span>
                          : <StatusBadge status={order.status} />}
                        <div className="flex gap-0.5 w-24">
                          {STATUS_STEPS.map((step, idx) => (
                            <div key={step.key}
                              className={`h-1 flex-1 rounded-full transition-all
                                ${hasMismatch ? 'bg-red-400' : idx <= STATUS_ORDER[order.status] ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                          ))}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-xs text-gray-400">
                      {new Date(order.created_at).toLocaleDateString('az-AZ', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-4">
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── SuppliersTable ───────────────────────────────────────────────────────────

function SuppliersTable({ suppliers, onSelect }: { suppliers: SupplierSummary[]; onSelect: (s: SupplierSummary) => void }) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Təchizatçılar</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              {['Təchizatçı','Aktiv sifarişlər','Statuslar','Tamamlanan',''].map((h,i) => (
                <th key={i} className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {suppliers.map((supplier) => {
              const active      = supplier.orders.filter((o) => o.status !== 'accepted').length;
              const accepted    = supplier.orders.filter((o) => o.status === 'accepted').length;
              const needsAction = supplier.orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length;
              const hasMismatch = supplier.orders.some((o) =>
                [...o.tracking_events].reverse().find((e) => e.status === 'accepted')?.note?.includes('UYĞUNSUZLUQ')
              );
              const statusCounts: Partial<Record<ShipmentStatus, number>> = {};
              for (const o of supplier.orders) statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;

              return (
                <tr key={supplier.supplier_id} onClick={() => onSelect(supplier)}
                  className={`cursor-pointer transition-colors group
                    ${hasMismatch ? 'hover:bg-red-50 dark:hover:bg-red-950/20'
                      : needsAction > 0 ? 'hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                        ${hasMismatch ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                          : needsAction > 0 ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        {hasMismatch ? <ShieldAlert className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{supplier.supplier_name}</p>
                        <p className="text-xs text-gray-400">{supplier.orders.length} sifariş</p>
                      </div>
                      {hasMismatch && (
                        <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[10px] font-bold">
                          Uyğunsuzluq
                        </span>
                      )}
                      {!hasMismatch && needsAction > 0 && (
                        <span className="ml-1 w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                          {needsAction}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className={`text-sm font-bold ${active > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>{active}</span>
                    <span className="text-xs text-gray-400 ml-1">aktiv</span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {(Object.entries(statusCounts) as [ShipmentStatus, number][])
                        .filter(([, cnt]) => cnt > 0)
                        .sort(([a], [b]) => STATUS_ORDER[a] - STATUS_ORDER[b])
                        .map(([st, cnt]) => {
                          const step = STATUS_STEPS.find((s) => s.key === st)!;
                          return (
                            <span key={st} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[st]}`}>
                              {step.icon}{cnt}
                            </span>
                          );
                        })}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {accepted > 0 ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-semibold text-green-600 dark:text-green-400">{accepted}</span>
                      </div>
                    ) : <span className="text-xs text-gray-400 italic">—</span>}
                  </td>
                  <td className="px-5 py-4">
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function DistributionTrackingPage() {
  useRequireAuth({ requiredRole: UserRole.DISTRIBUTION });

  const [orders, setOrders]                     = useState<SupplyChainOrder[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierSummary | null>(null);
  const [successMsg, setSuccessMsg]             = useState('');

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'supply_chain'),
      (snap) => { setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupplyChainOrder))); setLoading(false); },
      (err)  => { console.error(err); setLoading(false); }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!selectedSupplier) return;
    const supplierOrders = orders.filter((o) => o.supplier_id === selectedSupplier.supplier_id);
    setSelectedSupplier((prev) => prev ? { ...prev, orders: supplierOrders } : null);
  }, [orders]);

  const suppliers = Object.values(
    orders.reduce<Record<string, SupplierSummary>>((acc, order) => {
      if (!acc[order.supplier_id]) acc[order.supplier_id] = { supplier_id: order.supplier_id, supplier_name: order.supplier_name, orders: [] };
      acc[order.supplier_id].orders.push(order);
      return acc;
    }, {})
  ).sort((a, b) => {
    const aA = a.orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length;
    const bA = b.orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length;
    return bA - aA;
  });

  const totalActionNeeded = orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length;
  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 4000); };

  if (selectedSupplier) {
    return (
      <div className="max-w-5xl mx-auto">
        <SupplierProducts supplier={selectedSupplier} onBack={() => setSelectedSupplier(null)} onUpdated={showSuccess} />
      </div>
    );
  }

  const statCounts = {
    pending_shipment: orders.filter((o) => o.status === 'pending_shipment').length,
    ready:            orders.filter((o) => o.status === 'ready').length,
    shipped:          orders.filter((o) => o.status === 'shipped').length,
    delivered:        orders.filter((o) => o.status === 'delivered').length,
    accepted:         orders.filter((o) => o.status === 'accepted').length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="h-6 w-6 text-indigo-500" />Tracking
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gözlənilən çatdırılmalar və qəbul vəziyyəti</p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />{successMsg}
        </div>
      )}

      {!loading && totalActionNeeded > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <strong>{totalActionNeeded}</strong> sifariş təsdiq gözləyir
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {STATUS_STEPS.map((step) => {
            const cnt = statCounts[step.key as keyof typeof statCounts];
            return (
              <div key={step.key} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4 text-center">
                <div className={`inline-flex p-2 rounded-lg mb-2 ${STATUS_BADGE[step.key]}`}>{step.icon}</div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{cnt}</p>
                <p className="text-xs text-gray-400 mt-0.5">{step.label}</p>
              </div>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
            <div className="h-3 w-24 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
          </div>
          <table className="w-full"><tbody>{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</tbody></table>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
          <Truck className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Aktiv çatdırılma yoxdur</p>
          <p className="text-xs mt-1">Distributor hələ heç bir məhsul qəbul etməyib</p>
        </div>
      ) : (
        <SuppliersTable suppliers={suppliers} onSelect={setSelectedSupplier} />
      )}
    </div>
  );
}