"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  Calendar,
  ChevronRight,
  Download,
  FileText,
  LayoutDashboard,
  LogOut,
  PlusCircle,
  RefreshCw,
  Scale,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type ViewSection = "Dashboard" | "Transaksi" | "Setoran" | "Anggota" | "Laporan";

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

type ApiTransaction = {
  id: number;
  nasabahId: number | null;
  nasabahNama: string;
  tipe: string;
  jumlah: number;
  keterangan: string | null;
  status: string;
  createdAt: string;
  berat: number | null;
};

type ApiDeposit = {
  id: number;
  nasabahId: number | null;
  nasabahNama: string;
  jenisSampahId: number | null;
  jenisSampahNama: string;
  berat: number;
  total: number;
  status: string;
  petugasId: number | null;
  petugasNama: string | null;
  createdAt: string;
};

type ApiWithdrawal = {
  id: number;
  nasabahId: number | null;
  nasabahNama: string;
  jumlah: number;
  status: string;
  createdAt: string;
};

type ApiMember = {
  id: number;
  nama: string;
  email: string;
  role: string;
  alamat: string | null;
  noHp: string | null;
  saldo: number;
  totalSetoranKg: number;
  totalSetoranRp: number;
  createdAt: string;
};

type PaginatedResult<T> = {
  items: T[];
  meta: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

type SessionUser = {
  id: number;
  nama: string;
  email: string;
  role: string;
};

type RolePermissions = {
  role: string;
  canViewDashboard: boolean;
  canViewReports: boolean;
  canViewAnalytics: boolean;
  canViewTransactions: boolean;
  canViewMembers: boolean;
  canManageMembers: boolean;
  canViewWasteTypes: boolean;
  canManageWasteTypes: boolean;
  canCreateDeposits: boolean;
  canApproveDeposits: boolean;
  canDeleteDeposits: boolean;
  canBulkApproveDeposits: boolean;
  canCreateWithdrawals: boolean;
  canApproveWithdrawals: boolean;
  canDeleteWithdrawals: boolean;
  canBulkApproveWithdrawals: boolean;
  canViewAuditLog: boolean;
  canViewAlerts: boolean;
  canViewSummary: boolean;
};

const navItems: ViewSection[] = ["Dashboard", "Transaksi", "Setoran", "Anggota", "Laporan"];

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

function getInitialReportRange() {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return {
    start: formatDateInput(start),
    end: formatDateInput(now),
  };
}

function formatStatusBadge(status: string) {
  const normalized = status.toLowerCase();

  if (["berhasil", "success", "verified", "selesai"].includes(normalized)) {
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
  }

  if (["pending", "menunggu"].includes(normalized)) {
    return "bg-amber-50 text-amber-600 border-amber-100";
  }

  if (["failed", "gagal", "rejected", "ditolak"].includes(normalized)) {
    return "bg-rose-50 text-rose-600 border-rose-100";
  }

  return "bg-slate-100 text-slate-600 border-slate-200";
}

function formatTransactionType(type: string) {
  const normalized = type.toLowerCase();
  if (normalized === "setor") {
    return "Setoran";
  }
  if (normalized === "tarik") {
    return "Penarikan";
  }
  return type;
}

function formatTransactionAmount(item: ApiTransaction) {
  return item.tipe === "setor" ? formatKg(Number(item.berat ?? 0)) : formatRp(Number(item.jumlah ?? 0));
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

async function fetchJson<T>(input: string, init?: RequestInit) {
  const response = await fetch(input, init);
  if (!response.ok) {
    let message = "Request gagal";
    try {
      const data = await response.json();
      message = data.message ?? message;
    } catch {
      message = response.statusText || message;
    }
    throw new Error(message);
  }
  return (await response.json()) as T;
}

function SectionHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-black text-slate-900">{title}</h2>
        <p className="mt-1 text-sm font-medium text-slate-500">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

function InfoCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{title}</p>
      <p className="mt-3 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-2 text-sm font-medium text-slate-500">{hint}</p>
    </div>
  );
}

