'use client';

/**
 * Supply Chain səhifəsi — Supplier + Distributor tərəfləri
 *
 * Tracking axını:
 *  pending_shipment → [Supplier: "Hazırla" düyməsi]  → ready
 *  ready            → [Supplier: sənəd yükləyir]     → shipped  (+tracking_number, +document_url)
 *  shipped          → [Distributor: "Çatdı ✓" düyməsi] → delivered
 *  delivered        → [Distributor: sənəd yükləyir]  → accepted (+delivery_document_url)
 *  accepted         → suppliers/{supplier_id}/products stoku avtomatik yenilənir
 *
 * Supplier:    app/(dashboard)/supply/chain/page.tsx
 * Distributor: app/(dashboard)/distribution/supply/product/tracking/page.tsx
 */

import { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  arrayUnion,
  getDocs,
  increment,
} from 'firebase/firestore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useSupplyProfile } from '@/hooks/useSupplyProfile';
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
} from 'lucide-react';

// ─── Firebase Storage ─────────────────────────────────────────────────────────

const storage = getStorage();

// ─── Types ────────────────────────────────────────────────────────────────────

type ShipmentStatus = 'pending_shipment' | 'ready' | 'shipped' | 'delivered' | 'accepted';
type PageRole = 'supplier' | 'distributor';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateTrackingNumber(): string {
  const mid = Math.random().toString(36).toUpperCase().slice(2, 8);
  const suffix = Math.floor(Math.random() * 90 + 10);
  return `AZ-${mid}-${suffix}`;
}

/**
 * Qəbul edilmiş sifarişin miqdarını supplier-in products sub-kolleksiyasında
 * müvafiq məhsulun stock_status.bravo_current_stock_piece sahəsinə əlavə edir.
 *
 * Firestore yolu: suppliers/{supplierId}/products (barcode üzrə query)
 */
async function updateSupplierProductStock(order: SupplyChainOrder): Promise<void> {
  try {
    const productsRef = collection(db, 'suppliers', order.supplier_id, 'products');
    const q = query(productsRef, where('barcode', '==', order.barcode));
    const snap = await getDocs(q);

    if (snap.empty) {
      console.warn(
        `updateSupplierProductStock: barcode "${order.barcode}" üçün məhsul tapılmadı` +
        ` (supplier: ${order.supplier_id})`
      );
      return;
    }

    const nowISO = new Date().toISOString();

    // Eyni barcode-a malik birdən çox sənəd olsa hamısını yeniləyirik (normalda 1 olur)
    await Promise.all(
      snap.docs.map((productDoc) =>
        updateDoc(productDoc.ref, {
          'stock_status.bravo_current_stock_piece': increment(order.ordered_quantity_piece),
          updated_at: nowISO,
        })
      )
    );

    console.log(
      `updateSupplierProductStock: "${order.product_name}" — ` +
      `+${order.ordered_quantity_piece} ədəd əlavə edildi`
    );
  } catch (err) {
    // Stok yenilənməsindəki xəta sifariş axınını bloklamasın; yalnız log olunur
    console.error('updateSupplierProductStock xətası:', err);
  }
}

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

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
      <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>
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
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium transition"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        Aç
      </a>
    </div>
  );
}

// ─── Tracking Stepper ─────────────────────────────────────────────────────────

