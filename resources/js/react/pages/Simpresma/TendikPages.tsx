import { useRef, useState } from "react";
import { masterCoursesByProdi } from "./SimpresmaMatrix";
import api, { getToken } from "../../services/api";
import {
  Card,
  Input,
  PdfPreviewBox,
  PrestasiTable,
  saveUploadedDocumentUrl,
  SearchFilter,
  Title,
  usePrestasi,
  FlashMessage,
} from "./SimpresmaShared";

export function TendikDataPrestasi() {
  const { data, update } = usePrestasi();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [skFile, setSkFile] = useState("");
  const [skFileUrl, setSkFileUrl] = useState("");
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const rows = data
    .filter((r) => r.status === "Terkonversi")
    .filter((r) => !q || `${r.mahasiswa} ${r.lomba} ${r.prodi}`.toLowerCase().includes(q.toLowerCase()));

  const row = data.find((r) => r.id === selected);
  const getCourseCode = (courseName: string) => {
    const catalog = masterCoursesByProdi[row?.prodi || ""] || [];
    const match = catalog.find((item) => item === courseName || item.endsWith(` - ${courseName}`));
    if (!match) return "-";
    const separator = match.indexOf(" - ");
    return separator > 0 ? match.slice(0, separator) : "-";
  };

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    window.setTimeout(() => setFlash(null), 3200);
  };

  const uploadSK = () => {
    if (!row) return;
    if (!skFile) {
      showFlash("error", "Pilih berkas SK final terlebih dahulu.");
      return;
    }

    if (getToken() && skFileUrl) {
      const isLocalHost = ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
      const publicUrl =
        skFileUrl.startsWith("/storage/") && !isLocalHost
          ? `${window.location.origin}${skFileUrl}`
          : "https://storage.unej.ac.id/simpresma/sk-final.pdf";
      api.tendik
        .finalisasi(row.id, {
          link_sk_konversi: publicUrl,
          mata_kuliah: [],
        })
        .catch(() => {});
    }

    update(row.id, {
      skUploaded: true,
      skDisahkan: true,
      skFileName: skFile,
      skUrl: skFileUrl || undefined,
    });
    setSelected(null);
    setSkFile("");
    setSkFileUrl("");
    setPreviewDoc(null);
    showFlash("success", "SK final berhasil diunggah.");
  };

  const documents = row
    ? row.dokumen?.length
      ? row.dokumen
      : [
          "Sertifikat / Bukti Tahapan Saat Ini.pdf",
          "Surat Tugas Mahasiswa.pdf",
          "Surat Tugas Dosen Pembimbing.pdf",
          "Poster Lomba.pdf",
        ]
    : [];

  return (
    <>
      {flash && <FlashMessage type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
      <Title title="Pengajuan & Upload SK" description="Tendik melihat detail konversi secara read-only, mempratinjau dokumen PDF, dan mengunggah SK final." />
      <div className="mb-4">
        <SearchFilter value={q} onChange={setQ} />
      </div>
      <Card className="p-5">
        <PrestasiTable
          data={rows}
          action={(r) => (
            <button
              type="button"
              onClick={() => {
                setSelected(r.id);
                setSkFile("");
                setSkFileUrl("");
                setPreviewDoc(null);
              }}
              className="rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
            >
              {r.skUploaded ? "Lihat / SK Terunggah" : "Lihat & Upload SK"}
            </button>
          )}
        />
      </Card>

      {row && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/45 p-4 backdrop-blur-sm">
          <div className="my-auto max-h-[calc(100dvh-2rem)] min-w-0 w-full max-w-3xl overflow-x-hidden overflow-y-auto rounded-xl border border-slate-200 bg-white p-5 no-scrollbar shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-6">
            <div className="mb-5 flex items-start justify-between border-b px-0 pb-4 pt-0 dark:border-gray-700">
              <div>
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Detail Konversi</h2>
                <p className="mt-1 text-sm text-gray-500">{row.mahasiswa} • {row.lomba}</p>
              </div>
              <button type="button" onClick={() => { setSelected(null); setPreviewDoc(null); }} className="text-xl text-gray-400">×</button>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input label="Program Studi" value={row.prodi} readOnly />
              <Input label="Status" value={row.status} readOnly />
              <Input
                label="Tanggal & Waktu Pengajuan"
                value={
                  [...(row.history || [])].reverse().find((item) => item.timestamp)
                    ? `${new Date([...(row.history || [])].reverse().find((item) => item.timestamp)!.timestamp).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}, ${new Date([...(row.history || [])].reverse().find((item) => item.timestamp)!.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })} WIB`
                    : `${row.tanggal} • Waktu belum tercatat`
                }
                readOnly
              />
              <Input label="Bidang" value={row.bidang} readOnly />
              <Input label="Tingkatan" value={row.tingkatan} readOnly />
              <Input label="Tahapan" value={row.tahapan} readOnly />
              <div className="md:col-span-2">
                <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">Mata Kuliah yang Dipilih</p>
                {row.mataKuliah?.length ? (
                  <div className="space-y-2">
                    {row.mataKuliah.map((course) => (
                      <div key={course} className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-3 dark:border-gray-700 sm:grid-cols-3">
                        <Input label="Mata Kuliah" value={course} readOnly />
                        <Input label="Kode Mata Kuliah" value={getCourseCode(course)} readOnly />
                        <Input label="SKS" value={row.sks || "-"} readOnly />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Input label="Mata Kuliah" value="Belum dipilih" readOnly />
                )}
              </div>
              <Input label="Nilai" value={row.nilai?.join(", ") || "-"} readOnly />
            </div>

            <div className="mt-6 rounded-lg border border-gray-200 p-4 dark:border-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Dokumen Pendukung Mahasiswa</p>
              <p className="mt-1 text-xs text-gray-500">Dokumen PDF dapat dipratinjau langsung sebelum penerbitan SK.</p>
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {documents.map((doc) => (
                  <button
                    key={doc}
                    type="button"
                    onClick={() => setPreviewDoc(doc)}
                    className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-4 py-3 text-left transition hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700"
                  >
                    <span className="truncate text-sm text-gray-700 dark:text-gray-300">{doc}</span>
                    <span className="shrink-0 text-xs font-semibold text-brand-500">Preview</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 rounded-lg bg-gray-50 p-4 dark:bg-gray-800">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Hak Akses Tendik</p>
              <p className="mt-1 text-xs text-gray-500">Seluruh data konversi di atas bersifat read-only. Tendik tidak mengubah Bidang, SKS, Nilai, maupun Mata Kuliah.</p>
            </div>

            <div className="mt-6">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">SK Final (PDF)</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={row.skUploaded}
                  onChange={async (e) => {
                    const inputEl = e.currentTarget;
                    const file = inputEl.files?.[0];
                    if (!file) return;
                    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
                    if (!isPdf || file.size > 10 * 1024 * 1024) {
                      showFlash("error", "SK final harus PDF dengan ukuran maksimal 10MB.");
                      inputEl.value = "";
                      setSkFile("");
                      setSkFileUrl("");
                      return;
                    }
                    const persistedUrl = await saveUploadedDocumentUrl(file.name, file);
                    setSkFile(file.name);
                    setSkFileUrl(persistedUrl);
                  }}
                  className="hidden"
                />
                {!row.skUploaded && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50/80 p-4 dark:border-gray-700 dark:bg-gray-800/60">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-300"
                    >
                      <span aria-hidden="true">↑</span> Pilih File PDF
                    </button>
                    <span className="min-w-0 flex-1 break-all text-sm text-gray-600 dark:text-gray-300">
                      {skFile || "Belum ada file dipilih"}
                    </span>
                    {skFile && (
                      <>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc(skFileUrl || skFile)}
                          className="text-sm font-medium text-brand-500 hover:text-brand-600"
                        >
                          Preview SK
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSkFile("");
                            setSkFileUrl("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                          className="text-sm font-medium text-red-500 hover:text-red-600"
                        >
                          Hapus
                        </button>
                      </>
                    )}
                    <p className="w-full text-xs text-gray-500 dark:text-gray-400">Format PDF, ukuran maksimal 10 MB.</p>
                  </div>
                )}
                {row.skUploaded && (
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <div className="flex items-start gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">✓</span>
                      <div>
                        <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">SK berhasil diunggah</p>
                        <p className="mt-1 break-all text-xs text-emerald-700 dark:text-emerald-400">{row.skFileName || "Berkas SK"}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewDoc(row.skFileName || "SK_Konversi_Resmi.pdf")}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      Preview SK Final
                    </button>
                  </div>
                )}
              </label>
            </div>

            {previewDoc && (
              <PdfPreviewBox
                docName={previewDoc}
                row={{
                  ...row,
                  dokumenUrls: {
                    ...(row.dokumenUrls || {}),
                    ...(skFile && skFileUrl ? { [skFile]: skFileUrl } : {}),
                  },
                }}
                onClose={() => setPreviewDoc(null)}
              />
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => { setSelected(null); setPreviewDoc(null); }} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm">Tutup</button>
              {!row.skUploaded && <button type="button" onClick={uploadSK} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white">Upload SK Final</button>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function TendikMonitoring() {
  const { data } = usePrestasi();
  const rows = data.filter((x) => x.status === "Terkonversi");
  return (
    <>
      <Title title="Monitoring Konversi" description="Pemantauan read-only pengajuan yang telah disetujui Verifikator." />
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <Stat label="Menunggu SK" value={rows.filter((x) => !x.skUploaded).length} />
        <Stat label="SK Terunggah" value={rows.filter((x) => x.skUploaded).length} />
        <Stat label="Total Pengajuan" value={rows.length} />
      </div>
      <Card className="p-5"><PrestasiTable data={rows} /></Card>
    </>
  );
}

export function TendikReward() { return null; }

function Stat({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"><p className="text-sm text-gray-500">{label}</p><p className="mt-2 text-2xl font-bold text-gray-800 dark:text-white/90">{value}</p></div>;
}
