'use client';

/**
 * Distribution → Yeni Məhsullar (M2)
 *
 * - suppliers_promote koleksiyasından gələn məhsulları göstərir
 * - Məhsulu açanda tam məlumat + count seçimi (min: moq × units_per_case)
 * - Accept → supply_chain-ə yazır, suppliers_promote status-u 'accepted' olur
 * - Reject → suppliers_promote status-u 'rejected' olur
 *
 * Yerləşdir: app/(dashboard)/distribution/new-products/page.tsx
 */

import { useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';
import {
  Package,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  Loader2,
  Clock,
  AlertTriangle,
  Box,
  Truck,
  Hash,
  Tag,
  BarChart3,
  Sparkles,
  ShoppingCart,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PromoteStatus = 'pending' | 'accepted' | 'rejected';

type PromoteProduct = {
  id: string;
  product_id: string;
  barcode: string;
  product_name: string;
  product_category: string;
  uom_conversion: {
    order_uom: string;
    units_per_case: number;
  };
  stock_status: {
    supplier_atp_case: number;
    supplier_atp_piece: number;
    bravo_current_stock_piece: number;
    bravo_reorder_point_piece: number;
    health_indicator: string;
    health_order: number;
  };
  logistics: {
    moq_case: number;
    lead_time_days: number;
  };
  supplier_id: string;
  supplier_name: string;
  status: PromoteStatus;
  created_at: string;
  updated_at: string;
};

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PromoteStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  pending: {
    label: 'Gözləyir',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    icon: <Clock className="h-3 w-3" />,
  },
  accepted: {
    label: 'Qəbul edildi',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    icon: <CheckCircle className="h-3 w-3" />,
  },
  rejected: {
    label: 'Rədd edildi',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
    icon: <XCircle className="h-3 w-3" />,
  },
};

function StatusBadge({ status }: { status: PromoteStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Info row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <span className="mt-0.5 text-gray-400 flex-shrink-0">{icon}</span>
      <span className="text-xs text-gray-500 dark:text-gray-400 w-40 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">{value}</span>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-5 space-y-3">
      <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
      <div className="h-3 w-1/3 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
      <div className="h-3 w-1/2 rounded bg-gray-100 dark:bg-gray-800 animate-pulse" />
    </div>
  );
}

// ─── Product detail panel ─────────────────────────────────────────────────────

function ProductDetail({
  product,
  onBack,
  onAccepted,
  onRejected,
}: {
  product: PromoteProduct;
  onBack: () => void;
  onAccepted: () => void;
  onRejected: () => void;
}) {
  const minPiece = product.logistics.moq_case * product.uom_conversion.units_per_case;
  const step = product.uom_conversion.units_per_case;

  const [quantity, setQuantity] = useState(minPiece);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const quantityCase = Math.round(quantity / step);

  const decrease = () => setQuantity((q) => Math.max(minPiece, q - step));
  const increase = () => setQuantity((q) => {
    const maxPiece = product.stock_status.supplier_atp_case * product.uom_conversion.units_per_case;
    return Math.min(maxPiece, q + step);
  });

  const handleAccept = async () => {
    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      // 1. supply_chain-ə yaz
      await addDoc(collection(db, 'supply_chain'), {
        promote_id: product.id,
        product_id: product.product_id,
        barcode: product.barcode,
        product_name: product.product_name,
        product_category: product.product_category,
        uom_conversion: product.uom_conversion,
        stock_status: product.stock_status,
        logistics: product.logistics,
        supplier_id: product.supplier_id,
        supplier_name: product.supplier_name,
        ordered_quantity_piece: quantity,
        ordered_quantity_case: quantityCase,
        distributor_note: note.trim() || null,
        status: 'pending_shipment',
        tracking_events: [],
        document_url: null,
        created_at: now,
        updated_at: now,
      });

      // 2. suppliers_promote status-u yenilə
      await updateDoc(doc(db, 'suppliers_promote', product.id), {
        status: 'accepted',
        updated_at: now,
      });

      onAccepted();
    } catch (err) {
      console.error('accept error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setRejecting(true);
    try {
      await updateDoc(doc(db, 'suppliers_promote', product.id), {
        status: 'rejected',
        updated_at: new Date().toISOString(),
      });
      onRejected();
    } catch (err) {
      console.error('reject error:', err);
    } finally {
      setRejecting(false);
    }
  };

  const isPending = product.status === 'pending';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {product.product_name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {product.supplier_name}
          </p>
        </div>
        <StatusBadge status={product.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sol: məhsul məlumatları */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Məhsul məlumatları
            </span>
          </div>
          <div className="px-5">
            <InfoRow
              icon={<Hash className="h-4 w-4" />}
              label="SKU / Barkod"
              value={
                <span>
                  {product.product_id}
                  <span className="text-gray-400 mx-1">·</span>
                  <span className="font-mono text-xs text-gray-500">{product.barcode}</span>
                </span>
              }
            />
            <InfoRow
              icon={<Tag className="h-4 w-4" />}
              label="Kateqoriya"
              value={
                <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300">
                  {product.product_category}
                </span>
              }
            />
            <InfoRow
              icon={<Box className="h-4 w-4" />}
              label="Qablaşdırma"
              value={`${product.uom_conversion.units_per_case} ədəd / ${product.uom_conversion.order_uom}`}
            />
            <InfoRow
              icon={<Truck className="h-4 w-4" />}
              label="Çatdırılma müddəti"
              value={`${product.logistics.lead_time_days} iş günü`}
            />
            <InfoRow
              icon={<BarChart3 className="h-4 w-4" />}
              label="Sifariş nöqtəsi"
              value={`${product.stock_status.bravo_reorder_point_piece.toLocaleString('az-AZ')} ədəd`}
            />
          </div>
        </div>

        {/* Sağ: stok məlumatları */}
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/60">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
              Stok vəziyyəti
            </span>
          </div>
          <div className="px-5">
            <InfoRow
              icon={<Package className="h-4 w-4" />}
              label="Mövcud stok (koli)"
              value={
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {product.stock_status.supplier_atp_case.toLocaleString('az-AZ')} koli
                </span>
              }
            />
            <InfoRow
              icon={<Package className="h-4 w-4" />}
              label="Mövcud stok (ədəd)"
              value={`${product.stock_status.supplier_atp_piece.toLocaleString('az-AZ')} ədəd`}
            />
            <InfoRow
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Minimum sifariş"
              value={`${product.logistics.moq_case} koli (${minPiece.toLocaleString('az-AZ')} ədəd)`}
            />
            <InfoRow
              icon={<Sparkles className="h-4 w-4" />}
              label="Təchizatçı"
              value={product.supplier_name}
            />
          </div>
        </div>
      </div>

      {/* Quantity + accept/reject — yalnız pending-də aktiv */}
      {isPending ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-indigo-200 dark:border-indigo-800 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-indigo-100 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">
              Sifariş miqdarı
            </span>
          </div>
          <div className="p-5 space-y-5">
            {/* Counter */}
            <div className="flex items-center gap-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={decrease}
                  disabled={quantity <= minPiece}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="text-center min-w-[80px]">
                  <p className="text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
                    {quantity.toLocaleString('az-AZ')}
                  </p>
                  <p className="text-xs text-gray-400">ədəd</p>
                </div>
                <button
                  onClick={increase}
                  className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Koli</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                    {quantityCase}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-center">
                  <p className="text-xs text-gray-400 mb-0.5">Addım</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white tabular-nums">
                    {step}
                  </p>
                </div>
              </div>
            </div>

            {/* Min xəbərdarlıq */}
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0" />
              Minimum sifariş: {product.logistics.moq_case} koli · {minPiece.toLocaleString('az-AZ')} ədəd
            </div>

            {/* Qeyd */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                Qeyd (istəyə görə)
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Distributor qeydi..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleReject}
                disabled={rejecting || submitting}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm font-medium hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-50 transition"
              >
                {rejecting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                Rədd et
              </button>
              <button
                onClick={handleAccept}
                disabled={submitting || rejecting}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {submitting
                  ? 'Qəbul edilir...'
                  : `${quantity.toLocaleString('az-AZ')} ədəd qəbul et`}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className={`flex items-center gap-3 px-5 py-4 rounded-xl border text-sm font-medium
          ${product.status === 'accepted'
            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
          }`}>
          {product.status === 'accepted'
            ? <CheckCircle className="h-5 w-5 flex-shrink-0" />
            : <XCircle className="h-5 w-5 flex-shrink-0" />}
          {product.status === 'accepted'
            ? 'Bu məhsul qəbul edilib və supply_chain-ə əlavə olunub.'
            : 'Bu məhsul rədd edilib.'}
        </div>
      )}
    </div>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onClick,
}: {
  product: PromoteProduct;
  onClick: () => void;
}) {
  const minPiece = product.logistics.moq_case * product.uom_conversion.units_per_case;

  return (
    <div
      onClick={onClick}
      className={`group bg-white dark:bg-gray-900 rounded-xl border cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5
        ${product.status === 'pending'
          ? 'border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 dark:hover:border-indigo-600'
          : 'border-gray-200 dark:border-gray-700 opacity-75 hover:opacity-100'
        }`}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight truncate">
              {product.product_name}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {product.supplier_name}
            </p>
          </div>
          <StatusBadge status={product.status} />
        </div>

        <div className="space-y-1.5 mb-4">
          <div className="flex items-center gap-1.5">
            <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 truncate max-w-full">
              {product.product_category?.split(' / ')[1] ?? product.product_category}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>ATP: <strong className="text-gray-700 dark:text-gray-200">{product.stock_status.supplier_atp_case} koli</strong></span>
            <span>Min: <strong className="text-gray-700 dark:text-gray-200">{minPiece} ədəd</strong></span>
            <span>{product.logistics.lead_time_days} gün</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400 font-mono">{product.barcode}</span>
          <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DistributionNewProductsPage() {
  useRequireAuth({ requiredRole: UserRole.DISTRIBUTION });

  const [products, setProducts] = useState<PromoteProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<PromoteProduct | null>(null);
  const [filterStatus, setFilterStatus] = useState<PromoteStatus | 'ALL'>('ALL');
  const [successMsg, setSuccessMsg] = useState('');

  // Realtime listener — bütün suppliers_promote
  useEffect(() => {
    const q = query(
      collection(db, 'suppliers_promote'),
      where('status', 'in', ['pending', 'accepted', 'rejected'])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as PromoteProduct));
        // Client-side sort: pending əvvəl, sonra created_at desc
        docs.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
        setProducts(docs);
        setLoading(false);
      },
      (err) => {
        console.error('suppliers_promote listener:', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  // Selected-i realtime ilə sync et
  useEffect(() => {
    if (!selected) return;
    const updated = products.find((p) => p.id === selected.id);
    if (updated) setSelected(updated);
  }, [products]);

  const filtered = filterStatus === 'ALL'
    ? products
    : products.filter((p) => p.status === filterStatus);

  const counts = {
    ALL: products.length,
    pending: products.filter((p) => p.status === 'pending').length,
    accepted: products.filter((p) => p.status === 'accepted').length,
    rejected: products.filter((p) => p.status === 'rejected').length,
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  if (selected) {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-5">
          <button
            onClick={() => setSelected(null)}
            className="hover:text-indigo-500 transition-colors"
          >
            Yeni Məhsullar
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700 dark:text-gray-200 font-medium truncate">
            {selected.product_name}
          </span>
        </nav>

        <ProductDetail
          product={selected}
          onBack={() => setSelected(null)}
          onAccepted={() => {
            setSelected(null);
            showSuccess('Məhsul qəbul edildi və supply_chain-ə əlavə olundu');
          }}
          onRejected={() => {
            setSelected(null);
            showSuccess('Məhsul rədd edildi');
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-indigo-500" />
          Yeni Məhsullar
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Təchizatçıların göndərdiyi məhsul təklifləri
        </p>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Pending xəbərdarlıq */}
      {!loading && counts.pending > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <strong>{counts.pending}</strong> yeni məhsul təklifi qəbul gözləyir
        </div>
      )}

      {/* Filter tabs */}
      {!loading && (
        <div className="flex flex-wrap gap-2">
          {((['ALL', 'pending', 'accepted', 'rejected'] as const)).map((s) => {
            const labels = { ALL: 'Hamısı', pending: 'Gözləyir', accepted: 'Qəbul edildi', rejected: 'Rədd edildi' };
            const active = filterStatus === s;
            return (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm transition-all ${
                  active
                    ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-medium ring-2 ring-indigo-200 dark:ring-indigo-800'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-gray-900'
                }`}
              >
                {labels[s]}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                  active ? 'bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-200' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                }`}>
                  {counts[s]}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
          <Package className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">Məhsul tapılmadı</p>
          <p className="text-xs mt-1">Təchizatçılar hələ məhsul göndərməyib</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} onClick={() => setSelected(p)} />
          ))}
        </div>
      )}
    </div>
  );
}