function TrackingStepper({ status, events }: {
  status: ShipmentStatus; events: TrackingEvent[];
}) {
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
          const done = idx <= currentIdx;
          const active = idx === currentIdx;
          const event = events.find((e) => e.status === step.key);
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

function OrderDetail({ order, role, onBack, onUpdated }: {
  order: SupplyChainOrder;
  role: PageRole;
  onBack: () => void;
  onUpdated: (msg: string) => void;
}) {
  const [markingReady,      setMarkingReady]      = useState(false);
  const [uploadingShip,     setUploadingShip]     = useState(false);
  const [markingDelivered,  setMarkingDelivered]  = useState(false);
  const [uploadingDelivery, setUploadingDelivery] = useState(false);

  const nowISO = () => new Date().toISOString();

  const handleMarkReady = async () => {
    setMarkingReady(true);
    try {
      await updateDoc(doc(db, 'supply_chain', order.id), {
        status: 'ready',
        updated_at: nowISO(),
        tracking_events: arrayUnion({ status: 'ready', timestamp: nowISO() }),
      });
      onUpdated('Sifariş hazır kimi işarələndi');
    } catch (err) { console.error('markReady:', err); }
    finally { setMarkingReady(false); }
  };

  const handleShipDocument = async (file: File) => {
    setUploadingShip(true);
    try {
      const trackingNum = order.tracking_number ?? generateTrackingNumber();
      const storageRef = ref(storage, `supply_chain/${order.id}/ship_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'supply_chain', order.id), {
        status: 'shipped',
        tracking_number: trackingNum,
        document_url: downloadURL,
        updated_at: nowISO(),
        tracking_events: arrayUnion({
          status: 'shipped', timestamp: nowISO(),
          note: `Göndərilmə sənədi: ${file.name}`,
        }),
      });
      onUpdated('Sənəd yükləndi — Göndərildi statusuna keçdi');
    } catch (err) { console.error('shipDocument:', err); }
    finally { setUploadingShip(false); }
  };

  const handleMarkDelivered = async () => {
    setMarkingDelivered(true);
    try {
      await updateDoc(doc(db, 'supply_chain', order.id), {
        status: 'delivered',
        updated_at: nowISO(),
        tracking_events: arrayUnion({ status: 'delivered', timestamp: nowISO() }),
      });
      onUpdated('Çatdı kimi işarələndi');
    } catch (err) { console.error('markDelivered:', err); }
    finally { setMarkingDelivered(false); }
  };

  // ─── YENİ: Qəbul sənədi + stok yeniləməsi ────────────────────────────────
  const handleDeliveryDocument = async (file: File) => {
    setUploadingDelivery(true);
    try {
      // 1) Sənədi Firebase Storage-a yüklə
      const storageRef = ref(storage, `supply_chain/${order.id}/delivery_${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // 2) supply_chain sənədini "accepted" statusuna gətir
      await updateDoc(doc(db, 'supply_chain', order.id), {
        status: 'accepted',
        delivery_document_url: downloadURL,
        updated_at: nowISO(),
        tracking_events: arrayUnion({
          status: 'accepted', timestamp: nowISO(),
          note: `Qəbul sənədi: ${file.name}`,
        }),
      });

      // 3) Supplier-in products sub-kolleksiyasında stoku artır
      //    suppliers/{supplier_id}/products — barcode üzrə tapılır
      await updateSupplierProductStock(order);

      onUpdated('Qəbul sənədi yükləndi — sifariş tamamlandı, stok yeniləndi');
    } catch (err) { console.error('deliveryDocument:', err); }
    finally { setUploadingDelivery(false); }
  };
  // ─────────────────────────────────────────────────────────────────────────

  const s = order.status;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{order.product_name}</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">{order.supplier_name}</p>
        </div>
        <StatusBadge status={s} />
      </div>

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

      {role === 'supplier' && (
        <>
          {s === 'pending_shipment' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-amber-100 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30">
                <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                  Addım 1 — Sifarişi hazırla
                </span>
              </div>
              <div className="p-5 flex items-center justify-between gap-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Məhsul hazırlandıqdan sonra <strong>Hazır</strong> kimi işarələyin.
                  Bundan sonra göndərilmə sənədini yükləyə bilərsiniz.
                </p>
                <button
                  onClick={handleMarkReady}
                  disabled={markingReady}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm"
                >
                  {markingReady ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                  {markingReady ? 'Saxlanır...' : 'Hazır'}
                </button>
              </div>
            </div>
          )}

          {s === 'ready' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
                  Addım 2 — Göndərilmə sənədini yüklə
                </span>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Sənəd yüklənən kimi status avtomatik{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">Göndərildi</strong>-yə keçəcək
                  və tracking nömrəsi yaranacaq.
                </p>
                <UploadZone onFile={handleShipDocument} uploading={uploadingShip} hint="Sənəd yüklənəndə avtomatik tracking nömrəsi yaranır" />
              </div>
            </div>
          )}

          {(s === 'shipped' || s === 'delivered' || s === 'accepted') && (
            <div className="space-y-4">
              {order.document_url && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Göndərilmə sənədi</span>
                  </div>
                  <div className="p-5"><DocDisplay url={order.document_url} label="Göndərilmə sənədi yüklənib" /></div>
                </div>
              )}
              {order.delivery_document_url && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Qəbul sənədi (Distributor)</span>
                  </div>
                  <div className="p-5"><DocDisplay url={order.delivery_document_url} label="Qəbul sənədi yüklənib" /></div>
                </div>
              )}
              {s !== 'accepted' ? (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-sm text-gray-500 dark:text-gray-400">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  Növbəti addım distributor tərəfindən həyata keçiriləcək
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-sm text-green-700 dark:text-green-400">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Sifariş uğurla tamamlandı
                </div>
              )}
            </div>
          )}
        </>
      )}

      {role === 'distributor' && (
        <>
          {(s === 'pending_shipment' || s === 'ready') && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
              <Clock className="h-4 w-4 flex-shrink-0" />
              Təchizatçı sifarişi hazırlayır...
            </div>
          )}
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
          {s === 'delivered' && (
            <div className="bg-white dark:bg-gray-900 rounded-xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
              <div className="px-5 py-3.5 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30">
                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Qəbul sənədini yüklə</span>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Qəbul aktını yükləyin. Sənəd yüklənən kimi sifariş{' '}
                  <strong className="text-green-600 dark:text-green-400">Qəbul edildi</strong> statusuna keçəcək
                  və supplier stoku avtomatik yenilənəcək.
                </p>
                <UploadZone onFile={handleDeliveryDocument} uploading={uploadingDelivery} hint="Sənəd yüklənəndə stok avtomatik yenilənir" />
              </div>
            </div>
          )}
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
                Sifariş uğurla tamamlandı
              </div>
            </div>
          )}
        </>
      )}

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
            <InfoRow icon={<Box className="h-4 w-4" />} label="Qablaşdırma" value={`${order.uom_conversion.units_per_case} ədəd / ${order.uom_conversion.order_uom}`} />
            <InfoRow icon={<Truck className="h-4 w-4" />} label="Çatdırılma müddəti" value={`${order.logistics.lead_time_days} iş günü`} />
            <InfoRow icon={<BarChart3 className="h-4 w-4" />} label="Sifariş nöqtəsi" value={`${order.stock_status.bravo_reorder_point_piece.toLocaleString('az-AZ')} ədəd`} />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Sifariş məlumatları</span>
          </div>
          <div className="px-5">
            <InfoRow icon={<ShoppingCart className="h-4 w-4" />} label="Sifariş (koli)"
              value={<span className="text-indigo-600 dark:text-indigo-400 font-bold">{order.ordered_quantity_case.toLocaleString('az-AZ')} koli</span>} />
            <InfoRow icon={<Package className="h-4 w-4" />} label="Sifariş (ədəd)" value={`${order.ordered_quantity_piece.toLocaleString('az-AZ')} ədəd`} />
            <InfoRow icon={<Sparkles className="h-4 w-4" />} label="Distributor qeydi"
              value={order.distributor_note ?? <span className="text-gray-400 text-xs italic">Qeyd yoxdur</span>} />
            <InfoRow icon={<Clock className="h-4 w-4" />} label="Sifariş tarixi"
              value={new Date(order.created_at).toLocaleDateString('az-AZ', { day: '2-digit', month: 'long', year: 'numeric' })} />
          </div>
        </div>
      </div>

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

