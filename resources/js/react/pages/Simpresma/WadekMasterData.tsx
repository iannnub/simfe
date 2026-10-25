import { useRef, useState } from "react";
import DropdownSelect from "../../components/form/DropdownSelect";
import { Card, Input, TablePagination, Title } from "./SimpresmaShared";
import { loadBidangMapping, loadMatrixRows, masterCoursesByProdi, saveBidangMapping } from "./SimpresmaMatrix";

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

function EditModal({
  title,
  label,
  value,
  onChange,
  onCancel,
  onSubmit,
}: {
  title: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[999998] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <input
            autoFocus
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSubmit();
              if (e.key === "Escape") onCancel();
            }}
            className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
        </label>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button>
          <button type="button" onClick={onSubmit} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600">Simpan Perubahan</button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({
  title,
  description,
  onCancel,
  onConfirm,
}: {
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[999998] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400">!</div>
        <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Batal</button>
          <button type="button" onClick={onConfirm} className="rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-error-600">Hapus</button>
        </div>
      </div>
    </div>
  );
}

export function WadekMatriksSKS() {
  const rows = loadMatrixRows();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <>
      <Title title="Master Data SKS" description="Pemantauan read-only aturan SKS yang dikelola oleh Verifikator." />
      <Card className="p-5">
        <div className="overflow-x-auto no-scrollbar">
          <table className="simpresma-table w-full min-w-[980px]">
            <thead><tr className="border-b border-gray-200 dark:border-gray-800">{['Tingkatan Lomba','Tahapan','Rentang SKS'].map((h)=><th key={h} className="pb-3 text-left text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody>{paginatedRows.map((row)=><tr key={`${row.tingkatan}-${row.tahapan}`} className="border-b border-gray-200 dark:border-gray-800"><td className="py-3 text-sm text-gray-700 dark:text-gray-300">{row.tingkatan}</td><td className="py-3 text-sm text-gray-700 dark:text-gray-300">{row.tahapan}</td><td className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">{row.sks}</td></tr>)}</tbody>
          </table>
          <TablePagination currentPage={currentPage} totalItems={rows.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
        <p className="mt-4 text-xs text-gray-500">Read-only. Perubahan Master Data SKS dilakukan oleh Verifikator.</p>
      </Card>
    </>
  );
}

export function WadekMatriksNilai() {
  const rows = loadMatrixRows();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <>
      <Title title="Master Data Nilai" description="Pemantauan read-only aturan huruf nilai yang dikelola oleh Verifikator." />
      <Card className="p-5">
        <div className="overflow-x-auto no-scrollbar">
          <table className="simpresma-table w-full min-w-[980px]">
            <thead><tr className="border-b border-gray-200 dark:border-gray-800">{['Tingkatan Lomba','Tahapan','Huruf Nilai'].map((h)=><th key={h} className="pb-3 text-left text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody>{paginatedRows.map((row)=><tr key={`${row.tingkatan}-${row.tahapan}`} className="border-b border-gray-200 dark:border-gray-800"><td className="py-3 text-sm text-gray-700 dark:text-gray-300">{row.tingkatan}</td><td className="py-3 text-sm text-gray-700 dark:text-gray-300">{row.tahapan}</td><td className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">{row.nilai}</td></tr>)}</tbody>
          </table>
          <TablePagination currentPage={currentPage} totalItems={rows.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
        <p className="mt-4 text-xs text-gray-500">Read-only. Perubahan Master Data Nilai dilakukan oleh Verifikator.</p>
      </Card>
    </>
  );
}

