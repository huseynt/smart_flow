/**
 * Firestore Mock Data Seed Script
 *
 * İstifadə:
 *   1. .env.local faylındakı dəyərləri aşağıya əlavə et (və ya mühit dəyişənləri qur)
 *   2. node seed-firestore.mjs
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// ─── Firebase konfiqurasiya ────────────────────────────────────────────────────
// .env.local faylındakı dəyərləri bura yapışdır

const firebaseConfig = {
  apiKey:            'AIzaSyDf_8pjLcqEoYQHeBXtCwYVt582jbNjSDg',
  authDomain:        'bravo-smart-flow.firebaseapp.com',
  projectId:         'bravo-smart-flow',
  storageBucket:     'bravo-smart-flow.firebasestorage.app',
  messagingSenderId: '1021094001450',
  appId:             '1:1021094001450:web:a85789bbe41dfc74993c53',
};

// ─── Data ──────────────────────────────────────────────────────────────────────

const supplier = {
  supplier_name:     'Coca-Cola Bottlers Azerbaijan',
  supplier_category: 'İçkilər',
  total_active_skus: 1,
  last_sync_date:    new Date().toISOString(),
  created_at:        new Date().toISOString(),
  updated_at:        new Date().toISOString(),
};

const product = {
  product_id:   'CC-1L-ZERO-01',
  barcode:      '4760000123456',
  product_name: 'Coca-Cola Şəkərsiz 1L PET',
  uom_conversion: {
    order_uom:      'Case',
    units_per_case: 12,
  },
  stock_status: {
    supplier_atp_case:           500,
    supplier_atp_piece:          6000,
    bravo_current_stock_piece:   450,
    bravo_reorder_point_piece:   800,
    health_indicator:            'CRITICAL_LOW',
    health_order:                1,   // CRITICAL_LOW = 1 (sıralama üçün)
  },
  logistics: {
    moq_case:       5,
    lead_time_days: 2,
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// ─── Seed ──────────────────────────────────────────────────────────────────────

async function seed() {
  const app = initializeApp(firebaseConfig);
  const db  = getFirestore(app);

  // 1. Supplier yarat
  const supplierRef = doc(collection(db, 'suppliers'));
  await setDoc(supplierRef, supplier);
  console.log('✅ Supplier yaradıldı:', supplierRef.id);

  // 2. Həmin supplier-ə aid məhsul yarat
  const productRef = await addDoc(
    collection(db, 'suppliers', supplierRef.id, 'products'),
    product
  );
  console.log('✅ Məhsul yaradıldı:', productRef.id);
  console.log('\nFirestore strukturu:');
  console.log(`  suppliers/${supplierRef.id}`);
  console.log(`  suppliers/${supplierRef.id}/products/${productRef.id}`);
  console.log('\nBitdi! 🎉');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Xəta:', err.message);
  process.exit(1);
});
