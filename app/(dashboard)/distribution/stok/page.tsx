'use client';

/**
 * Distribution → Stok səhifəsi
 *
 * Level 1: Təchizatçılar cədvəli
 * Level 2: Seçilmiş təchizatçının məhsulları
 *          — kritiklər yuxarıda
 *          — cursor-based pagination (PAGE_SIZE=50)
 *          — axtarış (client-side, yüklənmiş data üzərindən)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';
import {
  getSuppliers,
  getProductsFirstPage,
  getProductsNextPage,
  PAGE_SIZE,
  type Supplier,
  type Product,
  type HealthIndicator,
  type ProductPage,
} from '@/services/stock.service';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import {
  ChevronRight,
  ChevronLeft,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  Package,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  CheckCircle,
  XCircle,
  Search,
  Loader2,
} from 'lucide-react';

// ─── Health badge config ───────────────────────────────────────────────────────

type BadgeCfg = { label: string; row: string; badge: string; icon: React.ReactNode };

const HEALTH_CFG: Record<HealthIndicator, BadgeCfg> = {
  OUT_OF_STOCK: {
    label: 'Stokda yox',
    row: 'bg-red-50 dark:bg-red-950/25',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  CRITICAL_LOW: {
    label: 'Kritik',
    row: 'bg-red-50 dark:bg-red-950/25',
    badge: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  LOW: {
    label: 'Az',
    row: 'bg-yellow-50 dark:bg-yellow-950/20',
    badge: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    icon: <TrendingDown className="h-3.5 w-3.5" />,
  },
  HEALTHY: {
    label: 'Normal',
    row: '',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  OVERSTOCK: {
    label: 'Həddindən artıq',
    row: 'bg-blue-50 dark:bg-blue-950/20',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    icon: <TrendingUp className="h-3.5 w-3.5" />,
  },
};

function HealthBadge({ status }: { status: HealthIndicator }) {
  const cfg = HEALTH_CFG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────

function SkeletonRows({ cols, rows = 6 }: { cols: number; rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-t border-gray-100 dark:border-gray-800">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

// ─── Supplier table ────────────────────────────────────────────────────────────

function SupplierTable({
  suppliers,
  loading,
  onSelect,
}: {
  suppliers: Supplier[];
  loading: boolean;
  onSelect: (s: Supplier) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = suppliers.filter(
    (s) =>
      s.supplier_name.toLowerCase().includes(search.toLowerCase()) ||
      s.supplier_category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Təchizatçı adı və ya kateqoriya axtar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60 text-left">
              {['Təchizatçı', 'Kateqoriya', 'Aktiv SKU', 'Son Yenilənmə', ''].map(
                (h) => (
                  <th
                    key={h}
                    className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide"
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <SkeletonRows cols={5} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-14 text-center text-gray-400">
                  {search ? 'Axtarışa uyğun nəticə yoxdur' : 'Təchizatçı tapılmadı'}
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr
                  key={s.id}
                  onClick={() => onSelect(s)}
                  className="border-t border-gray-100 dark:border-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 cursor-pointer transition-colors group"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {s.supplier_name}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {s.supplier_category}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold">
                      {s.total_active_skus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {s.last_sync_date
                      ? new Date(s.last_sync_date).toLocaleString('az-AZ', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 transition-colors ml-auto" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {!loading && (
        <p className="mt-2 text-xs text-gray-400 text-right">
          {filtered.length} təchizatçı
        </p>
      )}
    </div>
  );
}

// ─── Product panel ────────────────────────────────────────────────────────────

function ProductPanel({
  supplier,
  onBack,
}: {
  supplier: Supplier;
  onBack: () => void;
}) {
  // Yüklənmiş bütün məhsullar (bütün səhifələr birləşdirilmiş)
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loadingFirst, setLoadingFirst] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);

  // Axtarış — yüklənmiş data üzərindən (client-side)
  const [search, setSearch] = useState('');

  // Status filter
  const [filterStatus, setFilterStatus] = useState<HealthIndicator | 'ALL'>('ALL');

  // İlk yükləmə
  const loadFirst = useCallback(async () => {
    setLoadingFirst(true);
    setAllProducts([]);
    setHasMore(false);
    lastDocRef.current = null;
    try {
      const page: ProductPage = await getProductsFirstPage(supplier.id);
      setAllProducts(page.products);
      setHasMore(page.hasMore);
      lastDocRef.current = page.lastDoc;
    } catch (err) {
      console.error('loadFirst error:', err);
    } finally {
      setLoadingFirst(false);
    }
  }, [supplier.id]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  // Növbəti səhifə
  const loadMore = async () => {
    if (!hasMore || loadingMore || !lastDocRef.current) return;
    setLoadingMore(true);
    try {
      const page: ProductPage = await getProductsNextPage(
        supplier.id,
        lastDocRef.current
      );
      setAllProducts((prev) => [...prev, ...page.products]);
      setHasMore(page.hasMore);
      lastDocRef.current = page.lastDoc;
    } catch (err) {
      console.error('loadMore error:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  // Client-side filter + axtarış
  const filtered = allProducts.filter((p) => {
    const matchSearch =
      search === '' ||
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.barcode.includes(search) ||
      p.product_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === 'ALL' || p.stock_status.health_indicator === filterStatus;
    return matchSearch && matchStatus;
  });

  // Stat counts
  const counts = allProducts.reduce<Record<string, number>>(
    (acc, p) => {
      acc[p.stock_status.health_indicator] =
        (acc[p.stock_status.health_indicator] ?? 0) + 1;
      return acc;
    },
    {}
  );
  const criticalCount =
    (counts['CRITICAL_LOW'] ?? 0) + (counts['OUT_OF_STOCK'] ?? 0);

  const statCards: { key: HealthIndicator; label: string }[] = [
    { key: 'CRITICAL_LOW', label: 'Kritik' },
    { key: 'OUT_OF_STOCK', label: 'Stokda yox' },
    { key: 'LOW', label: 'Az' },
    { key: 'HEALTHY', label: 'Normal' },
    { key: 'OVERSTOCK', label: 'Çox' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          Geri
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">
            {supplier.supplier_name}
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {supplier.supplier_category} · {supplier.total_active_skus} aktiv SKU
          </p>
        </div>
        <button
          onClick={loadFirst}
          disabled={loadingFirst}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title="Yenilə"
        >
          <RefreshCw className={`h-4 w-4 ${loadingFirst ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stat cards */}
      {!loadingFirst && allProducts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {statCards.map(({ key, label }) => {
            const count = counts[key] ?? 0;
            if (count === 0) return null;
            const cfg = HEALTH_CFG[key];
            const active = filterStatus === key;
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(active ? 'ALL' : key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                  active
                    ? 'border-indigo-400 dark:border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800 bg-white dark:bg-gray-900'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span
                  className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${cfg.badge}`}
                >
                  {count}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{label}</span>
              </button>
            );
          })}
          {filterStatus !== 'ALL' && (
            <button
              onClick={() => setFilterStatus('ALL')}
              className="px-3 py-2 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
            >
              Filtri sıfırla
            </button>
          )}
        </div>
      )}

      {/* Kritik xəbərdarlıq */}
      {!loadingFirst && criticalCount > 0 && (
        <div className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            <strong>{criticalCount}</strong> məhsul kritik stok səviyyəsindədir
          </span>
        </div>
      )}

      {/* Axtarış */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input
          type="text"
          placeholder="Məhsul adı, barkod və ya kod axtar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
      </div>

      {/* Məhsul cədvəli */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800/60 text-left">
              {[
                'Məhsul',
                'Qablaşdırma',
                'Təch. Stoku (koli)',
                'Cari Qalıq (ədəd)',
                'Sifariş Nöqtəsi',
                'MOQ / Çatdırılma',
                'Status',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loadingFirst ? (
              <SkeletonRows cols={7} rows={8} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-14 text-center text-gray-400">
                  {search || filterStatus !== 'ALL'
                    ? 'Axtarışa uyğun məhsul tapılmadı'
                    : 'Bu təchizatçıya aid məhsul yoxdur'}
                </td>
              </tr>
            ) : (
              filtered.map((p) => {
                const cfg = HEALTH_CFG[p.stock_status.health_indicator];
                return (
                  <tr
                    key={p.id}
                    className={`border-t border-gray-100 dark:border-gray-800 transition-colors ${cfg.row}`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white leading-tight">
                        {p.product_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.barcode} · {p.product_id}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {p.uom_conversion.units_per_case} ədəd/{p.uom_conversion.order_uom}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white text-right tabular-nums">
                      {p.stock_status.supplier_atp_case.toLocaleString('az-AZ')}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white text-right tabular-nums">
                      {p.stock_status.bravo_current_stock_piece.toLocaleString('az-AZ')}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-right tabular-nums">
                      {p.stock_status.bravo_reorder_point_piece.toLocaleString('az-AZ')}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      Min {p.logistics.moq_case} koli · {p.logistics.lead_time_days} gün
                    </td>
                    <td className="px-4 py-3">
                      <HealthBadge status={p.stock_status.health_indicator} />
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer: yüklənmiş / cəmi + "Daha çox" */}
      {!loadingFirst && (
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {search || filterStatus !== 'ALL'
              ? `${filtered.length} nəticə`
              : `${allProducts.length} məhsul yüklənib`}
            {hasMore && !search && filterStatus === 'ALL' && (
              <span className="ml-1 text-gray-400">
                (daha var — aşağıdakı düyməyə basın)
              </span>
            )}
          </p>

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 disabled:opacity-50 transition"
            >
              {loadingMore ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
              {loadingMore
                ? 'Yüklənir...'
                : `Daha ${PAGE_SIZE} məhsul yüklə`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Ana səhifə ────────────────────────────────────────────────────────────────

export default function DistributionStokPage() {
  useRequireAuth({ requiredRole: UserRole.DISTRIBUTION });

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await getSuppliers();
        setSuppliers(data);
      } catch (err) {
        console.error('getSuppliers error:', err);
      } finally {
        setLoadingSuppliers(false);
      }
    })();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Səhifə başlığı */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="h-6 w-6 text-indigo-500" />
          Stok İdarəetməsi
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {selectedSupplier
            ? 'Məhsulların stok vəziyyəti — kritiklər yuxarıda göstərilir'
            : 'Məhsul stokuna baxmaq üçün təchizatçı seçin'}
        </p>
      </div>

      {/* Breadcrumb */}
      {selectedSupplier && (
        <nav className="flex items-center gap-2 text-xs text-gray-400 mb-5">
          <button
            onClick={() => setSelectedSupplier(null)}
            className="hover:text-indigo-500 transition-colors"
          >
            Bütün Təchizatçılar
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-gray-700 dark:text-gray-200 font-medium">
            {selectedSupplier.supplier_name}
          </span>
        </nav>
      )}

      {/* Kart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
        {selectedSupplier ? (
          <ProductPanel
            supplier={selectedSupplier}
            onBack={() => setSelectedSupplier(null)}
          />
        ) : (
          <SupplierTable
            suppliers={suppliers}
            loading={loadingSuppliers}
            onSelect={(s) => setSelectedSupplier(s)}
          />
        )}
      </div>
    </div>
  );
}
