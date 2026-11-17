import React, { useEffect, useState } from "react";
import DropdownSelect from "../../components/form/DropdownSelect";
import { useNavigate } from "react-router";
import api, { getToken } from "../../services/api";
import { loadActiveAccount } from "./SimpresmaMockAccess";
import {
  AlertIcon,
  AngleLeftIcon,
  AngleRightIcon,
  CheckCircleIcon,
  DownloadIcon,
  EyeIcon,
  FileIcon,
  GridIcon,
  GroupIcon,
  TimeIcon,
  UserIcon,
} from "../../icons";

export type Status =
  | "Pending"
  | "Diterima"
  | "Ditolak"
  | "Terkonversi";

export type Prestasi = {
  id: number;
  mahasiswa: string;
  nim: string;
  prodi:
    | "Sistem Informasi"
    | "Teknologi Informasi"
    | "Informatika";
  lomba: string;
  bidang: string;
  tingkatan: string;
  tahapan: string;
  jenis: "Individu" | "Kelompok";
  status: Status;
  tanggal: string;
  feedback?: string;
  history?: { status: Status; timestamp: string; feedback?: string }[];
  skDisahkan?: boolean;
  skUploaded?: boolean;
  skFileName?: string;
  dokumen?: string[];
  mataKuliah?: string[];
  nilai?: string[];
  sks?: string;
};

export const defaultPrestasi: Prestasi[] = [
  {
    id: 1,
    mahasiswa: "Chelsea Brilliant Syah Putra",
    nim: "242410101079",
    prodi: "Sistem Informasi",
    lomba: "Gemastik",
    bidang: "Komputasi",
    tingkatan: "Nasional Kementerian",
    tahapan:
      "Pemenang (Juara 1/2/3/Honorable Mention)",
    jenis: "Individu",
    status: "Pending",
    tanggal: "10 Agustus 2026",
  },

  {
    id: 2,
    mahasiswa: "Andi Setiawan",
    nim: "242410101055",
    prodi: "Teknologi Informasi",
    lomba: "Program Kreativitas Mahasiswa",
    bidang: "Pembelajaran",
    tingkatan: "Nasional Kementerian",
    tahapan: "Lolos Tahap Awal",
    jenis: "Kelompok",
    status: "Diterima",
    tanggal: "8 Agustus 2026",
    mataKuliah: [
      "Pengembangan Aplikasi",
      "Manajemen Proyek",
    ],
    nilai: ["A"],
    sks: "4–6",
  },

  {
    id: 3,
    mahasiswa: "Rina Wulandari",
    nim: "242410101032",
    prodi: "Informatika",
    lomba: "Kompetisi Inovasi Mahasiswa",
    bidang: "Kewirausahaan",
    tingkatan: "Wilayah-Regional-Provinsi",
    tahapan:
      "Pemenang (Juara 1/2/3/Honorable Mention)",
    jenis: "Kelompok",
    status: "Ditolak",
    tanggal: "5 Agustus 2026",
    feedback:
      "Dokumen pendukung yang diunggah belum sesuai dengan ketentuan.",
  },

  {
    id: 4,
    mahasiswa: "Budi Pratama",
    nim: "242410101021",
    prodi: "Sistem Informasi",
    lomba: "UI/UX Design Competition",
    bidang: "Seni",
    tingkatan: "Nasional Non Kementerian-Mandiri",
    tahapan: "Finalis",
    jenis: "Individu",
    status: "Terkonversi",
    tanggal: "1 Agustus 2026",
    mataKuliah: ["UI/UX Design"],
    nilai: ["A"],
    sks: "4–6",
  },
];

const sprint2DemoPrestasi: Prestasi[] = [
  {
    id: 5,
    mahasiswa: "Siti Aulia Rahma",
    nim: "242410101088",
    prodi: "Teknologi Informasi",
    lomba: "Gemastik XVI - Pengembangan Perangkat Lunak",
    bidang: "-",
    tingkatan: "Nasional Kementerian (Gemastik, LIDM, Satria Data, NUDC, KDMI, MTQMN)",
    tahapan: "Pemenang (Juara 1/2/3/Honorable Mention)",
    jenis: "Kelompok",
    status: "Pending",
    tanggal: "29 September 2026",
    dokumen: [
      "Sertifikat_Bukti_Tahapan.pdf",
      "Surat_Tugas_Mahasiswa.pdf",
      "Surat_Tugas_Dosen_Pembimbing.pdf",
      "Poster_Lomba.pdf",
    ],
  },
  {
    id: 6,
    mahasiswa: "Fajar Ramadhan",
    nim: "242410101091",
    prodi: "Informatika",
    lomba: "Kompetisi Inovasi Teknologi Mahasiswa",
    bidang: "-",
    tingkatan: "Wilayah-Regional-Provinsi",
    tahapan: "Finalis",
    jenis: "Individu",
    status: "Pending",
    tanggal: "29 September 2026",
    dokumen: [
      "Sertifikat_Bukti_Tahapan.pdf",
      "Poster_Lomba.pdf",
    ],
  },
  {
    id: 7,
    mahasiswa: "Nabila Putri Maharani",
    nim: "242410101095",
    prodi: "Sistem Informasi",
    lomba: "Kompetisi UI/UX Digital Nasional",
    bidang: "-",
    tingkatan: "Nasional Non Kementerian-Mandiri",
    tahapan: "Pemenang (Juara 1/2/3/Honorable Mention)",
    jenis: "Individu",
    status: "Pending",
    tanggal: "29 September 2026",
    dokumen: [
      "Sertifikat_Bukti_Tahapan.pdf",
      "Poster_Lomba.pdf",
    ],
  },
];