export function WadekMasterBidang() {
  const [mapping, setMapping] = useState(loadBidangMapping);
  const [newBidang, setNewBidang] = useState("");
  const [selectedBidang, setSelectedBidang] = useState(Object.keys(mapping)[0] ?? "");
  const [matkul, setMatkul] = useState("");
  const [prodi, setProdi] = useState("Sistem Informasi");
  const [toast, setToast] = useState<ToastState>(null);
  const [editBidangTarget, setEditBidangTarget] = useState<string | null>(null);
  const [editBidangValue, setEditBidangValue] = useState("");
  const [deleteBidangTarget, setDeleteBidangTarget] = useState<string | null>(null);
  const [editMappingTarget, setEditMappingTarget] = useState<string | null>(null);
  const [editMappingValue, setEditMappingValue] = useState("");
  const [deleteMappingTarget, setDeleteMappingTarget] = useState<string | null>(null);
  const mappingPanelRef = useRef<HTMLDivElement | null>(null);

  const showToast = (nextToast: NonNullable<ToastState>) => {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 3000);
  };

  const persist = (next: Record<string, string[]>) => {
    setMapping(next);
    saveBidangMapping(next);
  };

  const addBidang = () => {
    const name = newBidang.trim();
    if (!name) {
      showToast({ type: "error", message: "Nama bidang wajib diisi." });
      return;
    }
    if (mapping[name]) {
      showToast({ type: "error", message: "Nama bidang tersebut sudah ada." });
      return;
    }

    try {
      const next = { ...mapping, [name]: [] };
      persist(next);
      setSelectedBidang(name);
      setNewBidang("");
      showToast({ type: "success", message: "Bidang berhasil ditambahkan." });
    } catch {
      showToast({ type: "error", message: "Bidang gagal ditambahkan." });
    }
  };

  const openEditBidang = (oldName: string) => {
    setEditBidangTarget(oldName);
    setEditBidangValue(oldName);
  };

  const saveEditBidang = () => {
    if (!editBidangTarget) return;
    const nextName = editBidangValue.trim();

    if (!nextName) {
      showToast({ type: "error", message: "Nama bidang wajib diisi." });
      return;
    }
    if (nextName !== editBidangTarget && mapping[nextName]) {
      showToast({ type: "error", message: "Nama bidang tersebut sudah ada." });
      return;
    }

    try {
      const next: Record<string, string[]> = {};
      Object.entries(mapping).forEach(([key, value]) => {
        next[key === editBidangTarget ? nextName : key] = value;
      });
      persist(next);
      setSelectedBidang(nextName);
      setEditBidangTarget(null);
      setEditBidangValue("");
      showToast({ type: "success", message: "Bidang berhasil diperbarui." });
    } catch {
      showToast({ type: "error", message: "Bidang gagal diperbarui." });
    }
  };

  const removeBidang = (name: string) => {
    if (Object.keys(mapping).length <= 1) {
      setDeleteBidangTarget(null);
      showToast({ type: "error", message: "Minimal harus ada satu bidang." });
      return;
    }

    try {
      const next = { ...mapping };
      delete next[name];
      persist(next);
      setSelectedBidang(Object.keys(next)[0] ?? "");
      setDeleteBidangTarget(null);
      showToast({ type: "success", message: "Bidang berhasil dihapus." });
    } catch {
      showToast({ type: "error", message: "Bidang gagal dihapus." });
    }
  };

  const addMapping = () => {
    const value = matkul.trim();
    if (!selectedBidang || !value) {
      showToast({ type: "error", message: "Bidang dan Mata Kuliah wajib diisi." });
      return;
    }

    try {
      const next = { ...mapping, [selectedBidang]: [...(mapping[selectedBidang] ?? []), value] };
      persist(next);
      setMatkul("");
      showToast({ type: "success", message: "Pemetaan Mata Kuliah berhasil ditambahkan." });
    } catch {
      showToast({ type: "error", message: "Pemetaan Mata Kuliah gagal ditambahkan." });
    }
  };

  const openEditMapping = (course: string) => {
    setEditMappingTarget(course);
    setEditMappingValue(course);
  };

  const saveEditMapping = () => {
    if (!editMappingTarget) return;
    const nextCourse = editMappingValue.trim();

    if (!nextCourse) {
      showToast({ type: "error", message: "Nama Mata Kuliah wajib diisi." });
      return;
    }

    try {
      const next = {
        ...mapping,
        [selectedBidang]: (mapping[selectedBidang] ?? []).map((item) => item === editMappingTarget ? nextCourse : item),
      };
      persist(next);
      setEditMappingTarget(null);
      setEditMappingValue("");
      showToast({ type: "success", message: "Pemetaan Mata Kuliah berhasil diperbarui." });
    } catch {
      showToast({ type: "error", message: "Pemetaan Mata Kuliah gagal diperbarui." });
    }
  };

  const openMappingManager = (field: string) => {
    setSelectedBidang(field);
    window.setTimeout(() => mappingPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 0);
  };

  const removeMapping = (course: string) => {
    try {
      const next = {
        ...mapping,
        [selectedBidang]: (mapping[selectedBidang] ?? []).filter((item) => item !== course),
      };
      persist(next);
      setDeleteMappingTarget(null);
      showToast({ type: "success", message: "Pemetaan Mata Kuliah berhasil dihapus." });
    } catch {
      showToast({ type: "error", message: "Pemetaan Mata Kuliah gagal dihapus." });
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const bidangEntries = Object.entries(mapping);
  const paginatedBidangEntries = bidangEntries.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return (
    <>
      <Toast toast={toast} />
      <Title title="Master Data Bidang & Pemetaan Mata Kuliah" description="Wadek mengelola kategori Bidang dan pemetaan Mata Kuliah ke Bidang. Daftar mata kuliah berasal dari katalog master per program studi." />
      <Card className="p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="Tambah Kategori Bidang" value={newBidang} onChange={(e) => setNewBidang(e.target.value)} placeholder="Nama bidang baru" />
          <button type="button" onClick={addBidang} className="h-11 self-end rounded-lg bg-brand-500 px-5 text-sm font-medium text-white">Tambah Bidang</button>
        </div>

        <div className="mt-6 overflow-x-auto no-scrollbar">
          <table className="simpresma-table w-full min-w-[760px]">
            <thead><tr className="border-b border-gray-200 dark:border-gray-800"><th className="pb-3 text-left text-xs font-medium text-gray-500">Bidang</th><th className="pb-3 text-left text-xs font-medium text-gray-500">Jumlah Mata Kuliah</th><th className="pb-3 text-left text-xs font-medium text-gray-500">Aksi</th></tr></thead>
            <tbody>{paginatedBidangEntries.map(([field, courses])=><tr key={field} className="border-b border-gray-200 dark:border-gray-800"><td className="py-3 text-sm font-medium text-gray-700 dark:text-gray-300">{field}</td><td className="py-3 text-sm text-gray-500">{courses.length}</td><td className="py-3"><div className="flex gap-4">
                <button type="button" onClick={()=>openMappingManager(field)} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">Kelola</button>
                <button type="button" onClick={()=>openEditBidang(field)} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">Edit</button>
                <button type="button" onClick={()=>setDeleteBidangTarget(field)} className="rounded-lg bg-error-500 px-3 py-2 text-sm font-medium text-white hover:bg-error-600">Hapus</button>
                </div></td></tr>)}</tbody>
          </table>
          <TablePagination currentPage={currentPage} totalItems={bidangEntries.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>

        <div ref={mappingPanelRef} className="mt-8 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="block"><span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Bidang Aktif</span><DropdownSelect value={selectedBidang} onChange={setSelectedBidang} options={Object.keys(mapping).map((item) => ({ value: item, label: item }))} /></label>
            <label className="block"><span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Program Studi</span><DropdownSelect value={prodi} onChange={setProdi} options={Object.keys(masterCoursesByProdi).map((item) => ({ value: item, label: item }))} /></label>
            <Input label="Mata Kuliah dari Katalog" value={matkul} onChange={(e)=>setMatkul(e.target.value)} placeholder="Pilih/tulis nama mata kuliah" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">{masterCoursesByProdi[prodi].map((course)=><button key={course} type="button" onClick={()=>setMatkul(course)} className="rounded-full bg-gray-100 px-3 py-1.5 text-xs text-gray-600 hover:bg-brand-50 hover:text-brand-500 dark:bg-gray-800 dark:text-gray-300">{course}</button>)}</div>
          <button type="button" onClick={addMapping} className="mt-4 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white">Tambah Pemetaan</button>

          <div className="mt-6 space-y-2">{(mapping[selectedBidang] ?? []).map((course)=><div key={course} className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3 text-sm dark:bg-gray-800"><span className="text-gray-700 dark:text-gray-300">{course}</span><div className="flex gap-3">
            <button type="button" onClick={()=>openEditMapping(course)} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">Edit</button>
            <button type="button" onClick={()=>setDeleteMappingTarget(course)} className="rounded-lg bg-error-500 px-3 py-2 text-sm font-medium text-white hover:bg-error-600">Hapus</button>
        </div></div>)}</div>
        </div>

        <p className="mt-4 text-xs text-gray-500">Kewenangan Bidang dan pemetaan Mata Kuliah adalah milik Wadek. Master SKS/Nilai tetap read-only di sisi Wadek.</p>
      </Card>

      {editBidangTarget !== null && (
        <EditModal
          title="Edit Bidang"
          label="Nama Bidang"
          value={editBidangValue}
          onChange={setEditBidangValue}
          onCancel={() => setEditBidangTarget(null)}
          onSubmit={saveEditBidang}
        />
      )}

      {deleteBidangTarget !== null && (
        <DeleteModal
          title="Hapus Bidang?"
          description={`Bidang "${deleteBidangTarget}" akan dihapus dari master data. Lanjutkan?`}
          onCancel={() => setDeleteBidangTarget(null)}
          onConfirm={() => removeBidang(deleteBidangTarget)}
        />
      )}

      {editMappingTarget !== null && (
        <EditModal
          title="Edit Pemetaan Mata Kuliah"
          label="Nama Mata Kuliah"
          value={editMappingValue}
          onChange={setEditMappingValue}
          onCancel={() => setEditMappingTarget(null)}
          onSubmit={saveEditMapping}
        />
      )}

      {deleteMappingTarget !== null && (
        <DeleteModal
          title="Hapus Pemetaan?"
          description={`Pemetaan "${deleteMappingTarget}" akan dihapus dari bidang "${selectedBidang}". Lanjutkan?`}
          onCancel={() => setDeleteMappingTarget(null)}
          onConfirm={() => removeMapping(deleteMappingTarget)}
        />
      )}
    </>
  );
}
