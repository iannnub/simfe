import React, { useEffect, useState } from "react";
import { loadActiveAccount } from "./SimpresmaMockAccess";
import DropdownSelect from "../../components/form/DropdownSelect";
import { getConversionMatrix, loadBidangMapping, masterCoursesByProdi } from "./SimpresmaMatrix";
import {
  Card,
  Input,
  Prestasi,
  PrestasiTable,
  SearchFilter,
  Textarea,
  Title,
  usePrestasi,
  FlashMessage,
} from "./SimpresmaShared";

function createMockPdfUrl(title: string) {
  const safe = title.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const stream = `BT\n/F1 14 Tf\n50 760 Td\n(${safe}) Tj\n/F1 10 Tf\n0 -28 Td\n(Preview PDF simulasi frontend SIMPRESMA) Tj\nET`;
  const objects = [
    "1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj",
    "2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj",
    "3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>endobj",
    "4 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj",
    `5 0 obj<< /Length ${stream.length} >>stream\n${stream}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n"; const offsets = [0];
  for (const obj of objects) { offsets.push(pdf.length); pdf += obj + "\n"; }
  const xref = pdf.length; pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i++) pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return URL.createObjectURL(new Blob([pdf], { type: "application/pdf" }));
}

function VerificationList({
  mode,
}: {
  mode: "pending" | "repair" | "history" | "all";
}) {
  const { data, update } = usePrestasi();

  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Prestasi | null>(null);
  const [feedback, setFeedback] = useState("");
  const [bidang, setBidang] = useState("");
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (!previewDoc) { setPreviewUrl(null); setPreviewLoading(false); return; }
    setPreviewLoading(true);
    const timer = window.setTimeout(() => {
      const url = createMockPdfUrl(previewDoc);
      setPreviewUrl(url);
      setPreviewLoading(false);
    }, 250);
    return () => {
      window.clearTimeout(timer);
    };
  }, [previewDoc]);

  const activeAccount = loadActiveAccount();
  const scopeProdi = activeAccount?.prodi ?? "Sistem Informasi";

  let rows = data.filter((r) => r.prodi === scopeProdi);

  if (mode === "pending") {
    rows = rows.filter((r) => r.status === "Pending");
  }

  if (mode === "repair") {
    rows = rows.filter((r) => r.status === "Ditolak");
  }

  if (mode === "history") {
    rows = rows.filter((r) => r.status !== "Pending");
  }

  if (mode === "all") {
    rows = rows.filter(
      (r) =>
        r.status === "Diterima" ||
        r.status === "Terkonversi" ||
        r.status === "Ditolak"
    );
  }

  rows = rows.filter((r) =>
    !q ||
    `${r.mahasiswa} ${r.lomba}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    window.setTimeout(() => setFlash(null), 3200);
  };

  const approve = (r: Prestasi) => {
    if (!bidang.trim()) {
      showFlash("error", "Bidang wajib dipilih untuk menyetujui pengajuan.");
      return;
    }

    const matrix = getConversionMatrix(r.tingkatan, r.tahapan);
    setDecisionLoading(true);

    window.setTimeout(() => {
      update(r.id, {
        status: "Diterima",
        bidang,
        sks: matrix?.sks ?? "-",
        nilai: matrix?.nilai && matrix.nilai !== "-" ? [matrix.nilai] : [],
      });
      setDecisionLoading(false);
      setSelected(null);
      showFlash("success", "Pengajuan berhasil disetujui. SKS dan Nilai ditetapkan otomatis berdasarkan matriks konversi.");
    }, 250);
  };

  const reject = (r: Prestasi) => {
    if (!feedback.trim()) {
      showFlash("error", "Feedback wajib diisi.");
      return;
    }

    setDecisionLoading(true);
    window.setTimeout(() => {
      update(r.id, {
        status: "Ditolak",
        feedback: feedback.trim(),
      });
      setDecisionLoading(false);
      setFeedback("");
      setSelected(null);
      showFlash("success", "Pengajuan ditolak dan alasan penolakan dicatat untuk mahasiswa.");
    }, 250);
  };

  return (
    <>
      {flash && <FlashMessage type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
      <Title
        title={
          mode === "pending"
            ? "Menunggu Verifikasi"
            : mode === "repair"
              ? "Perlu Perbaikan"
              : mode === "history"
                ? "Riwayat Verifikasi"
                : "Data Prestasi"
        }
        description={
          mode === "pending"
            ? "Periksa dan verifikasi pengajuan prestasi mahasiswa yang masuk."
            : "Lihat dan kelola data prestasi mahasiswa sesuai scope program studi."
        }
      />

      <div className="mb-4">
        <SearchFilter value={q} onChange={setQ} />
      </div>

      <Card className="p-5">
        <PrestasiTable
          data={rows}
          action={(r) => (
            <button
              onClick={() => { setSelected(r); setBidang(r.bidang === "-" ? "" : r.bidang); setFeedback(""); setPreviewDoc(null); }}
              className={`text-sm font-medium rounded-lg bg-warning-400 px-3 py-2 text-white hover:bg-warning-500`}
            >
              {mode === "pending" ? "Periksa" : "Lihat Detail"}
            </button>
          )}
        />
      </Card>

      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="my-auto max-h-[calc(100dvh-2rem)] min-w-0 w-full max-w-3xl overflow-y-auto no-scrollbar rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-6">
            <div className="mb-5 flex items-start justify-between border-b border-gray-200 px-0 pb-4 pt-0 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">
                  {selected.lomba}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {selected.mahasiswa} • {selected.prodi}
                </p>
              </div>

              <button
                onClick={() => { setSelected(null); setPreviewDoc(null); }}
                className="text-xl text-gray-400"
              >
                ×
              </button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Nama Mahasiswa"
                value={selected.mahasiswa}
                readOnly
              />

              <Input
                label="NIM"
                value={selected.nim}
                readOnly
              />

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">Bidang Lomba</span>
                <DropdownSelect
                value={bidang}
                onChange={setBidang}
                disabled={selected.status !== "Pending"}
                placeholder="Pilih bidang"
                options={[
                  { value: "", label: "Pilih bidang" },
                  ...Object.keys(loadBidangMapping()).map((item) => ({ value: item, label: item })),
                ]}
              />
              </label>

              <Input label="SKS Otomatis" value={getConversionMatrix(selected.tingkatan, selected.tahapan)?.sks || "-"} readOnly />

              <Input label="Nilai Otomatis" value={getConversionMatrix(selected.tingkatan, selected.tahapan)?.nilai || "-"} readOnly />

              <Input
                label="Tingkatan"
                value={selected.tingkatan}
                readOnly
              />

              <Input
                label="Tahapan Saat Ini"
                value={selected.tahapan}
                readOnly
              />

              <Input
                label="Status"
                value={selected.status}
                readOnly
              />
            </div>

            {bidang && (
              <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Daftar Mata Kuliah Konversi</p>
                <p className="mt-1 text-xs text-gray-500">Opsi ditampilkan otomatis berdasarkan Bidang dan Program Studi. Mahasiswa memilih mata kuliah setelah pengajuan disetujui.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(loadBidangMapping()[bidang] || [])
                    .filter((course) => (masterCoursesByProdi[selected.prodi] || []).some((catalog) => catalog.includes(course) || course.includes(catalog)))
                    .map((course) => (
                      <span key={course} className="rounded-full bg-brand-50 px-3 py-1.5 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">{course}</span>
                    ))}
                </div>
              </div>
            )}

            <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dokumen Pendukung</p>
              <p className="mt-1 text-xs text-gray-500">Dokumen PDF dapat dipratinjau langsung tanpa mengunduh. Pada mock frontend, preview menggunakan contoh PDF untuk mensimulasikan Object Storage.</p>
              <div className="mt-3 space-y-2">
                {(selected.dokumen?.length ? selected.dokumen : [
                  "Sertifikat / Bukti Tahapan Saat Ini.pdf",
                  "Surat Tugas Mahasiswa.pdf",
                  "Surat Tugas Dosen Pembimbing.pdf",
                  "Poster Lomba.pdf",
                ]).map((doc) => (
                  <div key={doc} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3 dark:bg-gray-800">
                    <span className="truncate text-sm text-gray-700 dark:text-gray-300">{doc}</span>
                    <button type="button" onClick={() => setPreviewDoc(doc)} className="shrink-0 text-sm font-medium text-brand-500">Preview</button>
                  </div>
                ))}
              </div>
              {previewDoc && (
                <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-3 dark:bg-gray-800">
                    <span className="truncate text-sm font-medium">Preview: {previewDoc}</span>
                    <button type="button" onClick={() => setPreviewDoc(null)} className="text-sm text-gray-500">Tutup</button>
                  </div>
                  {previewLoading ? (
                    <div className="flex h-[420px] flex-col items-center justify-center bg-white text-center dark:bg-gray-900"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#3978e8] border-t-transparent" /><p className="mt-3 text-xs font-semibold text-gray-700 dark:text-gray-200">Memuat halaman...</p><p className="mt-1 text-[10px] text-gray-500">Harap tunggu sebentar</p></div>
                  ) : previewUrl ? (
                    <iframe title={`Preview ${previewDoc}`} src={previewUrl} className="h-[420px] w-full bg-white" />
                  ) : null}
                </div>
              )}
            </div>

            {mode === "pending" && (
              <>
                <div className="mt-6">
                  <Textarea
                    label="Feedback / Alasan Penolakan (wajib jika Tolak)"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                    placeholder="Isi alasan jika pengajuan tidak memenuhi ketentuan."
                  />
                </div>

                {decisionLoading && (
                  <div className="mb-4 rounded-lg bg-brand-50 px-4 py-3 text-sm text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                    <span className="flex flex-col items-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#3978e8] border-t-transparent" /><span className="mt-3 text-xs font-semibold">Memuat halaman...</span><span className="mt-1 text-[10px] text-gray-500">Harap tunggu sebentar</span></span>
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    onClick={() => reject(selected)}
                    className="rounded-lg border border-error-300 px-5 py-2.5 text-sm font-medium text-error-600"
                  >
                    Tolak
                  </button>

                  <button
                    onClick={() => approve(selected)}
                    className="rounded-lg bg-success-500 px-5 py-2.5 text-sm font-medium text-white"
                  >
                    Terima
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export const VerifikatorMenunggu = () => (
  <VerificationList mode="pending" />
);

export const VerifikatorPerbaikan = () => (
  <VerificationList mode="repair" />
);

export const VerifikatorRiwayat = () => (
  <VerificationList mode="history" />
);

export const VerifikatorDataPrestasi = () => (
  <VerificationList mode="all" />
);

export const VerifikatorProfil = () => <div />;
