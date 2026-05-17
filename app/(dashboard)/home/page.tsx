'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRole } from '@/hooks/useRole';
import { useSupplyProfile } from '@/hooks/useSupplyProfile';
import { useDistributionProfile } from '@/hooks/useDistributionProfile';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { UserRole } from '@/types';

import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Building2,
  Package,
  ShieldAlert,
  Star,
  Truck,
  Warehouse,
} from 'lucide-react';

import { motion } from 'framer-motion';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const orderData = [
  { day: 'Mon', orders: 120, inventory: 95 },
  { day: 'Tue', orders: 190, inventory: 90 },
  { day: 'Wed', orders: 260, inventory: 84 },
  { day: 'Thu', orders: 300, inventory: 79 },
  { day: 'Fri', orders: 420, inventory: 72 },
  { day: 'Sat', orders: 520, inventory: 64 },
];

const donutData = [
  { name: 'Fresh', value: 480 },
  { name: 'Frozen', value: 220 },
  { name: 'Beverages', value: 310 },
  { name: 'Snacks', value: 190 },
];

const supplierRadar = [
  { subject: 'Speed', A: 90 },
  { subject: 'Accuracy', A: 82 },
  { subject: 'Stock', A: 88 },
  { subject: 'Returns', A: 70 },
  { subject: 'Support', A: 94 },
];

const radialData = [
  {
    name: 'Inventory',
    value: 78,
    fill: '#22c55e',
  },
];

const stats = [
  {
    title: 'Kritik Məhsullar',
    value: '14',
    change: '-8%',
    positive: false,
    icon: ShieldAlert,
  },
  {
    title: 'Stok Faizi',
    value: '97%',
    change: '+4%',
    positive: true,
    icon: Warehouse,
  },
  {
    title: 'Aktiv Çatdırılmalar',
    value: '42',
    change: '+12%',
    positive: true,
    icon: Truck,
  },
  {
    title: 'Sifariş Dəqiqliyi',
    value: '99.2%',
    change: '+1.2%',
    positive: true,
    icon: Activity,
  },
];

const mapPoints = [
  { city: 'Gəncə', top: '22%', left: '18%' },
  { city: 'Şəki', top: '16%', left: '28%' },
  { city: 'Lənkəran', top: '72%', left: '62%' },
  { city: 'Bakı', top: '44%', left: '74%' },
];

