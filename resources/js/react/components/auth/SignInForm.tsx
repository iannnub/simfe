import React, { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";
import api from "../../services/api";
import { saveActiveAccount, rolePath, Role } from "../../pages/Simpresma/SimpresmaMockAccess";

export default function SignInForm() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Silakan masukkan email/username dan password.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      const user = res.data?.user;

      if (user) {
        // Map backend roles to UI Roles
        const roleMap: Record<string, Role> = {
          mahasiswa: "Mahasiswa",
          verifikator: "Verifikator",
          tendik: "Tendik",
          wadek: "Wadek",
          admin: "Wadek",
          kaprodi: "Kaprodi",
        };

        const rawRoles: string[] = Array.isArray(user.roles) ? user.roles : [];
        const mappedRoles: Role[] = rawRoles
          .map((r: string) => roleMap[r.toLowerCase()])
          .filter(Boolean) as Role[];

        const primaryRole: Role = mappedRoles[0] || "Mahasiswa";

        saveActiveAccount(
          {
            name: user.nama || user.name || "Pengguna SIMPRESMA",
            email: user.email,
            roles: mappedRoles.length > 0 ? mappedRoles : ["Mahasiswa"],
            prodi: (user.prodi?.nama || user.prodi || undefined) as
              | "Sistem Informasi"
              | "Teknologi Informasi"
              | "Informatika"
              | undefined,
            nim_nip: user.nim_nip || undefined,
            whatsapp: user.no_whatsapp || undefined,
            avatar: user.avatar || undefined,
            telegramConnected: user.telegram_connected || false,
            telegramChatId: user.telegram_chat_id || "",
          },
          primaryRole
        );

        navigate(rolePath[primaryRole] || "/mock-access");
      }
    } catch (err: unknown) {
      const errorObj = err as { data?: { message?: string }; message?: string };
      setErrorMessage(
        errorObj?.data?.message || errorObj?.message || "Login gagal. Periksa kembali email dan password Anda."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGapuraLogin = () => {
    window.location.href = "/api/auth/gapura/redirect";
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex flex-col items-center justify-center flex-1 w-full max-w-md mx-auto">
        <div className="w-full">
          <div className="mb-5 sm:mb-8 text-center sm:text-left">
            <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md">
              Masuk ke SIMPRESMA
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sistem Informasi Manajemen Prestasi Mahasiswa FASILKOM Universitas Jember.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-4 rounded-lg bg-error-50 p-3 text-sm text-error-700 dark:bg-error-500/10 dark:text-error-400">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="space-y-5">
              <div>
                <Label>
                  Email / Username <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  placeholder="contoh: wadek@test.com atau 242410101079"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div>
                <Label>
                  Password <span className="text-error-500">*</span>
                </Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password"
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

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox checked={isChecked} onChange={setIsChecked} />
                  <span className="block font-normal text-gray-700 text-theme-sm dark:text-gray-400">
                    Ingat saya
                  </span>
                </div>
                <Link
                  to="/mock-access"
                  className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 font-medium"
                >
                  Simulasi Akun
                </Link>
              </div>

              <div>
                <Button type="submit" className="w-full" size="sm" disabled={loading}>
                  {loading ? "Memproses..." : "Masuk"}
                </Button>
              </div>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200 dark:border-gray-700" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500 dark:bg-gray-900 dark:text-gray-400">
                    Atau masuk dengan
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGapuraLogin}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700/60"
              >
                <span className="font-bold text-amber-500">GAPURA</span> UNEJ Single Sign-On
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
