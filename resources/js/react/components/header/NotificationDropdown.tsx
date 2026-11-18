import { useMemo, useState } from "react";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { Link, useLocation, useNavigate } from "react-router";
import { usePrestasi } from "../../pages/Simpresma/SimpresmaShared";
import { loadProfileForRole } from "../../pages/Simpresma/SimpresmaMockAccess";

interface NotificationEntry {
  id: string;
  title: string;
  message: string;
  badgeColor: string;
  category: string;
  time: string;
  to: string;
}

export default function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [readAll, setReadAll] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { data } = usePrestasi();

  const role = location.pathname.startsWith("/verifikator")
    ? "Verifikator"
    : location.pathname.startsWith("/tendik")
    ? "Tendik"
    : "Mahasiswa";

  const notifications = useMemo<NotificationEntry[]>(() => {
    const profile = loadProfileForRole(role);

    if (role === "Verifikator") {
      const pendingItems = data.filter((item) => item.status === "Pending");
      return pendingItems.slice(0, 6).map((item) => ({
        id: `verif-${item.id}`,
        title: item.mahasiswa,
        message: `mengajukan verifikasi prestasi "${item.lomba}"`,
        badgeColor: "bg-warning-500",
        category: item.prodi,
        time: item.tanggal,
        to: "/verifikator/menunggu",
      }));
    }

    if (role === "Tendik") {
      const readyItems = data.filter((item) => item.status === "Terkonversi");
      return readyItems.slice(0, 6).map((item) => ({
        id: `tendik-${item.id}`,
        title: item.mahasiswa,
        message: item.skUploaded
          ? `SK Final "${item.lomba}" telah terunggah`
          : `menunggu penerbitan SK konversi "${item.lomba}"`,
        badgeColor: item.skUploaded ? "bg-success-500" : "bg-brand-500",
        category: item.prodi,
        time: item.tanggal,
        to: "/tendik/data-prestasi",
      }));
    }

    const myItems = data.filter(
      (item) =>
        item.mahasiswa === "Chelsea Brilliant Syah Putra" ||
        (profile.name && item.mahasiswa === profile.name) ||
        (profile.nim_nip && item.nim === profile.nim_nip)
    );

    return myItems.slice(0, 6).map((item) => {
      let message = `Pengajuan "${item.lomba}" sedang diproses verifikator`;
      let badgeColor = "bg-warning-500";
      if (item.status === "Diterima") {
        message = `Disetujui! Pilih mata kuliah konversi untuk "${item.lomba}"`;
        badgeColor = "bg-success-500";
      } else if (item.status === "Terkonversi" && item.skUploaded) {
        message = `SK Konversi untuk "${item.lomba}" sudah tersedia dan dapat diunduh`;
        badgeColor = "bg-brand-500";
      } else if (item.status === "Terkonversi") {
        message = `Konversi "${item.lomba}" menunggu penerbitan SK dari Tendik`;
        badgeColor = "bg-brand-500";
      } else if (item.status === "Ditolak") {
        message = `Perlu perbaikan pada "${item.lomba}": ${item.feedback || "Periksa catatan"}`;
        badgeColor = "bg-error-500";
      }

      return {
        id: `mhs-${item.id}`,
        title: "Status Pengajuan",
        message,
        badgeColor,
        category: item.status === "Terkonversi" && item.skUploaded ? "SK Terbit" : item.status,
        time: item.tanggal,
        to: "/mahasiswa/riwayat",
      };
    });
  }, [data, role]);

  const unreadCount = readAll ? 0 : notifications.length;
  const viewAllPath =
    role === "Verifikator"
      ? "/verifikator/menunggu"
      : role === "Tendik"
      ? "/tendik/data-prestasi"
      : "/mahasiswa/riwayat";

  function toggleDropdown() {
    setIsOpen(!isOpen);
  }

  function closeDropdown() {
    setIsOpen(false);
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Notifikasi SIMPRESMA"
        className="relative flex items-center justify-center text-gray-500 transition-colors bg-white border border-gray-200 rounded-full dropdown-toggle hover:text-gray-700 h-11 w-11 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
        onClick={toggleDropdown}
      >
        {unreadCount > 0 && (
          <span className="absolute right-0 top-0.5 z-10 flex h-2.5 w-2.5 rounded-full bg-orange-400">
            <span className="absolute inline-flex w-full h-full bg-orange-400 rounded-full opacity-75 animate-ping"></span>
          </span>
        )}
        <svg
          className="fill-current"
          width="20"
          height="20"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
            fill="currentColor"
          />
        </svg>
      </button>
      <Dropdown
        isOpen={isOpen}
        onClose={closeDropdown}
        className="simpresma-notification-dropdown absolute -right-[240px] mt-[17px] flex max-h-[480px] w-[340px] flex-col rounded-2xl border border-gray-200 bg-white p-3 shadow-theme-lg dark:border-gray-800 dark:bg-gray-dark sm:w-[361px] lg:right-0"
      >
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h5 className="text-base font-semibold text-gray-800 dark:text-gray-200">
              Notifikasi
            </h5>
            {unreadCount > 0 && (
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => setReadAll(true)}
                className="text-xs font-medium text-brand-500 hover:text-brand-600"
              >
                Tandai dibaca
              </button>
            )}
            <button
              type="button"
              onClick={closeDropdown}
              aria-label="Tutup Notifikasi"
              className="text-gray-500 transition dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              ×
            </button>
          </div>
        </div>
        <ul className="flex flex-col h-auto overflow-y-auto custom-scrollbar">
          {notifications.length ? (
            notifications.map((item) => (
              <li key={item.id}>
                <DropdownItem
                  onItemClick={() => {
                    closeDropdown();
                    navigate(item.to);
                  }}
                  className="flex gap-3 rounded-lg border-b border-gray-100 px-3 py-3 text-left hover:bg-gray-100 dark:border-gray-800 dark:hover:bg-white/5"
                >
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.badgeColor}`} />
                  <span className="block min-w-0">
                    <span className="mb-1 block text-theme-sm text-gray-600 dark:text-gray-300">
                      <span className="font-semibold text-gray-800 dark:text-white/90">{item.title}: </span>
                      <span>{item.message}</span>
                    </span>
                    <span className="flex items-center gap-2 text-gray-500 text-theme-xs dark:text-gray-400">
                      <span>{item.category}</span>
                      <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                      <span>{item.time}</span>
                    </span>
                  </span>
                </DropdownItem>
              </li>
            ))
          ) : (
            <li className="py-8 text-center text-sm text-gray-500">Belum ada notifikasi baru.</li>
          )}
        </ul>
        <Link
          to={viewAllPath}
          onClick={closeDropdown}
          className="block px-4 py-2 mt-3 text-sm font-medium text-center text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          Lihat Semua Aktivitas
        </Link>
      </Dropdown>
    </div>
  );
}
