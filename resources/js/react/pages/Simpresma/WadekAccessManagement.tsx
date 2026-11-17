import { useEffect, useState } from "react";
import { Card, SearchFilter, TablePagination, Title } from "./SimpresmaShared";
import { Account, ManagedRole, loadManagedAccounts, saveManagedAccounts } from "./SimpresmaMockAccess";

type ToastState = { type: "success" | "error"; message: string } | null;

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  return (
    <div className="fixed right-5 top-5 z-[999999] w-[calc(100%-2.5rem)] max-w-sm">
      <div className={`rounded-xl border bg-white px-4 py-3 shadow-lg dark:bg-gray-900 ${toast.type === "success" ? "border-brand-200" : "border-error-200"}`}>
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${toast.type === "success" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"}`}>
            {toast.type === "success" ? "✓" : "!"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{toast.type === "success" ? "Berhasil" : "Gagal"}</p>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{toast.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function WadekAccessManagement() {
  const [accounts, setAccounts] = useState<Account[]>(loadManagedAccounts);
  const [q, setQ] = useState("");
  const [toast, setToast] = useState<ToastState>(null);
  const [pendingRoleChange, setPendingRoleChange] = useState<{ email: string; role: ManagedRole; action: "grant" | "revoke" } | null>(null);

  const showToast = (nextToast: NonNullable<ToastState>) => {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    saveManagedAccounts(accounts);
  }, [accounts]);

  const requestRoleChange = (email: string, role: ManagedRole) => {
    const account = accounts.find((item) => item.email === email);
    if (!account) return;
    const active = account.roles.includes(role);

    if (active && account.roles.length <= 1) {
      showToast({ type: "error", message: "User harus memiliki minimal 1 role aktif." });
      return;
    }

    setPendingRoleChange({ email, role, action: active ? "revoke" : "grant" });
  };

  const confirmRoleChange = () => {
    if (!pendingRoleChange) return;
    const { email, role, action } = pendingRoleChange;
    const account = accounts.find((item) => item.email === email);
    if (!account) {
      setPendingRoleChange(null);
      showToast({ type: "error", message: "Data pengguna tidak ditemukan." });
      return;
    }

    try {
      setAccounts((current) => current.map((item) => {
        if (item.email !== email) return item;
        const roles = action === "revoke"
          ? item.roles.filter((itemRole) => itemRole !== role)
          : item.roles.includes(role) ? item.roles : [...item.roles, role];
        return { ...item, roles };
      }));
      setPendingRoleChange(null);
      showToast({
        type: "success",
        message: `Role '${role}' berhasil ${action === "revoke" ? "dicabut dari" : "ditambahkan ke"} user ${account.name}.`,
      });
    } catch {
      setPendingRoleChange(null);
      showToast({ type: "error", message: `Role '${role}' gagal ${action === "revoke" ? "dicabut dari" : "ditambahkan ke"} user ${account.name}.` });
    }
  };

  const filtered = accounts.filter((account) =>
    `${account.name} ${account.email} ${account.prodi ?? ""}`.toLowerCase().includes(q.toLowerCase())
  );

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  useEffect(() => { setCurrentPage((page) => Math.min(page, totalPages)); }, [totalPages]);
  const paginatedAccounts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <>
      <Toast toast={toast} />
      <Title title="Manajemen Hak Akses" description="Wadek sebagai Superadmin memberikan atau mencabut role Verifikator, Tendik, dan Kaprodi." />
      <div className="mb-4">
        <SearchFilter value={q} onChange={setQ} />
      </div>
      <Card className="p-5">
        <div className="mt-5 overflow-x-auto no-scrollbar">
          <table className="simpresma-table min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 font-medium text-gray-500">Pengguna</th>
                <th className="px-4 py-3 font-medium text-gray-500">Program Studi</th>
                <th className="px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedAccounts.map((account) => (
                <tr key={account.email} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="px-4 py-4">
                    <p className="font-medium text-gray-800 dark:text-white">{account.name}</p>
                    <p className="text-xs text-gray-500">{account.email}</p>
                  </td>
                  <td className="px-4 py-4 text-gray-500">{account.prodi ?? "Lintas Prodi"}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {account.roles.map((role) => <span key={role} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{role}</span>)}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      {(["Verifikator", "Tendik", "Kaprodi"] as ManagedRole[]).map((role) => (
                        <label key={role} className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                          <input type="checkbox" checked={account.roles.includes(role)} onChange={() => requestRoleChange(account.email, role)} />
                          {role}
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <TablePagination currentPage={currentPage} totalItems={filtered.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
        <p className="mt-4 text-xs text-gray-500">Role Wadek tidak dikelola melalui halaman ini. Master Data SKS dan Nilai juga tidak dikelola Wadek; kewenangan tersebut berada pada Verifikator.</p>
      </Card>

      {pendingRoleChange && (
        <div className="fixed inset-0 z-[999998] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full ${pendingRoleChange.action === "grant" ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"}`}>
              {pendingRoleChange.action === "grant" ? "✓" : "!"}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              {pendingRoleChange.action === "grant" ? "Berikan Hak Akses?" : "Cabut Hak Akses?"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
              Apakah yakin ingin {pendingRoleChange.action === "grant" ? "memberikan" : "mencabut"} role <span className="font-semibold text-gray-700 dark:text-gray-200">{pendingRoleChange.role}</span> {pendingRoleChange.action === "grant" ? "kepada" : "dari"} user <span className="font-semibold text-gray-700 dark:text-gray-200">{accounts.find((account) => account.email === pendingRoleChange.email)?.name}</span>?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setPendingRoleChange(null)} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button>
              <button type="button" onClick={confirmRoleChange} className={`rounded-lg px-4 py-2.5 text-sm font-medium text-white ${pendingRoleChange.action === "grant" ? "bg-brand-500 hover:bg-brand-600" : "bg-error-500 hover:bg-error-600"}`}>
                {pendingRoleChange.action === "grant" ? "Ya, Berikan" : "Ya, Cabut"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
