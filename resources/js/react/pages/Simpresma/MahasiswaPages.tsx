import React, { useEffect, useMemo, useRef, useState } from "react";
import DropdownSelect from "../../components/form/DropdownSelect";
import api, { getToken } from "../../services/api";
import { loadProfileForRole, saveProfileForRole } from "./SimpresmaMockAccess";
import {
  Card,
  PrestasiTable,
  SearchFilter,
  Title,
  Input,
  usePrestasi,
  FlashMessage,
  PdfPreviewModal,
  Prestasi,
  prodiOptions,
} from "./SimpresmaShared";
import { loadBidangMapping } from "./SimpresmaMatrix";

interface DownloadablePrestasi {
  mahasiswa: string;
  nim: string;
  prodi: string;
  lomba: string;
  mataKuliah?: string[];
  nilai?: string[];
  status?: string;
  skUploaded?: boolean;
  skUrl?: string;
  skFileName?: string;
}

function downloadMockSK(row: DownloadablePrestasi) {
  if (row.skUrl && (row.skUrl.startsWith("blob:") || row.skUrl.startsWith("/storage/") || row.skUrl.startsWith("data:application/pdf"))) {
    const a = document.createElement("a");
    a.href = row.skUrl;
    a.download = row.skFileName || `SK_${row.nim}.pdf`;
    a.click();
    return;
  }

  const lines = [
    "SURAT KEPUTUSAN KONVERSI PRESTASI MAHASISWA",
    `Nama: ${row.mahasiswa}`,
    `NIM: ${row.nim}`,
    `Program Studi: ${row.prodi}`,
    `Prestasi: ${row.lomba}`,
    `Mata Kuliah: ${(row.mataKuliah ?? []).join(", ")}`,
    `Nilai: ${(row.nilai ?? []).join(", ")}`,
    "Dokumen Resmi SIMPRESMA FASILKOM UNEJ.",
  ];
  const sanitize = (text: string) =>
    text.replace(/[^\x20-\x7E]/g, "-").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = ["BT", "/F1 11 Tf", "50 760 Td", ...lines.map((line, i) => `${i ? "0 -24 Td " : ""}(${sanitize(line)}) Tj`), "ET"].join("\n");
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj\n",
    "4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n",
    `5 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj\n`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(pdf.length);
    pdf += obj;
  }
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = row.skFileName || `SK_${row.nim}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

const COURSE_CREDITS: Record<string, number> = {
  "Frontend Development": 3,
  "UI/UX Design": 3,
  "Pengembangan Aplikasi": 2,
  "Analisis dan Perancangan Sistem": 2,
  "Manajemen Proyek": 3,
  "Sistem Informasi Manajemen": 3,
};

function getCourseCredits(course: string) {
  return COURSE_CREDITS[course] ?? 3;
}

function getSksRange(value?: string) {
  const numbers = (value ?? "").match(/\d+/g)?.map(Number) ?? [];
  if (!numbers.length) return { min: 0, max: 0 };
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
  return { min: numbers[0], max: numbers[1] };
}

export function MahasiswaRiwayat() {
  const { data, update } = usePrestasi();
  const studentProfile = loadProfileForRole("Mahasiswa");
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedMatkul, setSelectedMatkul] = useState<string[]>([]);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [previewContextRow, setPreviewContextRow] = useState<Prestasi | undefined>(undefined);

  useEffect(() => {
    const raw = localStorage.getItem("simpresma_flash");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      if (parsed?.message) setFlash(parsed);
    } catch {
      // Ignored non-json flash storage
    }
    localStorage.removeItem("simpresma_flash");
  }, []);

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    window.setTimeout(() => setFlash(null), 3200);
  };

  const allRows = useMemo(
    () =>
      data.filter(
        (r) =>
          r.mahasiswa === "Chelsea Brilliant Syah Putra" ||
          (studentProfile.name && r.mahasiswa === studentProfile.name) ||
          (studentProfile.nim_nip && r.nim === studentProfile.nim_nip)
      ),
    [data, studentProfile.name, studentProfile.nim_nip]
  );

  const rows = useMemo(() => {
    let result = allRows;
    if (q) result = result.filter((r) => `${r.lomba} ${r.status}`.toLowerCase().includes(q.toLowerCase()));
    if (filter === "Perlu tindakan") result = result.filter((r) => r.status === "Diterima");
    if (filter === "Diproses") result = result.filter((r) => r.status === "Pending");
    if (filter === "Disetujui") result = result.filter((r) => r.status === "Diterima");
    if (filter === "Selesai") result = result.filter((r) => r.status === "Terkonversi" && r.skUploaded);
    if (filter === "Ditolak") result = result.filter((r) => r.status === "Ditolak");
    return result;
  }, [allRows, q, filter]);

  const counts = {
    semua: allRows.length,
    perlu: allRows.filter((r) => r.status === "Diterima").length,
    diproses: allRows.filter((r) => r.status === "Pending").length,
    disetujui: allRows.filter((r) => r.status === "Diterima").length,
    selesai: allRows.filter((r) => r.status === "Terkonversi" && r.skUploaded).length,
    ditolak: allRows.filter((r) => r.status === "Ditolak").length,
  };

  const selectedRow = data.find((r) => r.id === selected);
  const mapping = loadBidangMapping();
  const available = selectedRow ? mapping[selectedRow.bidang] ?? [] : [];
  const selectedTotalSks = selectedMatkul.reduce((total, course) => total + getCourseCredits(course), 0);
  const selectedRange = getSksRange(selectedRow?.sks);
  const remainingSks = Math.max(0, selectedRange.max - selectedTotalSks);
  const actionFor = (r: { status: string; skUploaded?: boolean }) => {
    if (r.status === "Diterima") return "Pilih Matkul";
    if (r.status === "Terkonversi" && r.skUploaded) return "Unduh SK";
    return "Lihat Detail";
  };

  const openPreview = (docName: string, rowCtx?: Prestasi) => {
    setPreviewContextRow(rowCtx);
    setPreviewDoc(docName);
  };

  return (
    <>
      {flash && <FlashMessage type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
      <Title title="Riwayat Prestasi" description="Lihat seluruh pengajuan dan pilih mata kuliah konversi setelah pengajuan disetujui." />

      <Card className="mb-4 p-5">
        <h3 className="text-base font-semibold text-gray-800 dark:text-white/90">
          Cara membaca status pengajuan
        </h3>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              1
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Disetujui</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Klik tombol Pilih Matkul untuk memilih mata kuliah konversi.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              2
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Menunggu SK</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tendik sedang menerbitkan SK. Anda akan diberi informasi melalui Telegram.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
              3
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-white/90">Selesai</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                SK sudah terbit. Klik tombol Preview SK atau Unduh SK untuk mengunduh.
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="mb-4">
        <SearchFilter value={q} onChange={setQ} />
      </div>

      <Card className="mb-4 max-w-max p-2">
        <div className="flex flex-wrap items-center gap-2 justify-start">
          {[['Semua', counts.semua], ['Perlu tindakan', counts.perlu], ['Diproses', counts.diproses], ['Disetujui', counts.disetujui], ['Selesai', counts.selesai], ['Ditolak', counts.ditolak]].map(([label, count]) => (
            <button key={label as string} type="button" onClick={() => setFilter(label as string)} className={`rounded-lg px-4 py-2.5 text-sm font-medium transition ${filter === label ? "bg-brand-500 text-white shadow-theme-sm" : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}>
              {label as string} <span className="ml-1 text-xs opacity-80">{count as number}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-5">
        <PrestasiTable
          hideStudentColumns
          data={rows}
          action={(r) => (
            <div className="flex items-center gap-2">
              {r.status === "Terkonversi" && r.skUploaded && (
                <button
                  type="button"
                  onClick={() => openPreview(r.skFileName || `SK_${r.nim}.pdf`, r)}
                  className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm font-medium text-brand-600 hover:bg-brand-100 dark:border-brand-700 dark:bg-brand-500/10 dark:text-brand-400"
                >
                  Preview SK
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (r.status === "Terkonversi" && r.skUploaded) {
                    downloadMockSK(r);
                    return;
                  }
                  setSelected(r.id);
                  setSelectedMatkul(r.mataKuliah ?? []);
                }}
                className={`text-sm font-medium ${
                  r.status === "Diterima"
                    ? "rounded-lg bg-brand-500 px-3 py-2 text-white hover:bg-brand-600"
                    : r.status === "Terkonversi" && r.skUploaded
                    ? "rounded-lg bg-success-500 px-3 py-2 text-white hover:bg-success-600"
                    : "rounded-lg bg-warning-400 px-3 py-2 text-white hover:bg-warning-500"
                }`}
              >
                {actionFor(r)}
              </button>
            </div>
          )}
        />
        {rows.length === 0 && <div className="p-8 text-center text-sm text-gray-500">Tidak ada pengajuan pada filter ini.</div>}
      </Card>

      {selectedRow && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/45 p-4 backdrop-blur-sm"><div className="my-auto max-h-[calc(100dvh-2rem)] min-w-0 w-full max-w-3xl overflow-y-auto no-scrollbar rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-6"><div className="mb-5 flex items-start justify-between border-b border-gray-200 px-0 pb-4 pt-0 dark:border-gray-700"><div><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{selectedRow.status === "Diterima" ? "Pilih Mata Kuliah" : "Detail Pengajuan"}</h2><p className="mt-1 text-sm text-gray-500">{selectedRow.mahasiswa} • {selectedRow.lomba}</p></div><button type="button" onClick={()=>setSelected(null)} className="text-xl text-gray-400">×</button></div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"><Input label="Program Studi" value={selectedRow.prodi} readOnly /><Input label="Bidang" value={selectedRow.bidang} readOnly /><Input label="Tingkatan" value={selectedRow.tingkatan} readOnly /><Input label="Tahapan" value={selectedRow.tahapan} readOnly /></div>
        {selectedRow.dokumen?.length ? (
          <div className="mt-6">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dokumen Pendukung (Klik untuk Preview PDF)</p>
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              {selectedRow.dokumen.map((doc, i) => (
                <button
                  key={`${doc}-${i}`}
                  type="button"
                  onClick={() => openPreview(doc, selectedRow)}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm transition hover:border-brand-400 dark:border-gray-700"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded bg-error-50 px-2 py-1 text-xs font-bold text-error-600">Pdf</span>
                    <span className="truncate text-gray-700 dark:text-gray-200">{doc}</span>
                  </span>
                  <span className="ml-2 shrink-0 text-xs font-semibold text-brand-500">Preview</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
        {selectedRow.status === "Diterima" && <>
          <div className="mt-6 rounded-lg bg-brand-50 p-4 text-sm text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <p className="font-semibold">{selectedRow.lomba}</p>
            <p className="mt-1">Bidang {selectedRow.bidang} · Program Studi {selectedRow.prodi} · Nilai {selectedRow.nilai?.join(", ") || "-"}</p>
            <p className="mt-3">Pilih satu atau lebih mata kuliah dengan total SKS sesuai rentang {selectedRow.sks || "-"}.</p>
          </div>
          <div className="mt-5 flex items-center justify-between text-sm font-semibold text-gray-800 dark:text-white/90">
            <span>Total dipilih</span>
            <span>{selectedTotalSks} / {selectedRange.max || "-"} SKS</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
            <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${selectedRange.max ? Math.min(100, (selectedTotalSks / selectedRange.max) * 100) : 0}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-xs text-gray-500">
            <span>Minimal {selectedRange.min || 0} SKS</span>
            <span>Sisa {remainingSks} SKS</span>
          </div>
          <div className="mt-5 space-y-2">
            {available.length ? available.map((m)=>(
              <label key={m} className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-sm transition hover:border-brand-300 dark:border-gray-800">
                <input type="checkbox" checked={selectedMatkul.includes(m)} onChange={(e)=>setSelectedMatkul((prev)=>e.target.checked?[...prev,m]:prev.filter((x)=>x!==m))} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-gray-800 dark:text-white/90">{m}</span>
                  <span className="text-xs text-gray-500">Mata kuliah konversi</span>
                </span>
                <span className="font-semibold text-gray-800 dark:text-white/90">{getCourseCredits(m)} SKS</span>
              </label>
            )) : <p className="text-sm text-gray-500">Belum ada pemetaan mata kuliah untuk Bidang ini.</p>}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={()=>setSelected(null)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Batal</button>
            <button type="button" onClick={()=>{
              if(!selectedMatkul.length){showFlash("error","Pilih minimal satu mata kuliah.");return;}
              if(selectedTotalSks < selectedRange.min || selectedTotalSks > selectedRange.max){showFlash("error",`Total SKS harus berada pada rentang ${selectedRow.sks}.`);return;}
              update(selectedRow.id,{mataKuliah:selectedMatkul,status:"Terkonversi",sks:String(selectedTotalSks)});
              setSelected(null);
              showFlash("success","Pilihan mata kuliah berhasil disimpan. Menunggu penerbitan SK.");
            }} className="rounded-lg bg-success-500 px-5 py-2.5 text-sm font-medium text-white">Simpan Pilihan</button>
          </div>
        </>}
        {selectedRow.status === "Terkonversi" && <div className="mt-6 rounded-lg bg-success-50 p-4 text-sm text-success-700">
          <p className="font-semibold">Hasil Konversi</p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <p>Mata Kuliah: <span className="font-semibold">{selectedRow.mataKuliah?.join(", ") || "-"}</span></p>
            <p>SKS Didapat: <span className="font-semibold">{selectedRow.sks || "-"} SKS</span></p>
            <p>Nilai: <span className="font-semibold">{selectedRow.nilai?.join(", ") || "-"}</span></p>
            <p>Status SK: <span className="font-semibold">{selectedRow.skUploaded ? "SK Final Tersedia" : "Menunggu SK"}</span></p>
          </div>
        </div>}
        {selectedRow.status === "Ditolak" && selectedRow.feedback && <div className="mt-6 rounded-lg bg-error-50 p-4 text-sm text-error-700">Catatan Verifikator: {selectedRow.feedback}</div>}
      </div></div>}
      <PdfPreviewModal
        docName={previewDoc}
        row={previewContextRow || selectedRow}
        onClose={() => setPreviewDoc(null)}
      />
    </>
  );
}

export function MahasiswaProfil() {
  return <Profile role="Mahasiswa" editable />;
}

async function compressImageToDataUrl(file: File, maxSize = 360): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(String(reader.result || ""));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.86));
      };
      img.onerror = () => resolve(String(reader.result || ""));
      img.src = String(reader.result || "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function Profile({
  role,
  editable = true,
}: {
  role: string;
  editable?: boolean;
}) {
  const initialProfile = loadProfileForRole(role);
  const [nama, setNama] = useState(initialProfile.name || "");
  const [nimNip, setNimNip] = useState(initialProfile.nim_nip || "");
  const [email, setEmail] = useState(initialProfile.email || "");
  const [whatsapp, setWhatsapp] = useState(initialProfile.whatsapp || "");
  const [prodi, setProdi] = useState(initialProfile.prodi || "Sistem Informasi");
  const [avatar, setAvatar] = useState(initialProfile.avatar || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [telegramChatId, setTelegramChatId] = useState(initialProfile.telegramChatId || "");
  const [telegramConnected, setTelegramConnected] = useState(Boolean(initialProfile.telegramConnected));
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const sync = () => {
      const latest = loadProfileForRole(role);
      setNama(latest.name || "");
      setNimNip(latest.nim_nip || "");
      setEmail(latest.email || "");
      setWhatsapp(latest.whatsapp || "");
      setProdi(latest.prodi || "Sistem Informasi");
      setAvatar(latest.avatar || "");
      setTelegramConnected(Boolean(latest.telegramConnected));
      setTelegramChatId(latest.telegramChatId || "");
    };
    sync();
    window.addEventListener("simpresma:profile-update", sync);
    return () => window.removeEventListener("simpresma:profile-update", sync);
  }, [role]);

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    window.setTimeout(() => setFlash(null), 3200);
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.currentTarget;
    const file = inputEl.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
      showFlash("error", "Foto profil harus berupa gambar (JPG/PNG/WebP) maksimal 5MB.");
      inputEl.value = "";
      return;
    }

    setSaving(true);
    try {
      const compactDataUrl = await compressImageToDataUrl(file);
      let finalAvatarUrl = compactDataUrl;

      if (getToken()) {
        try {
          const fd = new FormData();
          fd.append("avatar", file);
          const res = await api.auth.updateProfile(fd);
          if (res?.data?.avatar) {
            finalAvatarUrl = res.data.avatar;
          }
        } catch {
          // Keep compressed local Data URL if backend sync unavailable
        }
      }

      setAvatar(finalAvatarUrl);
      saveProfileForRole(role, { avatar: finalAvatarUrl });
      showFlash("success", "Foto profil berhasil diperbarui.");
    } catch {
      showFlash("error", "Gagal memproses foto profil.");
    } finally {
      setSaving(false);
      inputEl.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    setSaving(true);
    try {
      if (getToken()) {
        try {
          const fd = new FormData();
          fd.append("remove_avatar", "1");
          await api.auth.updateProfile(fd);
        } catch {
          // Ignore backend fallback
        }
      }
      setAvatar("");
      saveProfileForRole(role, { removeAvatar: true });
      showFlash("success", "Foto profil berhasil dihapus.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim() || !email.trim()) {
      showFlash("error", "Nama Lengkap dan Email wajib diisi.");
      return;
    }

    setSaving(true);
    try {
      if (getToken()) {
        try {
          const fd = new FormData();
          fd.append("nama", nama.trim());
          fd.append("email", email.trim());
          fd.append("nim_nip", nimNip.trim());
          fd.append("no_whatsapp", whatsapp.trim());
          await api.auth.updateProfile(fd);
        } catch {
          // Local storage sync remains active
        }
      }

      saveProfileForRole(role, {
        name: nama.trim(),
        nim_nip: nimNip.trim(),
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        prodi: prodi as "Sistem Informasi" | "Teknologi Informasi" | "Informatika",
      });
      showFlash("success", "Informasi profil berhasil disimpan.");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showFlash("error", "Password baru minimal 6 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showFlash("error", "Konfirmasi password tidak cocok.");
      return;
    }

    setSaving(true);
    try {
      if (getToken()) {
        const fd = new FormData();
        fd.append("password", newPassword);
        await api.auth.updateProfile(fd);
      }
      setNewPassword("");
      setConfirmPassword("");
      showFlash("success", "Password berhasil diperbarui.");
    } catch {
      showFlash("error", "Gagal memperbarui password.");
    } finally {
      setSaving(false);
    }
  };

  const handleConnectTelegram = async () => {
    if (!/^\d+$/.test(telegramChatId.trim())) {
      showFlash("error", "Chat ID Telegram harus berupa angka valid.");
      return;
    }
    setSaving(true);
    try {
      if (getToken()) {
        try {
          await api.auth.connectTelegram(telegramChatId.trim());
        } catch {
          // Allow local state sync if offline
        }
      }
      setTelegramConnected(true);
      saveProfileForRole(role, { telegramConnected: true, telegramChatId: telegramChatId.trim() });
      showFlash("success", "Bot Telegram berhasil dihubungkan.");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    setSaving(true);
    try {
      if (getToken()) {
        try {
          await api.auth.disconnectTelegram();
        } catch {
          // Allow local fallback
        }
      }
      setTelegramConnected(false);
      setTelegramChatId("");
      saveProfileForRole(role, { telegramConnected: false, telegramChatId: "" });
      showFlash("success", "Koneksi Telegram diputuskan.");
    } finally {
      setSaving(false);
    }
  };

  const initialChar = (nama || role).trim().charAt(0).toUpperCase() || "U";

  return (
    <>
      {flash && <FlashMessage type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
      <Title title="Profil Pengguna" description={`Kelola foto profil, informasi akun, keamanan, dan notifikasi ${role}.`} />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card className="p-6">
          <div className="flex flex-col items-center py-2 text-center">
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-2 border-brand-200 bg-brand-50 dark:border-brand-700 dark:bg-brand-500/15">
              {avatar ? (
                <img src={avatar} alt={`Foto profil ${nama}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-bold text-brand-600 dark:text-brand-400">
                  {initialChar}
                </div>
              )}
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              {nama || role}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">{role}</p>
            <p className="mt-1 text-xs text-gray-400">{email}</p>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handlePhotoChange}
              className="hidden"
              id="profile-avatar-upload"
            />
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => photoInputRef.current?.click()}
                className="min-h-[44px] rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
              >
                Ganti Foto Profil
              </button>
              {avatar && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleRemovePhoto}
                  className="min-h-[44px] rounded-lg border border-error-200 px-4 py-2 text-sm font-medium text-error-600 transition hover:bg-error-50 dark:border-error-800 dark:text-error-400 dark:hover:bg-error-950/30"
                >
                  Hapus Foto
                </button>
              )}
            </div>
            <p className="mt-3 text-xs text-gray-400">Format JPG, PNG, atau WebP (maks. 5MB)</p>
          </div>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Informasi Pribadi</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Pastikan data identitas dan nomor WhatsApp aktif untuk kelancaran proses verifikasi prestasi.
          </p>

          <form onSubmit={handleSaveProfile} className="mt-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Input
                label="Nama Lengkap"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                readOnly={!editable}
              />

              <Input
                label={role === "Mahasiswa" ? "NIM" : "NIP / Identitas"}
                value={nimNip}
                onChange={(e) => setNimNip(e.target.value)}
                readOnly={!editable}
              />

              <Input
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                readOnly={!editable}
              />

              <Input
                label="No. WhatsApp"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="08XXXXXXXXXX"
                readOnly={!editable}
              />

              <div className="md:col-span-2">
                {role === "Wakil Dekan" || role === "Tendik" ? (
                  <Input
                    label="Unit Kerja / Fakultas"
                    value={role === "Wakil Dekan" ? "Lintas Program Studi — FASILKOM UNEJ" : "Fakultas Ilmu Komputer UNEJ"}
                    readOnly
                  />
                ) : (
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Program Studi
                    </span>
                    <DropdownSelect
                      value={prodi}
                      onChange={setProdi}
                      options={prodiOptions.map((item) => ({ value: item, label: item }))}
                    />
                  </label>
                )}
              </div>
            </div>

            {editable && (
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="min-h-[44px] rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            )}
          </form>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Keamanan & Password</h2>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Perbarui password akun SIMPRESMA Anda secara berkala.
          </p>
          <form onSubmit={handleUpdatePassword} className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Password Baru"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimal 6 karakter"
            />
            <Input
              label="Konfirmasi Password Baru"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password baru"
            />
            <div className="md:col-span-2 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="min-h-[44px] rounded-lg border border-brand-500 px-5 py-2.5 text-sm font-medium text-brand-600 transition hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
              >
                Perbarui Password
              </button>
            </div>
          </form>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Notifikasi Telegram</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                telegramConnected
                  ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
              }`}
            >
              {telegramConnected ? "Terhubung" : "Belum Terhubung"}
            </span>
          </div>
          <p className="mt-2 text-xs leading-5 text-gray-500 dark:text-gray-400">
            Hubungkan Chat ID Telegram Anda untuk menerima pembaruan status pengajuan prestasi & SK konversi secara real-time.
          </p>
          <div className="mt-4 space-y-4">
            <Input
              label="Telegram Chat ID"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
              placeholder="Contoh: 123456789"
            />
            {telegramConnected ? (
              <button
                type="button"
                disabled={saving}
                onClick={handleDisconnectTelegram}
                className="min-h-[44px] w-full rounded-lg border border-error-200 px-4 py-2 text-sm font-medium text-error-600 hover:bg-error-50 dark:border-error-800 dark:text-error-400"
              >
                Putuskan Koneksi Telegram
              </button>
            ) : (
              <button
                type="button"
                disabled={saving}
                onClick={handleConnectTelegram}
                className="min-h-[44px] w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
              >
                Hubungkan Telegram
              </button>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
