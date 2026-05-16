'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useSupplyProfile } from '@/hooks/useSupplyProfile';
import { useDistributionProfile } from '@/hooks/useDistributionProfile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';
import { Building2, Truck, TrendingUp, Package } from 'lucide-react';
import { useState, useEffect } from 'react';
import { getSuppliers, getProductsFirstPage, Product } from '@/services/stock.service';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

export default function HomePage() {
  // Protect the page
  useRequireAuth();

  const { loading, firebaseUser } = useAuth();
  const role = useRole();
  const supplyProfile = useSupplyProfile();
  const distributionProfile = useDistributionProfile();

  // Get user display name
  const displayName =
    supplyProfile && 'first_name' in supplyProfile && 'last_name' in supplyProfile
      ? `${supplyProfile.first_name} ${supplyProfile.last_name}`
      : distributionProfile && 'first_name' in distributionProfile && 'last_name' in distributionProfile
        ? `${distributionProfile.first_name} ${distributionProfile.last_name}`
        : firebaseUser?.displayName ||
          firebaseUser?.email?.split('@')[0] ||
          'İstifadəçi';

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [sampleProducts, setSampleProducts] = useState<Product[] | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  // derived analytics
  const criticalCount = (sampleProducts || []).filter(p => {
    const h = p.stock_status?.health_indicator || 'HEALTHY';
    return h === 'OUT_OF_STOCK' || h === 'CRITICAL_LOW';
  }).length;
  const healthyCount = (sampleProducts || []).filter(p => (p.stock_status?.health_indicator || '') === 'HEALTHY' || (p.stock_status?.health_indicator || '') === 'OVERSTOCK').length;
  const totalCount = (sampleProducts || []).length || 0;
  const inStockPercent = totalCount === 0 ? 0 : Math.round((healthyCount / totalCount) * 100);
  const avgLeadTime = Math.round(((sampleProducts || []).reduce((a,b) => a + (b.logistics?.lead_time_days || 0), 0) / (totalCount || 1)) * 10) / 10;
  // orders-derived metrics
  const totalOrders = orders.length;
  const acceptedOrders = orders.filter(o => o.status === 'accepted').length;
  const activeShipments = orders.filter(o => o.status !== 'accepted').length;
  const activityRatio = totalOrders === 0 ? 0 : Math.round((acceptedOrders / totalOrders) * 100);

  useEffect(() => {
    // Load some Firestore-backed dashboard data (suppliers + small product sample)
    let mounted = true;
    async function load() {
      try {
        setMetricsLoading(true);
        const s = await getSuppliers();
        if (!mounted) return;
        setSuppliers(s || []);

        // If there is at least one supplier, load its first product page as a sample
        if (s && s.length > 0) {
          try {
            const p = await getProductsFirstPage(s[0].id);
            if (!mounted) return;
            setSampleProducts(p.products ?? []);
          } catch (e) {
            // ignore product load failures — dashboard remains usable
            setSampleProducts([]);
          }
        }
      } finally {
        if (mounted) setMetricsLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // subscribe to supply_chain orders for dashboard metrics
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'supply_chain'), (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, (err) => console.error('supply_chain snapshot error', err));
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Yüklənir...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Smart Dashboard</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Xoş gəldiniz, {displayName} — təchizat və paylama proseslərinin ağıllı təhlili.</p>
      </div>

      {/* SUPPLY DASHBOARD */}
      {role === UserRole.SUPPLY && supplyProfile && (
        <>
          {/* Company Info Card */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 mb-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-orange-600" />
                  {supplyProfile.company_name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  VOEN: {supplyProfile.voen}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {supplyProfile.address}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  📞 {supplyProfile.phone}
                </p>
              </div>
              <div className="px-3 py-1 bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 rounded-full text-xs font-semibold">
                Təchizatçı
              </div>
            </div>
          </div>
        </>
      )}

      {/* DISTRIBUTION DASHBOARD */}
      {role === UserRole.DISTRIBUTION && distributionProfile && (
        <>
          {/* User Info Card */}
          {/* <div className="bg-green-50 dark:bg-green-900/10 rounded-lg shadow-sm p-6 border-l-4 border-green-500 border-gray-200 dark:border-gray-800 mb-6 mt-6">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <Truck className="h-5 w-5 text-green-600" />
                  {distributionProfile.first_name} {distributionProfile.last_name}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {firebaseUser?.email}
                </p>
              </div>
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full text-xs font-semibold">
                Distribyutor
              </div>
            </div>
          </div> */}

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Aktiv Paylamalar
                  </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                      {activeShipments}
                    </p>
                </div>
                <Truck className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Inventar
                  </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                      {suppliers.reduce((a, b) => a + (b.total_active_skus || 0), 0)}
                    </p>
                </div>
                <Package className="h-8 w-8 text-blue-600 opacity-50" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Fəaliyyət Nisbəti
                  </p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                      {activityRatio}%
                    </p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600 opacity-50" />
              </div>
            </div>
          </div>
        </>
      )}

      {/* Top KPIs (shared for both roles) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">Critical SKUs</p>
          <p className="text-2xl font-semibold mt-2">{metricsLoading ? '—' : criticalCount}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">In-stock %</p>
          <p className="text-2xl font-semibold mt-2">{metricsLoading ? '—' : `${inStockPercent}%`}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">Avg Lead Time (days)</p>
          <p className="text-2xl font-semibold mt-2">{metricsLoading ? '—' : avgLeadTime}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
          <p className="text-xs text-gray-500">Ümumi Inventar SKUs</p>
          <p className="text-2xl font-semibold mt-2">{metricsLoading ? '—' : suppliers.reduce((a, b) => a + (b.total_active_skus || 0), 0)}</p>
        </div>
      </div>

      {/* Main grid: charts, lists, alerts — 2-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Orders Trend (sparkline) */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Sifariş Trendi (Son 30 gün)</h3>
            <div className="mt-4">
              <svg className="w-full h-24" viewBox="0 0 300 60" preserveAspectRatio="none">
                <polyline fill="none" stroke="#4f46e5" strokeWidth="3" points="0,45 30,42 60,30 90,25 120,20 150,22 180,18 210,15 240,12 270,10 300,8" />
              </svg>
            </div>
            <p className="text-xs text-gray-500 mt-2">Hacimli sifarişlərin trendini göstərir — məlumat Firestore-dan yüklənə bilər.</p>
          </div>

            {/* Analytics row: Enlarged Pie chart + Legend */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Pie chart (inventory by health) - enlarged */}
              <div className="md:col-span-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800 flex items-center">
                <div className="flex-1 flex items-center gap-6">
                  <svg viewBox="0 0 64 64" className="w-40 h-40">
                    {
                      (() => {
                        const counts: Record<string, number> = { OUT_OF_STOCK: 0, CRITICAL_LOW: 0, LOW: 0, HEALTHY: 0, OVERSTOCK: 0 };
                        (sampleProducts || []).forEach((p) => {
                          const h = p.stock_status?.health_indicator || 'HEALTHY';
                          counts[h] = (counts[h] || 0) + 1;
                        });
                        const total = Object.values(counts).reduce((a,b) => a + b, 0) || 1;
                        const colors: Record<string,string> = { OUT_OF_STOCK: '#dc2626', CRITICAL_LOW: '#f97316', LOW: '#f59e0b', HEALTHY: '#10b981', OVERSTOCK: '#6366f1' };
                        let start = 0;
                        const paths: any[] = [];
                        Object.entries(counts).forEach(([k,v]) => {
                          const portion = v / total;
                          if (portion <= 0) return;
                          const end = start + portion;
                          const large = end - start > 0.5 ? 1 : 0;
                          const sx = 32 + 32 * Math.cos(2 * Math.PI * start);
                          const sy = 32 + 32 * Math.sin(2 * Math.PI * start);
                          const ex = 32 + 32 * Math.cos(2 * Math.PI * end);
                          const ey = 32 + 32 * Math.sin(2 * Math.PI * end);
                          const d = `M32 32 L ${sx} ${sy} A 32 32 0 ${large} 1 ${ex} ${ey} Z`;
                          paths.push(<path key={k} d={d} fill={colors[k] || '#9CA3AF'} />);
                          start = end;
                        });
                        return paths;
                      })()
                    }
                  </svg>
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Inventar Paylanması</h4>
                    <div className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-1">
                      <div>Stok bitib: {(sampleProducts || []).filter(p => (p.stock_status?.health_indicator || '') === 'OUT_OF_STOCK').length}</div>
                      <div>Kritik səviyyə: {(sampleProducts || []).filter(p => (p.stock_status?.health_indicator || '') === 'CRITICAL_LOW').length}</div>
                      <div>Aşağı: {(sampleProducts || []).filter(p => (p.stock_status?.health_indicator || '') === 'LOW').length}</div>
                      <div>Sağlam: {(sampleProducts || []).filter(p => (p.stock_status?.health_indicator || '') === 'HEALTHY').length}</div>
                      <div>Artıq stok: {(sampleProducts || []).filter(p => (p.stock_status?.health_indicator || '') === 'OVERSTOCK').length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend / analytics summary */}
              <div className="md:col-span-1 bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Analitika Xülasəsi</h4>
                <div className="mt-4 space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between"><span>Ümumi SKUs</span><span>{totalCount}</span></div>
                  <div className="flex items-center justify-between"><span>Critical SKUs</span><span>{criticalCount}</span></div>
                  <div className="flex items-center justify-between"><span>In-stock %</span><span>{inStockPercent}%</span></div>
                  <div className="flex items-center justify-between"><span>Avg Lead Time</span><span>{avgLeadTime} gün</span></div>
                </div>
              </div>
            </div>

          {/* Recent Shipments table */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 border border-gray-200 dark:border-gray-800">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Son Çatdırılmalar</h3>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-2">ID</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2">Təchizatçı</th>
                    <th className="pb-2">Tarix</th>
                  </tr>
                </thead>
                <tbody>
                  {metricsLoading && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">Yüklənir...</td></tr>
                  )}
                  {!metricsLoading && (!sampleProducts || sampleProducts.length === 0) && (
                    <tr><td colSpan={4} className="py-4 text-center text-gray-500">Çatdırılma məlumatı tapılmadı</td></tr>
                  )}
                  {!metricsLoading && sampleProducts && sampleProducts.slice(0,5).map((p) => (
                    <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800">
                      <td className="py-2">{p.product_id || p.id}</td>
                      <td className="py-2">{p.stock_status.health_indicator}</td>
                      <td className="py-2">{p.supplier_id}</td>
                      <td className="py-2">{p.updated_at?.slice(0,10) ?? ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column (widgets) */}
        <div className="space-y-6">
          {/* Inventory Health */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Inventar Sağlamlığı</h4>
            <div className="mt-3 flex items-center gap-3">
              <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                <div className="h-2 bg-green-500" style={{ width: `${Math.min(100, (sampleProducts?.length ?? 0) * 5)}%` }} />
              </div>
              <div className="text-xs text-gray-500">{sampleProducts ? `${sampleProducts.length} SKUs` : '—'}</div>
            </div>
          </div>

          {/* Top Suppliers */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Top Təchizatçılar</h4>
            <ul className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {metricsLoading && <li>Yüklənir...</li>}
              {!metricsLoading && suppliers.length === 0 && <li>Məlumat yoxdur</li>}
              {!metricsLoading && suppliers.slice(0,5).map((s) => (
                <li key={s.id} className="flex items-center justify-between">
                  <span>{s.supplier_name}</span>
                  <span className="text-xs text-gray-500">{s.total_active_skus ?? 0} SKUs</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Alerts */}
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-4 border border-gray-200 dark:border-gray-800">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Xəbərdarlıqlar</h4>
            <ul className="mt-3 text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <li className="text-red-600">• 3 məhsul üçün stok kritik səviyyədə</li>
              <li className="text-yellow-600">• 5 sifariş gecikmiş</li>
              <li className="text-green-600">• Bütün sistemlər normal işləyir</li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