const studentDemoPrestasi: Prestasi[] = [
  {
    id: 101,
    mahasiswa: "Chelsea Brilliant Syah Putra",
    nim: "242410101079",
    prodi: "Sistem Informasi",
    lomba: "UI/UX Design Competition Nasional",
    bidang: "Seni",
    tingkatan: "Nasional Non Kementerian-Mandiri",
    tahapan: "Lolos Tahap Awal",
    jenis: "Individu",
    status: "Pending",
    tanggal: "1 Oktober 2026",
    dokumen: ["Sertifikat_Bukti_Tahapan.pdf", "Poster_Lomba.pdf"],
  },
  {
    id: 102,
    mahasiswa: "Chelsea Brilliant Syah Putra",
    nim: "242410101079",
    prodi: "Sistem Informasi",
    lomba: "Kompetisi Inovasi Mahasiswa Wilayah",
    bidang: "Kewirausahaan",
    tingkatan: "Wilayah-Regional-Provinsi",
    tahapan: "Finalis",
    jenis: "Individu",
    status: "Pending",
    tanggal: "30 September 2026",
    dokumen: ["Sertifikat_Bukti_Tahapan.pdf", "Poster_Lomba.pdf"],
  },
  {
    id: 103,
    mahasiswa: "Chelsea Brilliant Syah Putra",
    nim: "242410101079",
    prodi: "Sistem Informasi",
    lomba: "PKM-KC 2026 — Kewirausahaan Cerdas",
    bidang: "Pembelajaran",
    tingkatan: "Nasional Kementerian (PKM, P2MW, PPK Ormawa, Pilmapres, Peksiminas)",
    tahapan: "Pemenang (Juara 1/2/3/Honorable Mention)",
    jenis: "Individu",
    status: "Diterima",
    tanggal: "2 September 2026",
    nilai: ["A"],
    sks: "4–6",
    dokumen: ["Sertifikat_Bukti_Tahapan.pdf", "Poster_Lomba.pdf"],
  },
  {
    id: 104,
    mahasiswa: "Chelsea Brilliant Syah Putra",
    nim: "242410101079",
    prodi: "Sistem Informasi",
    lomba: "Lomba UI/UX Nasional",
    bidang: "Komputasi",
    tingkatan: "Nasional Non Kementerian-Mandiri",
    tahapan: "Pemenang (Juara 1/2/3/Honorable Mention)",
    jenis: "Individu",
    status: "Diterima",
    tanggal: "20 Agustus 2026",
    nilai: ["A"],
    sks: "4",
    dokumen: ["Sertifikat_Bukti_Tahapan.pdf", "Poster_Lomba.pdf"],
  },
  {
    id: 105,
    mahasiswa: "Chelsea Brilliant Syah Putra",
    nim: "242410101079",
    prodi: "Sistem Informasi",
    lomba: "Gemastik XVII — Pengembangan Perangkat Lunak",
    bidang: "Komputasi",
    tingkatan: "Nasional Kementerian (Gemastik, LIDM, Satria Data, NUDC, KDMI, MTQMN)",
    tahapan: "Finalis",
    jenis: "Kelompok",
    status: "Terkonversi",
    tanggal: "28 September 2026",
    mataKuliah: ["Frontend Development", "Pengembangan Aplikasi"],
    nilai: ["AB"],
    sks: "6",
    skUploaded: true,
    skFileName: "SK_Konversi_Gemastik_XVII.pdf",
    dokumen: ["Sertifikat_Bukti_Tahapan.pdf", "Surat_Tugas_Mahasiswa.pdf", "Surat_Tugas_Dosen_Pembimbing.pdf", "Poster_Lomba.pdf"],
  },
  {
    id: 106,
    mahasiswa: "Chelsea Brilliant Syah Putra",
    nim: "242410101079",
    prodi: "Sistem Informasi",
    lomba: "Lomba Karya Tulis Ilmiah Jawa Timur",
    bidang: "Penalaran",
    tingkatan: "Wilayah-Regional-Provinsi",
    tahapan: "Pemenang (Juara 1/2/3/Honorable Mention)",
    jenis: "Individu",
    status: "Ditolak",
    tanggal: "14 September 2026",
    feedback: "Dokumen pendukung yang diunggah belum sesuai dengan ketentuan.",
    dokumen: ["Sertifikat_Bukti_Tahapan.pdf", "Poster_Lomba.pdf"],
  },
];

