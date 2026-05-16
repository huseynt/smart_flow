'use client';

/**
 * Təchizatçı → Məhsullar səhifəsi (M1)
 *
 * - Tək məhsul əlavə etmə formu
 * - CSV toplu import (şablon yükləmə + preview + xəta yoxlaması)
 * - Əlavə edilmiş məhsullar cədvəli
 * - suppliers_promote koleksiyasına yazır
 *
 * Yerləşdir: app/(dashboard)/supply/product/page.tsx
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch,
  doc,
} from 'firebase/firestore';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';
import {
  Plus,
  Package,
  X,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  AlertCircle,
  Box,
  Truck,
  Hash,
  BarChart3,
  Search,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckSquare,
  Eye,
  Trash2,
  FileText,
} from 'lucide-react';
import { useSupplyProfile } from '@/hooks/useSupplyProfile';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderUOM = 'Case' | 'Pallet' | 'Box';
type PendingStatus = 'pending' | 'accepted' | 'rejected';
type AddMode = 'single' | 'csv';

// ─── Product categories ───────────────────────────────────────────────────────

export const PRODUCT_CATEGORIES = [
  'İçkilər / Qazlı içkilər', 'İçkilər / Qazlı su', 'İçkilər / Mineral su',
  'İçkilər / Meyvə suyu', 'İçkilər / Enerji içkiləri', 'İçkilər / İdman içkiləri',
  'İçkilər / İced tea', 'İçkilər / Kofe içkiləri (hazır)', 'İçkilər / Limonad', 'İçkilər / Kokteyl',
  'Süd məhsulları / Süd', 'Süd məhsulları / Qatıq', 'Süd məhsulları / Yoqurt',
  'Süd məhsulları / Qaymaq', 'Süd məhsulları / Pendir', 'Süd məhsulları / Kəsmik',
  'Süd məhsulları / Kərə yağı', 'Süd məhsulları / Ayran', 'Süd məhsulları / Qatılaşdırılmış süd',
  'Çay & Qəhvə / Qara çay', 'Çay & Qəhvə / Yaşıl çay', 'Çay & Qəhvə / Bitki çayı',
  'Çay & Qəhvə / Meyvə çayı', 'Çay & Qəhvə / Anında qəhvə', 'Çay & Qəhvə / Espresso kapsulu', 'Çay & Qəhvə / Kakao',
  'Qəlyanaltılar / Çips', 'Qəlyanaltılar / Krekerlər', 'Qəlyanaltılar / Popcorn',
  'Qəlyanaltılar / Quru meyvə', 'Qəlyanaltılar / Fındıq & Qoz', 'Qəlyanaltılar / Cips (tortilla)',
  'Qəlyanaltılar / Müsli & Qranola', 'Qəlyanaltılar / Paxlava & Şərq şirniyyatı',
  'Şirniyyat / Şokolad', 'Şirniyyat / Konfet', 'Şirniyyat / Karamel',
  'Şirniyyat / Marmelad & Jele', 'Şirniyyat / Zefir & Marshmallow',
  'Şirniyyat / Şokolad pastası', 'Şirniyyat / Saqqız',
  'Çörək & Çörəkçilik / Çörək', 'Çörək & Çörəkçilik / Lavaş', 'Çörək & Çörəkçilik / Keks',
  'Çörək & Çörəkçilik / Pişi & Fətir', 'Çörək & Çörəkçilik / Kruassan',
  'Çörək & Çörəkçilik / Tost çörəyi', 'Çörək & Çörəkçilik / Biskvit',
  'Makaron & Yarma / Makaron', 'Makaron & Yarma / Düyü', 'Makaron & Yarma / Bulgur',
  'Makaron & Yarma / Qarabaşaq', 'Makaron & Yarma / Yulaf', 'Makaron & Yarma / Mərci',
  'Makaron & Yarma / Noxud', 'Makaron & Yarma / Lobya',
  'Konservlər / Pomidor konservi', 'Konservlər / Balıq konservi', 'Konservlər / Ət konservi',
  'Konservlər / Tərəvəz konservi', 'Konservlər / Meyvə kompotu', 'Konservlər / Turşu & Marinad',
  'Ət & Quşçuluq / Toyuq', 'Ət & Quşçuluq / Mal əti', 'Ət & Quşçuluq / Donuz əti',
  'Ət & Quşçuluq / Qoyun əti', 'Ət & Quşçuluq / Kolbasa & Sosis',
  'Ət & Quşçuluq / Vetçina & Jambon', 'Ət & Quşçuluq / Qurutulmuş ət',
  'Balıq & Dəniz / Təzə balıq', 'Balıq & Dəniz / Dondurulmuş balıq',
  'Balıq & Dəniz / Qisidilmiş balıq', 'Balıq & Dəniz / Karides', 'Balıq & Dəniz / Xərçəng',
  'Tərəvəz & Meyvə / Təzə tərəvəz', 'Tərəvəz & Meyvə / Təzə meyvə',
  'Tərəvəz & Meyvə / Dondurulmuş tərəvəz', 'Tərəvəz & Meyvə / Dondurulmuş meyvə',
  'Yağlar & Souslar / Zeytun yağı', 'Yağlar & Souslar / Günəbaxan yağı',
  'Yağlar & Souslar / Qarğıdalı yağı', 'Yağlar & Souslar / Ketchup',
  'Yağlar & Souslar / Mayonez', 'Yağlar & Souslar / Xardal',
  'Yağlar & Souslar / Soya sousu', 'Yağlar & Souslar / Balzamik sirkə',
  'Baharatlar / Duz', 'Baharatlar / Şəkər', 'Baharatlar / Bibər', 'Baharatlar / Zəfəran',
  'Baharatlar / Darçın', 'Baharatlar / Mixək', 'Baharatlar / Kəklikotu',
  'Baharatlar / Reyhan', 'Baharatlar / Hazır baharat qarışığı',
  'Un & Bişirmə / Buğda unu', 'Un & Bişirmə / Mısır unu', 'Un & Bişirmə / Kabartma tozu',
  'Un & Bişirmə / Yeast (maya)', 'Un & Bişirmə / Nişasta', 'Un & Bişirmə / Vanilin',
  'Dondurulmuş / Pizza', 'Dondurulmuş / Hazır yeməklər', 'Dondurulmuş / Pelmeni & Mantu',
  'Dondurulmuş / Xinkali', 'Dondurulmuş / Dondurma',
  'Uşaq qidası / Körpə püresi', 'Uşaq qidası / Körpə südu',
  'Uşaq qidası / Körpə ərzaqları', 'Uşaq qidası / Uşaq qranolası',
  'Üzvi & Sağlıklı / Üzvi meyvə-tərəvəz', 'Üzvi & Sağlıklı / Glutensiz məhsullar',
  'Üzvi & Sağlıklı / Veqan məhsullar', 'Üzvi & Sağlıklı / Protein barı',
  'Üzvi & Sağlıklı / Protein tozu', 'Üzvi & Sağlıqlı / Superfood',
  'Ev kimyası / Bulaşıq dəsti', 'Ev kimyası / Paltaryuyan', 'Ev kimyası / Ümumi təmizləyici',
  'Ev kimyası / Hamam təmizləyicisi', 'Ev kimyası / Cam təmizləyicisi',
  'Ev kimyası / Əl sabunu (maye)', 'Ev kimyası / Antiseptik',
  'Şəxsi qayğı / Şampun', 'Şəxsi qayğı / Saç kondisioneri', 'Şəxsi qayğı / Duş geli',
  'Şəxsi qayğı / Diş məcunu', 'Şəxsi qayğı / Diş fırçası', 'Şəxsi qayğı / Dezodorant',
  'Şəxsi qayğı / Ülgüc', 'Şəxsi qayğı / Dəri qayğı kremi',
  'Kağız məhsulları / Tualet kağızı', 'Kağız məhsulları / Kağız dəsmal',
  'Kağız məhsulları / Peçetlər', 'Kağız məhsulları / Bezlik',
  'Pet məhsulları / It qidası', 'Pet məhsulları / Pişik qidası', 'Pet məhsulları / Pet aksessuarları',
  'Aperitiv / Virgin kokteyl', 'Aperitiv / Kombucha', 'Aperitiv / Kefir içkiləri',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

type PendingProduct = {
  id: string;
  product_id: string;
  barcode: string;
  product_name: string;
  product_category: ProductCategory;
  uom_conversion: { order_uom: OrderUOM; units_per_case: number };
  stock_status: {
    supplier_atp_case: number;
    supplier_atp_piece: number;
    bravo_current_stock_piece: number;
    bravo_reorder_point_piece: number;
    health_indicator: 'CRITICAL_LOW';
    health_order: 1;
  };
  logistics: { moq_case: number; lead_time_days: number };
  supplier_id: string;
  supplier_name: string;
  status: PendingStatus;
  created_at: string;
  updated_at: string;
};

type FormState = {
  product_name: string;
  barcode: string;
  product_id: string;
  product_category: string;
  order_uom: OrderUOM;
  units_per_case: string;
  moq_case: string;
  lead_time_days: string;
  supplier_atp_case: string;
};

// CSV row after parsing
type CsvRow = {
  _rowNum: number;
  product_name: string;
  barcode: string;
  product_id: string;
  product_category: string;
  order_uom: string;
  units_per_case: string;
  moq_case: string;
  lead_time_days: string;
  supplier_atp_case: string;
  errors: string[];
};

const EMPTY_FORM: FormState = {
  product_name: '',
  barcode: '',
  product_id: '',
  product_category: '',
  order_uom: 'Case',
  units_per_case: '',
  moq_case: '',
  lead_time_days: '',
  supplier_atp_case: '',
};

// CSV column headers — exact match expected
const CSV_HEADERS = [
  'product_name',
  'barcode',
  'product_id',
  'product_category',
  'order_uom',
  'units_per_case',
  'moq_case',
  'lead_time_days',
  'supplier_atp_case',
];

// ─── CSV template generator ───────────────────────────────────────────────────

function downloadCsvTemplate() {
  const header = CSV_HEADERS.join(',');
  const example = [
    'Milla Süd 1L',
    '4760000123456',
    'ML-SUD-1L',
    'Süd məhsulları / Süd',
    'Case',
    '12',
    '10',
    '2',
    '500',
  ].join(',');
  const example2 = [
    'Coca-Cola 0.5L',
    '5449000000996',
    'CC-05L',
    'İçkilər / Qazlı içkilər',
    'Case',
    '24',
    '5',
    '1',
    '1000',
  ].join(',');
  const csv = `${header}\n${example}\n${example2}`;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mehsul_sablonu.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ─── CSV parser & validator ───────────────────────────────────────────────────

function parseCsv(text: string): CsvRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  // Header row — normalize
  const headerLine = lines[0].toLowerCase().replace(/\s/g, '_');
  const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    // Handle quoted fields
    const fields: string[] = [];
    let cur = '';
    let inQuote = false;
    for (const ch of lines[i]) {
      if (ch === '"') { inQuote = !inQuote; continue; }
      if (ch === ',' && !inQuote) { fields.push(cur.trim()); cur = ''; continue; }
      cur += ch;
    }
    fields.push(cur.trim());

    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = fields[idx] ?? ''; });

    const row: CsvRow = {
      _rowNum: i + 1,
      product_name: obj['product_name'] ?? '',
      barcode: obj['barcode'] ?? '',
      product_id: obj['product_id'] ?? '',
      product_category: obj['product_category'] ?? '',
      order_uom: obj['order_uom'] ?? 'Case',
      units_per_case: obj['units_per_case'] ?? '',
      moq_case: obj['moq_case'] ?? '',
      lead_time_days: obj['lead_time_days'] ?? '',
      supplier_atp_case: obj['supplier_atp_case'] ?? '',
      errors: [],
    };

    // Validate
    if (!row.product_name.trim()) row.errors.push('Məhsul adı boşdur');
    if (!row.barcode.trim()) row.errors.push('Barkod boşdur');
    if (!row.product_id.trim()) row.errors.push('SKU boşdur');
    if (!row.product_category.trim()) {
      row.errors.push('Kateqoriya boşdur');
    } else if (!PRODUCT_CATEGORIES.includes(row.product_category as ProductCategory)) {
      row.errors.push(`Kateqoriya tanınmır: "${row.product_category}"`);
    }
    if (!['Case', 'Pallet', 'Box'].includes(row.order_uom)) {
      row.errors.push(`UOM səhvdir (Case/Pallet/Box olmalıdır)`);
    }
    if (isNaN(Number(row.units_per_case)) || Number(row.units_per_case) <= 0)
      row.errors.push('units_per_case müsbət rəqəm olmalıdır');
    if (isNaN(Number(row.moq_case)) || Number(row.moq_case) <= 0)
      row.errors.push('moq_case müsbət rəqəm olmalıdır');
    if (isNaN(Number(row.lead_time_days)) || Number(row.lead_time_days) <= 0)
      row.errors.push('lead_time_days müsbət rəqəm olmalıdır');
    if (isNaN(Number(row.supplier_atp_case)) || Number(row.supplier_atp_case) < 0)
      row.errors.push('supplier_atp_case 0 və ya daha böyük olmalıdır');

    rows.push(row);
  }

  return rows;
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<PendingStatus, { label: string; badge: string; icon: React.ReactNode }> = {
  pending:  { label: 'Gözləyir',     badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',   icon: <Clock       className="h-3 w-3" /> },
  accepted: { label: 'Qəbul edildi', badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',   icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: 'Rədd edildi',  badge: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',           icon: <XCircle     className="h-3 w-3" /> },
};

function StatusBadge({ status }: { status: PendingStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, hint, error, children, required }: {
  label: string; hint?: string; error?: string; children: React.ReactNode; required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />{error}
        </p>
      )}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

// ─── Category searchable dropdown ─────────────────────────────────────────────

function CategorySearch({ value, onChange, error }: {
  value: string; onChange: (val: string) => void; error?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? PRODUCT_CATEGORIES.filter((c) => c.toLowerCase().includes(query.toLowerCase()))
    : PRODUCT_CATEGORIES;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      {value && !open ? (
        <div
          className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg border cursor-pointer transition
            ${error ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
          onClick={() => setOpen(true)}
        >
          <span className="truncate">{value}</span>
          <button type="button" onClick={(e) => { e.stopPropagation(); onChange(''); setQuery(''); }}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input type="text" value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={value || 'Kateqoriya axtar...'}
            className={`${inputCls} pl-9 ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
        </div>
      )}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Nəticə tapılmadı</p>
          ) : (
            filtered.map((cat) => {
              const [group, item] = cat.split(' / ');
              return (
                <button key={cat} type="button"
                  onClick={() => { onChange(cat); setQuery(''); setOpen(false); }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30
                    ${value === cat ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  <span className="text-xs text-gray-400 dark:text-gray-500 block leading-none mb-0.5">{group}</span>
                  {item ?? cat}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── CSV Import Panel ─────────────────────────────────────────────────────────

function CsvImportPanel({ supplierId, supplierName, onSuccess }: {
  supplierId: string;
  supplierName: string;
  onSuccess: (count: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview'>('upload');

  const validRows   = rows.filter((r) => r.errors.length === 0);
  const invalidRows = rows.filter((r) => r.errors.length > 0);

  const handleFile = (file: File) => {
    if (!file.name.endsWith('.csv')) {
      alert('Yalnız .csv faylı qəbul edilir');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      setRows(parsed);
      setStep('preview');
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleImport = async () => {
    if (validRows.length === 0) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      // Firestore batch — max 500 per batch
      const chunks: CsvRow[][] = [];
      for (let i = 0; i < validRows.length; i += 400) {
        chunks.push(validRows.slice(i, i + 400));
      }
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const row of chunk) {
          const atpCase     = Number(row.supplier_atp_case);
          const unitsPer    = Number(row.units_per_case);
          const moqCase     = Number(row.moq_case);
          const reorder     = moqCase * unitsPer;
          const newDocRef   = doc(collection(db, 'suppliers_promote'));
          batch.set(newDocRef, {
            product_id:       row.product_id.trim(),
            barcode:          row.barcode.trim(),
            product_name:     row.product_name.trim(),
            product_category: row.product_category as ProductCategory,
            uom_conversion:   { order_uom: row.order_uom as OrderUOM, units_per_case: unitsPer },
            stock_status: {
              supplier_atp_case:          atpCase,
              supplier_atp_piece:         atpCase * unitsPer,
              bravo_current_stock_piece:  0,
              bravo_reorder_point_piece:  reorder,
              health_indicator:           'CRITICAL_LOW',
              health_order:               1,
            },
            logistics:     { moq_case: moqCase, lead_time_days: Number(row.lead_time_days) },
            supplier_id:   supplierId,
            supplier_name: supplierName,
            status:        'pending',
            created_at:    now,
            updated_at:    now,
          });
        }
        await batch.commit();
      }
      onSuccess(validRows.length);
      setRows([]);
      setFileName('');
      setStep('upload');
    } catch (err) {
      console.error('CSV import error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setRows([]);
    setFileName('');
    setStep('upload');
  };

  // ── Upload step ──────────────────────────────────────────────────────────

  if (step === 'upload') {
    return (
      <div className="space-y-5">
        {/* Info strip */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-[280px] px-4 py-3.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800">
            <FileText className="h-5 w-5 text-indigo-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-200">CSV formatı haqqında</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 leading-relaxed">
                Faylın birinci sətri başlıq olmalıdır. Lazımi sütunlar:<br />
                <span className="font-mono">product_name, barcode, product_id, product_category, order_uom, units_per_case, moq_case, lead_time_days, supplier_atp_case</span>
              </p>
            </div>
          </div>
          <button
            onClick={downloadCsvTemplate}
            className="flex items-center gap-2 px-4 py-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600 transition"
          >
            <Download className="h-4 w-4 text-indigo-500" />
            Şablonu yüklə
          </button>
        </div>

        {/* Drop zone */}
        <input ref={fileRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          className={`flex flex-col items-center justify-center gap-4 px-8 py-14 rounded-xl border-2 border-dashed cursor-pointer transition-all
            ${dragOver
              ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 dark:border-indigo-500'
              : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-800/40'}`}
        >
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center">
            <FileSpreadsheet className="h-7 w-7 text-indigo-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">CSV faylını bura sürükləyin</p>
            <p className="text-xs text-gray-400 mt-1">
              və ya <span className="text-indigo-500 font-medium">kompüterinizdən seçin</span>
            </p>
          </div>
          <span className="text-xs text-gray-400 px-3 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            Yalnız .csv
          </span>
        </div>
      </div>
    );
  }

  // ── Preview step ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
          <FileSpreadsheet className="h-4 w-4 text-gray-400" />
          <span className="font-mono font-medium">{fileName}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 text-xs text-green-700 dark:text-green-400">
          <CheckSquare className="h-4 w-4" />
          <strong>{validRows.length}</strong> məhsul hazır
        </div>
        {invalidRows.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
            <strong>{invalidRows.length}</strong> xətalı sətir (atlanacaq)
          </div>
        )}
        <button onClick={reset}
          className="ml-auto flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition">
          <Trash2 className="h-3.5 w-3.5" />
          Təmizlə
        </button>
      </div>

      {/* Preview table */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <Eye className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
            Önizləmə — {rows.length} sətir
          </span>
        </div>
        <div className="overflow-x-auto max-h-72 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white dark:bg-gray-900 z-10">
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-3 py-2.5 text-left text-gray-400 font-semibold w-10">#</th>
                <th className="px-3 py-2.5 text-left text-gray-400 font-semibold">Məhsul adı</th>
                <th className="px-3 py-2.5 text-left text-gray-400 font-semibold">Barkod</th>
                <th className="px-3 py-2.5 text-left text-gray-400 font-semibold">SKU</th>
                <th className="px-3 py-2.5 text-left text-gray-400 font-semibold">Kateqoriya</th>
                <th className="px-3 py-2.5 text-left text-gray-400 font-semibold">UOM</th>
                <th className="px-3 py-2.5 text-right text-gray-400 font-semibold">Ədəd/koli</th>
                <th className="px-3 py-2.5 text-right text-gray-400 font-semibold">MOQ</th>
                <th className="px-3 py-2.5 text-right text-gray-400 font-semibold">Gün</th>
                <th className="px-3 py-2.5 text-right text-gray-400 font-semibold">Stok</th>
                <th className="px-3 py-2.5 text-center text-gray-400 font-semibold">Vəziyyət</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((row) => {
                const hasError = row.errors.length > 0;
                return (
                  <tr key={row._rowNum}
                    className={hasError
                      ? 'bg-red-50/60 dark:bg-red-950/10'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800/40'}>
                    <td className="px-3 py-2.5 text-gray-400">{row._rowNum}</td>
                    <td className="px-3 py-2.5 font-medium text-gray-900 dark:text-white max-w-[140px] truncate">{row.product_name || <span className="text-red-400 italic">boş</span>}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-600 dark:text-gray-400">{row.barcode || <span className="text-red-400 italic">boş</span>}</td>
                    <td className="px-3 py-2.5 font-mono text-gray-600 dark:text-gray-400">{row.product_id || <span className="text-red-400 italic">boş</span>}</td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400 max-w-[160px] truncate" title={row.product_category}>
                      {row.product_category
                        ? row.product_category.split(' / ')[1] ?? row.product_category
                        : <span className="text-red-400 italic">boş</span>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 dark:text-gray-400">{row.order_uom}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{row.units_per_case}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{row.moq_case}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{row.lead_time_days}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700 dark:text-gray-300">{row.supplier_atp_case}</td>
                    <td className="px-3 py-2.5 text-center">
                      {hasError ? (
                        <span title={row.errors.join('\n')}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 font-medium cursor-help">
                          <AlertCircle className="h-3 w-3" />
                          Xəta
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400 font-medium">
                          <CheckCircle className="h-3 w-3" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error detail */}
      {invalidRows.length > 0 && (
        <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/10 overflow-hidden">
          <div className="px-4 py-3 border-b border-red-100 dark:border-red-900">
            <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">
              Xətalı sətirlər ({invalidRows.length})
            </span>
          </div>
          <div className="divide-y divide-red-100 dark:divide-red-900/40 max-h-40 overflow-y-auto">
            {invalidRows.map((row) => (
              <div key={row._rowNum} className="px-4 py-2.5 flex items-start gap-3">
                <span className="text-xs font-mono text-red-500 flex-shrink-0 mt-0.5">Sətir {row._rowNum}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-red-700 dark:text-red-300 truncate">{row.product_name || '(ad yoxdur)'}</p>
                  <ul className="text-[11px] text-red-500 dark:text-red-400 mt-0.5 space-y-0.5">
                    {row.errors.map((e, i) => <li key={i}>• {e}</li>)}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
        <button onClick={reset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
          <Upload className="h-4 w-4" />
          Başqa fayl seç
        </button>
        <button
          onClick={handleImport}
          disabled={validRows.length === 0 || submitting}
          className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition shadow-sm"
        >
          {submitting
            ? <><Loader2 className="h-4 w-4 animate-spin" />İdxal edilir...</>
            : <><ChevronRight className="h-4 w-4" />{validRows.length} məhsulu distributora göndər</>}
        </button>
      </div>
    </div>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRows({ cols, rows = 4 }: { cols: number; rows?: number }) {
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

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SupplierProductsPage() {
  useRequireAuth({ requiredRole: UserRole.SUPPLY });
  const supplyProfile = useSupplyProfile();

  const supplierId: string   = (supplyProfile as any)?.user_id    ?? 'demo-supplier';
  const supplierName: string = (supplyProfile as any)?.company_name ?? 'Demo Supplier';

  // Form
  const [form, setForm]         = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors]     = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [addMode, setAddMode]   = useState<AddMode>('single');
  const [successMsg, setSuccessMsg] = useState('');
  

  // Products list
  const [products, setProducts]             = useState<PendingProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'suppliers_promote'),
      where('supplier_id', '==', supplierId),
      orderBy('created_at', 'desc')
    );
    const unsub = onSnapshot(q,
      (snap) => { setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingProduct))); setLoadingProducts(false); },
      (err) => { console.error('pending_products listener:', err); setLoadingProducts(false); }
    );
    return () => unsub();
  }, [supplierId]);

  const reorderPoint =
    Number(form.moq_case) > 0 && Number(form.units_per_case) > 0
      ? Number(form.moq_case) * Number(form.units_per_case)
      : null;

  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.product_name.trim())    errs.product_name    = 'Məhsul adı tələb olunur';
    if (!form.barcode.trim())         errs.barcode         = 'Barkod tələb olunur';
    if (!form.product_id.trim())      errs.product_id      = 'SKU kodu tələb olunur';
    if (!form.product_category)       errs.product_category = 'Kateqoriya seçin';
    if (!form.units_per_case || Number(form.units_per_case) <= 0) errs.units_per_case = 'Müsbət rəqəm daxil edin';
    if (!form.moq_case       || Number(form.moq_case)       <= 0) errs.moq_case       = 'Müsbət rəqəm daxil edin';
    if (!form.lead_time_days || Number(form.lead_time_days) <= 0) errs.lead_time_days = 'Müsbət rəqəm daxil edin';
    if (!form.supplier_atp_case || Number(form.supplier_atp_case) < 0) errs.supplier_atp_case = 'Stok miqdarını daxil edin';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    const atpCase = Number(form.supplier_atp_case);
    const unitsPerCase = Number(form.units_per_case);
    const moqCase = Number(form.moq_case);
    const now = new Date().toISOString();
    try {
      await addDoc(collection(db, 'suppliers_promote'), {

        product_id:   form.product_id.trim(),
        barcode:      form.barcode.trim(),
        product_name: form.product_name.trim(),
        product_category: form.product_category as ProductCategory,
        uom_conversion: { order_uom: form.order_uom, units_per_case: unitsPerCase },
        stock_status: {
          supplier_atp_case: atpCase,
          supplier_atp_piece: atpCase * unitsPerCase,
          bravo_current_stock_piece: 0,
          bravo_reorder_point_piece: moqCase * unitsPerCase,
          health_indicator: 'CRITICAL_LOW',
          health_order: 1,
        },
        logistics: { moq_case: moqCase, lead_time_days: Number(form.lead_time_days) },
        supplier_id: supplyProfile?.user_id,
        supplier_name: supplyProfile?.company_name,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });
      setSuccessMsg(`"${form.product_name.trim()}" uğurla göndərildi`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) { console.error('addDoc error:', err); }
    finally { setSubmitting(false); }
  };

  const stats = {
    total:    products.length,
    pending:  products.filter((p) => p.status === 'pending').length,
    accepted: products.filter((p) => p.status === 'accepted').length,
    rejected: products.filter((p) => p.status === 'rejected').length,
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="h-6 w-6 text-indigo-500" />
            Məhsullarım
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Distributora göndərilən məhsul təklifləri
          </p>
        </div>
        <button
          onClick={() => { setShowForm((v) => !v); setForm(EMPTY_FORM); setErrors({}); setAddMode('single'); }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
        >
          {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm ? 'Ləğv et' : 'Məhsul əlavə et'}
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />{successMsg}
        </div>
      )}

      {/* Stat cards */}
      {!loadingProducts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Cəmi',        value: stats.total,    color: 'text-gray-700 dark:text-gray-200',   bg: 'bg-gray-100 dark:bg-gray-800' },
            { label: 'Gözləyir',    value: stats.pending,  color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Qəbul edildi',value: stats.accepted, color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Rədd edildi', value: stats.rejected, color: 'text-red-700 dark:text-red-300',     bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl px-4 py-3 ${s.bg} flex items-center justify-between`}>
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">{s.label}</span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add form panel */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden">
          {/* Mode tabs */}
          <div className="flex items-stretch border-b border-gray-100 dark:border-gray-800 bg-indigo-50 dark:bg-indigo-950/30">
            <button
              onClick={() => setAddMode('single')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition border-b-2 -mb-px ${
                addMode === 'single'
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <Plus className="h-4 w-4" />
              Tək məhsul
            </button>
            <button
              onClick={() => setAddMode('csv')}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium transition border-b-2 -mb-px ${
                addMode === 'csv'
                  ? 'border-indigo-600 text-indigo-700 dark:text-indigo-300'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV ilə toplu idxal
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="ml-auto px-4 py-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-6">
            {/* ── Single product form ── */}
            {addMode === 'single' && (
              <div className="space-y-6">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Hash className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Məhsul məlumatları</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Məhsul adı" required error={errors.product_name}>
                      <input name="product_name" value={form.product_name} onChange={handleChange}
                        placeholder="Coca-Cola Şəkərsiz 1L"
                        className={`${inputCls} ${errors.product_name ? 'border-red-400 focus:ring-red-400' : ''}`} />
                    </Field>
                    <Field label="Barkod" required error={errors.barcode}>
                      <input name="barcode" value={form.barcode} onChange={handleChange}
                        placeholder="4760000123456"
                        className={`${inputCls} ${errors.barcode ? 'border-red-400 focus:ring-red-400' : ''}`} />
                    </Field>
                    <Field label="SKU / Məhsul kodu" required error={errors.product_id}>
                      <input name="product_id" value={form.product_id} onChange={handleChange}
                        placeholder="CC-1L-ZERO-01"
                        className={`${inputCls} ${errors.product_id ? 'border-red-400 focus:ring-red-400' : ''}`} />
                    </Field>
                  </div>
                  <div className="mt-4">
                    <Field label="Kateqoriya" required error={errors.product_category}>
                      <CategorySearch value={form.product_category}
                        onChange={(val) => { setForm((p) => ({ ...p, product_category: val })); if (errors.product_category) setErrors((p) => ({ ...p, product_category: undefined })); }}
                        error={errors.product_category} />
                    </Field>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Box className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Qablaşdırma</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Sifariş vahidi" required>
                      <select name="order_uom" value={form.order_uom} onChange={handleChange} className={inputCls}>
                        <option value="Case">Case (koli)</option>
                        <option value="Pallet">Pallet</option>
                        <option value="Box">Box (qutu)</option>
                      </select>
                    </Field>
                    <Field label="Kolida neçə ədəd" required error={errors.units_per_case} hint="Hər kolinin içindəki məhsul sayı">
                      <input name="units_per_case" type="number" min={1} value={form.units_per_case} onChange={handleChange}
                        placeholder="12"
                        className={`${inputCls} ${errors.units_per_case ? 'border-red-400 focus:ring-red-400' : ''}`} />
                    </Field>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="h-4 w-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">Logistika</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="Minimum sifariş (koli)" required error={errors.moq_case} hint="MOQ">
                      <input name="moq_case" type="number" min={1} value={form.moq_case} onChange={handleChange}
                        placeholder="5"
                        className={`${inputCls} ${errors.moq_case ? 'border-red-400 focus:ring-red-400' : ''}`} />
                    </Field>
                    <Field label="Çatdırılma müddəti (gün)" required error={errors.lead_time_days}>
                      <input name="lead_time_days" type="number" min={1} value={form.lead_time_days} onChange={handleChange}
                        placeholder="2"
                        className={`${inputCls} ${errors.lead_time_days ? 'border-red-400 focus:ring-red-400' : ''}`} />
                    </Field>
                    <Field label="Mövcud stok (koli)" required error={errors.supplier_atp_case} hint="Anbarda hazır olan koli sayı">
                      <input name="supplier_atp_case" type="number" min={0} value={form.supplier_atp_case} onChange={handleChange}
                        placeholder="500"
                        className={`${inputCls} ${errors.supplier_atp_case ? 'border-red-400 focus:ring-red-400' : ''}`} />
                    </Field>
                  </div>
                </div>

                {reorderPoint !== null && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800">
                    <BarChart3 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Avtomatik sifariş nöqtəsi: </span>
                      <span className="font-bold text-indigo-700 dark:text-indigo-300">{reorderPoint.toLocaleString('az-AZ')} ədəd</span>
                      <span className="text-xs text-gray-400 ml-2">({form.moq_case} koli × {form.units_per_case} ədəd)</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setErrors({}); }}
                    className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition">
                    Ləğv et
                  </button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm">
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                    {submitting ? 'Göndərilir...' : 'Distributora göndər'}
                  </button>
                </div>
              </div>
            )}

            {/* ── CSV import ── */}
            {addMode === 'csv' && (
              <CsvImportPanel
                supplierId={supplierId}
                supplierName={supplierName}
                onSuccess={(count) => {
                  setSuccessMsg(`${count} məhsul uğurla distributora göndərildi`);
                  setShowForm(false);
                  setTimeout(() => setSuccessMsg(''), 5000);
                }}
              />
            )}
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">Göndərilmiş məhsullar</span>
          {!loadingProducts && <span className="text-xs text-gray-400">{products.length} məhsul</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-left">
                {['Məhsul', 'Kateqoriya', 'Qablaşdırma', 'MOQ / Çatdırılma', 'ATP (koli)', 'Sifariş nöqtəsi', 'Status', 'Tarix'].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loadingProducts ? (
                <SkeletonRows cols={8} />
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Hələ məhsul göndərilməyib</p>
                    <p className="text-xs mt-1">Yuxarıdakı "Məhsul əlavə et" düyməsinə basın</p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white leading-tight">{p.product_name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.barcode} · {p.product_id}</p>
                    </td>
                    <td className="px-4 py-3">
                      {p.product_category && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 max-w-[160px] truncate" title={p.product_category}>
                          {p.product_category.split(' / ')[1] ?? p.product_category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {p.uom_conversion.units_per_case} ədəd / {p.uom_conversion.order_uom}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      Min {p.logistics.moq_case} koli · {p.logistics.lead_time_days} gün
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                      {p.stock_status.supplier_atp_case.toLocaleString('az-AZ')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                      {p.stock_status.bravo_reorder_point_piece.toLocaleString('az-AZ')} <span className="text-xs">ədəd</span>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString('az-AZ', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}