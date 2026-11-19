<?php

namespace App\Listeners;

use App\Events\PengajuanSubmitted;
use App\Models\User;
use App\Models\VerifikatorProdi;
use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

/**
 * Listener: notifikasi ke verifikator prodi terkait saat mahasiswa submit pengajuan baru.
 */
class SendNewPengajuanNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public int $tries = 2;

    public function __construct(
        protected TelegramService $telegram
    ) {}

    public function handle(PengajuanSubmitted $event): void
    {
        $pengajuan = $event->pengajuan->load(['mahasiswa', 'prodi', 'bidang', 'tingkatan', 'tahapan']);

        $verifikatorIds = VerifikatorProdi::where('prodi_id', $pengajuan->prodi_id)
            ->where('is_active', 1)
            ->pluck('user_id');

        $verifikators = User::whereIn('id', $verifikatorIds)
            ->whereNotNull('telegram_chat_id')
            ->where('telegram_chat_id', '!=', '')
            ->get();

        if ($verifikators->isEmpty()) {
            return;
        }

        $botName   = $this->telegram->getBotUsername();
        $namaMhs   = $this->telegram->escapeHtml($pengajuan->mahasiswa?->nama);
        $nimMhs    = $this->telegram->escapeHtml($pengajuan->mahasiswa?->nim_nip ?? '-');
        $prodi     = $this->telegram->escapeHtml($pengajuan->prodi?->singkatan ?? $pengajuan->prodi?->nama);
        $namaLomba = $this->telegram->escapeHtml($pengajuan->nama_lomba);
        $bidang    = $this->telegram->escapeHtml($pengajuan->bidang?->nama);
        $tingkatan = $this->telegram->escapeHtml($pengajuan->tingkatan?->nama);
        $tahapan   = $this->telegram->escapeHtml($pengajuan->tahapan?->nama);

        $text = implode("\n", [
            "📨 <b>Pengajuan Prestasi Baru!</b>",
            "",
            "Ada pengajuan baru dari mahasiswa prodi Anda yang menunggu verifikasi:",
            "",
            "• Mahasiswa : {$namaMhs} ({$nimMhs})",
            "• Prodi     : {$prodi}",
            "• Lomba     : {$namaLomba}",
            "• Bidang    : {$bidang}",
            "• Tingkatan : {$tingkatan}",
            "• Capaian   : {$tahapan}",
            "• ID        : #{$pengajuan->id}",
            "",
            "Silakan buka menu <b>Menunggu Verifikasi</b> di SIMPRESMA untuk memeriksa berkas.",
            "",
            "— SIMPRESMA @{$botName}",
        ]);

        foreach ($verifikators as $verifikator) {
            $this->telegram->sendMessage((string) $verifikator->telegram_chat_id, $text);
        }
    }
}