export interface BackendPengajuanItem {
  id: number;
  nama_lomba?: string;
  nama_tim?: string;
  status?: string;
  created_at?: string;
  feedback_verifikator?: string;
  link_sk_konversi?: string;
  link_sertifikat?: string;
  link_surat_tugas_mahasiswa?: string;
  link_surat_tugas_dosen?: string;
  link_poster?: string;
  snapshot_huruf_nilai?: string;
  snapshot_min_sks?: number | string;
  snapshot_max_sks?: number | string;
  mahasiswa?: { nama?: string; name?: string; nim_nip?: string };
  prodi?: { nama?: string };
  bidang?: { nama?: string };
  tingkatan?: { nama?: string };
  tahapan?: { nama?: string };
  pengajuan_mata_kuliahs?: Array<{ mata_kuliah?: { nama_mk?: string }; nama_mk?: string }>;
}

export function mapBackendPengajuanToPrestasi(item: BackendPengajuanItem): Prestasi {
  const statusMap: Record<string, Status> = {
    pending: "Pending",
    diterima: "Diterima",
    ditolak: "Ditolak",
    selesai: "Terkonversi",
  };
  return {
    id: item.id,
    mahasiswa: item.mahasiswa?.nama || item.mahasiswa?.name || "Mahasiswa",
    nim: item.mahasiswa?.nim_nip || "-",
    prodi: (item.prodi?.nama || "Sistem Informasi") as Prodi,
    lomba: item.nama_lomba || "-",
    bidang: item.bidang?.nama || "-",
    tingkatan: item.tingkatan?.nama || "-",
    tahapan: item.tahapan?.nama || "-",
    jenis: item.nama_tim ? "Kelompok" : "Individu",
    status: statusMap[item.status?.toLowerCase() || ""] || "Pending",
    tanggal: item.created_at
      ? new Date(item.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "-",
    feedback: item.feedback_verifikator,
    skDisahkan: item.status?.toLowerCase() === "selesai",
    skUploaded: Boolean(item.link_sk_konversi),
    skFileName: item.link_sk_konversi ? "SK_Konversi_Resmi.pdf" : undefined,
    dokumen: [
      item.link_sertifikat && "Sertifikat_Lomba.pdf",
      item.link_surat_tugas_mahasiswa && "Surat_Tugas_Mahasiswa.pdf",
      item.link_surat_tugas_dosen && "Surat_Tugas_Dosen.pdf",
      item.link_poster && "Poster_Lomba.pdf",
    ].filter(Boolean) as string[],
    mataKuliah: Array.isArray(item.pengajuan_mata_kuliahs)
      ? (item.pengajuan_mata_kuliahs.map((pmk) => pmk.mata_kuliah?.nama_mk || pmk.nama_mk).filter(Boolean) as string[])
      : [],
    nilai: item.snapshot_huruf_nilai ? [item.snapshot_huruf_nilai] : [],
    sks: item.snapshot_min_sks ? `${item.snapshot_min_sks}–${item.snapshot_max_sks}` : undefined,
  };
}

export function usePrestasi() {
  const [data, setData] = useState<Prestasi[]>(() => {
    try {
      const s = localStorage.getItem("simpresma_prestasi");

      if (!s) return [...defaultPrestasi, ...sprint2DemoPrestasi];

      const parsed = JSON.parse(s);
      if (!Array.isArray(parsed)) return [...defaultPrestasi, ...sprint2DemoPrestasi];

      const existingIds = new Set(parsed.map((item: Prestasi) => item.id));
      const missingDemo = [...sprint2DemoPrestasi, ...studentDemoPrestasi].filter((item) => !existingIds.has(item.id));
      return [...parsed, ...missingDemo];
    } catch {
      return [...defaultPrestasi, ...sprint2DemoPrestasi, ...studentDemoPrestasi];
    }
  });

  // Fetch real data from backend API if authenticated
  useEffect(() => {
    const fetchBackend = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const active = loadActiveAccount();
        const role = active?.activeRole || active?.roles?.[0];
        let res: { data?: { items?: BackendPengajuanItem[] } | BackendPengajuanItem[] } | undefined;
        if (role === "Mahasiswa") {
          res = await api.mahasiswa.getPengajuan({ per_page: 50 });
        } else if (role === "Verifikator") {
          res = await api.verifikator.getPengajuan({ per_page: 50 });
        } else if (role === "Tendik") {
          res = await api.tendik.getPengajuan({ per_page: 50 });
        } else if (role === "Kaprodi") {
          res = await api.kaprodi.getPengajuan({ per_page: 50 });
        } else {
          res = await api.tendik.getPengajuan({ per_page: 50 });
        }

        const rawData = res?.data;
        const items = Array.isArray(rawData) ? rawData : rawData?.items;
        if (Array.isArray(items) && items.length > 0) {
          const mapped = items.map(mapBackendPengajuanToPrestasi);
          setData((prev) => {
            const apiIds = new Set(mapped.map((m) => m.id));
            const localOnly = prev.filter((p) => !apiIds.has(p.id));
            return [...mapped, ...localOnly];
          });
        }
      } catch {
        // Silent fallback to local storage
      }
    };
    fetchBackend();
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "simpresma_prestasi",
      JSON.stringify(data)
    );
  }, [data]);

  useEffect(() => {
    const h = () => {
      try {
        const s = localStorage.getItem(
          "simpresma_prestasi"
        );

        if (s) {
          setData(JSON.parse(s));
        }
      } catch {
        // Ignored storage parse error
      }
    };

    window.addEventListener("simpresma:update", h);

    return () =>
      window.removeEventListener("simpresma:update", h);
  }, []);

  const update = (id: number, patch: Partial<Prestasi>) => {
    setData((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const changedStatus = patch.status && patch.status !== x.status;
        const history = changedStatus
          ? [
              ...(x.history ?? [
                { status: x.status, timestamp: new Date().toISOString() },
              ]),
              {
                status: patch.status as Status,
                timestamp: new Date().toISOString(),
                feedback: patch.feedback,
              },
            ]
          : x.history;
        return { ...x, ...patch, ...(history ? { history } : {}) };
      })
    );

    // Call backend API in background if authenticated
    const token = getToken();
    if (token) {
      if (patch.status === "Diterima") {
        api.verifikator.terima(id, patch.feedback).catch(() => {});
      } else if (patch.status === "Ditolak") {
        api.verifikator.tolak(id, patch.feedback || "Ditolak").catch(() => {});
      }
    }
  };

  const add = (item: Prestasi) => {
    const withHistory = item.history?.length
      ? item
      : { ...item, history: [{ status: item.status, timestamp: new Date().toISOString() }] };
    setData((prev) => [withHistory, ...prev]);
  };

  return {
    data,
    update,
    add,
  };
}

