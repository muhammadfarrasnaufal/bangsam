"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  PlusCircle, 
  Users, 
  FileText, 
  LogOut, 
  RefreshCw, 
  Download, 
  Calendar,
  TrendingUp,
  Wallet,
  Scale,
  Activity,
  ChevronRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

type Transaction = {
  id: string;
  customer: string;
  type: string;
  amount: string;
  status: string;
  createdAt: string;
};

type Stats = {
  totalSetoranKg: number;
  saldoPoinRp: number;
  anggotaAktif: number;
  transaksiHariIni: number;
};

type DashboardData = {
  stats: Stats;
  recentTransactions: Transaction[];
  activeUsers: string[];
  activeFeatures: string[];
  programHighlights: Array<{ title: string; description: string }>;
  lastUpdated: string;
  demoMode?: boolean;
};

type ReportData = {
  reportTransactions: Transaction[];
  reportStats: {
    totalSetoranKg: number;
    saldoPoinRp: number;
    transaksiCount: number;
    uniqueUsers: number;
  };
  start: string;
  end: string;
  demoMode?: boolean;
};

const navItems = ["Dashboard", "Transaksi", "Setoran", "Anggota", "Laporan"];

const programHighlights = [
  { title: "Edukasi Sampah", description: "Mengajak anggota memilah dan menabung sampah dengan lebih baik." },
  { title: "Penjemputan", description: "Layanan jemput sampah terjadwal di lingkungan komunitas." },
  { title: "Tukar Poin", description: "Tukar hasil sampah dengan uang tunai dan hadiah." },
];

const initialStats: Stats = {
  totalSetoranKg: 0,
  saldoPoinRp: 0,
  anggotaAktif: 0,
  transaksiHariIni: 0,
};

const initialTransactions: Transaction[] = [];
const initialFeatures = ["Dashboard", "Transaksi", "Setoran", "Anggota", "Laporan"];

function formatRp(value: number) {
  return `Rp ${value.toLocaleString("id-ID")}`;
}

function formatKg(value: number) {
  return `${value.toLocaleString("id-ID")} kg`;
}

function formatDateInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

