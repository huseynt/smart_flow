/**
 * Stock Service
 * Firestore structure:
 *   suppliers/{supplierId}
 *   suppliers/{supplierId}/products/{productId}
 *
 * Sıralama: health_order ASC (CRITICAL=0 ən yuxarı), sonra product_name ASC
 * Pagination: cursor-based startAfter — 2000+ məhsul üçün
 */

import { db } from '@/lib/firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  serverTimestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

// ─── Types ────────────────────────────────────────────────────────────────────

export type HealthIndicator =
  | 'HEALTHY'
  | 'LOW'
  | 'CRITICAL_LOW'
  | 'OVERSTOCK'
  | 'OUT_OF_STOCK';

/** Firestore sort üçün — aşağı rəqəm daha kritik deməkdir */
export const HEALTH_ORDER: Record<HealthIndicator, number> = {
  OUT_OF_STOCK: 0,
  CRITICAL_LOW: 1,
  LOW: 2,
  HEALTHY: 3,
  OVERSTOCK: 4,
};

export interface UomConversion {
  order_uom: string;
  units_per_case: number;
}

export interface StockStatus {
  supplier_atp_case: number;
  supplier_atp_piece: number;
  bravo_current_stock_piece: number;
  bravo_reorder_point_piece: number;
  health_indicator: HealthIndicator;
  health_order: number; // Firestore orderBy üçün — HEALTH_ORDER[health_indicator]
}

export interface Logistics {
  moq_case: number;
  lead_time_days: number;
}

export interface Product {
  id: string;
  supplier_id: string;
  product_id: string;
  barcode: string;
  product_name: string;
  uom_conversion: UomConversion;
  stock_status: StockStatus;
  logistics: Logistics;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  supplier_name: string;
  supplier_category: string;
  total_active_skus: number;
  last_sync_date: string;
  created_at: string;
  updated_at: string;
}

export interface ProductPage {
  products: Product[];
  lastDoc: QueryDocumentSnapshot | null;
  hasMore: boolean;
}

export const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIso(val: unknown): string {
  if (!val) return '';
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  return String(val);
}

function docToProduct(d: QueryDocumentSnapshot, supplierId: string): Product {
  const data = d.data();
  return {
    id: d.id,
    supplier_id: supplierId,
    product_id: data.product_id ?? '',
    barcode: data.barcode ?? '',
    product_name: data.product_name ?? '',
    uom_conversion: data.uom_conversion ?? { order_uom: 'Case', units_per_case: 1 },
    stock_status: data.stock_status ?? {
      supplier_atp_case: 0,
      supplier_atp_piece: 0,
      bravo_current_stock_piece: 0,
      bravo_reorder_point_piece: 0,
      health_indicator: 'HEALTHY' as HealthIndicator,
      health_order: HEALTH_ORDER.HEALTHY,
    },
    logistics: data.logistics ?? { moq_case: 1, lead_time_days: 1 },
    created_at: toIso(data.created_at),
    updated_at: toIso(data.updated_at),
  };
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export async function getSuppliers(): Promise<Supplier[]> {
  const snap = await getDocs(
    query(collection(db, 'suppliers'), orderBy('supplier_name'))
  );
  return snap.docs.map((d) => ({
    id: d.id,
    supplier_name: d.data().supplier_name ?? '',
    supplier_category: d.data().supplier_category ?? '',
    total_active_skus: d.data().total_active_skus ?? 0,
    last_sync_date: toIso(d.data().last_sync_date),
    created_at: toIso(d.data().created_at),
    updated_at: toIso(d.data().updated_at),
  }));
}

export async function addSupplier(
  data: Pick<Supplier, 'supplier_name' | 'supplier_category'>
): Promise<string> {
  const ref = await addDoc(collection(db, 'suppliers'), {
    ...data,
    total_active_skus: 0,
    last_sync_date: serverTimestamp(),
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
  return ref.id;
}

// ─── Products — pagination ────────────────────────────────────────────────────
//
// Firestore composite index lazımdır (avtomatik yaratmaq üçün app-i işlət,
// konsolda link çıxacaq):
//   Collection group: products
//   Fields indexed: stock_status.health_order ASC, product_name ASC

export async function getProductsFirstPage(
  supplierId: string
): Promise<ProductPage> {
  const col = collection(db, 'suppliers', supplierId, 'products');
  const q = query(
    col,
    orderBy('stock_status.health_order', 'asc'),
    orderBy('product_name', 'asc'),
    limit(PAGE_SIZE)
  );
  const snap = await getDocs(q);
  const products = snap.docs.map((d) =>
    docToProduct(d as QueryDocumentSnapshot, supplierId)
  );
  const lastDoc =
    snap.docs.length > 0
      ? (snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot)
      : null;
  return { products, lastDoc, hasMore: snap.docs.length === PAGE_SIZE };
}

export async function getProductsNextPage(
  supplierId: string,
  lastDocument: QueryDocumentSnapshot
): Promise<ProductPage> {
  const col = collection(db, 'suppliers', supplierId, 'products');
  const q = query(
    col,
    orderBy('stock_status.health_order', 'asc'),
    orderBy('product_name', 'asc'),
    startAfter(lastDocument),
    limit(PAGE_SIZE)
  );
  const snap = await getDocs(q);
  const products = snap.docs.map((d) =>
    docToProduct(d as QueryDocumentSnapshot, supplierId)
  );
  const lastDoc =
    snap.docs.length > 0
      ? (snap.docs[snap.docs.length - 1] as QueryDocumentSnapshot)
      : null;
  return { products, lastDoc, hasMore: snap.docs.length === PAGE_SIZE };
}

// ─── Products — add / update ──────────────────────────────────────────────────

export async function addProduct(
  supplierId: string,
  data: Omit<Product, 'id' | 'supplier_id' | 'created_at' | 'updated_at'>
): Promise<string> {
  const enriched = {
    ...data,
    stock_status: {
      ...data.stock_status,
      health_order: HEALTH_ORDER[data.stock_status.health_indicator],
    },
    created_at: serverTimestamp(),
    updated_at: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, 'suppliers', supplierId, 'products'),
    enriched
  );

  // SKU sayını artır
  const supplierRef = doc(db, 'suppliers', supplierId);
  const snap = await getDoc(supplierRef);
  if (snap.exists()) {
    await updateDoc(supplierRef, {
      total_active_skus: (snap.data().total_active_skus ?? 0) + 1,
      last_sync_date: serverTimestamp(),
      updated_at: serverTimestamp(),
    });
  }

  return ref.id;
}

export async function updateProductStock(
  supplierId: string,
  productId: string,
  stockStatus: Omit<StockStatus, 'health_order'>
): Promise<void> {
  await updateDoc(doc(db, 'suppliers', supplierId, 'products', productId), {
    stock_status: {
      ...stockStatus,
      health_order: HEALTH_ORDER[stockStatus.health_indicator],
    },
    updated_at: serverTimestamp(),
  });
  await updateDoc(doc(db, 'suppliers', supplierId), {
    last_sync_date: serverTimestamp(),
    updated_at: serverTimestamp(),
  });
}

// ─── Köməkçi ─────────────────────────────────────────────────────────────────

export function computeHealthIndicator(
  current: number,
  reorderPoint: number,
  supplierAtp: number
): HealthIndicator {
  if (current === 0 || supplierAtp === 0) return 'OUT_OF_STOCK';
  if (current < reorderPoint * 0.5) return 'CRITICAL_LOW';
  if (current < reorderPoint) return 'LOW';
  if (current > reorderPoint * 2.5) return 'OVERSTOCK';
  return 'HEALTHY';
}