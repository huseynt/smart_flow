'use client';

/**
 * Distribution → Təchizat / Tracking (M3 — Distributor tərəfi)
 *
 * Yerləşdir: app/(dashboard)/distribution/supply/product/tracking/page.tsx
 *
 * updateSupplierProductStock düzəlişi:
 *   - suppliers koleksiyasında supplier_id field-i ilə sənəd axtarır
 *   - Tapıldısa: həmin sənədin products sub-koleksiyasına yazır
 *   - Tapılmadısa: yeni supplier sənədi + product yaradır
 */

import { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  getDocs,
  query,
  where,
  increment,
  addDoc,
  setDoc,
} from 'firebase/firestore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';
import {
  Truck,
  Package,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  Upload,
  Hash,
  Tag,
  Box,
  BarChart3,
  Loader2,
  AlertTriangle,
  FileText,
  MapPin,
  Sparkles,
  ShoppingCart,
  ExternalLink,
  Copy,
  Check,
  PackageCheck,
  Building2,
  Activity,
} from 'lucide-react';

// ─── Firebase Storage ─────────────────────────────────────────────────────────

const storage = getStorage();

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

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STEPS: { key: ShipmentStatus; label: string; icon: React.ReactNode }[] = [
  { key: 'pending_shipment', label: 'Hazırlanır',   icon: <Clock className="h-4 w-4" /> },
  { key: 'ready',            label: 'Hazır',        icon: <PackageCheck className="h-4 w-4" /> },
  { key: 'shipped',          label: 'Göndərildi',   icon: <Truck className="h-4 w-4" /> },
  { key: 'delivered',        label: 'Çatdı',        icon: <MapPin className="h-4 w-4" /> },
  { key: 'accepted',         label: 'Qəbul edildi', icon: <CheckCircle className="h-4 w-4" /> },
];

const STATUS_ORDER: Record<ShipmentStatus, number> = {
  pending_shipment: 0,
  ready:            1,
  shipped:          2,
  delivered:        3,
  accepted:         4,
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
  if (current === 0)              return { health_indicator: 'OUT_OF_STOCK', health_order: 0 };
  if (current < reorder * 0.5)   return { health_indicator: 'CRITICAL_LOW', health_order: 1 };
  if (current < reorder)         return { health_indicator: 'LOW',          health_order: 2 };
  if (current <= reorder * 2)    return { health_indicator: 'HEALTHY',      health_order: 3 };
  return                                { health_indicator: 'OVERSTOCK',    health_order: 4 };
}

// ─── Stock update ─────────────────────────────────────────────────────────────
//
// Axın:
//   1. suppliers koleksiyasında supplier_id field-i == order.supplier_id olan sənəd axtar
//   2. Tapılmadısa → yeni supplier sənədi yarat (supplier_id field-i ilə)
//   3. Həmin supplier sənədinin products sub-koleksiyasında barcode axtar
//   4. Tapıldısa → stock yenilə  |  Tapılmadısa → yeni product sənədi yarat

