import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { ChevronLeftIcon, EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import DropdownSelect from "../form/DropdownSelect";
import api from "../../services/api";
import { saveActiveAccount } from "../../pages/Simpresma/SimpresmaMockAccess";

const PRODI_LIST = [
  { id: 1, name: "Sistem Informasi" as const },
  { id: 2, name: "Teknologi Informasi" as const },
  { id: 3, name: "Informatika" as const },
];

export default function SignUpForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [nama, setNama] = useState("");
  const [nim, setNim] = useState("");
  const [prodiId, setProdiId] = useState("1");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!nama.trim() || !nim.trim() || !email.trim() || password.length < 6) {
      setErrorMessage("Lengkapi nama, NIM, email valid, dan password minimal 6 karakter.");
      return;
    }
    if (!isChecked) {
      setErrorMessage("Setujui ketentuan penggunaan layanan SIMPRESMA sebelum mendaftar.");
      return;
    }

    setLoading(true);
    try {
      const selectedProdi = PRODI_LIST.find((p) => String(p.id) === prodiId) || PRODI_LIST[0];
      const res = await api.auth.register({
        nama: nama.trim(),
        nim_nip: nim.trim(),
        email: email.trim(),
        password,
        prodi_id: selectedProdi.id,
        no_whatsapp: whatsapp.trim() || undefined,
      });

      const user = res.data?.user;
      saveActiveAccount(
        {
          name: user?.nama || nama.trim(),
          email: user?.email || email.trim(),
          nim_nip: user?.nim_nip || nim.trim(),
          whatsapp: user?.no_whatsapp || whatsapp.trim(),
          prodi: (user?.prodi?.nama || selectedProdi.name) as
            | "Sistem Informasi"
            | "Teknologi Informasi"
            | "Informatika",
          roles: ["Mahasiswa"],
        },
        "Mahasiswa"
      );

      navigate("/mahasiswa/dashboard");
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      setErrorMessage(
        errorObj?.data?.message || errorObj?.message || "Pendaftaran gagal. Periksa kembali data Anda."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="w-full max-w-md mx-auto mb-5 sm:pt-10">
        <Link
          to="/signin"
          className="inline-flex items-center text-sm text-gray-500 transition-colors hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
        >
          <ChevronLeftIcon className="size-5" />
          Kembali ke halaman masuk
        </Link>
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto pb-8">
        <div>
          <div className="mb-5 sm:mb-7">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Daftar Akun SIMPRESMA
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Pendaftaran akun mahasiswa Fakultas Ilmu Komputer Universitas Jember.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <Label>
                  Nama Lengkap<span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="Contoh: Chelsea Brilliant Syah Putra"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label>
                    NIM<span className="text-error-500">*</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="24241010XXXX"
                    value={nim}
                    onChange={(e) => setNim(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <Label>
                    Program Studi<span className="text-error-500">*</span>
                  </Label>
                  <DropdownSelect
                    value={prodiId}
                    onChange={setProdiId}
                    options={PRODI_LIST.map((p) => ({ value: String(p.id), label: p.name }))}
                  />
                </div>
              </div>

              <div>
                <Label>No. WhatsApp</Label>
                <Input
                  type="text"
                  placeholder="08XXXXXXXXXX"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label>
                  Email<span className="text-error-500">*</span>
                </Label>
                <Input
                  type="email"
                  placeholder="nama@mail.unej.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label>
                  Password<span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    placeholder="Minimal 6 karakter"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  >
                    {showPassword ? (
                      <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    ) : (
                      <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox
                  className="w-5 h-5"
                  checked={isChecked}
                  onChange={setIsChecked}
                />
                <p className="inline-block text-sm font-normal text-gray-500 dark:text-gray-400">
                  Saya menyatakan data mahasiswa yang didaftarkan benar dan menyetujui ketentuan SIMPRESMA FASILKOM UNEJ.
                </p>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center justify-center w-full min-h-[44px] px-4 py-3 text-sm font-medium text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-60"
                >
                  {loading ? "Mendaftarkan..." : "Daftar Sekarang"}
                </button>
              </div>
            </div>
          </form>

          <div className="mt-5">
            <p className="text-sm font-normal text-center text-gray-700 dark:text-gray-400 sm:text-start">
              Sudah memiliki akun?{" "}
              <Link
                to="/signin"
                className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