export function notify() {
  window.dispatchEvent(new Event("simpresma:update"));
}

export const bidangOptions = [
  "Pembelajaran",
  "Komputasi",
  "Seni",
  "Olahraga",
  "Penalaran",
  "Kewirausahaan",
  "Lainnya",
];

export const tingkatOptions = [
  "Internasional",
  "Nasional Kementerian (Gemastik, LIDM, Satria Data, NUDC, KDMI, MTQMN)",
  "Nasional Kementerian (PKM, P2MW, PPK Ormawa, Pilmapres, Peksiminas)",
  "Nasional Non Kementerian-Mandiri",
  "Wilayah-Regional-Provinsi",
  "Promahadesa",
];

export const tahapOptions = [
  "Mendaftar",
  "Lolos Tahap Awal",
  "Finalis",
  "Pemenang (Juara 1/2/3/Honorable Mention)",
];

export const prodiOptions = [
  "Sistem Informasi",
  "Teknologi Informasi",
  "Informatika",
];

export const mataKuliahOptions = [
  "Frontend Development",
  "UI/UX Design",
  "Pengembangan Aplikasi",
  "Manajemen Proyek",
  "Analisis dan Perancangan Sistem",
];

export function FlashMessage({
  type,
  message,
  onClose,
}: {
  type: "success" | "error";
  message: string;
  onClose?: () => void;
}) {
  return (
    <div className="fixed right-5 top-5 z-[999999] w-[calc(100%-2.5rem)] max-w-sm">
      <div
        className={`rounded-xl border bg-white px-4 py-3 shadow-lg dark:bg-gray-900 ${
          type === "success" ? "border-brand-200" : "border-error-200"
        }`}
      >
        <div className="flex items-start gap-3">
          <div
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              type === "success"
                ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
                : "bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400"
            }`}
          >
            {type === "success" ? "✓" : "!"}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${type === "success" ? "text-brand-600 dark:text-brand-400" : "text-error-600 dark:text-error-400"}`}>
              {type === "success" ? "Berhasil" : "Gagal"}
            </p>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="text-lg leading-none text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              ×
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatSubmissionDateTime(row: Prestasi): string {
  const latestTimestamp = [...(row.history || [])].reverse().find((item) => item.timestamp)?.timestamp;
  if (latestTimestamp) {
    const date = new Date(latestTimestamp);
    if (!Number.isNaN(date.getTime())) {
      return `${date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}, ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })} WIB`;
    }
  }
  return `${row.tanggal} • Waktu belum tercatat`;
}

