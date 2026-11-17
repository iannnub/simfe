import React, { useState } from "react";
import DropdownSelect from "../../components/form/DropdownSelect";
import { useNavigate } from "react-router";
import api, { getToken } from "../../services/api";
import { FlashMessage, usePrestasi } from "./SimpresmaShared";

function FileField({
  label,
  required,
  name,
  onValid,
  fileName,
  previewUrl,
}: {
  label: string;
  required?: boolean;
  name: string;
  onValid: (name: string, url: string) => void;
  fileName: string;
  previewUrl?: string;
}) {
  const inputId = `file-${name}`;
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">
        {label} {required && <span className="text-error-500">*</span>}
      </label>
      <input
        id={inputId}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.type !== "application/pdf" || file.size > 10 * 1024 * 1024) {
            window.dispatchEvent(new CustomEvent("simpresma:flash", { detail: { type: "error", message: "Dokumen harus berformat PDF dengan ukuran maksimal 10MB." } }));
            e.currentTarget.value = "";
            return;
          }
          onValid(file.name, URL.createObjectURL(file));
        }}
      />
      <label
        htmlFor={inputId}
        className="flex min-h-[50px] cursor-pointer items-center rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-500 transition hover:border-brand-300 hover:bg-brand-50/30 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400 dark:hover:border-brand-700"
      >
        {fileName ? (
          <div className="flex w-full items-center gap-3">
            <span className="rounded bg-error-50 px-2 py-1 text-xs font-bold text-error-600 dark:bg-error-500/10 dark:text-error-400">Pdf</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-800 dark:text-gray-200">{fileName}</p>
              <p className="text-xs text-gray-500">PDF siap dikirim</p>
            </div>
          </div>
        ) : (
          <span className="w-full text-center">Klik untuk unggah file PDF</span>
        )}
      </label>
      {previewUrl && (
        <button type="button" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")} className="mt-2 text-xs font-medium text-brand-500 hover:text-brand-600">
          Preview dokumen
        </button>
      )}
    </div>
  );
}

function UploadedDocument({ label, name, url, onRemove, onPreview }: { label: string; name: string; url?: string; onRemove: () => void; onPreview: () => void }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900">
      <div className="flex items-center gap-3">
        <span className="rounded bg-error-50 px-2 py-1 text-xs font-bold text-error-600 dark:bg-error-500/10 dark:text-error-400">Pdf</span>
        <button type="button" onClick={onPreview} className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-gray-800 hover:text-brand-500 dark:text-gray-200">{name}</p>
          <p className="text-xs text-gray-500">{label}</p>
        </button>
        <button type="button" onClick={onRemove} className="flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">X</button>
      </div>
      {url && <div className="mt-1 text-[11px] text-gray-400">Klik nama dokumen untuk preview</div>}
    </div>
  );
}