export default function HomePage() {
  const initialReportRange = useMemo(() => getInitialReportRange(), []);
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentView, setCurrentView] = useState<ViewSection>("Dashboard");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [backendReady, setBackendReady] = useState(false);
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [stats, setStats] = useState<Stats>(initialStats);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>(initialTransactions);
  const [activeUsers, setActiveUsers] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>(initialFeatures);
  const [lastUpdated, setLastUpdated] = useState("");
  const [reportStart, setReportStart] = useState(initialReportRange.start);
  const [reportEnd, setReportEnd] = useState(initialReportRange.end);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState(false);
  const [sectionError, setSectionError] = useState("");
  const [transactionQuery, setTransactionQuery] = useState("");
  const [transactionData, setTransactionData] = useState<PaginatedResult<ApiTransaction> | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<ApiTransaction | null>(null);
  const [depositData, setDepositData] = useState<PaginatedResult<ApiDeposit> | null>(null);
  const [withdrawalData, setWithdrawalData] = useState<PaginatedResult<ApiWithdrawal> | null>(null);
  const [memberData, setMemberData] = useState<PaginatedResult<ApiMember> | null>(null);
  const initialReportRangeRef = useRef(initialReportRange);

  async function loadPermissions() {
    const data = await fetchJson<{ user: SessionUser; permissions: RolePermissions }>("/api/me/permissions");
    setSessionUser(data.user);
    setPermissions(data.permissions);
  }

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
      await Promise.all([refreshDashboard(), loadReport(reportStart, reportEnd), loadPermissions()]);
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
    setSessionUser(null);
    setPermissions(null);
    setCurrentView("Dashboard");
  }

  async function refreshDashboard() {
    setLoading(true);
    try {
      const data = await fetchJson<DashboardData>("/api/dashboard");
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
      const data = await fetchJson<ReportData>(
        `/api/reports?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`
      );
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

  async function loadTransactions(query = transactionQuery) {
    setSectionLoading(true);
    setSectionError("");
    try {
      const data = await fetchJson<PaginatedResult<ApiTransaction>>(
        `/api/transactions?q=${encodeURIComponent(query)}&page=1&limit=12`
      );
      setTransactionData(data);
      setSelectedTransaction((current) => current ?? data.items[0] ?? null);
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : "Gagal memuat transaksi");
      setTransactionData(null);
      setSelectedTransaction(null);
    } finally {
      setSectionLoading(false);
    }
  }

  async function loadOperationalData() {
    setSectionLoading(true);
    setSectionError("");
    try {
      const [deposits, withdrawals] = await Promise.all([
        fetchJson<PaginatedResult<ApiDeposit>>("/api/deposits?page=1&limit=8"),
        fetchJson<PaginatedResult<ApiWithdrawal>>("/api/withdrawals?page=1&limit=8"),
      ]);
      setDepositData(deposits);
      setWithdrawalData(withdrawals);
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : "Gagal memuat operasional");
      setDepositData(null);
      setWithdrawalData(null);
    } finally {
      setSectionLoading(false);
    }
  }

  async function loadMembers() {
    setSectionLoading(true);
    setSectionError("");
    try {
      const data = await fetchJson<PaginatedResult<ApiMember>>("/api/members?page=1&limit=10");
      setMemberData(data);
    } catch (error) {
      setSectionError(error instanceof Error ? error.message : "Gagal memuat anggota");
      setMemberData(null);
    } finally {
      setSectionLoading(false);
    }
  }

  function openView(view: ViewSection) {
    setCurrentView(view);

    if (view === "Transaksi") {
      void loadTransactions();
      return;
    }

    if (view === "Setoran") {
      void loadOperationalData();
      return;
    }

    if (view === "Anggota") {
      void loadMembers();
      return;
    }

    if (view === "Laporan") {
      void loadReport(reportStart, reportEnd);
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
          await Promise.all([refreshDashboard(), loadReport(start, end), loadPermissions()]);
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
    if (!authenticated || currentView !== "Laporan") return;
    void loadReport(reportStart, reportEnd);
  }, [authenticated, currentView, reportStart, reportEnd]);

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
      <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100 via-slate-50 to-white p-4">
        <div className="w-full max-w-md rounded-[2.5rem] border border-blue-50 bg-white p-8 shadow-2xl shadow-blue-200/50">
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Zap className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Admin Bank Sampah</h2>
            <p className="mt-2 text-center text-sm text-slate-500">Masuk untuk mengelola ekosistem bank sampah Anda</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="username" className="ml-1 text-sm font-semibold text-slate-700">
                Nama Pengguna
              </label>
              <div className="relative">
                <input
                  id="username"
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 pl-11 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-primary"
                  placeholder="admin@bangsam.local"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  required
                />
                <Users className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="ml-1 text-sm font-semibold text-slate-700">
                Kata Sandi
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  className="w-full rounded-2xl bg-slate-50 px-4 py-3 pl-11 outline-none ring-1 ring-slate-200 transition-all focus:ring-2 focus:ring-primary"
                  placeholder="••••••••"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <ShieldCheck className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            {loginError ? (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-600">
                <div className="h-1 w-1 rounded-full bg-red-600" />
                {loginError}
              </div>
            ) : null}

            <button
              type="submit"
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-bold text-white shadow-lg shadow-primary/20 transition-all hover:bg-primary/90"
            >
              Masuk Sekarang
              <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </button>
          </form>
        </div>
      </main>
    );
  }

  const navItemIcons: Record<ViewSection, React.ComponentType<{ className?: string }>> = {
    Dashboard: LayoutDashboard,
    Transaksi: ArrowLeftRight,
    Setoran: PlusCircle,
    Anggota: Users,
    Laporan: FileText,
  };

  return (
    <main className="flex min-h-screen flex-col bg-slate-50/50 lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="flex flex-col gap-8 border-r border-slate-200 bg-white p-6 lg:sticky lg:top-0 lg:h-screen">
        <div className="flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 shadow-lg shadow-emerald-200">
            <Zap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold leading-none text-slate-900">Bank Sampah</h2>
            <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-500">
              {sessionUser?.role ?? "administrator"}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = navItemIcons[item];
            const isActive = item === currentView;
            return (
              <button
                key={item}
                type="button"
                onClick={() => openView(item)}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-4 py-3 text-left font-medium transition-all duration-200 group",
                  isActive ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-600 hover:bg-slate-50 hover:text-primary"
                )}
              >
                <Icon className={cn("h-5 w-5", isActive ? "text-white" : "text-slate-400 group-hover:text-primary")} />
                {item}
              </button>
            );
          })}
        </nav>

        <div className="mt-auto space-y-4">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-slate-900">Live Status</h3>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              {features.map((feature) => (
                <span
                  key={feature}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-tight text-slate-600"
                >
                  {feature}
                </span>
              ))}
            </div>
            <p className="text-xs font-medium text-slate-500">Update terakhir: {lastUpdated || "-"}</p>
          </div>

          <div className="rounded-3xl border border-slate-100 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Hak Akses</p>
            <div className="mt-3 space-y-2 text-sm font-medium text-slate-600">
              <p>Kelola anggota: {permissions?.canManageMembers ? "Ya" : "Tidak"}</p>
              <p>Approve setoran: {permissions?.canApproveDeposits ? "Ya" : "Tidak"}</p>
              <p>Lihat audit: {permissions?.canViewAuditLog ? "Ya" : "Tidak"}</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition-colors hover:bg-red-100"
          >
            <LogOut className="h-4 w-4" />
            Keluar Panel
          </button>
        </div>
      </aside>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 p-4 lg:p-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {currentView === "Dashboard" ? "Selamat Datang" : currentView}
            </h1>
            <p className="mt-1 font-medium text-slate-500">
              {sessionUser ? `${sessionUser.nama} • ${sessionUser.role}` : "Pantau operasional bank sampah Anda."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-widest",
                backendReady ? "border-emerald-100 bg-emerald-50 text-emerald-600" : "border-amber-100 bg-amber-50 text-amber-600"
              )}
            >
              <div className={cn("h-2 w-2 animate-pulse rounded-full", backendReady ? "bg-emerald-500" : "bg-amber-500")} />
              {backendReady ? "Connected" : "Demo Mode"}
            </div>
            <button
              onClick={refreshDashboard}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white p-2 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={cn("h-5 w-5 text-slate-600", loading && "animate-spin")} />
            </button>
          </div>
        </div>

        {currentView === "Dashboard" ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {cards.map((stat, idx) => {
                const icons = [Scale, Wallet, Users, ArrowLeftRight, Activity];
                const colors = ["text-blue-600", "text-emerald-600", "text-purple-600", "text-orange-600", "text-pink-600"];
                const bgColors = ["bg-blue-50", "bg-emerald-50", "bg-purple-50", "bg-orange-50", "bg-pink-50"];
                const Icon = icons[idx] || Activity;

                return (
                  <div key={stat.title} className="group rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                    <div className={cn("mb-4 flex h-12 w-12 items-center justify-center rounded-2xl transition-transform group-hover:scale-110", bgColors[idx % bgColors.length])}>
                      <Icon className={cn("h-6 w-6", colors[idx % colors.length])} />
                    </div>
                    <p className="text-sm font-bold uppercase tracking-wider text-slate-500">{stat.title}</p>
                    <p className="mt-1 text-2xl font-black text-slate-900">{stat.value}</p>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
              <div className="space-y-6 xl:col-span-2">
                <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
                  <div className="flex flex-col justify-between gap-4 border-b border-slate-50 p-8 md:flex-row md:items-center">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50">
                        <TrendingUp className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">Transaksi Terbaru</h2>
                        <p className="text-sm font-medium text-slate-400">Klik transaksi untuk buka panel detail.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentView("Transaksi")}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                    >
                      Buka Semua Transaksi
                    </button>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Pelanggan</th>
                          <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Tipe</th>
                          <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Jumlah</th>
                          <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {recentTransactions.map((transaction) => (
                          <tr
                            key={transaction.id}
                            className="cursor-pointer transition-colors hover:bg-slate-50/50"
                            onClick={() => {
                              setSelectedTransaction({
                                id: Number(transaction.id),
                                nasabahId: null,
                                nasabahNama: transaction.customer,
                                tipe: transaction.type.toLowerCase().includes("tarik") ? "tarik" : "setor",
                                jumlah: 0,
                                keterangan: transaction.type,
                                status: transaction.status,
                                createdAt: transaction.createdAt,
                                berat: null,
                              });
                              openView("Transaksi");
                            }}
                          >
                            <td className="px-8 py-5">
                              <p className="font-bold text-slate-900">{transaction.customer}</p>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                                {new Date(transaction.createdAt).toLocaleString("id-ID")}
                              </p>
                            </td>
                            <td className="px-8 py-5">
                              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                                {transaction.type}
                              </span>
                            </td>
                            <td className="px-8 py-5 font-black italic text-slate-900">{transaction.amount}</td>
                            <td className="px-8 py-5">
                              <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", formatStatusBadge(transaction.status))}>
                                {transaction.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">Ringkasan Akses</h3>
                  <div className="mt-5 grid grid-cols-1 gap-4">
                    <InfoCard title="Role Aktif" value={permissions?.role ?? "-"} hint="Role login saat ini" />
                    <InfoCard title="Data Anggota" value={permissions?.canManageMembers ? "Full Access" : "Read Only"} hint="Sesuai hak akses backend" />
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-[2.5rem] bg-emerald-900 p-8 text-white shadow-xl shadow-emerald-900/20">
                  <div className="absolute -right-4 -top-4 h-32 w-32 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150" />
                  <h3 className="flex items-center gap-2 text-xl font-bold">
                    <PlusCircle className="h-5 w-5" />
                    Program Unggulan
                  </h3>
                  <div className="mt-6 space-y-4">
                    {programHighlights.map((item) => (
                      <div key={item.title} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md transition-colors hover:bg-white/20">
                        <h4 className="mb-1 font-bold text-emerald-300">{item.title}</h4>
                        <p className="text-xs font-medium leading-relaxed text-emerald-50/70">{item.description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}

        {currentView === "Transaksi" ? (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-6">
              <SectionHeader
                title="Riwayat Transaksi"
                description="List transaksi sekarang sudah aktif dan bisa dipilih."
                actions={
                  <>
                    <input
                      value={transactionQuery}
                      onChange={(event) => setTransactionQuery(event.target.value)}
                      placeholder="Cari nama atau keterangan"
                      className="rounded-2xl border-0 bg-white px-4 py-3 outline-none ring-1 ring-slate-200 focus:ring-2 focus:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => loadTransactions()}
                      className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                    >
                      Cari
                    </button>
                  </>
                }
              />

              <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
                {sectionLoading ? (
                  <div className="flex items-center justify-center gap-3 p-10 text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    Memuat transaksi...
                  </div>
                ) : sectionError ? (
                  <div className="p-8 text-sm font-medium text-rose-600">{sectionError}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Nasabah</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Tipe</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Jumlah</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                          <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Waktu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {transactionData?.items.map((item) => (
                          <tr
                            key={item.id}
                            className={cn(
                              "cursor-pointer transition-colors hover:bg-slate-50",
                              selectedTransaction?.id === item.id && "bg-blue-50/50"
                            )}
                            onClick={() => setSelectedTransaction(item)}
                          >
                            <td className="px-6 py-4 font-bold text-slate-900">{item.nasabahNama}</td>
                            <td className="px-6 py-4">
                              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                                {formatTransactionType(item.tipe)}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-900">{formatTransactionAmount(item)}</td>
                            <td className="px-6 py-4">
                              <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", formatStatusBadge(item.status))}>
                                {item.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-500">
                              {new Date(item.createdAt).toLocaleString("id-ID")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Detail Transaksi</h3>
              {selectedTransaction ? (
                <div className="mt-6 space-y-4 text-sm font-medium text-slate-600">
                  <InfoCard title="Nasabah" value={selectedTransaction.nasabahNama} hint={`ID transaksi #${selectedTransaction.id}`} />
                  <InfoCard title="Tipe" value={formatTransactionType(selectedTransaction.tipe)} hint={selectedTransaction.keterangan || "Tanpa keterangan"} />
                  <InfoCard title="Nominal" value={formatTransactionAmount(selectedTransaction)} hint={`Status ${selectedTransaction.status}`} />
                  <InfoCard title="Waktu" value={new Date(selectedTransaction.createdAt).toLocaleDateString("id-ID")} hint={new Date(selectedTransaction.createdAt).toLocaleTimeString("id-ID")} />
                </div>
              ) : (
                <p className="mt-6 text-sm font-medium text-slate-500">Pilih salah satu transaksi untuk melihat detailnya.</p>
              )}
            </div>
          </div>
        ) : null}

        {currentView === "Setoran" ? (
          <div className="space-y-8">
            <SectionHeader
              title="Operasional Setoran dan Penarikan"
              description="Data setoran dan penarikan sekarang bisa dibuka langsung dari web."
              actions={
                <button
                  type="button"
                  onClick={loadOperationalData}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                >
                  Refresh Operasional
                </button>
              }
            />

            {sectionError ? <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-600">{sectionError}</div> : null}

            <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
              <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-50 p-6">
                  <h3 className="text-lg font-bold text-slate-900">Setoran Terbaru</h3>
                  <p className="mt-1 text-sm text-slate-500">Total data: {depositData?.meta.totalItems ?? 0}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Nasabah</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Jenis</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Berat</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {depositData?.items.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold text-slate-900">{item.nasabahNama}</td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.jenisSampahNama}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">
                            {formatKg(item.berat)} / {formatRp(item.total)}
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", formatStatusBadge(item.status))}>
                              {item.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
                <div className="border-b border-slate-50 p-6">
                  <h3 className="text-lg font-bold text-slate-900">Penarikan Terbaru</h3>
                  <p className="mt-1 text-sm text-slate-500">Total data: {withdrawalData?.meta.totalItems ?? 0}</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-50/50">
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Nasabah</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Jumlah</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                        <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Waktu</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {withdrawalData?.items.map((item) => (
                        <tr key={item.id} className="transition-colors hover:bg-slate-50">
                          <td className="px-6 py-4 font-bold text-slate-900">{item.nasabahNama}</td>
                          <td className="px-6 py-4 font-bold text-slate-900">{formatRp(item.jumlah)}</td>
                          <td className="px-6 py-4">
                            <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", formatStatusBadge(item.status))}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-slate-500">
                            {new Date(item.createdAt).toLocaleString("id-ID")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {currentView === "Anggota" ? (
          <div className="space-y-8">
            <SectionHeader
              title="Data Anggota"
              description="Daftar anggota aktif dari database MySQL."
              actions={
                <button
                  type="button"
                  onClick={loadMembers}
                  className="rounded-2xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                >
                  Refresh Anggota
                </button>
              }
            />

            {sectionError ? <div className="rounded-2xl bg-rose-50 p-4 text-sm font-medium text-rose-600">{sectionError}</div> : null}

            <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/50">
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Nama</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Email</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Kontak</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Saldo</th>
                      <th className="px-6 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Setoran</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {memberData?.items.map((item) => (
                      <tr key={item.id} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-4">
                          <p className="font-bold text-slate-900">{item.nama}</p>
                          <p className="mt-1 text-xs font-medium text-slate-400">{item.alamat || "Alamat belum diisi"}</p>
                        </td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.email}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-600">{item.noHp || "-"}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">{formatRp(item.saldo)}</td>
                        <td className="px-6 py-4 font-bold text-slate-900">
                          {formatKg(item.totalSetoranKg)} / {formatRp(item.totalSetoranRp)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {currentView === "Laporan" ? (
          <div className="grid grid-cols-1 gap-8 xl:grid-cols-3">
            <div className="space-y-6 xl:col-span-2">
              <SectionHeader
                title="Laporan Transaksi"
                description={`Periode aktif ${reportPeriod}`}
                actions={
                  <>
                    <button
                      onClick={() => downloadCSV(reportData)}
                      className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <Download className="h-4 w-4" />
                      CSV
                    </button>
                    <button
                      onClick={() => exportPDF(reportData)}
                      className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-slate-800"
                    >
                      <FileText className="h-4 w-4" />
                      PDF
                    </button>
                  </>
                }
              />

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <InfoCard title="Total Setoran" value={formatKg(reportStats.totalSetoranKg)} hint="Akumulasi periode aktif" />
                <InfoCard title="Saldo Poin" value={formatRp(reportStats.saldoPoinRp)} hint="Total nilai setoran" />
                <InfoCard title="Transaksi" value={reportStats.transaksiCount.toString()} hint="Jumlah semua transaksi" />
                <InfoCard title="Nasabah Unik" value={reportStats.uniqueUsers.toString()} hint="Pengguna dalam periode ini" />
              </div>

              <div className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm">
                {reportLoading ? (
                  <div className="flex items-center justify-center gap-3 p-12 text-slate-400">
                    <RefreshCw className="h-8 w-8 animate-spin" />
                    <p className="font-bold">Memperbarui Data...</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                      <thead>
                        <tr className="bg-slate-50/50">
                          <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Pelanggan</th>
                          <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Tipe</th>
                          <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Jumlah</th>
                          <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {reportTransactions.map((transaction) => (
                          <tr key={transaction.id} className="transition-colors hover:bg-slate-50/50">
                            <td className="px-8 py-5">
                              <p className="font-bold text-slate-900">{transaction.customer}</p>
                              <p className="mt-1 text-[10px] font-bold uppercase tracking-tighter text-slate-400">
                                {new Date(transaction.createdAt).toLocaleString("id-ID")}
                              </p>
                            </td>
                            <td className="px-8 py-5">
                              <span className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-blue-600">
                                {transaction.type}
                              </span>
                            </td>
                            <td className="px-8 py-5 font-black italic text-slate-900">{transaction.amount}</td>
                            <td className="px-8 py-5">
                              <span className={cn("rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-widest", formatStatusBadge(transaction.status))}>
                                {transaction.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-8">
              <div className="rounded-[2.5rem] border border-slate-100 bg-white p-8 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">Filter Laporan</h3>
                </div>

                <div className="mt-6 space-y-4">
                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-black uppercase tracking-widest text-slate-400">Mulai Dari</label>
                    <input
                      type="date"
                      value={reportStart}
                      onChange={(event) => setReportStart(event.target.value)}
                      className="w-full rounded-2xl bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="ml-1 text-xs font-black uppercase tracking-widest text-slate-400">Hingga Akhir</label>
                    <input
                      type="date"
                      value={reportEnd}
                      onChange={(event) => setReportEnd(event.target.value)}
                      className="w-full rounded-2xl bg-slate-50 px-4 py-3 font-bold text-slate-700 outline-none ring-1 ring-slate-100 focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <button
                    onClick={() => loadReport(reportStart, reportEnd)}
                    className="mt-2 w-full rounded-2xl bg-slate-900 py-4 font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800"
                  >
                    Terapkan Filter
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