export function ReadOnlyPrestasiModal({
  row,
  onClose,
}: {
  row: Prestasi | null;
  onClose: () => void;
}) {
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);

  if (!row) return null;

  const documents = row.dokumen?.length
    ? row.dokumen
    : [
        "Sertifikat / Bukti Tahapan Saat Ini.pdf",
        "Surat Tugas Mahasiswa.pdf",
        "Surat Tugas Dosen Pembimbing.pdf",
        "Poster Lomba.pdf",
      ];
  const previewUrl = previewDoc
    ? `data:application/pdf,${encodeURIComponent(`Preview PDF simulasi frontend SIMPRESMA\n${previewDoc}`)}`
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-950/45 p-4 backdrop-blur-sm">
      <div className="my-auto max-h-[calc(100dvh-2rem)] min-w-0 w-full max-w-3xl overflow-y-auto no-scrollbar rounded-xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:p-6">
        <div className="mb-5 flex items-start justify-between border-b border-gray-200 px-0 pb-4 pt-0 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Detail Pengajuan</h2>
            <p className="mt-1 text-sm text-gray-500">{row.mahasiswa} • {row.lomba}</p>
          </div>
          <button type="button" onClick={onClose} className="text-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">×</button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input label="Nama Mahasiswa" value={row.mahasiswa} readOnly />
          <Input label="NIM" value={row.nim} readOnly />
          <Input label="Program Studi" value={row.prodi} readOnly />
          <Input label="Nama Lomba" value={row.lomba} readOnly />
          <Input label="Jenis Lomba" value={row.jenis} readOnly />
          <Input label="Bidang" value={row.bidang || "-"} readOnly />
          <Input label="Tingkatan" value={row.tingkatan} readOnly />
          <Input label="Tahapan Saat Ini" value={row.tahapan} readOnly />
          <Input label="Status" value={row.status === "Terkonversi" && row.skUploaded ? "Selesai" : row.status} readOnly />
          <Input label="Tanggal & Waktu Pengajuan" value={formatSubmissionDateTime(row)} readOnly />
          {row.sks && <Input label="SKS" value={row.sks} readOnly />}
          {row.nilai?.length ? <Input label="Nilai" value={row.nilai.join(", ")} readOnly /> : null}
          {row.mataKuliah?.length ? <div className="md:col-span-2"><Input label="Mata Kuliah Konversi" value={row.mataKuliah.join(", ")} readOnly /></div> : null}
        </div>

        {row.feedback && (
          <div className="mt-6 rounded-xl border border-error-200 bg-error-50 p-4 dark:border-error-500/20 dark:bg-error-500/10">
            <p className="text-sm font-semibold text-error-700 dark:text-error-300">Alasan Penolakan</p>
            <p className="mt-1 text-sm text-error-600 dark:text-error-400">{row.feedback}</p>
          </div>
        )}

        <div className="mt-6 rounded-xl border border-gray-200 p-4 dark:border-gray-800">
          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dokumen Pendukung</p>
          <p className="mt-1 text-xs text-gray-500">Dokumen dapat dipratinjau langsung tanpa mengubah data pengajuan.</p>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {documents.map((doc) => (
              <button key={doc} type="button" onClick={() => setPreviewDoc(doc)} className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-3 text-left text-sm transition hover:border-brand-300 dark:border-gray-700 dark:hover:border-brand-500">
                <span className="min-w-0 truncate text-gray-700 dark:text-gray-300">{doc}</span>
                <span className="ml-3 shrink-0 font-medium text-brand-500">Preview</span>
              </button>
            ))}
          </div>
          {previewDoc && (
            <div className="mt-4 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between bg-gray-50 px-4 py-3 dark:bg-gray-800">
                <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-200">Preview: {previewDoc}</span>
                <button type="button" onClick={() => setPreviewDoc(null)} className="text-sm text-gray-500 hover:text-gray-700">Tutup</button>
              </div>
              <iframe title={`Preview ${previewDoc}`} src={previewUrl ?? undefined} className="h-[420px] w-full bg-white" />
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">Tutup</button>
        </div>
      </div>
    </div>
  );
}

export function Title({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-title-md font-semibold text-gray-800 dark:text-white/90">
        {title}
      </h1>

      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${className}`}
    >
      {children}
    </div>
  );
}

export function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-800">
        <h2 className="text-base font-semibold text-gray-800 dark:text-white/90">
          {title}
        </h2>

        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {desc}
        </p>
      </div>

      <div className="p-6">
        {children}
      </div>
    </>
  );
}

export function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>

      <input
        {...props}
        className={`h-11 w-full rounded-lg border border-gray-300 bg-white px-4 text-sm text-gray-800 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 ${
          props.className || ""
        }`}
      />
    </label>
  );
}

export function Select({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>

      <DropdownSelect
        value={value}
        onChange={onChange}
        options={[
          { value: "", label: `Pilih ${label.toLowerCase()}` },
          ...options.map((o) => ({ value: o, label: o })),
        ]}
      />
    </label>
  );
}

export function Textarea({
  label,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
      </span>

      <textarea
        {...props}
        className={`w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 ${
          props.className || ""
        }`}
      />
    </label>
  );
}

export function getStatusLabel(status: Status | string, skUploaded = false) {
  if (status === "Pending") return "Diproses";
  if (status === "Diterima") return "Disetujui";
  if (status === "Terkonversi") return skUploaded ? "SK Final Tersedia" : "Menunggu Penerbitan SK";
  return status;
}

export function StatusBadge({
  status,
  skUploaded = false,
}: {
  status: Status | string;
  skUploaded?: boolean;
}) {
  const cls =
    status === "Pending"
      ? "bg-warning-50 text-warning-600 dark:bg-warning-500/10 dark:text-warning-400"
      : status === "Diterima"
      ? "bg-success-50 text-success-600 dark:bg-success-500/10 dark:text-success-400"
      : status === "Ditolak" ||
        status === "Perlu Perbaikan"
      ? "bg-error-50 text-error-600 dark:bg-error-500/10 dark:text-error-400"
      : "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400";

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${cls}`}
    >
      {getStatusLabel(status, skUploaded)}
    </span>
  );
}