function downloadCSV(report: ReportData | null) {
  if (!report) return;

  const rows = [
    ["Nama", "Jenis", "Jumlah", "Status", "Waktu"],
    ...report.reportTransactions.map((transaction) => [
      transaction.customer,
      transaction.type,
      transaction.amount,
      transaction.status,
      new Date(transaction.createdAt).toLocaleString("id-ID"),
    ]),
  ];

  const csvContent = rows.map((row) => row.map((field) => `"${String(field).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `laporan-bank-sampah-${report.start.slice(0, 10)}-${report.end.slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function exportPDF(report: ReportData | null) {
  if (!report) return;

  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.text("Laporan Bank Sampah", 14, 20);
  doc.setFontSize(10);
  doc.text(`Periode: ${report.start.slice(0, 10)} sampai ${report.end.slice(0, 10)}`, 14, 28);
  doc.text(`Total Setoran: ${formatKg(report.reportStats.totalSetoranKg)}`, 14, 36);
  doc.text(`Saldo Poin: ${formatRp(report.reportStats.saldoPoinRp)}`, 14, 42);
  doc.text(`Transaksi: ${report.reportStats.transaksiCount}`, 14, 48);
  doc.text(`Pengguna Unik: ${report.reportStats.uniqueUsers}`, 14, 54);
  doc.text("Transaksi Terbaru:", 14, 64);

  report.reportTransactions.slice(0, 10).forEach((transaction, index) => {
    const y = 72 + index * 6;
    if (y > 270) return;
    doc.text(
      `${index + 1}. ${transaction.customer} - ${transaction.type} - ${transaction.amount} - ${transaction.status}`,
      14,
      y
    );
  });

  doc.save(`laporan-bank-sampah-${report.start.slice(0, 10)}-${report.end.slice(0, 10)}.pdf`);
}

export default function HomePage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [backendReady, setBackendReady] = useState(false);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(initialTransactions);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>(initialFeatures);
  const [lastUpdated, setLastUpdated] = useState("");
  const [reportStart, setReportStart] = useState(formatDateInput(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [reportEnd, setReportEnd] = useState(formatDateInput(new Date()));
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const initialReportRangeRef = useRef({ start: reportStart, end: reportEnd });

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginError("");

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!response.ok) {
        setLoginError("Nama pengguna atau kata sandi salah.");
        setAuthenticated(false);
        return;
      }

      setAuthenticated(true);
      await refreshDashboard();
      await loadReport(reportStart, reportEnd);
    } catch (error) {
      console.error("Login failed:", error);
      setLoginError("Tidak dapat masuk, coba lagi.");
      setAuthenticated(false);
    }
  }

  async function handleLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout failed:", error);
    }

    setAuthenticated(false);
    setBackendReady(false);
  }

  async function refreshDashboard() {
    setLoading(true);
    try {
      const response = await fetch("/api/dashboard");
      if (!response.ok) {
        throw new Error("Gagal memuat dashboard");
      }
      const data: DashboardData = await response.json();
      setStats(data.stats);
      setRecentTransactions(data.recentTransactions);
      setActiveUsers(data.activeUsers);
      setFeatures(data.activeFeatures);
      setLastUpdated(new Date(data.lastUpdated).toLocaleTimeString("id-ID"));
      setBackendReady(!data.demoMode);
    } catch (error) {
      console.error(error);
      setBackendReady(false);
    } finally {
      setLoading(false);
    }
  }

  async function loadReport(start: string, end: string) {
    setReportLoading(true);
    try {
      const response = await fetch(
        `/api/reports?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      );
      if (!response.ok) {
        throw new Error("Gagal memuat laporan");
      }
      const data: ReportData = await response.json();
      setReportData(data);
      setBackendReady(!data.demoMode);
    } catch (error) {
      console.error(error);
      setReportData(null);
      setBackendReady(false);
    } finally {
      setReportLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function runAuthCheck() {
      try {
        const response = await fetch("/api/auth");
        if (!response.ok) {
          if (!cancelled) {
            setAuthenticated(false);
          }
          return;
        }

        const data = await response.json();
        if (cancelled) {
          return;
        }

        setAuthenticated(data.authenticated);
        if (data.authenticated) {
          const { start, end } = initialReportRangeRef.current;
          await refreshDashboard();
          await loadReport(start, end);
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        if (!cancelled) {
          setAuthenticated(false);
        }
      } finally {
        if (!cancelled) {
          setAuthChecked(true);
        }
      }
    }

    void runAuthCheck();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const interval = window.setInterval(() => {
      refreshDashboard();
      loadReport(reportStart, reportEnd);
    }, 15000);
    return () => window.clearInterval(interval);
  }, [authenticated, reportEnd, reportStart]);

  useEffect(() => {
    if (!authenticated) return;
    loadReport(reportStart, reportEnd);
  }, [authenticated, reportStart, reportEnd]);

  const cards = useMemo(
    () => [
      { title: "Total Setoran", value: formatKg(stats.totalSetoranKg) },
      { title: "Saldo Poin", value: formatRp(stats.saldoPoinRp) },
      { title: "Anggota Aktif", value: stats.anggotaAktif.toString() },
      { title: "Transaksi Hari Ini", value: stats.transaksiHariIni.toString() },
      { title: "Pengguna Online", value: activeUsers.length.toString() },
    ],
    [stats, activeUsers]
  );

  const reportStats = reportData?.reportStats ?? {
    totalSetoranKg: 0,
    saldoPoinRp: 0,
    transaksiCount: 0,
    uniqueUsers: 0,
  };

  const reportTransactions = reportData?.reportTransactions ?? [];
  const reportPeriod = `${reportStart} sampai ${reportEnd}`;

  if (!authChecked) {
    return (
      <main className="page-shell">
        <div className="login-card">
          <h2>Memeriksa otentikasi...</h2>
        </div>
      </main>
    );
  }

  if (!authenticated) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-blue-200/50 border border-blue-50">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Bank Sampah</h2>
            <p className="text-slate-500 mt-2 text-center text-sm">Masuk untuk mengelola ekosistem bank sampah Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-semibold text-slate-700 ml-1">Nama Pengguna</label>
              <div className="relative">
                <input
                  id="username"
                  className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all pl-11"
                  placeholder="admin"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
                <Users className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-slate-700 ml-1">Kata Sandi</label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  className="w-full bg-slate-50 border-0 ring-1 ring-slate-200 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none transition-all pl-11"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <ShieldCheck className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {loginError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <div className="w-1 h-1 bg-red-600 rounded-full" />
                {loginError}
              </div>
            )}

            <button type="submit" className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group">
              Masuk Sekarang
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
            <p className="text-xs text-slate-400 font-medium tracking-wide">VERSION 2.0 • BUILT WITH PRIDE</p>
          </div>
        </div>
      </main>
    );
  }

  const navItemIcons: Record<string, any> = {
    Dashboard: LayoutDashboard,
    Transaksi: ArrowLeftRight,
    Setoran: PlusCircle,
    Anggota: Users,
    Laporan: FileText,
  };

  return (
    <main className="min-h-screen bg-slate-50/50 lg:grid lg:grid-cols-[280px_1fr] flex flex-col">
      {/* Sidebar */}
      <aside className="lg:sticky lg:top-0 lg:h-screen border-r border-slate-200 bg-white p-6 flex flex-col gap-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-200">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 leading-none">Bank Sampah</h2>
            <p className="text-xs font-medium text-slate-500 mt-1 uppercase tracking-wider">Administrator</p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = navItemIcons[item] || LayoutDashboard;
            const isActive = item === "Dashboard";
            return (
              <a
                key={item}
                href="#"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 font-medium group",
                  isActive 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                {item}
              </a>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="bg-slate-50 rounded-3xl p-5 border border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900">Live Status</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 uppercase tracking-tight"
                >
                  {feature}
                </span>
              ))}
            </div>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-red-50 text-red-600 font-bold text-sm hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Keluar Panel
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <section className="p-4 lg:p-10 flex flex-col gap-8 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Selamat Datang, Admin!</h1>
            <p className="text-slate-500 font-medium mt-1">Pantau perkembangan ekosistem bank sampah Anda hari ini.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border",
              backendReady 
                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                : "bg-amber-50 text-amber-600 border-amber-100"
            )}>
              <div className={cn("w-2 h-2 rounded-full animate-pulse", backendReady ? "bg-emerald-500" : "bg-amber-500")} />
              {backendReady ? "Connected" : "Demo Mode"}
            </div>
            <button 
              onClick={refreshDashboard}
              disabled={loading}
              className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-5 h-5 text-slate-600", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {cards.map((stat, idx) => {
            const icons = [Scale, Wallet, Users, ArrowLeftRight, Activity];
            const colors = ["text-blue-600", "text-emerald-600", "text-purple-600", "text-orange-600", "text-pink-600"];
            const bgColors = ["bg-blue-50", "bg-emerald-50", "bg-purple-50", "bg-orange-50", "bg-pink-50"];
            const Icon = icons[idx] || Activity;
            
            return (
              <div key={stat.title} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110", bgColors[idx % bgColors.length])}>
                  <Icon className={cn("w-6 h-6", colors[idx % colors.length])} />
                </div>
                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">{stat.title}</p>
                <p className="text-2xl font-black text-slate-900 mt-1">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Reports & Table Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main Table */}
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Transaksi Terbaru</h2>
                    <p className="text-sm font-medium text-slate-400">Periode: {reportPeriod}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadCSV(reportData)} className="flex items-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-sm font-bold transition-colors">
                    <Download className="w-4 h-4" />
                    CSV
                  </button>
                  <button onClick={() => exportPDF(reportData)} className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold transition-colors">
                    <FileText className="w-4 h-4" />
                    PDF
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                {reportLoading ? (
                  <div className="p-12 flex flex-col items-center justify-center text-slate-400 gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <p className="font-bold">Memperbarui Data...</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Pelanggan</th>
                        <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Tipe</th>
                        <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Jumlah</th>
                        <th className="px-8 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {reportTransactions.map((transaction) => (
                        <tr key={transaction.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-8 py-5">
                            <p className="font-bold text-slate-900">{transaction.customer}</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-1">{new Date(transaction.createdAt).toLocaleString("id-ID")}</p>
                          </td>
                          <td className="px-8 py-5">
                            <span className={cn(
                              "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
                              transaction.type.includes("Setoran") ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-purple-50 text-purple-600 border-purple-100"
                            )}>
                              {transaction.type}
                            </span>
                          </td>
                          <td className="px-8 py-5">
                            <p className="font-black text-slate-900 italic">{transaction.amount}</p>
                          </td>
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-2">
                              <div className={cn("w-1.5 h-1.5 rounded-full", transaction.status === "Selesai" ? "bg-emerald-500" : "bg-amber-500")} />
                              <p className="text-sm font-bold text-slate-700">{transaction.status}</p>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Info/Filters */}
          <div className="flex flex-col gap-8">
            {/* Filter Card */}
            <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Filter Laporan</h3>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Mulai Dari</label>
                  <input
                    type="date"
                    value={reportStart}
                    onChange={(event) => setReportStart(event.target.value)}
                    className="w-full bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Hingga Akhir</label>
                  <input
                    type="date"
                    value={reportEnd}
                    onChange={(event) => setReportEnd(event.target.value)}
                    className="w-full bg-slate-50 border-0 ring-1 ring-slate-100 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-primary outline-none font-bold text-slate-700"
                  />
                </div>
                <button 
                  onClick={() => loadReport(reportStart, reportEnd)}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-lg shadow-slate-200 mt-2"
                >
                  Terapkan Filter
                </button>
              </div>
            </div>

            {/* Highlights */}
            <div className="bg-emerald-900 rounded-[2.5rem] p-8 shadow-xl shadow-emerald-900/20 text-white space-y-6 relative overflow-hidden group">
              <div className="absolute -right-4 -top-4 w-32 h-32 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <h3 className="text-xl font-bold flex items-center gap-2">
                <PlusCircle className="w-5 h-5" />
                Program Unggulan
              </h3>
              <div className="space-y-4">
                {programHighlights.map((item) => (
                  <div key={item.title} className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 hover:bg-white/20 transition-colors">
                    <h4 className="font-bold text-emerald-300 mb-1">{item.title}</h4>
                    <p className="text-xs text-emerald-50/70 leading-relaxed font-medium">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
