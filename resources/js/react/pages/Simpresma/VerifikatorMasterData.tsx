import { useEffect, useState } from "react";
import DropdownSelect from "../../components/form/DropdownSelect";
import { Card, TablePagination, Title } from "./SimpresmaShared";
import { loadMatrixRows, saveMatrixRows } from "./SimpresmaMatrix";

const LEVELS = [
  "Internasional",
  "Nasional Kementerian (Gemastik, LIDM, Satria Data, NUDC, KDMI, MTQMN)",
  "Nasional Kementerian (PKM, P2MW, PPK Ormawa, Pilmapres, Peksiminas)",
  "Nasional Non Kementerian-Mandiri",
  "Wilayah-Regional-Provinsi",
  "Promahadesa",
];
const STAGES = ["Mendaftar", "Lolos Tahap Awal", "Finalis", "Pemenang (Juara 1/2/3/Honorable Mention)"];

type ToastState = { type: "success" | "error"; message: string } | null;

function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;

  return (
    <div className="fixed right-5 top-5 z-[999999] w-[calc(100%-2.5rem)] max-w-sm">
      <div
        className={`rounded-xl border bg-white px-4 py-3 shadow-lg dark:bg-gray-900 ${
          toast.type === "success"
            ? "border-brand-200"
            : "border-error-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              toast.type === "success"
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
            }`}
          >
            {toast.type === "success" ? "✓" : "!"}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-800 dark:text-white/90">
              {toast.type === "success" ? "Berhasil" : "Gagal"}
            </p>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{toast.message}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActionModal({
  title,
  description,
  value,
  onChange,
  onCancel,
  onSubmit,
  submitLabel,
}: {
  title: string;
  description: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-[999998] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        <label className="mt-5 block">
          <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Nilai</span>
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
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onSubmit}
            className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600"
          >
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteModal({
  title = "Hapus data?",
  description = "Data yang dihapus tidak akan ditampilkan lagi. Lanjutkan?",
  onCancel,
  onConfirm,
}: {
  title?: string;
  description?: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[999998] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400">
          !
        </div>
        <h3 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">{title}</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-error-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-error-600"
          >
            Hapus
          </button>
        </div>
      </div>
    </div>
  );
}

function MatrixEditor({ field, title, description }: { field: "sks" | "nilai"; title: string; description: string }) {
  const [rows, setRows] = useState(loadMatrixRows);
  const [showAdd, setShowAdd] = useState(false);
  const [tingkatan, setTingkatan] = useState(LEVELS[0]);
  const [tahapan, setTahapan] = useState(STAGES[0]);
  const [value, setValue] = useState("");
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  useEffect(() => { setCurrentPage((page) => Math.min(page, totalPages)); }, [totalPages]);

  const showToast = (nextToast: NonNullable<ToastState>) => {
    setToast(nextToast);
    window.setTimeout(() => setToast(null), 3000);
  };

  const persist = (next: typeof rows) => {
    setRows(next);
    saveMatrixRows(next);
  };

  const openEdit = (index: number) => {
    setEditIndex(index);
    setEditValue(rows[index][field]);
  };

  const saveEdit = () => {
    if (editIndex === null) return;
    const nextValue = editValue.trim();

    if (!nextValue) {
      showToast({
        type: "error",
        message: field === "sks" ? "Rentang SKS wajib diisi." : "Huruf Nilai wajib diisi.",
      });
      return;
    }

    try {
      persist(rows.map((row, index) => (index === editIndex ? { ...row, [field]: nextValue } : row)));
      setEditIndex(null);
      setEditValue("");
      showToast({
        type: "success",
        message: field === "sks" ? "Rentang SKS berhasil diperbarui." : "Huruf Nilai berhasil diperbarui.",
      });
    } catch {
      showToast({
        type: "error",
        message: field === "sks" ? "Rentang SKS gagal diperbarui." : "Huruf Nilai gagal diperbarui.",
      });
    }
  };

  const remove = (index: number) => {
    try {
      persist(rows.map((row, i) => (i === index ? { ...row, [field]: "-" } : row)));
      setDeleteIndex(null);
      showToast({
        type: "success",
        message: field === "sks" ? "Data SKS berhasil dihapus." : "Data Nilai berhasil dihapus.",
      });
    } catch {
      showToast({
        type: "error",
        message: field === "sks" ? "Data SKS gagal dihapus." : "Data Nilai gagal dihapus.",
      });
    }
  };

  const add = () => {
    if (!value.trim()) {
      showToast({
        type: "error",
        message: field === "sks" ? "Rentang SKS wajib diisi." : "Huruf Nilai wajib diisi.",
      });
      return;
    }

    try {
      const existingIndex = rows.findIndex((r) => r.tingkatan === tingkatan && r.tahapan === tahapan);
      if (existingIndex >= 0) {
        persist(rows.map((row, index) => index === existingIndex ? { ...row, [field]: value.trim() } : row));
      } else {
        const nextRow = {
          tingkatan,
          tahapan,
          sks: field === "sks" ? value.trim() : "-",
          nilai: field === "nilai" ? value.trim() : "-",
        };
        persist([...rows, nextRow]);
      }
      setValue("");
      setShowAdd(false);
      showToast({
        type: "success",
        message: field === "sks" ? "Data SKS berhasil disimpan." : "Data Nilai berhasil disimpan.",
      });
    } catch {
      showToast({
        type: "error",
        message: field === "sks" ? "Data SKS gagal disimpan." : "Data Nilai gagal disimpan.",
      });
    }
  };

  return (
    <>
      <Toast toast={toast} />
      <Title title={title} description={description} />
      <Card className="p-5">
        <div className="mb-5 flex justify-end">
          <button type="button" onClick={() => setShowAdd((v) => !v)} className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white">{showAdd ? "Batal" : `Tambah ${field === "sks" ? "SKS" : "Nilai"}`}</button>
        </div>
        {showAdd && (
          <div className="mb-6 rounded-xl border border-gray-200 p-5 dark:border-gray-800">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <label className="block"><span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Tingkatan Lomba</span><DropdownSelect value={tingkatan} onChange={setTingkatan} options={LEVELS.map((x) => ({ value: x, label: x }))} /></label>
              <label className="block"><span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Tahapan</span><DropdownSelect value={tahapan} onChange={setTahapan} options={STAGES.map((x) => ({ value: x, label: x }))} /></label>
              <label className="block"><span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">{field === "sks" ? "Rentang SKS" : "Huruf Nilai"}</span><input value={value} onChange={(e)=>setValue(e.target.value)} placeholder={field === "sks" ? "Contoh: 4–6" : "Contoh: A"} className="h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300" /></label>
            </div>
            <button type="button" onClick={add} className="mt-4 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white">Simpan</button>
          </div>
        )}
        <div className="overflow-x-auto no-scrollbar">
          <table className="simpresma-table w-full min-w-[980px]">
            <thead><tr className="border-b border-gray-200 dark:border-gray-800">{['Tingkatan Lomba', 'Tahapan', field === "sks" ? 'Rentang SKS' : 'Huruf Nilai', 'Aksi'].map((h) => <th key={h} className="pb-3 text-left text-xs font-medium text-gray-500">{h}</th>)}</tr></thead>
            <tbody>{paginatedRows.map((row, pageIndex) => { const index = (currentPage - 1) * pageSize + pageIndex; return <tr key={`${row.tingkatan}-${row.tahapan}`} className="border-b border-gray-200 dark:border-gray-800"><td className="py-3 text-sm text-gray-700 dark:text-gray-300">{row.tingkatan}</td><td className="py-3 text-sm text-gray-700 dark:text-gray-300">{row.tahapan}</td><td className="py-3 text-sm font-medium text-gray-800 dark:text-white/90">{row[field]}</td><td className="py-3"><div className="flex gap-4">
                <button type="button" onClick={() => openEdit(index)} className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600">Edit</button>
                <button type="button" onClick={() => setDeleteIndex(index)} className="rounded-lg bg-error-500 px-3 py-2 text-sm font-medium text-white hover:bg-error-600">Hapus</button>
            </div></td></tr>; })}</tbody>
          </table>
          <TablePagination currentPage={currentPage} totalItems={rows.length} pageSize={pageSize} onPageChange={setCurrentPage} />
        </div>
        <p className="mt-4 text-xs text-gray-500">Master data ini dikelola Verifikator. Wadek dan Kaprodi hanya dapat melihatnya (Read-Only).</p>
      </Card>

      {editIndex !== null && (
        <ActionModal
          title={`Edit ${field === "sks" ? "Rentang SKS" : "Huruf Nilai"}`}
          description={`Perbarui ${field === "sks" ? "rentang SKS" : "huruf nilai"} untuk data yang dipilih.`}
          value={editValue}
          onChange={setEditValue}
          onCancel={() => setEditIndex(null)}
          onSubmit={saveEdit}
          submitLabel="Simpan Perubahan"
        />
      )}

      {deleteIndex !== null && (
        <DeleteModal
          onCancel={() => setDeleteIndex(null)}
          onConfirm={() => remove(deleteIndex)}
        />
      )}
    </>
  );
}

export function VerifikatorMatriksSKS() { return <MatrixEditor field="sks" title="Master Data SKS" description="Tambah, ubah, hapus, dan lihat aturan SKS berdasarkan kombinasi Tingkatan Lomba dan Tahapan." />; }
export function VerifikatorMatriksNilai() { return <MatrixEditor field="nilai" title="Master Data Nilai" description="Tambah, ubah, hapus, dan lihat huruf Nilai berdasarkan kombinasi Tingkatan Lomba dan Tahapan." />; }
