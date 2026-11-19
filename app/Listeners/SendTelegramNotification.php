<?php

namespace App\Listeners;

use App\Events\PengajuanStatusChanged;
use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendTelegramNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public int $tries = 2;

    public function __construct(
        protected TelegramService $telegram
    ) {}

    public function handle(PengajuanStatusChanged $event): void
    {
        $pengajuan = $event->pengajuan->load([
            'mahasiswa',
            'verifikator',
            'tendik',
            'bidang',
            'tingkatan',
            'tahapan',
            'prodi',
            'mataKuliahs',
        ]);

        $newStatus = $event->newStatus;
        $mhsChatId = (string) ($pengajuan->mahasiswa?->telegram_chat_id ?? '');

        if ($mhsChatId === '' || !in_array($newStatus, ['diterima', 'ditolak', 'selesai'], true)) {
            return;
        }

        $text = $this->buildMahasiswaMessage($newStatus, $pengajuan);
        $this->telegram->sendMessage($mhsChatId, $text);
    }

    protected function buildMahasiswaMessage(string $status, $pengajuan): string
    {
        $botName    = $this->telegram->getBotUsername();
        $namaMhs    = $this->telegram->escapeHtml($pengajuan->mahasiswa?->nama ?? 'Mahasiswa');
        $namaLomba  = $this->telegram->escapeHtml($pengajuan->nama_lomba);
        $bidang     = $this->telegram->escapeHtml($pengajuan->bidang?->nama);
        $tingkatan  = $this->telegram->escapeHtml($pengajuan->tingkatan?->nama);
        $tahapan    = $this->telegram->escapeHtml($pengajuan->tahapan?->nama);
        $verifikator = $this->telegram->escapeHtml($pengajuan->verifikator?->nama ?? 'Dosen Verifikator');
        $feedback   = trim((string) ($pengajuan->feedback_verifikator ?? ''));

        if ($status === 'diterima') {
            $sksRange = ($pengajuan->snapshot_min_sks !== null && $pengajuan->snapshot_max_sks !== null)
                ? "{$pengajuan->snapshot_min_sks}–{$pengajuan->snapshot_max_sks} SKS"
                : "-";
            $nilai = $this->telegram->escapeHtml($pengajuan->snapshot_huruf_nilai ?? '-');

            $lines = [
                "✅ <b>Pengajuan Prestasi Disetujui!</b>",
                "",
                "Halo <b>{$namaMhs}</b>,",
                "Pengajuan prestasi Anda telah <b>disetujui</b> oleh {$verifikator}.",
                "",
                "📋 <b>Detail Keputusan Verifikator:</b>",
                "• Lomba     : {$namaLomba}",
                "• Bidang    : {$bidang}",
                "• Tingkatan : {$tingkatan}",
                "• Capaian   : {$tahapan}",
                "• Kuota SKS : {$sksRange} (Nilai: <b>{$nilai}</b>)",
            ];

            if ($feedback !== '') {
                $lines[] = "• Catatan   : <i>\"" . $this->telegram->escapeHtml($feedback) . "\"</i>";
            }

            $lines[] = "";
            $lines[] = "👉 Silakan buka menu <b>Riwayat Prestasi → Pilih Matkul</b> di SIMPRESMA untuk memilih mata kuliah konversi agar dapat diproses SK oleh Tendik.";
            $lines[] = "";
            $lines[] = "— SIMPRESMA @{$botName}";

            return implode("\n", $lines);
        }

        if ($status === 'ditolak') {
            $alasan = $feedback !== '' ? $this->telegram->escapeHtml($feedback) : 'Tidak memenuhi ketentuan verifikasi.';

            return implode("\n", [
                "❌ <b>Pengajuan Prestasi Ditolak</b>",
                "",
                "Halo <b>{$namaMhs}</b>,",
                "Maaf, pengajuan prestasi Anda <b>ditolak</b> oleh {$verifikator}.",
                "",
                "📋 <b>Detail Keputusan Verifikator:</b>",
                "• Lomba  : {$namaLomba}",
                "• Bidang : {$bidang}",
                "• Alasan Penolakan: <i>\"{$alasan}\"</i>",
                "",
                "Silakan periksa alasan penolakan di atas dan ajukan kembali setelah berkas diperbaiki.",
                "",
                "— SIMPRESMA @{$botName}",
            ]);
        }

        // 'selesai' — Tendik selesai upload SK final & siap diunduh
        $mkList = [];
        foreach ($pengajuan->mataKuliahs as $mk) {
            $nilaiMk = $this->telegram->escapeHtml($mk->pivot?->huruf_nilai ?? $pengajuan->snapshot_huruf_nilai ?? '-');
            $namaMk  = $this->telegram->escapeHtml($mk->nama_mk);
            $sksMk   = (int) ($mk->pivot?->sks_snapshot ?? $mk->sks ?? 0);
            $mkList[] = "  - {$namaMk} ({$sksMk} SKS, Nilai: {$nilaiMk})";
        }

        $lines = [
            "🎉 <b>SK Final Konversi Siap Diunduh!</b>",
            "",
            "Halo <b>{$namaMhs}</b>,",
            "Tendik telah menyelesaikan penerbitan dan mengunggah <b>SK Final</b> untuk prestasi Anda.",
            "",
            "📋 <b>Detail SK Konversi:</b>",
            "• Lomba  : {$namaLomba}",
            "• Bidang : {$bidang}",
            "• Status : 🎓 Selesai (SK Final Siap Diunduh)",
        ];

        if (!empty($mkList)) {
            $lines[] = "• Mata Kuliah Terkonversi:";
            foreach ($mkList as $item) {
                $lines[] = $item;
            }
        }

        if (!empty($pengajuan->link_sk_konversi)) {
            $lines[] = "• Link SK : " . $this->telegram->escapeHtml($pengajuan->link_sk_konversi);
        }

        if (!empty($pengajuan->catatan_tendik)) {
            $lines[] = "• Catatan Tendik : <i>\"" . $this->telegram->escapeHtml($pengajuan->catatan_tendik) . "\"</i>";
        }

        $lines[] = "";
        $lines[] = "👉 Buka menu <b>Riwayat Prestasi → Preview SK / Unduh SK</b> di SIMPRESMA untuk mengunduh SK resmi Anda.";
        $lines[] = "";
        $lines[] = "— SIMPRESMA @{$botName}";

        return implode("\n", $lines);
    }
}