export function StatCard({
  value,
  label,
  icon = "○",
}: {
  value: string | number;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/20 text-xl">
          {icon}
        </div>

        <span className="text-xs font-medium text-gray-400">

        </span>
      </div>

      <div className="mt-4">
        <h4 className="text-2xl font-bold text-gray-800 dark:text-white/90">
          {value}
        </h4>

        <span className="text-sm text-gray-500 dark:text-gray-400">
          {label}
        </span>
      </div>
    </div>
  );
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
}: {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalPages <= 1) return null;

  return (
    <div className="mt-4 flex min-w-0 items-center justify-between gap-3 border-t border-gray-200 pt-4 dark:border-gray-800">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Halaman {currentPage} dari {totalPages}
      </p>
      <div className="flex min-w-0 shrink-0 items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="flex h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 p-0 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <AngleLeftIcon className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-1">
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => onPageChange(page)}
              className={`flex h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-lg text-sm font-medium transition ${
                page === currentPage
                  ? "bg-brand-500 text-white"
                  : "border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              }`}
            >
              {page}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="flex h-9 w-9 min-w-9 shrink-0 items-center justify-center rounded-lg border border-gray-300 p-0 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <AngleRightIcon className="h-4 w-4"/>
        </button>
      </div>
    </div>
  );
}

