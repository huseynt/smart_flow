'use client';

/**
 * Təchizatçı → Məhsullar səhifəsi (M1)
 *
 * - Məhsul əlavə etmə formu
 * - Əlavə edilmiş məhsullar cədvəli
 * - bravo_reorder_point_piece = moq_case × units_per_case (avtomatik)
 * - suppliers_promote koleksiyasına yazır (distributor M2-də görəcək)
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
  Timestamp,
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
} from 'lucide-react';
import { useSupplyProfile } from '@/hooks/useSupplyProfile';

// ─── Types ────────────────────────────────────────────────────────────────────

type OrderUOM = 'Case' | 'Pallet' | 'Box';

type PendingStatus = 'pending' | 'accepted' | 'rejected';

// ─── Product categories ───────────────────────────────────────────────────────

export const PRODUCT_CATEGORIES = [
  // İçkilər
  'İçkilər / Qazlı içkilər',
  'İçkilər / Qazlı su',
  'İçkilər / Mineral su',
  'İçkilər / Meyvə suyu',
  'İçkilər / Enerji içkiləri',
  'İçkilər / İdman içkiləri',
  'İçkilər / İced tea',
  'İçkilər / Kofe içkiləri (hazır)',
  'İçkilər / Limonad',
  'İçkilər / Kokteyl',
  // Süd məhsulları
  'Süd məhsulları / Süd',
  'Süd məhsulları / Qatıq',
  'Süd məhsulları / Yoqurt',
  'Süd məhsulları / Qaymaq',
  'Süd məhsulları / Pendir',
  'Süd məhsulları / Kəsmik',
  'Süd məhsulları / Kərə yağı',
  'Süd məhsulları / Ayran',
  'Süd məhsulları / Qatılaşdırılmış süd',
  // Çay & Qəhvə
  'Çay & Qəhvə / Qara çay',
  'Çay & Qəhvə / Yaşıl çay',
  'Çay & Qəhvə / Bitki çayı',
  'Çay & Qəhvə / Meyvə çayı',
  'Çay & Qəhvə / Anında qəhvə',
  'Çay & Qəhvə / Espresso kapsulu',
  'Çay & Qəhvə / Kakao',
  // Qəlyanaltılar
  'Qəlyanaltılar / Çips',
  'Qəlyanaltılar / Krekerlər',
  'Qəlyanaltılar / Popcorn',
  'Qəlyanaltılar / Quru meyvə',
  'Qəlyanaltılar / Fındıq & Qoz',
  'Qəlyanaltılar / Cips (tortilla)',
  'Qəlyanaltılar / Müsli & Qranola',
  'Qəlyanaltılar / Paxlava & Şərq şirniyyatı',
  // Şirniyyat & Konfet
  'Şirniyyat / Şokolad',
  'Şirniyyat / Konfet',
  'Şirniyyat / Karamel',
  'Şirniyyat / Marmelad & Jele',
  'Şirniyyat / Zefir & Marshmallow',
  'Şirniyyat / Şokolad pastası',
  'Şirniyyat / Saqqız',
  // Çörək & Çörəkçilik
  'Çörək & Çörəkçilik / Çörək',
  'Çörək & Çörəkçilik / Lavaş',
  'Çörək & Çörəkçilik / Keks',
  'Çörək & Çörəkçilik / Pişi & Fətir',
  'Çörək & Çörəkçilik / Kruassan',
  'Çörək & Çörəkçilik / Tost çörəyi',
  'Çörək & Çörəkçilik / Biskvit',
  // Makaron & Yarma
  'Makaron & Yarma / Makaron',
  'Makaron & Yarma / Düyü',
  'Makaron & Yarma / Bulgur',
  'Makaron & Yarma / Qarabaşaq',
  'Makaron & Yarma / Yulaf',
  'Makaron & Yarma / Mərci',
  'Makaron & Yarma / Noxud',
  'Makaron & Yarma / Lobya',
  // Konservlər & Emal edilmiş qida
  'Konservlər / Pomidor konservi',
  'Konservlər / Balıq konservi',
  'Konservlər / Ət konservi',
  'Konservlər / Tərəvəz konservi',
  'Konservlər / Meyvə kompotu',
  'Konservlər / Turşu & Marinad',
  // Ət & Quşçuluq
  'Ət & Quşçuluq / Toyuq',
  'Ət & Quşçuluq / Mal əti',
  'Ət & Quşçuluq / Donuz əti',
  'Ət & Quşçuluq / Qoyun əti',
  'Ət & Quşçuluq / Kolbasa & Sosis',
  'Ət & Quşçuluq / Vetçina & Jambon',
  'Ət & Quşçuluq / Qurutulmuş ət',
  // Balıq & Dəniz məhsulları
  'Balıq & Dəniz / Təzə balıq',
  'Balıq & Dəniz / Dondurulmuş balıq',
  'Balıq & Dəniz / Qisidilmiş balıq',
  'Balıq & Dəniz / Karides',
  'Balıq & Dəniz / Xərçəng',
  // Tərəvəz & Meyvə
  'Tərəvəz & Meyvə / Təzə tərəvəz',
  'Tərəvəz & Meyvə / Təzə meyvə',
  'Tərəvəz & Meyvə / Dondurulmuş tərəvəz',
  'Tərəvəz & Meyvə / Dondurulmuş meyvə',
  // Yağlar & Souslar
  'Yağlar & Souslar / Zeytun yağı',
  'Yağlar & Souslar / Günəbaxan yağı',
  'Yağlar & Souslar / Qarğıdalı yağı',
  'Yağlar & Souslar / Ketchup',
  'Yağlar & Souslar / Mayonez',
  'Yağlar & Souslar / Xardal',
  'Yağlar & Souslar / Soya sousu',
  'Yağlar & Souslar / Balzamik sirkə',
  // Baharatlar & Ədviyyatlar
  'Baharatlar / Duz',
  'Baharatlar / Şəkər',
  'Baharatlar / Bibər',
  'Baharatlar / Zəfəran',
  'Baharatlar / Darçın',
  'Baharatlar / Mixək',
  'Baharatlar / Kəklikotu',
  'Baharatlar / Reyhan',
  'Baharatlar / Hazır baharat qarışığı',
  // Un & Bişirmə
  'Un & Bişirmə / Buğda unu',
  'Un & Bişirmə / Mısır unu',
  'Un & Bişirmə / Kabartma tozu',
  'Un & Bişirmə / Yeast (maya)',
  'Un & Bişirmə / Nişasta',
  'Un & Bişirmə / Vanilin',
  // Dondurulmuş qidalar
  'Dondurulmuş / Pizza',
  'Dondurulmuş / Hazır yeməklər',
  'Dondurulmuş / Pelmeni & Mantu',
  'Dondurulmuş / Xinkali',
  'Dondurulmuş / Dondurma',
  // Uşaq qidası
  'Uşaq qidası / Körpə püresi',
  'Uşaq qidası / Körpə südu',
  'Uşaq qidası / Körpə ərzaqları',
  'Uşaq qidası / Uşaq qranolası',
  // Üzvi & Sağlıklı qida
  'Üzvi & Sağlıklı / Üzvi meyvə-tərəvəz',
  'Üzvi & Sağlıklı / Glutensiz məhsullar',
  'Üzvi & Sağlıklı / Veqan məhsullar',
  'Üzvi & Sağlıklı / Protein barı',
  'Üzvi & Sağlıklı / Protein tozu',
  'Üzvi & Sağlıqlı / Superfood',
  // Ev kimyası
  'Ev kimyası / Bulaşıq dəsti',
  'Ev kimyası / Paltaryuyan',
  'Ev kimyası / Ümumi təmizləyici',
  'Ev kimyası / Hamam təmizləyicisi',
  'Ev kimyası / Cam təmizləyicisi',
  'Ev kimyası / Əl sabunu (maye)',
  'Ev kimyası / Antiseptik',
  // Şəxsi qayğı
  'Şəxsi qayğı / Şampun',
  'Şəxsi qayğı / Saç kondisioneri',
  'Şəxsi qayğı / Duş geli',
  'Şəxsi qayğı / Diş məcunu',
  'Şəxsi qayğı / Diş fırçası',
  'Şəxsi qayğı / Dezodorant',
  'Şəxsi qayğı / Ülgüc',
  'Şəxsi qayğı / Dəri qayğı kremi',
  // Kağız məhsulları
  'Kağız məhsulları / Tualet kağızı',
  'Kağız məhsulları / Kağız dəsmal',
  'Kağız məhsulları / Peçetlər',
  'Kağız məhsulları / Bezlik',
  // Pet məhsulları
  'Pet məhsulları / It qidası',
  'Pet məhsulları / Pişik qidası',
  'Pet məhsulları / Pet aksessuarları',
  // Alkoqolsuz aperitivlər
  'Aperitiv / Virgin kokteyl',
  'Aperitiv / Kombucha',
  'Aperitiv / Kefir içkiləri',
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

type PendingProduct = {
  id: string;
  product_id: string;
  barcode: string;
  product_name: string;
  product_category: ProductCategory;
  uom_conversion: {
    order_uom: OrderUOM;
    units_per_case: number;
  };
  stock_status: {
    supplier_atp_case: number;
    supplier_atp_piece: number;
    bravo_current_stock_piece: number;
    bravo_reorder_point_piece: number;
    health_indicator: 'CRITICAL_LOW';
    health_order: 1;
  };
  logistics: {
    moq_case: number;
    lead_time_days: number;
  };
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

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CFG: Record<
  PendingStatus,
  { label: string; badge: string; icon: React.ReactNode }
> = {
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

function StatusBadge({ status }: { status: PendingStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badge}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ─── Form field ───────────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  children,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

// ─── Category searchable dropdown ─────────────────────────────────────────────

function CategorySearch({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (val: string) => void;
  error?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? PRODUCT_CATEGORIES.filter((c) =>
        c.toLowerCase().includes(query.toLowerCase())
      )
    : PRODUCT_CATEGORIES;

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (cat: string) => {
    onChange(cat);
    setQuery('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setQuery('');
  };

  return (
    <div ref={ref} className="relative">
      {/* Trigger / selected display */}
      {value && !open ? (
        <div
          className={`flex items-center justify-between w-full px-3 py-2 text-sm rounded-lg border cursor-pointer transition
            ${error ? 'border-red-400' : 'border-gray-200 dark:border-gray-700'}
            bg-white dark:bg-gray-800 text-gray-900 dark:text-white`}
          onClick={() => setOpen(true)}
        >
          <span className="truncate">{value}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleClear(); }}
            className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            placeholder={value || 'Kateqoriya axtar...'}
            className={`${inputCls} pl-9 ${error ? 'border-red-400 focus:ring-red-400' : ''}`}
          />
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">Nəticə tapılmadı</p>
          ) : (
            filtered.map((cat) => {
              const [group, item] = cat.split(' / ');
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-colors hover:bg-indigo-50 dark:hover:bg-indigo-950/30
                    ${value === cat ? 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-300 font-medium' : 'text-gray-700 dark:text-gray-300'}`}
                >
                  <span className="text-xs text-gray-400 dark:text-gray-500 block leading-none mb-0.5">
                    {group}
                  </span>
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
  // Auth — supplier rolunu tələb edir; user obyektindən supplier_id + supplier_name götürürük
  const user = useRequireAuth({ requiredRole: UserRole.SUPPLY });
  const supplyProfile = useSupplyProfile();

  const supplierId: string = (supplyProfile as any)?.user_id ?? 'demo-supplier';
  const supplierName: string = (supplyProfile as any)?.company_name ?? 'Demo Supplier';

  useEffect(() => {
    console.log(supplyProfile);
  }, [supplyProfile]);

  // Form
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Products list
  const [products, setProducts] = useState<PendingProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Realtime listener — bu təchizatçının suppliers_promote məhsulları
  useEffect(() => {
    const q = query(
      collection(db, 'suppliers_promote'),
      where('supplier_id', '==', supplierId),
      orderBy('created_at', 'desc')
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        setProducts(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as PendingProduct))
        );
        setLoadingProducts(false);
      },
      (err) => {
        console.error('pending_products listener:', err);
        setLoadingProducts(false);
      }
    );

    return () => unsub();
  }, [supplierId]);

  // Computed reorder point
  const reorderPoint =
    Number(form.moq_case) > 0 && Number(form.units_per_case) > 0
      ? Number(form.moq_case) * Number(form.units_per_case)
      : null;

  // Validation
  const validate = (): boolean => {
    const errs: Partial<FormState> = {};
    if (!form.product_name.trim()) errs.product_name = 'Məhsul adı tələb olunur';
    if (!form.barcode.trim()) errs.barcode = 'Barkod tələb olunur';
    if (!form.product_id.trim()) errs.product_id = 'SKU kodu tələb olunur';
    if (!form.product_category) errs.product_category = 'Kateqoriya seçin';
    if (!form.units_per_case || Number(form.units_per_case) <= 0)
      errs.units_per_case = 'Müsbət rəqəm daxil edin';
    if (!form.moq_case || Number(form.moq_case) <= 0)
      errs.moq_case = 'Müsbət rəqəm daxil edin';
    if (!form.lead_time_days || Number(form.lead_time_days) <= 0)
      errs.lead_time_days = 'Müsbət rəqəm daxil edin';
    if (!form.supplier_atp_case || Number(form.supplier_atp_case) < 0)
      errs.supplier_atp_case = 'Stok miqdarını daxil edin';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormState]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);

    const atpCase = Number(form.supplier_atp_case);
    const unitsPerCase = Number(form.units_per_case);
    const moqCase = Number(form.moq_case);
    const reorder = moqCase * unitsPerCase;
    const now = new Date().toISOString();

    const payload: Omit<PendingProduct, 'id'> = {
      product_id: form.product_id.trim(),
      barcode: form.barcode.trim(),
      product_name: form.product_name.trim(),
      product_category: form.product_category as ProductCategory,
      uom_conversion: {
        order_uom: form.order_uom,
        units_per_case: unitsPerCase,
      },
      stock_status: {
        supplier_atp_case: atpCase,
        supplier_atp_piece: atpCase * unitsPerCase,
        bravo_current_stock_piece: 0,
        bravo_reorder_point_piece: reorder,
        health_indicator: 'CRITICAL_LOW',
        health_order: 1,
      },
      logistics: {
        moq_case: moqCase,
        lead_time_days: Number(form.lead_time_days),
      },
      supplier_id: supplierId,
      supplier_name: supplierName,
      status: 'pending',
      created_at: now,
      updated_at: now,
    };

    try {
      await addDoc(collection(db, 'suppliers_promote'), payload);
      setSuccessMsg(`"${payload.product_name}" uğurla göndərildi`);
      setForm(EMPTY_FORM);
      setShowForm(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      console.error('addDoc error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const stats = {
    total: products.length,
    pending: products.filter((p) => p.status === 'pending').length,
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
          onClick={() => {
            setShowForm((v) => !v);
            setForm(EMPTY_FORM);
            setErrors({});
          }}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition shadow-sm"
        >
          {showForm ? (
            <X className="h-4 w-4" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
          {showForm ? 'Ləğv et' : 'Yeni məhsul'}
        </button>
      </div>

      {/* Success toast */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}

      {/* Stat cards */}
      {!loadingProducts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Cəmi', value: stats.total, color: 'text-gray-700 dark:text-gray-200', bg: 'bg-gray-100 dark:bg-gray-800' },
            { label: 'Gözləyir', value: stats.pending, color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-50 dark:bg-amber-900/20' },
            { label: 'Qəbul edildi', value: stats.accepted, color: 'text-green-700 dark:text-green-300', bg: 'bg-green-50 dark:bg-green-900/20' },
            { label: 'Rədd edildi', value: stats.rejected, color: 'text-red-700 dark:text-red-300', bg: 'bg-red-50 dark:bg-red-900/20' },
          ].map((s) => (
            <div
              key={s.label}
              className={`rounded-xl px-4 py-3 ${s.bg} flex items-center justify-between`}
            >
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                {s.label}
              </span>
              <span className={`text-2xl font-bold ${s.color}`}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-900 rounded-xl border border-indigo-200 dark:border-indigo-800 shadow-sm overflow-hidden">
          {/* Form header */}
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-indigo-50 dark:bg-indigo-950/30 flex items-center gap-2">
            <Plus className="h-4 w-4 text-indigo-500" />
            <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
              Yeni məhsul əlavə et
            </span>
          </div>

          <div className="p-6 space-y-6">
            {/* Section: Məhsul məlumatları */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Hash className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Məhsul məlumatları
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Məhsul adı" required error={errors.product_name}>
                  <input
                    name="product_name"
                    value={form.product_name}
                    onChange={handleChange}
                    placeholder="Coca-Cola Şəkərsiz 1L"
                    className={`${inputCls} ${errors.product_name ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                </Field>
                <Field label="Barkod" required error={errors.barcode}>
                  <input
                    name="barcode"
                    value={form.barcode}
                    onChange={handleChange}
                    placeholder="4760000123456"
                    className={`${inputCls} ${errors.barcode ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                </Field>
                <Field label="SKU / Məhsul kodu" required error={errors.product_id}>
                  <input
                    name="product_id"
                    value={form.product_id}
                    onChange={handleChange}
                    placeholder="CC-1L-ZERO-01"
                    className={`${inputCls} ${errors.product_id ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Kateqoriya" required error={errors.product_category}>
                  <CategorySearch
                    value={form.product_category}
                    onChange={(val) => {
                      setForm((prev) => ({ ...prev, product_category: val }));
                      if (errors.product_category)
                        setErrors((prev) => ({ ...prev, product_category: undefined }));
                    }}
                    error={errors.product_category}
                  />
                </Field>
              </div>
            </div>

            {/* Section: Qablaşdırma */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Box className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Qablaşdırma
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Sifariş vahidi" required>
                  <select
                    name="order_uom"
                    value={form.order_uom}
                    onChange={handleChange}
                    className={inputCls}
                  >
                    <option value="Case">Case (koli)</option>
                    <option value="Pallet">Pallet</option>
                    <option value="Box">Box (qutu)</option>
                  </select>
                </Field>
                <Field
                  label="Kolida neçə ədəd"
                  required
                  error={errors.units_per_case}
                  hint="Hər kolinin içindəki məhsul sayı"
                >
                  <input
                    name="units_per_case"
                    type="number"
                    min={1}
                    value={form.units_per_case}
                    onChange={handleChange}
                    placeholder="12"
                    className={`${inputCls} ${errors.units_per_case ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                </Field>
              </div>
            </div>

            {/* Section: Logistika */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Truck className="h-4 w-4 text-gray-400" />
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                  Logistika
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field
                  label="Minimum sifariş (koli)"
                  required
                  error={errors.moq_case}
                  hint="MOQ — minimum order quantity"
                >
                  <input
                    name="moq_case"
                    type="number"
                    min={1}
                    value={form.moq_case}
                    onChange={handleChange}
                    placeholder="5"
                    className={`${inputCls} ${errors.moq_case ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                </Field>
                <Field
                  label="Çatdırılma müddəti (gün)"
                  required
                  error={errors.lead_time_days}
                >
                  <input
                    name="lead_time_days"
                    type="number"
                    min={1}
                    value={form.lead_time_days}
                    onChange={handleChange}
                    placeholder="2"
                    className={`${inputCls} ${errors.lead_time_days ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                </Field>
                <Field
                  label="Mövcud stok (koli)"
                  required
                  error={errors.supplier_atp_case}
                  hint="Anbarda hazır olan koli sayı"
                >
                  <input
                    name="supplier_atp_case"
                    type="number"
                    min={0}
                    value={form.supplier_atp_case}
                    onChange={handleChange}
                    placeholder="500"
                    className={`${inputCls} ${errors.supplier_atp_case ? 'border-red-400 focus:ring-red-400' : ''}`}
                  />
                </Field>
              </div>
            </div>

            {/* Computed preview */}
            {reorderPoint !== null && (
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-800">
                <BarChart3 className="h-4 w-4 text-indigo-500 flex-shrink-0" />
                <div className="text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    Avtomatik sifariş nöqtəsi:{' '}
                  </span>
                  <span className="font-bold text-indigo-700 dark:text-indigo-300">
                    {reorderPoint.toLocaleString('az-AZ')} ədəd
                  </span>
                  <span className="text-xs text-gray-400 ml-2">
                    ({form.moq_case} koli × {form.units_per_case} ədəd)
                  </span>
                </div>
              </div>
            )}

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                onClick={() => {
                  setShowForm(false);
                  setForm(EMPTY_FORM);
                  setErrors({});
                }}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
              >
                Ləğv et
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-medium transition shadow-sm"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                {submitting ? 'Göndərilir...' : 'Distributora göndər'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
            Göndərilmiş məhsullar
          </span>
          {!loadingProducts && (
            <span className="text-xs text-gray-400">{products.length} məhsul</span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-left">
                {[
                  'Məhsul',
                  'Kateqoriya',
                  'Qablaşdırma',
                  'MOQ / Çatdırılma',
                  'ATP (koli)',
                  'Sifariş nöqtəsi',
                  'Status',
                  'Tarix',
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
              {loadingProducts ? (
                <SkeletonRows cols={7} />
              ) : products.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-16 text-center text-gray-400"
                  >
                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>Hələ məhsul göndərilməyib</p>
                    <p className="text-xs mt-1">
                      Yuxarıdakı "Yeni məhsul" düyməsinə basın
                    </p>
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900 dark:text-white leading-tight">
                        {p.product_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {p.barcode} · {p.product_id}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {p.product_category && (
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 max-w-[160px] truncate" title={p.product_category}>
                          {p.product_category.split(' / ')[1] ?? p.product_category}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {p.uom_conversion.units_per_case} ədəd /
                      {p.uom_conversion.order_uom}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap text-xs">
                      Min {p.logistics.moq_case} koli ·{' '}
                      {p.logistics.lead_time_days} gün
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-gray-900 dark:text-white">
                      {p.stock_status.supplier_atp_case.toLocaleString('az-AZ')}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-500 dark:text-gray-400">
                      {p.stock_status.bravo_reorder_point_piece.toLocaleString(
                        'az-AZ'
                      )}{' '}
                      <span className="text-xs">ədəd</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString('az-AZ', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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