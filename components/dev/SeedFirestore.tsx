'use client';

/**
 * SeedFirestore komponenti
 * Yalnız development məqsədli — mock data Firestore-a yükləyir
 *
 * Yerləşdir: components/dev/SeedFirestore.tsx
 * İstifadə:  istənilən səhifəyə əlavə et, işlədəndən sonra sil
 */

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, setDoc, collection, addDoc } from 'firebase/firestore';
import { Database, CheckCircle, XCircle, Loader2, Trash2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type HealthIndicator = 'OUT_OF_STOCK' | 'CRITICAL_LOW' | 'LOW' | 'HEALTHY' | 'OVERSTOCK';

type Supplier = {
  supplier_name: string;
  supplier_category: string;
  total_active_skus: number;
  last_sync_date: string;
  created_at: string;
  updated_at: string;
};

type Product = {
  product_id: string;
  barcode: string;
  product_name: string;
  uom_conversion: {
    order_uom: string;
    units_per_case: number;
  };
  stock_status: {
    supplier_atp_case: number;
    supplier_atp_piece: number;
    bravo_current_stock_piece: number;
    bravo_reorder_point_piece: number;
    health_indicator: HealthIndicator;
    health_order: number;
  };
  logistics: {
    moq_case: number;
    lead_time_days: number;
  };
  created_at: string;
  updated_at: string;
};

type SupplierWithProducts = {
  supplier: Supplier;
  products: Product[];
};

// ─── Mock data ────────────────────────────────────────────────────────────────

const now = new Date().toISOString();

const MOCK_DATA: SupplierWithProducts[] = [
  {
    supplier: {
      supplier_name: 'Coca-Cola Bottlers Azerbaijan',
      supplier_category: 'İçkilər',
      total_active_skus: 3,
      last_sync_date: now,
      created_at: now,
      updated_at: now,
    },
    products: [
      {
        product_id: 'CC-1L-ZERO-01',
        barcode: '4760000123456',
        product_name: 'Coca-Cola Şəkərsiz 1L PET',
        uom_conversion: { order_uom: 'Case', units_per_case: 12 },
        stock_status: {
          supplier_atp_case: 500,
          supplier_atp_piece: 6000,
          bravo_current_stock_piece: 450,
          bravo_reorder_point_piece: 800,
          health_indicator: 'CRITICAL_LOW',
          health_order: 1,
        },
        logistics: { moq_case: 5, lead_time_days: 2 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'CC-033-CLS-02',
        barcode: '4760000123457',
        product_name: 'Coca-Cola Classic 0.33L Şüşə',
        uom_conversion: { order_uom: 'Case', units_per_case: 24 },
        stock_status: {
          supplier_atp_case: 1200,
          supplier_atp_piece: 28800,
          bravo_current_stock_piece: 960,
          bravo_reorder_point_piece: 600,
          health_indicator: 'HEALTHY',
          health_order: 3,
        },
        logistics: { moq_case: 10, lead_time_days: 2 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'FNT-05-STR-03',
        barcode: '4760000123458',
        product_name: 'Fanta Çiyələk 0.5L PET',
        uom_conversion: { order_uom: 'Case', units_per_case: 12 },
        stock_status: {
          supplier_atp_case: 80,
          supplier_atp_piece: 960,
          bravo_current_stock_piece: 200,
          bravo_reorder_point_piece: 400,
          health_indicator: 'LOW',
          health_order: 2,
        },
        logistics: { moq_case: 5, lead_time_days: 3 },
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    supplier: {
      supplier_name: 'Nar Premium Meyvə Suları',
      supplier_category: 'Meyvə Suları',
      total_active_skus: 3,
      last_sync_date: now,
      created_at: now,
      updated_at: now,
    },
    products: [
      {
        product_id: 'NAR-1L-POM-01',
        barcode: '4760000234561',
        product_name: 'Nar Nektarı 1L Tetra Pak',
        uom_conversion: { order_uom: 'Case', units_per_case: 6 },
        stock_status: {
          supplier_atp_case: 300,
          supplier_atp_piece: 1800,
          bravo_current_stock_piece: 1200,
          bravo_reorder_point_piece: 500,
          health_indicator: 'OVERSTOCK',
          health_order: 4,
        },
        logistics: { moq_case: 10, lead_time_days: 1 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'NAR-025-MNG-02',
        barcode: '4760000234562',
        product_name: 'Nar Mango-Ananas 0.25L',
        uom_conversion: { order_uom: 'Case', units_per_case: 24 },
        stock_status: {
          supplier_atp_case: 50,
          supplier_atp_piece: 1200,
          bravo_current_stock_piece: 96,
          bravo_reorder_point_piece: 300,
          health_indicator: 'CRITICAL_LOW',
          health_order: 1,
        },
        logistics: { moq_case: 5, lead_time_days: 2 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'NAR-2L-APL-03',
        barcode: '4760000234563',
        product_name: 'Nar Alma Suyu 2L',
        uom_conversion: { order_uom: 'Case', units_per_case: 6 },
        stock_status: {
          supplier_atp_case: 400,
          supplier_atp_piece: 2400,
          bravo_current_stock_piece: 720,
          bravo_reorder_point_piece: 600,
          health_indicator: 'HEALTHY',
          health_order: 3,
        },
        logistics: { moq_case: 8, lead_time_days: 1 },
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    supplier: {
      supplier_name: 'Nestle Azerbaijan MMC',
      supplier_category: 'Süd Məhsulları',
      total_active_skus: 3,
      last_sync_date: now,
      created_at: now,
      updated_at: now,
    },
    products: [
      {
        product_id: 'NST-1L-MILK-01',
        barcode: '4760000345671',
        product_name: 'Nestle Tam Yağlı Süd 1L',
        uom_conversion: { order_uom: 'Case', units_per_case: 12 },
        stock_status: {
          supplier_atp_case: 600,
          supplier_atp_piece: 7200,
          bravo_current_stock_piece: 840,
          bravo_reorder_point_piece: 600,
          health_indicator: 'HEALTHY',
          health_order: 3,
        },
        logistics: { moq_case: 10, lead_time_days: 1 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'NST-200-YOG-02',
        barcode: '4760000345672',
        product_name: 'Nestle Şeftali Yoqurtu 200g',
        uom_conversion: { order_uom: 'Case', units_per_case: 18 },
        stock_status: {
          supplier_atp_case: 120,
          supplier_atp_piece: 2160,
          bravo_current_stock_piece: 180,
          bravo_reorder_point_piece: 360,
          health_indicator: 'LOW',
          health_order: 2,
        },
        logistics: { moq_case: 6, lead_time_days: 2 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'NST-500-CRM-03',
        barcode: '4760000345673',
        product_name: 'Nestle Qaymaq 500ml',
        uom_conversion: { order_uom: 'Case', units_per_case: 12 },
        stock_status: {
          supplier_atp_case: 2000,
          supplier_atp_piece: 24000,
          bravo_current_stock_piece: 1800,
          bravo_reorder_point_piece: 400,
          health_indicator: 'OVERSTOCK',
          health_order: 4,
        },
        logistics: { moq_case: 12, lead_time_days: 1 },
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    supplier: {
      supplier_name: 'Bakcell Snack Distribution',
      supplier_category: 'Qəlyanaltılar',
      total_active_skus: 3,
      last_sync_date: now,
      created_at: now,
      updated_at: now,
    },
    products: [
      {
        product_id: 'BCL-150-CHP-01',
        barcode: '4760000456781',
        product_name: 'Lays Klasik Çips 150g',
        uom_conversion: { order_uom: 'Case', units_per_case: 20 },
        stock_status: {
          supplier_atp_case: 800,
          supplier_atp_piece: 16000,
          bravo_current_stock_piece: 600,
          bravo_reorder_point_piece: 500,
          health_indicator: 'HEALTHY',
          health_order: 3,
        },
        logistics: { moq_case: 10, lead_time_days: 2 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'BCL-30-NUT-02',
        barcode: '4760000456782',
        product_name: 'Qavrulmuş Fıstıq 30g',
        uom_conversion: { order_uom: 'Case', units_per_case: 48 },
        stock_status: {
          supplier_atp_case: 25,
          supplier_atp_piece: 1200,
          bravo_current_stock_piece: 144,
          bravo_reorder_point_piece: 480,
          health_indicator: 'CRITICAL_LOW',
          health_order: 1,
        },
        logistics: { moq_case: 5, lead_time_days: 3 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'BCL-100-CRK-03',
        barcode: '4760000456783',
        product_name: 'Krakerz Duzlu Peynirli 100g',
        uom_conversion: { order_uom: 'Case', units_per_case: 30 },
        stock_status: {
          supplier_atp_case: 350,
          supplier_atp_piece: 10500,
          bravo_current_stock_piece: 480,
          bravo_reorder_point_piece: 600,
          health_indicator: 'LOW',
          health_order: 2,
        },
        logistics: { moq_case: 8, lead_time_days: 2 },
        created_at: now,
        updated_at: now,
      },
    ],
  },
  {
    supplier: {
      supplier_name: 'Azərbaycan Çay Evi',
      supplier_category: 'Çay & Qəhvə',
      total_active_skus: 3,
      last_sync_date: now,
      created_at: now,
      updated_at: now,
    },
    products: [
      {
        product_id: 'ACE-100-BLK-01',
        barcode: '4760000567891',
        product_name: 'Azərbaycan Qara Çayı 100g',
        uom_conversion: { order_uom: 'Case', units_per_case: 24 },
        stock_status: {
          supplier_atp_case: 700,
          supplier_atp_piece: 16800,
          bravo_current_stock_piece: 960,
          bravo_reorder_point_piece: 480,
          health_indicator: 'OVERSTOCK',
          health_order: 4,
        },
        logistics: { moq_case: 12, lead_time_days: 1 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'ACE-250-GRN-02',
        barcode: '4760000567892',
        product_name: 'Yaşıl Çay Limon 250g',
        uom_conversion: { order_uom: 'Case', units_per_case: 12 },
        stock_status: {
          supplier_atp_case: 90,
          supplier_atp_piece: 1080,
          bravo_current_stock_piece: 108,
          bravo_reorder_point_piece: 240,
          health_indicator: 'LOW',
          health_order: 2,
        },
        logistics: { moq_case: 6, lead_time_days: 2 },
        created_at: now,
        updated_at: now,
      },
      {
        product_id: 'ACE-200-COF-03',
        barcode: '4760000567893',
        product_name: 'Anında Qəhvə 3ü1ində 200g',
        uom_conversion: { order_uom: 'Case', units_per_case: 20 },
        stock_status: {
          supplier_atp_case: 450,
          supplier_atp_piece: 9000,
          bravo_current_stock_piece: 700,
          bravo_reorder_point_piece: 600,
          health_indicator: 'HEALTHY',
          health_order: 3,
        },
        logistics: { moq_case: 10, lead_time_days: 2 },
        created_at: now,
        updated_at: now,
      },
    ],
  },
];

// ─── Log item type ────────────────────────────────────────────────────────────

type LogItem = {
  text: string;
  type: 'info' | 'success' | 'error';
};

// ─── Component ────────────────────────────────────────────────────────────────

export function SeedFirestore() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [progress, setProgress] = useState(0); // 0–100

  const addLog = (text: string, type: LogItem['type'] = 'info') => {
    setLogs((prev) => [...prev, { text, type }]);
  };

  const handleSeed = async () => {
    setStatus('loading');
    setLogs([]);
    setProgress(0);

    const totalSteps = MOCK_DATA.length + MOCK_DATA.reduce((acc, s) => acc + s.products.length, 0);
    let completedSteps = 0;

    try {
      for (const entry of MOCK_DATA) {
        addLog(`▶ ${entry.supplier.supplier_name} yaradılır...`);
        const supplierRef = doc(collection(db, 'suppliers'));
        await setDoc(supplierRef, entry.supplier);
        completedSteps++;
        setProgress(Math.round((completedSteps / totalSteps) * 100));
        addLog(`✓ Supplier → suppliers/${supplierRef.id}`, 'success');

        for (const product of entry.products) {
          addLog(`  • ${product.product_name} əlavə edilir...`);
          const productRef = await addDoc(
            collection(db, 'suppliers', supplierRef.id, 'products'),
            product
          );
          completedSteps++;
          setProgress(Math.round((completedSteps / totalSteps) * 100));
          addLog(`  ✓ Məhsul → .../${productRef.id}`, 'success');
        }
      }

      addLog(`🎉 Tamamlandı! 5 supplier, 15 məhsul yükləndi.`, 'success');
      setStatus('done');
      setProgress(100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Xəta: ${msg}`, 'error');
      setStatus('error');
    }
  };

  const handleReset = () => {
    setStatus('idle');
    setLogs([]);
    setProgress(0);
  };

  const totalProducts = MOCK_DATA.reduce((acc, s) => acc + s.products.length, 0);

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <Database className="h-4 w-4 text-indigo-500" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          Firestore Seed
        </span>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400 font-medium">
          DEV
        </span>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {MOCK_DATA.length} supplier + {totalProducts} məhsul Firestore-a yüklənəcək.{' '}
          <span className="text-gray-400 dark:text-gray-500">
            (OUT_OF_STOCK, CRITICAL_LOW, LOW, HEALTHY, OVERSTOCK)
          </span>
        </p>

        {/* Progress bar */}
        {status === 'loading' && (
          <div className="w-full h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Log area */}
        {logs.length > 0 && (
          <div className="rounded-lg bg-gray-950 p-3 space-y-1 max-h-48 overflow-y-auto font-mono text-xs">
            {logs.map((log, i) => (
              <p
                key={i}
                className={
                  log.type === 'success'
                    ? 'text-green-400'
                    : log.type === 'error'
                    ? 'text-red-400'
                    : 'text-gray-400'
                }
              >
                {log.text}
              </p>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          {status !== 'done' && (
            <button
              onClick={handleSeed}
              disabled={status === 'loading'}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition"
            >
              {status === 'loading' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : status === 'error' ? (
                <XCircle className="h-4 w-4" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {status === 'loading'
                ? `Yüklənir... ${progress}%`
                : status === 'error'
                ? 'Yenidən cəhd et'
                : 'Seed et'}
            </button>
          )}

          {status === 'done' && (
            <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-sm font-medium">
              <CheckCircle className="h-4 w-4" />
              Uğurla yükləndi
            </div>
          )}

          {(status === 'done' || status === 'error') && (
            <button
              onClick={handleReset}
              className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              title="Sıfırla"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}