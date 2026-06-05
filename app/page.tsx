"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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

  async function checkAuth() {
    try {
      const response = await fetch("/api/auth");
      if (!response.ok) {
        setAuthenticated(false);
      } else {
        const data = await response.json();
        setAuthenticated(data.authenticated);
        if (data.authenticated) {
          await refreshDashboard();
          await loadReport(reportStart, reportEnd);
        }
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      setAuthenticated(false);
    } finally {
      setAuthChecked(true);
    }
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

  async function addRemoteTransaction() {
    if (!authenticated) return;
    try {
      const response = await fetch("/api/transactions", { method: "POST" });
      if (!response.ok) {
        throw new Error("Gagal menambahkan transaksi");
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
    }
  }

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    const interval = window.setInterval(addRemoteTransaction, 10000);
    return () => window.clearInterval(interval);
  }, [authenticated]);

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
      <main className="page-shell login-shell">
        <div className="login-card">
          <h2>Login Admin Bank Sampah</h2>
          <form onSubmit={handleLogin}>
            <div className="form-field">
              <label htmlFor="username">Nama Pengguna</label>
              <input
                id="username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="password">Kata Sandi</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {loginError && <p style={{ color: "#b91c1c" }}>{loginError}</p>}
            <button type="submit" className="button">
              Masuk
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="page-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-dot" />
          <div>
            <p className="brand-title">Bank Sampah Admin</p>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>Panel manajemen</p>
          </div>
        </div>

        <nav>
          {navItems.map((item) => (
            <a key={item} className={`nav-item ${item === "Dashboard" ? "active" : ""}`} href="#">
              {item}
            </a>
          ))}
        </nav>

        <div className="section">
          <h2 className="section-title">Info Admin</h2>
          <p style={{ margin: "0.75rem 0 0", color: "#4b5563" }}>
            Kelola setoran sampah, transaksi, anggota, dan laporan mudah dari satu dashboard.
          </p>
          <p style={{ margin: "1rem 0 0", fontSize: "0.9rem", color: "#6b7280" }}>
            Terakhir diperbarui: {lastUpdated || "Memuat..."}
          </p>
        </div>

        <div className="section">
          <h2 className="section-title">Fitur Aktif</h2>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
            {features.map((feature) => (
              <span
                key={feature}
                style={{
                  display: "inline-flex",
                  padding: "0.4rem 0.75rem",
                  borderRadius: "9999px",
                  background: "#ecfdf5",
                  color: "#166534",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                }}
              >
                {feature}
              </span>
            ))}
          </div>
          <p style={{ margin: "0.75rem 0 0", color: "#4b5563" }}>
            Semua fitur aktif dan siap dipakai untuk melihat pemakaian nyata.
          </p>
          <div style={{ marginTop: "1rem" }}>
            <div style={{ fontWeight: 700, marginBottom: "0.5rem" }}>Pengguna Aktif</div>
            {activeUsers.length ? (
              <ul style={{ margin: 0, paddingLeft: "1.2rem", color: "#374151" }}>
                {activeUsers.map((user) => (
                  <li key={user}>{user}</li>
                ))}
              </ul>
            ) : (
              <p style={{ margin: 0, color: "#6b7280" }}>Belum ada pengguna aktif saat ini.</p>
            )}
          </div>
        </div>
      </aside>

      <section className="panel">
        <div className="header">
          <div>
            <h1 className="header-title">Halo, Admin!</h1>
            <p className="subtitle">Ringkasan aktivitas bank sampah dan update terbaru.</p>
          </div>
          <div>
            <div className="badge" style={{ marginBottom: "0.75rem" }}>
              {backendReady ? "Backend Terhubung" : "Mode Demo / Fallback"}
            </div>
            <button className="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>

        {loading ? (
          <div className="section">
            <p>Memuat data dashboard...</p>
          </div>
        ) : (
          <div className="cards">
            {cards.map((stat) => (
              <div key={stat.title} className="card">
                <p className="card-title">{stat.title}</p>
                <p className="card-value">{stat.value}</p>
              </div>
            ))}
          </div>
        )}

        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Ringkasan Program</h2>
            <span className="badge">Terbaru</span>
          </div>
          <div className="overview-grid">
            {programHighlights.map((item) => (
              <div key={item.title} className="overview-card">
                <h3 style={{ margin: 0, fontSize: "1rem" }}>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="section">
          <div className="section-header">
            <h2 className="section-title">Laporan Periode</h2>
            <span className="badge">Filter</span>
          </div>
          <div className="filter-row">
            <label>
              Mulai
              <input
                type="date"
                value={reportStart}
                onChange={(event) => setReportStart(event.target.value)}
              />
            </label>
            <label>
              Selesai
              <input
                type="date"
                value={reportEnd}
                onChange={(event) => setReportEnd(event.target.value)}
              />
            </label>
            <button className="button" onClick={() => loadReport(reportStart, reportEnd)}>
              Refresh Laporan
            </button>
          </div>

          <div className="overview-grid">
            <div className="overview-card">
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>Total Setoran</p>
              <p style={{ margin: "0.75rem 0 0", fontSize: "1.45rem", fontWeight: 700 }}>
                {formatKg(reportStats.totalSetoranKg)}
              </p>
            </div>
            <div className="overview-card">
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>Saldo Poin</p>
              <p style={{ margin: "0.75rem 0 0", fontSize: "1.45rem", fontWeight: 700 }}>
                {formatRp(reportStats.saldoPoinRp)}
              </p>
            </div>
            <div className="overview-card">
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>Transaksi</p>
              <p style={{ margin: "0.75rem 0 0", fontSize: "1.45rem", fontWeight: 700 }}>
                {reportStats.transaksiCount}
              </p>
            </div>
            <div className="overview-card">
              <p style={{ margin: 0, color: "#6b7280", fontSize: "0.95rem" }}>Pengguna Unik</p>
              <p style={{ margin: "0.75rem 0 0", fontSize: "1.45rem", fontWeight: 700 }}>
                {reportStats.uniqueUsers}
              </p>
            </div>
          </div>

          <div className="export-row">
            <button className="button" onClick={() => downloadCSV(reportData)}>
              Export CSV
            </button>
            <button className="button" onClick={() => exportPDF(reportData)}>
              Export PDF
            </button>
          </div>

          {reportLoading ? (
            <p>Memuat laporan...</p>
          ) : (
            <table className="transaction-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Jenis</th>
                  <th>Jumlah</th>
                  <th>Status</th>
                  <th>Waktu</th>
                </tr>
              </thead>
              <tbody>
                {reportTransactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td>{transaction.customer}</td>
                    <td>{transaction.type}</td>
                    <td>{transaction.amount}</td>
                    <td>{transaction.status}</td>
                    <td>{new Date(transaction.createdAt).toLocaleString("id-ID")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </main>
  );
}