export function PrestasiTable({
  data,
  action,
  hideStudentColumns = false,
}:{
  data: Prestasi[];
  action?: (p: Prestasi) => React.ReactNode;
  hideStudentColumns?: boolean;
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);
  const paginatedData = data.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="simpresma-table-wrap overflow-x-auto no-scrollbar">
      <table className="simpresma-table w-full min-w-[900px]">
        <thead>
          <tr>
            {[
              "No",
              ...(hideStudentColumns ? [] : ["Mahasiswa"]),
              "Prestasi",
              ...(hideStudentColumns ? [] : ["Prodi"]),
              "Tingkatan",
              "Status",
              "Tanggal",
              ...(action ? ["Aksi"] : []),
            ].map((h) => (
              <th
                key={h}
                className="text-left"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {paginatedData.map((r, i) => (
            <tr key={r.id}>
              <td className="text-sm text-gray-800 dark:text-white/90">
                {i + 1}
              </td>

              {!hideStudentColumns && (
                <td className="text-sm text-gray-800 dark:text-white/90">
                  {r.mahasiswa}
                  <div className="text-xs text-gray-500">
                    {r.nim}
                  </div>
                </td>
              )}

              <td className="text-sm text-gray-800 dark:text-white/90">
                {r.lomba}
              </td>

              {!hideStudentColumns && (
                <td className="text-sm text-gray-500 dark:text-gray-400">
                  {r.prodi}
                </td>
              )}

              <td className="text-sm text-gray-500 dark:text-gray-400">
                {r.tingkatan}
              </td>

              <td >
                <StatusBadge status={r.status} skUploaded={r.skUploaded} />
              </td>

              <td className="text-sm text-gray-500 dark:text-gray-400">
                {r.tanggal}
              </td>

              {action && (
                <td className="min-w-[110px] whitespace-nowrap">
                    {action(r)}
                    </td>)}
                </tr>
          ))}
        </tbody>
      </table>
      <TablePagination currentPage={currentPage} totalItems={data.length} pageSize={pageSize} onPageChange={setCurrentPage} />
    </div>
  );
}

export function SearchFilter({
  value,
  onChange,
  placeholder = "Cari pengajuan, nama, atau lomba...",
  filters,
  filterValues,
  onFilterChange,
}: {
  value?: string;
  onChange?: (val: string) => void;
  placeholder?: string;
  filters?: {
    label: string;
    options: string[];
  }[];
  filterValues?: Record<string, string>;
  onFilterChange?: (label: string, value: string) => void;
}) {
  return (
    <div className="flex w-full flex-row flex-wrap items-center gap-3">
      {onChange !== undefined && (
        <div className="relative min-w-[240px] flex-1">
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-4 pr-10 text-sm text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:border-gray-800 dark:bg-gray-900 dark:text-white dark:placeholder:text-gray-500"
          />
          {value && (
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              ×
            </button>
          )}
        </div>
      )}
      {filters &&
        filters.map((f) => (
          <DropdownSelect
            key={f.label}
            value={filterValues?.[f.label] || ""}
            onChange={(nextValue) => onFilterChange?.(f.label, nextValue)}
            options={[
              { value: "", label: `Semua ${f.label}` },
              ...f.options.map((o) => ({ value: o, label: o })),
            ]}
            className="min-w-[160px]"
          />
        ))}
    </div>
  );
}

export function DashboardRole({
  role,
}: {
  role:
    | "Mahasiswa"
    | "Verifikator"
    | "Tendik"
    | "Wadek"
    | "Kaprodi";
}) {
  const { data } = usePrestasi();

    const cfg = {
    Mahasiswa: {
      eyebrow: "Portal Mahasiswa",
      title: "Selamat Datang, Mahasiswa SI",
      desc: "Ajukan prestasi perlombaan Anda untuk mendapatkan konversi SKS mata kuliah secara resmi sesuai panduan fakultas.",
      action: "Ajukan Prestasi Baru",
      stats: [
        { value: "22", label: "Total Pengajuan", icon: <FileIcon className="size-6" /> },
        { value: "14", label: "Menunggu Verifikasi", icon: <TimeIcon className="size-6" /> },
        { value: "1", label: "Disetujui", icon: <CheckCircleIcon className="size-6" /> },
        { value: "0", label: "Selesai Konversi", icon: <DownloadIcon className="size-6" /> },
      ],
    },
    Verifikator: {
      eyebrow: "Panel Verifikator",
      title: "Dashboard Verifikator",
      desc: "Kelola dan verifikasi pengajuan prestasi sesuai scope Program Studi yang ditetapkan.",
      action: "Buka Shared Inbox",
      stats: [
        { value: "12", label: "Menunggu Verifikasi", icon: <TimeIcon className="size-6" /> },
        { value: "5", label: "Perlu Perbaikan", icon: <AlertIcon className="size-6" /> },
        { value: "48", label: "Sudah Diverifikasi", icon: <CheckCircleIcon className="size-6" /> },
        { value: "65", label: "Total Prestasi", icon: <FileIcon className="size-6" /> },
      ],
    },
    Tendik: {
      eyebrow: "Panel Tendik",
      title: "Dashboard Tendik",
      desc: "Pantau hasil konversi secara read-only dan kelola penerbitan SK final mahasiswa.",
      action: "Lihat Pengajuan",
      stats: [
        { value: "18", label: "Siap Dibuatkan SK", icon: <DownloadIcon className="size-6" /> },
        { value: "42", label: "SK Terunggah", icon: <CheckCircleIcon className="size-6" /> },
        { value: "42", label: "Konversi Read-Only", icon: <EyeIcon className="size-6" /> },
        { value: "3", label: "Program Studi", icon: <GroupIcon className="size-6" /> },
      ],
    },
    Wadek: {
      eyebrow: "Portal Wakil Dekan",
      title: "Dashboard Wakil Dekan",
      desc: "Pantau capaian prestasi, proses verifikasi, dan konversi mahasiswa lintas Program Studi.",
      action: "Lihat Peninjauan",
      stats: [
        { value: "1,248", label: "Total Mahasiswa", icon: <GroupIcon className="size-6" /> },
        { value: "342", label: "Total Prestasi", icon: <FileIcon className="size-6" /> },
        { value: "286", label: "Terverifikasi", icon: <CheckCircleIcon className="size-6" /> },
        { value: "3", label: "Program Studi", icon: <GridIcon className="size-6" /> },
      ],
    },
    Kaprodi: {
      eyebrow: "Portal Kaprodi",
      title: "Dashboard Kaprodi",
      desc: "Pantau pengajuan, rekap prestasi, konversi, dan performa Verifikator pada Program Studi sendiri.",
      action: "Lihat Pengajuan",
      stats: [
        { value: "128", label: "Mahasiswa Prodi", icon: <GroupIcon className="size-6" /> },
        { value: "42", label: "Total Prestasi", icon: <FileIcon className="size-6" /> },
        { value: "36", label: "Terverifikasi", icon: <CheckCircleIcon className="size-6" /> },
        { value: "2", label: "Verifikator", icon: <UserIcon className="size-6" /> },
      ],
    },
  }[role];

const navigate = useNavigate();

const actionRoute: Record<typeof role, string> = {
    Mahasiswa: "/mahasiswa/pengajuan",
    Verifikator: "/verifikator/menunggu",
    Tendik: "/tendik/data-prestasi",
    Wadek: "/wadek/monitoring",
    Kaprodi: "/kaprodi/monitoring",
};

const viewAllRoute: Record<typeof role, string> = {
    Mahasiswa: "/mahasiswa/riwayat",        // Riwayat Prestasi
    Verifikator: "/verifikator/riwayat",    // Riwayat Verifikasi
    Tendik: "/tendik/data-prestasi",        // Pengajuan & Upload SK
    Wadek: "/wadek/monitoring",            // Peninjauan Prestasi
    Kaprodi: "/kaprodi/monitoring",        // Peninjauan Prestasi
};

  const dashboardData = role === "Mahasiswa"
    ? data.filter((r) => r.mahasiswa === "Chelsea Brilliant Syah Putra")
    : data;
  const recentRows = dashboardData.slice(0, 5);
  const pending = Math.max(0, dashboardData.filter((r) => r.status === "Pending").length);
  const accepted = dashboardData.filter((r) => r.status === "Diterima").length;
  const converted = dashboardData.filter((r) => r.status === "Terkonversi" && r.skUploaded).length;
  const rejected = dashboardData.filter((r) => r.status === "Ditolak").length;
  const total = Math.max(1, pending + accepted + converted + rejected);
  const pendingPct = Math.round((pending / total) * 100);
  const acceptedPct = Math.round((accepted / total) * 100);
  const convertedPct = Math.round((converted / total) * 100);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-brand-600 border border-brand-500/20 px-6 py-7 text-white shadow-theme-md sm:px-8">
        <div className="relative z-10 max-w-3xl">
          <span className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/20">
            {cfg.eyebrow}
          </span>
          <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{cfg.title}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-white/85">{cfg.desc}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate(actionRoute[role])}
          className="relative z-10 mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-brand-600 shadow-sm sm:absolute sm:right-7 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2"
        >
          {cfg.action}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cfg.stats.map((c) => (
  <StatCard key={c.label} value={c.value} label={c.label} icon={c.icon} />
))}
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                Distribusi Status Prestasi Anda
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Proporsi status seluruh pengajuan prestasi.
              </p>
            </div>
            <span className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              {role}
            </span>
          </div>

          <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:justify-center">
            <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="12" className="dark:stroke-gray-800" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f79009" strokeWidth="12" strokeDasharray={`${(pendingPct / 100) * 251.327} ${251.327 - (pendingPct / 100) * 251.327}`} strokeDashoffset="0" />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#12b76a" strokeWidth="12" strokeDasharray={`${(acceptedPct / 100) * 251.327} ${251.327 - (acceptedPct / 100) * 251.327}`} strokeDashoffset={`${-((pendingPct / 100) * 251.327)}`} />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#465fff" strokeWidth="12" strokeDasharray={`${(convertedPct / 100) * 251.327} ${251.327 - (convertedPct / 100) * 251.327}`} strokeDashoffset={`${-(((pendingPct + acceptedPct) / 100) * 251.327)}`} />
                <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f04438" strokeWidth="12" strokeDasharray={`${(Math.max(0, 100 - pendingPct - acceptedPct - convertedPct) / 100) * 251.327} ${251.327}`} strokeDashoffset={`${-(((pendingPct + acceptedPct + convertedPct) / 100) * 251.327)}`} />
              </svg>
              <div className="absolute flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-theme-xs dark:bg-gray-900">
                <span className="text-2xl font-bold text-gray-800 dark:text-white/90">{data.length}</span>
                <span className="text-[11px] text-gray-500">Pengajuan</span>
              </div>
            </div>

            <div className="w-full max-w-xs space-y-3">
              {[
                ["Pending", pending, "bg-warning-500"],
                ["Diterima", accepted, "bg-success-500"],
                ["Selesai", converted, "bg-brand-500"],
                ["Ditolak", rejected, "bg-error-500"],
              ].map(([label, value, dot]) => (
                <div key={label as string} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5 dark:bg-gray-800/70">
                  <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          {role === "Mahasiswa" ? (
            <>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Aktivitas Terbaru</h3>
              </div>
              <div className="mt-5 space-y-4">
                {[
                  ["Pilihan Mata Kuliah Tersimpan", "Tendik telah diberi tahu untuk menyiapkan SK Anda."],
                  ["SK Final Siap Diunduh", "SK konversi \"Gemastik XVII — Pengembangan Perangkat Lunak\" sudah tersedia."],
                  ["Pengajuan Disetujui", "\"PKM-KC 2026 — Kewirausahaan Cerdas\" disetujui. Silakan pilih mata kuliah konversi."],
                ].map(([title, message]) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-brand-500 dark:bg-brand-500/10">
                      <span className="text-lg">🔔</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-white/90">{title}</p>
                      <p className="mt-1 text-sm leading-5 text-gray-600 dark:text-gray-400">{message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  Proporsi Pengajuan Mahasiswa Antar Prodi
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Persentase jumlah pengajuan mahasiswa dari 3 Program Studi.
                </p>
              </div>

              <div className="mt-7 flex flex-col items-center gap-7 sm:flex-row sm:justify-center">
                <div className="relative flex h-40 w-40 shrink-0 items-center justify-center">
                  <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#e5e7eb" strokeWidth="12" className="dark:stroke-gray-800" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#465fff" strokeWidth="12" strokeDasharray={`${(62 / 100) * 251.327} ${251.327}`} strokeDashoffset="0" />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#7a5af8" strokeWidth="12" strokeDasharray={`${(20 / 100) * 251.327} ${251.327}`} strokeDashoffset={`${-((62 / 100) * 251.327)}`} />
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#12b76a" strokeWidth="12" strokeDasharray={`${(18 / 100) * 251.327} ${251.327}`} strokeDashoffset={`${-((82 / 100) * 251.327)}`} />
                  </svg>
                  <div className="absolute flex h-24 w-24 flex-col items-center justify-center rounded-full bg-white shadow-theme-xs dark:bg-gray-900">
                    <span className="text-2xl font-bold text-gray-800 dark:text-white/90">100%</span>
                    <span className="text-[11px] text-gray-500">Distribusi</span>
                  </div>
                </div>
                <div className="w-full max-w-xs space-y-3">
                  {[
                    ["Sistem Informasi", "62%", "bg-brand-500"],
                    ["Teknologi Informasi", "20%", "bg-theme-purple-500"],
                    ["Informatika", "18%", "bg-success-500"],
                  ].map(([label, value, dot]) => (
                    <div key={label} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5 dark:border-gray-800">
                      <span className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
                        {label}
                      </span>
                      <span className="text-sm font-semibold text-gray-800 dark:text-white/90">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Recent table */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-800">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Pengajuan Terbaru</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">5 pengajuan prestasi perlombaan terakhir.</p>
          </div>
          <span className="text-sm font-medium text-brand-500 hover:underline cursor-pointer"onClick={() => navigate(viewAllRoute[role])}>Lihat Semua ({data.length})</span>
        </div>
        <div className="mt-4">
          <PrestasiTable data={recentRows} hideStudentColumns={role === "Mahasiswa"} />
        </div>
      </Card>
    </div>
  );
}
