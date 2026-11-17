import React, { useMemo, useState } from "react";
import {
  Card,
  PrestasiTable,
  SearchFilter,
  Title,
  Input,
  usePrestasi,
  FlashMessage,
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
}

function downloadMockSK(row: DownloadablePrestasi) {
  const lines = ["SURAT KEPUTUSAN KONVERSI PRESTASI MAHASISWA", `Nama: ${row.mahasiswa}`, `NIM: ${row.nim}`, `Program Studi: ${row.prodi}`, `Prestasi: ${row.lomba}`, `Mata Kuliah: ${(row.mataKuliah ?? []).join(", ")}`, `Nilai: ${(row.nilai ?? []).join(", ")}`, "Dokumen ini merupakan simulasi frontend SIMPRESMA."];
  const escapePdf = (text: string) => text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = ["BT", "/F1 11 Tf", "50 760 Td", ...lines.map((line, i) => `${i ? "0 -24 Td " : ""}(${escapePdf(line)}) Tj`), "ET"].join("\n");
  const objects = ["1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj", "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj", "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj", "4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj", `5 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  for (const obj of objects) { offsets.push(pdf.length); pdf += obj + "\n"; }
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const url = URL.createObjectURL(new Blob([pdf], { type: "application/pdf" })); const a = document.createElement("a"); a.href = url; a.download = `SK_${row.nim}.pdf`; a.click(); URL.revokeObjectURL(url);
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
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("Semua");
  const [selected, setSelected] = useState<number | null>(null);
  const [selectedMatkul, setSelectedMatkul] = useState<string[]>([]);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);

  React.useEffect(() => {
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

  const rows = useMemo(() => {
    let result = data.filter((r) => r.mahasiswa === "Chelsea Brilliant Syah Putra");
    if (q) result = result.filter((r) => `${r.lomba} ${r.status}`.toLowerCase().includes(q.toLowerCase()));
    if (filter === "Perlu tindakan") result = result.filter((r) => r.status === "Diterima");
    if (filter === "Diproses") result = result.filter((r) => r.status === "Pending");
    if (filter === "Disetujui") result = result.filter((r) => r.status === "Diterima");
    if (filter === "Selesai") result = result.filter((r) => r.status === "Terkonversi" && r.skUploaded);
    if (filter === "Ditolak") result = result.filter((r) => r.status === "Ditolak");
    return result;
  }, [data, q, filter]);

  const allRows = data.filter((r) => r.mahasiswa === "Chelsea Brilliant Syah Putra");
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
                SK sudah terbit. Klik tombol Unduh SK untuk mengunduh.
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
        <PrestasiTable hideStudentColumns data={rows} action={(r) => <button onClick={() => {
          if (r.status === "Terkonversi" && r.skUploaded) { downloadMockSK(r); return; }
          setSelected(r.id); setSelectedMatkul(r.mataKuliah ?? []);
        }} className={`text-sm font-medium ${r.status === "Diterima" ? "rounded-lg bg-brand-500 px-3 py-2 text-white hover:bg-brand-600" : r.status === "Terkonversi" && r.skUploaded ? "rounded-lg bg-success-500 px-3 py-2 text-white hover:bg-success-600" : "rounded-lg bg-warning-400 px-3 py-2 text-white hover:bg-warning-500" }`}>{actionFor(r)}</button>} />
        {rows.length === 0 && <div className="p-8 text-center text-sm text-gray-500">Tidak ada pengajuan pada filter ini.</div>}
      </Card>

      {selectedRow && <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/45 p-4 backdrop-blur-sm"><div className="my-auto max-h-[calc(100dvh-2rem)] min-w-0 w-full max-w-3xl overflow-y-auto no-scrollbar rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-6"><div className="mb-5 flex items-start justify-between border-b border-gray-200 px-0 pb-4 pt-0 dark:border-gray-700"><div><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">{selectedRow.status === "Diterima" ? "Pilih Mata Kuliah" : "Detail Pengajuan"}</h2><p className="mt-1 text-sm text-gray-500">{selectedRow.mahasiswa} • {selectedRow.lomba}</p></div><button onClick={()=>setSelected(null)} className="text-xl text-gray-400">×</button></div>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2"><Input label="Program Studi" value={selectedRow.prodi} readOnly /><Input label="Bidang" value={selectedRow.bidang} readOnly /><Input label="Tingkatan" value={selectedRow.tingkatan} readOnly /><Input label="Tahapan" value={selectedRow.tahapan} readOnly /></div>
        {selectedRow.dokumen?.length ? <div className="mt-6"><p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dokumen</p><div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">{selectedRow.dokumen.map((doc, i)=><button key={`${doc}-${i}`} type="button" onClick={()=>setPreviewDoc("data:application/pdf,"+encodeURIComponent("Preview PDF simulasi frontend SIMPRESMA\n"+doc))} className="rounded-lg border border-gray-200 px-4 py-3 text-left text-sm dark:border-gray-700"><span className="mr-2 rounded bg-error-50 px-2 py-1 text-xs font-bold text-error-600">Pdf</span>{doc}</button>)}</div></div> : null}
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
            <button onClick={()=>setSelected(null)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">Batal</button>
            <button onClick={()=>{
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
      {previewDoc && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/70 dark:border-gray-700 dark:bg-gray-900 dark:ring-gray-700"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800"><h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Preview Dokumen</h3><button onClick={()=>setPreviewDoc(null)} className="text-xl text-gray-400">×</button></div><iframe title="Preview" src={previewDoc} className="h-[calc(85vh-57px)] w-full" /></div></div>}
    </>
  );
}

export function MahasiswaProfil() {
  return <Profile role="Mahasiswa" />;
}

export function Profile({
  role,
  editable = false,
}: {
  role: string;
  editable?: boolean;
}) {
  return (
    <>
      <Title
        title="Profil"
        description={`Informasi akun ${role}.`}
      />

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <Card>
          <div className="flex flex-col items-center py-4">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-brand-50 text-3xl font-semibold text-brand-500">
              C
            </div>

            <h2 className="mt-4 text-lg font-semibold text-gray-800 dark:text-white/90">
              {role === "Mahasiswa"
                ? "Chelsea Brilliant Syah Putra"
                : role}
            </h2>

            <p className="text-sm text-gray-500">
              {role}
            </p>
          </div>
        </Card>

        <Card className="p-6 xl:col-span-2">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Informasi Pribadi
          </h2>

          <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <Input
              label="Nama Lengkap"
              value={
                role === "Mahasiswa"
                  ? "Chelsea Brilliant Syah Putra"
                  : role
              }
              readOnly={!editable}
            />

            <Input
              label={
                role === "Mahasiswa"
                  ? "NIM"
                  : "ID/Identitas"
              }
              value={
                role === "Mahasiswa"
                  ? "242410101079"
                  : "-"
              }
              readOnly={!editable}
            />

            <Input
              label="Email"
              value={
                role === "Mahasiswa"
                  ? "mahasiswa@example.com"
                  : "user@simpresma.ac.id"
              }
              readOnly={!editable}
            />

            <Input
              label="No. WhatsApp"
              value="081234567890"
              readOnly={!editable}
            />

            <div className="md:col-span-2">
              <Input
                label="Program Studi"
                value={
                  role === "Mahasiswa"
                    ? "Sistem Informasi"
                    : role === "Verifikator" || role === "Kaprodi"
                    ? "Sistem Informasi"
                    : role === "Wakil Dekan"
                    ? "Lintas Program Studi"
                    : "Fakultas Teknologi Informasi"
                }
                readOnly={!editable}
              />
            </div>
          </div>

        </Card>
      </div>
    </>
  );
}