// ─── Order Card ───────────────────────────────────────────────────────────────

function OrderCard({ order, onClick }: { order: SupplyChainOrder; onClick: () => void }) {
  const needsAction = order.status === 'pending_shipment' || order.status === 'ready';
  return (
    <div onClick={onClick}
      className={`group bg-white dark:bg-gray-900 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5
        ${needsAction ? 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600' : 'border-gray-200 dark:border-gray-700'}`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">{order.product_name}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{order.supplier_name}</p>
          </div>
          <StatusBadge status={order.status} />
        </div>
        <div className="space-y-1.5 mb-4">
          <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 truncate max-w-full">
            {order.product_category?.split(' / ')[1] ?? order.product_category}
          </span>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>Sifariş: <strong className="text-gray-700 dark:text-gray-200">{order.ordered_quantity_case} koli</strong></span>
            <strong className="text-gray-700 dark:text-gray-200">{order.ordered_quantity_piece} ədəd</strong>
            <span>{order.logistics.lead_time_days} gün</span>
          </div>
        </div>
        <div className="flex gap-1 mb-3">
          {STATUS_STEPS.map((step, idx) => (
            <div key={step.key}
              className={`h-1.5 flex-1 rounded-full transition-all ${idx <= STATUS_ORDER[order.status] ? 'bg-indigo-500' : 'bg-gray-200 dark:bg-gray-700'}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between">
          {order.tracking_number
            ? <span className="text-xs font-mono text-indigo-500 dark:text-indigo-400">{order.tracking_number}</span>
            : <span className="text-xs text-gray-400 italic">Tracking yoxdur</span>}
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}

// ─── Page Shell ───────────────────────────────────────────────────────────────

function SupplyChainPageShell({ role, supplierId }: { role: PageRole; supplierId?: string }) {
  const [orders, setOrders]             = useState<SupplyChainOrder[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selected, setSelected]         = useState<SupplyChainOrder | null>(null);
  const [filterStatus, setFilterStatus] = useState<ShipmentStatus | 'ALL'>('ALL');
  const [successMsg, setSuccessMsg]     = useState('');

  useEffect(() => {
    if (role === 'supplier' && !supplierId) return;

    const q = role === 'supplier'
      ? query(collection(db, 'supply_chain'), where('supplier_id', '==', supplierId))
      : query(collection(db, 'supply_chain'));

    const unsub = onSnapshot(q, (snap) => {
      const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as SupplyChainOrder));
      docs.sort((a, b) => {
        const diff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (diff !== 0) return diff;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      setOrders(docs);
      setLoading(false);
    }, (err) => { console.error('supply_chain listener:', err); setLoading(false); });

    return () => unsub();
  }, [role, supplierId]);

  useEffect(() => {
    if (!selected) return;
    const updated = orders.find((o) => o.id === selected.id);
    if (updated) setSelected(updated);
  }, [orders]);

  const filtered = filterStatus === 'ALL' ? orders : orders.filter((o) => o.status === filterStatus);

  const counts = {
    ALL:              orders.length,
    pending_shipment: orders.filter((o) => o.status === 'pending_shipment').length,
    ready:            orders.filter((o) => o.status === 'ready').length,
    shipped:          orders.filter((o) => o.status === 'shipped').length,
    delivered:        orders.filter((o) => o.status === 'delivered').length,
    accepted:         orders.filter((o) => o.status === 'accepted').length,
  };

  const FILTER_TABS: { key: ShipmentStatus | 'ALL'; label: string }[] = [
    { key: 'ALL',              label: 'Hamısı' },
    { key: 'pending_shipment', label: 'Hazırlanır' },
    { key: 'ready',            label: 'Hazır' },
    { key: 'shipped',          label: 'Göndərildi' },
    { key: 'delivered',        label: 'Çatdı' },
    { key: 'accepted',         label: 'Qəbul edildi' },
  ];

  const attentionCount = role === 'supplier'
    ? counts.pending_shipment + counts.ready
    : counts.shipped + counts.delivered;

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto">
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-5">
          <button onClick={() => setSelected(null)} className="hover:text-indigo-500 transition-colors">Təchizat</button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700 dark:text-gray-200 font-medium truncate">{selected.product_name}</span>
        </nav>
        <OrderDetail
          order={selected}
          role={role}
          onBack={() => setSelected(null)}
          onUpdated={(msg) => { showSuccess(msg); setSelected(null); }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Truck className="h-6 w-6 text-indigo-500" />
          Təchizat
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {role === 'supplier' ? 'Qəbul edilmiş sifarişlər və göndərilmə vəziyyəti' : 'Gözlənilən çatdırılmalar və qəbul vəziyyəti'}
        </p>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {!loading && attentionCount > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <strong>{attentionCount}</strong>{' '}
          {role === 'supplier' ? 'sifariş addım gözləyir' : 'sifariş təsdiq gözləyir'}
        </div>
      )}

      {!loading && (
        <div className="flex flex-wrap gap-2">
          {FILTER_TABS.map(({ key, label }) => {
            const active = filterStatus === key;
            return (
              <button key={key} onClick={() => setFilterStatus(key)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  active
                    ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-medium ring-2 ring-indigo-200 dark:ring-indigo-800'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
                }`}
              >
                {label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  active ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  {counts[key]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
          <Truck className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Sifariş tapılmadı</p>
          <p className="text-xs mt-1">
            {role === 'supplier' ? 'Distributor hələ heç bir sifariş qəbul etməyib' : 'Aktiv çatdırılma yoxdur'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((o) => (
            <OrderCard key={o.id} order={o} onClick={() => setSelected(o)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Exported pages ───────────────────────────────────────────────────────────

/** Supplier: app/(dashboard)/supply/chain/page.tsx */
export default function SupplyChainPage() {
  useRequireAuth({ requiredRole: UserRole.SUPPLY });
  const supplyProfile = useSupplyProfile();
  const supplierId = (supplyProfile as any)?.user_id as string | undefined;
  return <SupplyChainPageShell role="supplier" supplierId={supplierId} />;
}

/**
 * Distributor: app/(dashboard)/distribution/supply/product/tracking/page.tsx
 *
 *   'use client';
 *   export { DistributionTrackingPage as default } from '@/app/(dashboard)/supply/chain/page';
 */
export function DistributionTrackingPage() {
  useRequireAuth({ requiredRole: UserRole.DISTRIBUTION });
  return <SupplyChainPageShell role="distributor" />;
}