export default function MahasiswaPengajuan() {
  const navigate = useNavigate();
  const { add, data } = usePrestasi();
  const [step, setStep] = useState(1);
  const [showConfirm, setShowConfirm] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [namaTim, setNamaTim] = useState("");
  const [namaLomba, setNamaLomba] = useState("");
  const [tingkatan, setTingkatan] = useState("");
  const [tahapan, setTahapan] = useState("");
  const [semester, setSemester] = useState("4");
  const [suratTugasMahasiswa, setSuratTugasMahasiswa] = useState<"" | "Ada" | "Tidak">("");
  const [suratTugasDosen, setSuratTugasDosen] = useState<"" | "Ada" | "Tidak">("");
  const [certificate, setCertificate] = useState("");
  const [suratMahasiswa, setSuratMahasiswa] = useState("");
  const [suratDosen, setSuratDosen] = useState("");
  const [poster, setPoster] = useState("");
  const [socialLink, setSocialLink] = useState("");
  const [showValidation, setShowValidation] = useState(false);
  const [previewFiles, setPreviewFiles] = useState<Record<string, string>>({});
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [declarationChecked, setDeclarationChecked] = useState(false);

  const steps = [
    { no: 1, title: "Informasi Lomba", desc: "Data & Capaian" },
    { no: 2, title: "Tautan Bukti", desc: "Sertifikat & Dokumen" },
    { no: 3, title: "Konfirmasi", desc: "Review & Submit" },
  ];

  const showFlash = (type: "success" | "error", message: string) => {
    setFlash({ type, message });
    window.setTimeout(() => setFlash(null), 3200);
  };

  const setPreview = (key: string, name: string, url: string, setter: (value: string) => void) => {
    setPreviewFiles((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]);
      return { ...prev, [key]: url };
    });
    setter(name);
  };

  const removeFile = (key: string, setter: (value: string) => void) => {
    if (previewFiles[key]) URL.revokeObjectURL(previewFiles[key]);
    setPreviewFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setter("");
  };

  const validate = () => {
    setShowValidation(true);
    if (!namaLomba.trim() || !whatsapp.trim() || !socialLink.trim() || !tingkatan || !tahapan || !semester) {
      setStep(1);
      showFlash("error", "Lengkapi data informasi lomba yang wajib diisi.");
      return false;
    }
    if (!certificate || !poster || !suratTugasMahasiswa || !suratTugasDosen || (suratTugasMahasiswa === "Ada" && !suratMahasiswa) || (suratTugasDosen === "Ada" && !suratDosen)) {
      setStep(2);
      showFlash("error", "Lengkapi seluruh dokumen wajib sebelum melanjutkan.");
      return false;
    }
    return true;
  };

  const submit = () => {
    if (!declarationChecked) {
      showFlash("error", "Centang pernyataan bahwa data dan dokumen yang diunggah sudah benar.");
      return;
    }
    if (validate()) setShowConfirm(true);
  };

  const confirmSubmit = async () => {
    setSubmitLoading(true);
    try {
      if (getToken()) {
        try {
          await api.mahasiswa.storePengajuan({
            nama_lomba: namaLomba,
            bidang_id: 1,
            tingkatan_id: 1,
            tahapan_id: 3,
            semester: parseInt(semester, 10) || 4,
            nama_tim: namaTim || null,
            no_whatsapp: whatsapp,
            link_sosmed: socialLink.startsWith("http") ? socialLink : `https://${socialLink}`,
            link_sertifikat: "https://storage.unej.ac.id/simpresma/sertifikat.pdf",
            link_poster: "https://storage.unej.ac.id/simpresma/poster.jpg",
            link_surat_tugas_mahasiswa: "https://storage.unej.ac.id/simpresma/surat_tugas_mhs.pdf",
            link_surat_tugas_dosen: "https://storage.unej.ac.id/simpresma/surat_tugas_dosen.pdf",
          });
        } catch (apiErr) {
          console.warn("Backend API sync warning:", apiErr);
        }
      }

      const nextId = data.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      add({
        id: nextId,
        mahasiswa: "Chelsea Brilliant Syah Putra",
        nim: "242410101079",
        prodi: "Sistem Informasi",
        lomba: namaLomba,
        bidang: "-",
        tingkatan,
        tahapan,
        jenis: namaTim.trim() ? "Kelompok" : "Individu",
        status: "Pending",
        tanggal: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
        dokumen: [certificate, ...(suratTugasMahasiswa === "Ada" ? [suratMahasiswa] : []), ...(suratTugasDosen === "Ada" ? [suratDosen] : []), poster].filter(Boolean),
      });
      localStorage.setItem("simpresma_flash", JSON.stringify({ type: "success", message: "Pengajuan berhasil dikirim dan masuk ke proses verifikasi." }));
      setShowConfirm(false);
      window.setTimeout(() => navigate("/mahasiswa/riwayat"), 280);
    } catch {
      setSubmitLoading(false);
      showFlash("error", "Pengajuan gagal dikirim. Silakan coba lagi.");
    }
  };

  const RequiredError = ({ show }: { show: boolean }) => show ? <span className="mt-1 block text-xs text-error-500">Wajib diisi</span> : null;
  const inputClass = "h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-700 outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300";
  const documents = [
    { key: "certificate", label: "Sertifikat / Bukti Tahapan Saat Ini", name: certificate, url: previewFiles.certificate, setter: setCertificate },
    ...(suratTugasMahasiswa === "Ada" ? [{ key: "suratMahasiswa", label: "Surat Tugas Mahasiswa", name: suratMahasiswa, url: previewFiles.suratMahasiswa, setter: setSuratMahasiswa }] : []),
    ...(suratTugasDosen === "Ada" ? [{ key: "suratDosen", label: "Surat Tugas Dosen Pembimbing", name: suratDosen, url: previewFiles.suratDosen, setter: setSuratDosen }] : []),
    { key: "poster", label: "Poster Lomba", name: poster, url: previewFiles.poster, setter: setPoster },
  ];

  return (
    <div className="space-y-6">
      {flash && <FlashMessage type={flash.type} message={flash.message} onClose={() => setFlash(null)} />}
      {submitLoading && <div role="status" aria-live="polite" className="fixed inset-0 z-[210] flex items-center justify-center bg-[#f8fafc]/95 dark:bg-gray-950/95"><div className="flex flex-col items-center text-center"><span className="h-5 w-5 animate-spin rounded-full border-2 border-[#3978e8] border-t-transparent" /><p className="mt-3 text-xs font-semibold text-gray-700 dark:text-gray-200">Memuat halaman...</p><p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">Harap tunggu sebentar</p></div></div>}

      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white/90">Pengajuan Prestasi</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Lengkapi data lomba dan dokumen pendukung untuk mengajukan prestasi.</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="grid grid-cols-3 gap-1 sm:gap-4">
          {steps.map((item, index) => (
            <button key={item.no} type="button" onClick={() => item.no <= step && setStep(item.no)} className="group relative text-center">
              {index < steps.length - 1 && <span className={`absolute left-[calc(50%+22px)] right-[calc(-50%+22px)] top-5 hidden h-px sm:block ${step > item.no ? "bg-brand-500" : "bg-gray-200 dark:bg-gray-700"}`} />}
              <span className={`relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold ${step === item.no ? "bg-brand-500 text-white shadow-sm" : step > item.no ? "bg-brand-50 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400" : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"}`}>{step > item.no ? "✓" : item.no}</span>
              <span className={`mt-2 block text-[11px] font-semibold sm:text-xs ${step === item.no ? "text-brand-600 dark:text-brand-400" : "text-gray-500"}`}>{item.title}</span>
              <span className="mt-0.5 hidden text-[10px] text-gray-400 sm:block">{item.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {step === 1 && <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Nama</label><input className={inputClass + " bg-gray-50"} value="Chelsea Brilliant Syah Putra" readOnly /></div>
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">NIM</label><input className={inputClass + " bg-gray-50"} value="242410101079" readOnly /></div>
          <div className="md:col-span-2"><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Program Studi</label><input className={inputClass + " bg-gray-50"} value="Sistem Informasi" readOnly /></div>
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Nama Tim<span className="text-error-500">*</span></label><input className={inputClass} value={namaTim} onChange={(e) => setNamaTim(e.target.value)} placeholder="Contoh: Capstone 2" /></div>
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">No WhatsApp<span className="text-error-500">*</span></label><input className={inputClass} value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="08XXXXXXXXXX" /><RequiredError show={showValidation && !whatsapp.trim()} /></div>
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Nama Lomba<span className="text-error-500">*</span></label><input className={inputClass} value={namaLomba} onChange={(e) => setNamaLomba(e.target.value)} placeholder="Contoh: Gemastik" /><RequiredError show={showValidation && !namaLomba.trim()} /></div>
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Link Sosial Media Lomba<span className="text-error-500">*</span></label><input className={inputClass} value={socialLink} onChange={(e) => setSocialLink(e.target.value)} placeholder="https://instagram.com/..." /></div>
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Tingkatan Lomba / Kompetisi<span className="text-error-500">*</span></label><DropdownSelect value={tingkatan} onChange={setTingkatan} placeholder="Pilih..." options={[{value:"",label:"Pilih..."},{value:"Internasional",label:"Internasional"},{value:"Nasional Kementerian (Gemastik, LIDM, Satria Data, NUDC, KDMI, MTQMN)",label:"Nasional Kementerian (Gemastik, LIDM, Satria Data, NUDC, KDMI, MTQMN)"},{value:"Nasional Kementerian (PKM, P2MW, PPK Ormawa, Pilmapres, Peksiminas)",label:"Nasional Kementerian (PKM, P2MW, PPK Ormawa, Pilmapres, Peksiminas)"},{value:"Nasional Non Kementerian-Mandiri",label:"Nasional Non Kementerian / Mandiri"},{value:"Wilayah-Regional-Provinsi",label:"Wilayah / Regional / Provinsi"},{value:"Promahadesa",label:"Promahadesa"}]} /><RequiredError show={showValidation && !tingkatan} /></div>
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Tahapan Saat Ini<span className="text-error-500">*</span></label><DropdownSelect value={tahapan} onChange={setTahapan} placeholder="Pilih..." options={[{value:"",label:"Pilih..."},{value:"Mendaftar",label:"Mendaftar"},{value:"Lolos Tahap Awal",label:"Lolos Tahap Awal"},{value:"Finalis",label:"Finalis"},{value:"Pemenang (Juara 1/2/3/Honorable Mention)",label:"Pemenang (Juara 1/2/3/Honorable Mention)"}]} /><RequiredError show={showValidation && !tahapan} /></div>
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Semester Saat Ini<span className="text-error-500">*</span></label><DropdownSelect value={semester} onChange={setSemester} placeholder="Pilih..." options={[{value:"1",label:"Semester 1"},{value:"2",label:"Semester 2"},{value:"3",label:"Semester 3"},{value:"4",label:"Semester 4"},{value:"5",label:"Semester 5"},{value:"6",label:"Semester 6"},{value:"7",label:"Semester 7"},{value:"8",label:"Semester 8"}]} /><RequiredError show={showValidation && !semester} /></div>
        </div>
      </div>}

      {step === 2 && <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="grid grid-cols-1 gap-5 p-5 sm:p-6 md:grid-cols-2">
          <FileField label="Sertifikat / Bukti Tahapan Saat Ini" required name="certificate" onValid={(n,u)=>setPreview("certificate",n,u,setCertificate)} fileName={certificate} previewUrl={previewFiles.certificate} />
          <FileField label="Poster Lomba" required name="poster" onValid={(n,u)=>setPreview("poster",n,u,setPoster)} fileName={poster} previewUrl={previewFiles.poster} />
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Sudah ada Surat Tugas Mahasiswa?<span className="text-error-500">*</span></label><div className="grid grid-cols-2 gap-3">{(["Ada","Tidak"] as const).map((x)=><button key={x} type="button" onClick={()=>setSuratTugasMahasiswa(x)} className={`rounded-lg border px-4 py-3 text-sm font-medium ${suratTugasMahasiswa===x?"border-brand-500 bg-brand-500 text-white":"border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"}`}>{x === "Ada" ? "Ya" : "Tidak"}</button>)}</div></div>
          <div><label className="mb-2 block text-sm font-semibold text-gray-800 dark:text-gray-200">Sudah ada Surat Tugas Dosen Pembimbing?<span className="text-error-500">*</span></label><div className="grid grid-cols-2 gap-3">{(["Ada","Tidak"] as const).map((x)=><button key={x} type="button" onClick={()=>setSuratTugasDosen(x)} className={`rounded-lg border px-4 py-3 text-sm font-medium ${suratTugasDosen===x?"border-brand-500 bg-brand-500 text-white":"border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"}`}>{x === "Ada" ? "Ya" : "Tidak"}</button>)}</div></div>
          {suratTugasMahasiswa === "Ada" && <FileField label="Surat Tugas Mahasiswa" required name="suratMahasiswa" onValid={(n,u)=>setPreview("suratMahasiswa",n,u,setSuratMahasiswa)} fileName={suratMahasiswa} previewUrl={previewFiles.suratMahasiswa} />}
          {suratTugasDosen === "Ada" && <FileField label="Surat Tugas Dosen Pembimbing" required name="suratDosen" onValid={(n,u)=>setPreview("suratDosen",n,u,setSuratDosen)} fileName={suratDosen} previewUrl={previewFiles.suratDosen} />}
          {showValidation && (!certificate || !poster || !suratTugasMahasiswa || !suratTugasDosen || (suratTugasMahasiswa === "Ada" && !suratMahasiswa) || (suratTugasDosen === "Ada" && !suratDosen)) && <p className="md:col-span-2 text-xs text-error-500">Lengkapi dokumen yang wajib diunggah.</p>}
        </div>
      </div>}

      {step === 3 && <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-gray-800 sm:px-6"><h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Review & Submit</h2><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Pastikan seluruh data dan dokumen sudah benar sebelum dikirim.</p></div>
        <div className="p-5 sm:p-6">
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 md:grid-cols-2">
            {[["Nama Mahasiswa","Chelsea Brilliant Syah Putra"],["NIM","242410101079"],["Program Studi","Sistem Informasi"],["Semester",`Semester ${semester}`],["Nama Lomba",namaLomba||"-"],["Nama Tim",namaTim||"-"],["No WhatsApp",whatsapp||"-"],["Link Sosmed",socialLink||"-"],["Tingkatan",tingkatan||"-"],["Tahapan",tahapan||"-"]].map(([label,value])=><div key={label} className="flex gap-3 text-sm"><span className="w-36 shrink-0 font-semibold text-gray-800 dark:text-gray-200">{label}</span><span className="break-words text-gray-600 dark:text-gray-400">{value}</span></div>)}
          </div>
          <div className="mt-6"><h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Dokumen</h3><div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">{documents.map((doc)=><UploadedDocument key={doc.key} label={doc.label} name={doc.name || "Belum diunggah"} url={doc.url} onRemove={()=>removeFile(doc.key, doc.setter)} onPreview={()=>doc.url && setPreviewDoc(doc.url)} />)}</div></div>
        </div>
      </div>}

      {step === 3 && (
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={declarationChecked}
              onChange={(e) => setDeclarationChecked(e.target.checked)}
              className="mt-0.5 h-5 w-5 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
            />
            <span>Saya menyatakan data dan dokumen yang diunggah sudah benar.</span>
          </label>
          {showValidation && !declarationChecked && <p className="mt-2 ml-8 text-xs text-error-500">Pernyataan wajib dicentang sebelum mengirim pengajuan.</p>}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 pb-6 sm:flex-row sm:items-center sm:justify-between">
        <button type="button" onClick={()=>step>1?setStep(step-1):window.history.back()} className="rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300">{step===1?"Batal":"Kembali"}</button>
        {step<3 ? <button type="button" onClick={()=>setStep(step+1)} className="rounded-lg bg-brand-500 px-6 py-3 text-sm font-medium text-white shadow-theme-sm">Lanjutkan</button> : <button type="button" onClick={submit} disabled={!declarationChecked} className={`rounded-lg px-6 py-3 text-sm font-medium text-white shadow-theme-sm transition ${declarationChecked ? "bg-success-500 hover:bg-success-600" : "cursor-not-allowed bg-gray-300 dark:bg-gray-700"}`}>Kirim Pengajuan</button>}
      </div>

      {showConfirm && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"><div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto no-scrollbar rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200/70 dark:border-gray-700 dark:bg-gray-900 dark:ring-gray-700 sm:p-7"><h2 className="text-lg font-semibold text-gray-800 dark:text-white/90">Konfirmasi Pengajuan</h2><p className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">Pastikan seluruh data dan dokumen yang diunggah sudah benar. Setelah dikirim, pengajuan masuk ke proses verifikasi.</p><div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">{documents.map((doc)=><button key={doc.key} type="button" onClick={()=>doc.url&&setPreviewDoc(doc.url)} className="flex items-center gap-3 rounded-lg border border-gray-200 px-3 py-3 text-left dark:border-gray-700"><span className="rounded bg-error-50 px-2 py-1 text-xs font-bold text-error-600">Pdf</span><span className="min-w-0 flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">{doc.name}</span><span className="text-xs text-brand-500">Preview</span></button>)}</div><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={()=>setShowConfirm(false)} className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium">Batal</button><button type="button" onClick={confirmSubmit} className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-medium text-white">Ya, Submit</button></div></div></div>}
      {previewDoc && <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="h-[85vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-slate-200/70 dark:border-gray-700 dark:bg-gray-900 dark:ring-gray-700"><div className="flex items-center justify-between border-b border-gray-200 px-5 py-3 dark:border-gray-800"><h3 className="text-sm font-semibold text-gray-800 dark:text-white/90">Preview Dokumen</h3><button type="button" onClick={()=>setPreviewDoc(null)} className="text-xl text-gray-400">×</button></div><iframe title="Preview dokumen" src={previewDoc} className="h-[calc(85vh-57px)] w-full bg-white" /></div></div>}
    </div>
  );
}