async function updateSupplierProductStock(order: SupplyChainOrder): Promise<void> {
  try {
    const nowISO = new Date().toISOString();

    // ── 1. supplier sənədini tap ──────────────────────────────────────────────
    const suppliersRef = collection(db, 'suppliers');
    const supplierSnap = await getDocs(
      query(suppliersRef, where('supplier_id', '==', order.supplier_id))
    );

    let supplierDocId: string;

    if (supplierSnap.empty) {
      // ── 2. Yeni supplier sənədi yarat ──────────────────────────────────────
      const newSupplierRef = doc(suppliersRef); // auto-id
      await setDoc(newSupplierRef, {
        supplier_id:       order.supplier_id,
        supplier_name:     order.supplier_name,
        supplier_category: order.supplier_category ?? order.product_category?.split(' / ')[0] ?? '',
        total_active_skus: 0,
        last_sync_date:    nowISO,
        created_at:        nowISO,
        updated_at:        nowISO,
      });
      supplierDocId = newSupplierRef.id;
      console.log(`updateSupplierProductStock: yeni supplier yaradıldı → suppliers/${supplierDocId}`);
    } else {
      supplierDocId = supplierSnap.docs[0].id;
    }

    // ── 3. products sub-koleksiyasında barcode axtar ──────────────────────────
    const productsRef = collection(db, 'suppliers', supplierDocId, 'products');
    const productSnap = await getDocs(
      query(productsRef, where('barcode', '==', order.barcode))
    );

    if (productSnap.empty) {
      // ── 4a. Yeni product sənədi yarat ──────────────────────────────────────
      const reorder  = order.stock_status.bravo_reorder_point_piece;
      const newStock = order.ordered_quantity_piece;
      const health   = calcHealth(newStock, reorder);

      await addDoc(productsRef, {
        barcode:      order.barcode,
        product_id:   order.product_id,
        product_name: order.product_name,
        uom_conversion: {
          order_uom:      order.uom_conversion.order_uom,
          units_per_case: order.uom_conversion.units_per_case,
        },
        stock_status: {
          bravo_current_stock_piece: newStock,
          bravo_reorder_point_piece: reorder,
          health_indicator:          health.health_indicator,
          health_order:              health.health_order,
          supplier_atp_case:         order.stock_status.supplier_atp_case,
          supplier_atp_piece:        order.stock_status.supplier_atp_piece,
        },
        logistics: {
          lead_time_days: order.logistics.lead_time_days,
          moq_case:       order.logistics.moq_case,
        },
        created_at: nowISO,
        updated_at: nowISO,
      });

      // supplier-in total_active_skus-unu artır
      await updateDoc(doc(db, 'suppliers', supplierDocId), {
        total_active_skus: increment(1),
        last_sync_date:    nowISO,
        updated_at:        nowISO,
      });

      console.log(`updateSupplierProductStock: "${order.product_name}" — yeni məhsul yaradıldı (suppliers/${supplierDocId}/products)`);
    } else {
      // ── 4b. Mövcud product stokunu yenilə ────────────────────────────────
      await Promise.all(
        productSnap.docs.map((productDoc) => {
          const data    = productDoc.data();
          const reorder = data.stock_status?.bravo_reorder_point_piece ?? 0;
          const current = (data.stock_status?.bravo_current_stock_piece ?? 0) + order.ordered_quantity_piece;
          const health  = calcHealth(current, reorder);
          return updateDoc(productDoc.ref, {
            'stock_status.bravo_current_stock_piece': increment(order.ordered_quantity_piece),
            'stock_status.health_indicator':          health.health_indicator,
            'stock_status.health_order':              health.health_order,
            updated_at: nowISO,
          });
        })
      );

      // supplier last_sync_date yenilə
      await updateDoc(doc(db, 'suppliers', supplierDocId), {
        last_sync_date: nowISO,
        updated_at:     nowISO,
      });

      console.log(`updateSupplierProductStock: "${order.product_name}" — +${order.ordered_quantity_piece} ədəd əlavə edildi`);
    }
  } catch (err) {
    console.error('updateSupplierProductStock xətası:', err);
    throw err;
  }
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ShipmentStatus }) {
  const step = STATUS_STEPS.find((s) => s.key === status)!;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[status]}`}>
      {step.icon}
      {step.label}
    </span>
  );
}

function InfoRow({ icon, label, value }: {
  icon: React.ReactNode; label: string; value: React.ReactNode;
}) {
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
      <td className="px-5 py-4"><div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" /></td>
      <td className="px-5 py-4"><div className="h-4 w-10 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" /></td>
      <td className="px-5 py-4"><div className="h-4 w-24 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" /></td>
      <td className="px-5 py-4"><div className="h-4 w-16 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" /></td>
      <td className="px-5 py-4"><div className="h-4 w-8 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" /></td>
    </tr>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} className="ml-1.5 text-gray-400 hover:text-indigo-500 transition-colors">
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
        <ExternalLink className="h-3.5 w-3.5" />
        Aç
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
      <div
        className="absolute top-5 left-5 h-0.5 bg-indigo-500 transition-all duration-700"
        style={{ width: `${(currentIdx / total) * 100}%`, maxWidth: 'calc(100% - 2.5rem)' }}
      />
      <div className="relative flex justify-between">
        {STATUS_STEPS.map((step, idx) => {
          const done   = idx <= currentIdx;
          const active = idx === currentIdx;
          const event  = events.find((e) => e.status === step.key);
          return (
            <div key={step.key} className="flex flex-col items-center gap-2 flex-1">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all z-10
                ${done
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/40'
                  : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600'}
                ${active ? 'ring-4 ring-indigo-100 dark:ring-indigo-900/40' : ''}`}
              >
                {done && idx < currentIdx ? <Check className="h-4 w-4" /> : step.icon}
              </div>
              <div className="text-center">
                <p className={`text-xs font-semibold ${done ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'}`}>
                  {step.label}
                </p>
                {event && (
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(event.timestamp).toLocaleDateString('az-AZ', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
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

function UploadZone({ onFile, uploading, hint }: {
  onFile: (f: File) => void; uploading: boolean; hint?: string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }}
      />
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false);
          const f = e.dataTransfer.files?.[0]; if (f) onFile(f);
        }}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-all
          ${dragOver
            ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
            : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
      >
        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
            <p className="text-sm text-gray-500 dark:text-gray-400">Yüklənir...</p>
          </>
        ) : (
          <>
            <div className="w-12 h-12 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
              <Upload className="h-5 w-5 text-indigo-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-200">Sənədi bura sürükləyin</p>
              <p className="text-xs text-gray-400 mt-0.5">
                və ya <span className="text-indigo-500">seçin</span> · PDF, JPG, PNG, DOC
              </p>
            </div>
            {hint && (
              <div className="flex items-center gap-2 mt-1 text-xs text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
                {hint}
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

  const nowISO = () => new Date().toISOString();
  const s = order.status;

  const handleMarkDelivered = async () => {
    setMarkingDelivered(true);
    try {
      await updateDoc(doc(db, 'supply_chain', order.id), {
        status:     'delivered',
        updated_at: nowISO(),
        tracking_events: arrayUnion({ status: 'delivered', timestamp: nowISO() }),
      });
      onUpdated('Çatdı kimi işarələndi');
    } catch (err) { console.error('markDelivered:', err); }
    finally { setMarkingDelivered(false); }
  };

  const handleDeliveryDocument = async (file: File) => {
    setUploadingDelivery(true);
    try {
      const storageRef = ref(storage, `supply_chain/${order.id}/delivery_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      await updateDoc(doc(db, 'supply_chain', order.id), {
        status:               'accepted',
        delivery_document_url: downloadURL,
        updated_at:           nowISO(),
        tracking_events: arrayUnion({
          status: 'accepted', timestamp: nowISO(),
          note: `Qəbul sənədi: ${file.name}`,
        }),
      });

      // suppliers kolleksiyasında supplier_id ilə tap, products-a yaz
      await updateSupplierProductStock(order);

      onUpdated('Qəbul sənədi yükləndi — sifariş tamamlandı, stok yeniləndi');
    } catch (err) { console.error('deliveryDocument:', err); }
    finally { setUploadingDelivery(false); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <ChevronLeft className="h-4 w-4" />
          Geri
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{order.product_name}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{order.supplier_name}</p>
        </div>
        <StatusBadge status={s} />
      </div>

      {/* Tracking stepper */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-6">
          İzləmə vəziyyəti
        </p>
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
          <Clock className="h-4 w-4 flex-shrink-0" />
          Təchizatçı sifarişi hazırlayır...
        </div>
      )}

      {/* shipped */}
      {s === 'shipped' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-blue-100 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/30">
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
              Çatdırılmanı təsdiqlə
            </span>
          </div>
          <div className="p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Məhsul anbarınıza çatdıqda aşağıdakı düyməyə basın.
              </p>
              {order.document_url && (
                <a href={order.document_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-2 text-xs text-indigo-500 hover:text-indigo-600 transition">
                  <FileText className="h-3.5 w-3.5" />
                  Göndərilmə sənədinə bax
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

      {/* delivered: qəbul sənədi */}
      {s === 'delivered' && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Qəbul sənədini yüklə
            </span>
          </div>
          <div className="p-5">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Qəbul aktını yükləyin. Sənəd yüklənən kimi sifariş{' '}
              <strong className="text-green-600 dark:text-green-400">Qəbul edildi</strong>{' '}
              statusuna keçəcək və supplier stoku avtomatik yenilənəcək.
            </p>
            <UploadZone
              onFile={handleDeliveryDocument}
              uploading={uploadingDelivery}
              hint="Sənəd yüklənəndə stok avtomatik yenilənir"
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
          <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            Sifariş uğurla tamamlandı — stok yeniləndi
          </div>
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
  );
}

// ─── Supplier Products Table ──────────────────────────────────────────────────

function SupplierProducts({ supplier, onBack, onUpdated }: {
  supplier: SupplierSummary;
  onBack: () => void;
  onUpdated: (msg: string) => void;
}) {
  const [selectedOrder, setSelectedOrder] = useState<SupplyChainOrder | null>(null);

  const needsAction = supplier.orders.filter(
    (o) => o.status === 'shipped' || o.status === 'delivered'
  ).length;

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
          <button onClick={() => setSelectedOrder(null)} className="hover:text-indigo-500 transition-colors truncate max-w-[160px]">
            {supplier.supplier_name}
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700 dark:text-gray-200 font-medium truncate">{selectedOrder.product_name}</span>
        </nav>
        <OrderDetail
          order={selectedOrder}
          onBack={() => setSelectedOrder(null)}
          onUpdated={(msg) => { onUpdated(msg); setSelectedOrder(null); }}
        />
      </div>
    );
  }

  const sorted = [...supplier.orders].sort((a, b) => {
    const aAction = a.status === 'shipped' || a.status === 'delivered' ? 0 : 1;
    const bAction = b.status === 'shipped' || b.status === 'delivered' ? 0 : 1;
    if (aAction !== bAction) return aAction - bAction;
    return STATUS_ORDER[b.status] - STATUS_ORDER[a.status];
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <ChevronLeft className="h-4 w-4" />
          Geri
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="h-5 w-5 text-indigo-500 flex-shrink-0" />
            {supplier.supplier_name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {supplier.orders.length} sifariş · {needsAction > 0 ? `${needsAction} addım gözləyir` : 'Aktiv əməliyyat yoxdur'}
          </p>
        </div>
        {needsAction > 0 && (
          <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-xs font-medium">
            <AlertTriangle className="h-3.5 w-3.5" />
            {needsAction} gözləyir
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
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Məhsul</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tracking</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Sifariş</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Status</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tarix</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {sorted.map((order) => {
                const actionNeeded = order.status === 'shipped' || order.status === 'delivered';
                return (
                  <tr key={order.id} onClick={() => setSelectedOrder(order)}
                    className={`cursor-pointer transition-colors group
                      ${actionNeeded
                        ? 'hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {actionNeeded && <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 animate-pulse" />}
                        <div className={actionNeeded ? '' : 'ml-5'}>
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
                        <span className="text-gray-400 mx-1">·</span>
                        {order.ordered_quantity_piece} ədəd
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-1.5">
                        <StatusBadge status={order.status} />
                        <div className="flex gap-0.5 w-24">
                          {STATUS_STEPS.map((step, idx) => (
                            <div key={step.key}
                              className={`h-1 flex-1 rounded-full transition-all ${idx <= STATUS_ORDER[order.status] ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
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

// ─── Suppliers Table ──────────────────────────────────────────────────────────

function SuppliersTable({ suppliers, onSelect }: {
  suppliers: SupplierSummary[];
  onSelect: (s: SupplierSummary) => void;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Təchizatçılar</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-800">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Təchizatçı</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Aktiv sifarişlər</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Statuslar</th>
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Tamamlanan</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {suppliers.map((supplier) => {
              const active      = supplier.orders.filter((o) => o.status !== 'accepted').length;
              const accepted    = supplier.orders.filter((o) => o.status === 'accepted').length;
              const needsAction = supplier.orders.filter(
                (o) => o.status === 'shipped' || o.status === 'delivered'
              ).length;

              const statusCounts: Partial<Record<ShipmentStatus, number>> = {};
              for (const o of supplier.orders) {
                statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
              }

              return (
                <tr key={supplier.supplier_id} onClick={() => onSelect(supplier)}
                  className={`cursor-pointer transition-colors group
                    ${needsAction > 0
                      ? 'hover:bg-indigo-50 dark:hover:bg-indigo-950/20'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}`}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0
                        ${needsAction > 0
                          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                        <Building2 className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 dark:text-white">{supplier.supplier_name}</p>
                        <p className="text-xs text-gray-400">{supplier.orders.length} sifariş</p>
                      </div>
                      {needsAction > 0 && (
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
                    ) : (
                      <span className="text-xs text-gray-400 italic">—</span>
                    )}
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
    const unsub = onSnapshot(
      collection(db, 'supply_chain'),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupplyChainOrder));
        setOrders(docs);
        setLoading(false);
      },
      (err) => { console.error('supply_chain listener:', err); setLoading(false); }
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
      if (!acc[order.supplier_id]) {
        acc[order.supplier_id] = {
          supplier_id:   order.supplier_id,
          supplier_name: order.supplier_name,
          orders:        [],
        };
      }
      acc[order.supplier_id].orders.push(order);
      return acc;
    }, {})
  ).sort((a, b) => {
    const aAction = a.orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length;
    const bAction = b.orders.filter((o) => o.status === 'shipped' || o.status === 'delivered').length;
    return bAction - aAction;
  });

  const totalActionNeeded = orders.filter(
    (o) => o.status === 'shipped' || o.status === 'delivered'
  ).length;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (selectedSupplier) {
    return (
      <div className="max-w-5xl mx-auto">
        <SupplierProducts
          supplier={selectedSupplier}
          onBack={() => setSelectedSupplier(null)}
          onUpdated={showSuccess}
        />
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
          <Activity className="h-6 w-6 text-indigo-500" />
          Tracking
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Gözlənilən çatdırılmalar və qəbul vəziyyəti
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMsg}
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
          <table className="w-full">
            <tbody>{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</tbody>
          </table>
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