export default function HomePage() {
  useRequireAuth();

  const { loading, firebaseUser } = useAuth();
  const role = useRole();
  const supplyProfile = useSupplyProfile();
  const distributionProfile = useDistributionProfile();

  const displayName =
    supplyProfile && 'first_name' in supplyProfile && 'last_name' in supplyProfile
      ? `${supplyProfile.first_name} ${supplyProfile.last_name}`
      : distributionProfile && 'first_name' in distributionProfile && 'last_name' in distributionProfile
        ? `${distributionProfile.first_name} ${distributionProfile.last_name}`
        : firebaseUser?.displayName ||
          firebaseUser?.email?.split('@')[0] ||
          'İstifadəçi';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-14 w-14 animate-spin rounded-full border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col justify-between gap-4 lg:flex-row lg:items-center"
        >
          <div>
            <p className="mb-2 text-cyan-400">Bravo Smart Flow</p>
            <h1 className="text-4xl font-black tracking-tight">
              Ağıllı Logistika Paneli
            </h1>
            <p className="mt-2 text-slate-500">
              Xoş gəlmisən, {displayName} — real-time retail və təchizat analitikası.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200/80 bg-white/80 px-5 py-4 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              {role === UserRole.SUPPLY ? (
                <Building2 className="text-orange-400" />
              ) : (
                <Truck className="text-emerald-400" />
              )}

              <div>
                <p className="text-sm text-slate-500">Hazırkı Rol</p>
                <h3 className="font-semibold">
                  {role === UserRole.SUPPLY ? 'Təchizatçı Paneli' : 'Distribusiya Paneli'}
                </h3>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item, index) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur-xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.title}</p>
                  <h2 className="mt-2 text-3xl font-black">{item.value}</h2>
                </div>

                <div className="rounded-2xl bg-slate-100 p-3">
                  <item.icon className="h-6 w-6 text-cyan-400" />
                </div>
              </div>

              <div className="mb-4 h-16">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={orderData}>
                    <Area
                      type="monotone"
                      dataKey="orders"
                      stroke="#22d3ee"
                      fillOpacity={1}
                      fill="url(#spark)"
                    />
                    <defs>
                      <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div
                className={`flex items-center gap-2 text-sm ${
                  item.positive ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {item.positive ? (
                  <ArrowUpRight className="h-4 w-4" />
                ) : (
                  <ArrowDownRight className="h-4 w-4" />
                )}
                {item.change} bu həftə
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 backdrop-blur-xl xl:col-span-2"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Sifariş Trend Analitikası</h2>
                <p className="text-sm text-slate-500">
                  Canlı sifariş artımı və stok vəziyyəti
                </p>
              </div>

              <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs text-emerald-300">
                +28% Artım
              </div>
            </div>

            <div className="h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={orderData}>
                  <defs>
                    <linearGradient id="ordersGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.7} />
                      <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#cbd5e1" />
                  <XAxis dataKey="day" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip
                    contentStyle={{
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '16px',
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="orders"
                    stroke="#22d3ee"
                    strokeWidth={3}
                    fill="url(#ordersGradient)"
                  />

                  <Area
                    type="monotone"
                    dataKey="inventory"
                    stroke="#22c55e"
                    strokeWidth={2}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 backdrop-blur-xl"
          >
            <div className="mb-5">
              <h2 className="text-xl font-bold">İnventar Paylanması</h2>
              <p className="text-sm text-slate-500">Anbar kateqoriya göstəriciləri</p>
            </div>

            <div className="relative mx-auto h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((_, index) => (
                      <Cell
                        key={index}
                        fill={['#06b6d4', '#22c55e', '#f59e0b', '#8b5cf6'][index]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <h2 className="text-4xl font-black">1.2K</h2>
                <p className="text-sm text-slate-500">Ümumi Məhsul</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 backdrop-blur-xl lg:col-span-2"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Canlı Logistika Xəritəsi</h2>
                <p className="text-sm text-slate-500">
                  Tədarükçülərdən Bravo mərkəzinə aktiv çatdırılmalar
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                Canlı İzləmə
              </div>
            </div>

            <div className="relative h-[350px] overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-white to-slate-100">
              <div className="absolute inset-0 opacity-20">
                <div className="h-full w-full bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.18)_1px,transparent_1px)] bg-[length:24px_24px]" />
              </div>

              {mapPoints.map((point, index) => (
                <div
                  key={index}
                  className="absolute"
                  style={{ top: point.top, left: point.left }}
                >
                  <div className="relative flex flex-col items-center">
                    <div className="h-4 w-4 animate-ping rounded-full bg-cyan-400 absolute" />
                    <div className="relative z-10 h-4 w-4 rounded-full bg-cyan-300 border-2 border-white" />
                    <span className="mt-3 text-xs text-slate-900">{point.city}</span>
                  </div>
                </div>
              ))}

              <svg className="absolute inset-0 h-full w-full">
                <line
                  x1="18%"
                  y1="22%"
                  x2="74%"
                  y2="44%"
                  stroke="#22d3ee"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
                <line
                  x1="28%"
                  y1="16%"
                  x2="74%"
                  y2="44%"
                  stroke="#22c55e"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
                <line
                  x1="62%"
                  y1="72%"
                  x2="74%"
                  y2="44%"
                  stroke="#f59e0b"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
              </svg>
            </div>
          </motion.div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold">İnventar Sağlamlığı</h2>
                  <p className="text-sm text-slate-500">Anbar stabilliyi</p>
                </div>

                <Package className="text-cyan-400" />
              </div>

              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart
                    innerRadius="70%"
                    outerRadius="100%"
                    data={radialData}
                    startAngle={180}
                    endAngle={0}
                  >
                    <RadialBar background dataKey="value" cornerRadius={12} />
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>

              <div className="-mt-24 text-center">
                <h2 className="text-5xl font-black">78%</h2>
                <p className="text-slate-500">Optimal Stok</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-3xl border border-red-500/20 bg-red-500/10 p-6 backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="animate-pulse text-red-400" />
                  <div>
                    <h2 className="font-bold">Kritik Xəbərdarlıqlar</h2>
                    <p className="text-sm text-red-200/70">
                      Təcili əməliyyat riskləri
                    </p>
                  </div>
                </div>

                <span className="rounded-full bg-red-500/20 px-2 py-1 text-xs text-red-300">
                  3 Aktiv
                </span>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-white/5 bg-slate-100/80 p-3">
                  <p className="font-medium">Milk SKU #204</p>
                  <p className="text-sm text-slate-500">
                    Stok səviyyəsi limitdən aşağıdır
                  </p>
                </div>

                <div className="rounded-2xl border border-white/5 bg-slate-100/80 p-3">
                  <p className="font-medium">Gecikmiş Çatdırılma</p>
                  <p className="text-sm text-slate-500">
                    Net-Tech MMC 2 saat gecikib
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 backdrop-blur-xl"
          >
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Ən Yaxşı Təchizatçı</h2>
                <p className="text-sm text-slate-500">
                  Performans və etibarlılıq göstəriciləri
                </p>
              </div>

              <div className="flex items-center gap-1 text-amber-400">
                <Star className="h-4 w-4 fill-amber-400" />
                <Star className="h-4 w-4 fill-amber-400" />
                <Star className="h-4 w-4 fill-amber-400" />
                <Star className="h-4 w-4 fill-amber-400" />
                <Star className="h-4 w-4 fill-amber-400" />
              </div>
            </div>

            <div className="mb-5 rounded-2xl bg-slate-100/80 p-4">
              <h3 className="text-lg font-bold">Net-Tech MMC</h3>
              <p className="text-sm text-slate-500">
                Son çatdırılma uğur faizi: 98.7%
              </p>
            </div>

            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius={90} data={supplierRadar}>
                  <PolarGrid stroke="#cbd5e1" />
                  <PolarAngleAxis dataKey="subject" stroke="#cbd5e1" />
                  <Radar
                    dataKey="A"
                    stroke="#22d3ee"
                    fill="#06b6d4"
                    fillOpacity={0.5}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 p-6 backdrop-blur-xl"
          >
            <div className="mb-6">
              <h2 className="text-2xl font-black">
                AI Proqnoz və Data Storytelling
              </h2>

              <p className="mt-2 text-slate-600">
                Demand is increasing rapidly in Bakı region. Current trend suggests
                inventory pressure within the next 48 hours.
              </p>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-slate-100/80 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Tələb Proqnoz Dəqiqliyi
                  </span>

                  <span className="font-bold text-emerald-400">94%</span>
                </div>

                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-[94%] rounded-full bg-emerald-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-100/80 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Təchizatçı Effektivliyi
                  </span>

                  <span className="font-bold text-cyan-400">88%</span>
                </div>

                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-[88%] rounded-full bg-cyan-400" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200/80 bg-slate-100/80 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    Marşrut Optimizasiyası
                  </span>

                  <span className="font-bold text-amber-400">76%</span>
                </div>

                <div className="h-2 rounded-full bg-slate-100">
                  <div className="h-2 w-[76%] rounded-full bg-amber-400" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
