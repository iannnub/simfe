<?php

namespace App\Listeners;

use App\Events\MataKuliahKonversiSelected;
use App\Models\User;
use App\Services\TelegramService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendTendikSiapSkNotification implements ShouldQueue
{
    use InteractsWithQueue;

    public int $tries = 2;

    public function __construct(
        protected TelegramService $telegram
    ) {}

    public function handle(MataKuliahKonversiSelected $event): void
    {
        $pengajuan = $event->pengajuan->load([
            'mahasiswa',
            'prodi',
            'bidang',
            'tingkatan',
            'tahapan',
            'mataKuliahs',
            'verifikator',
        ]);

        $tendikUsers = User::with('roles')
            ->whereNotNull('telegram_chat_id')
            ->where('telegram_chat_id', '!=', '')
            ->get()
            ->filter(fn (User $u) => $u->hasRole('tendik'));

        if ($tendikUsers->isEmpty()) {
            return;
        }

        $botName    = $this->telegram->getBotUsername();
        $namaMhs    = $this->telegram->escapeHtml($pengajuan->mahasiswa?->nama ?? $event->mahasiswa->nama);
        $nimMhs     = $this->telegram->escapeHtml($pengajuan->mahasiswa?->nim_nip ?? $event->mahasiswa->nim_nip ?? '-');
        $prodi      = $this->telegram->escapeHtml($pengajuan->prodi?->singkatan ?? $pengajuan->prodi?->nama ?? '-');
        $namaLomba  = $this->telegram->escapeHtml($pengajuan->nama_lomba);
        $bidang     = $this->telegram->escapeHtml($pengajuan->bidang?->nama);
        $nilaiHuruf = $this->telegram->escapeHtml($pengajuan->snapshot_huruf_nilai ?? '-');

        $totalSks = 0;
        $mkLines = [];
        foreach ($pengajuan->mataKuliahs as $mk) {
            $sks = (int) ($mk->pivot?->sks_snapshot ?? $mk->sks ?? 0);
            $totalSks += $sks;
            $kode = $this->telegram->escapeHtml($mk->kode_mk);
            $nama = $this->telegram->escapeHtml($mk->nama_mk);
            $mkLines[] = "  - {$kode} - {$nama} ({$sks} SKS)";
        }

        $mkSection = !empty($mkLines) ? implode("\n", $mkLines) : "  - (Belum ada mata kuliah)";

        $text = implode("\n", [
            "📄 <b>Pengajuan Siap Dibuatkan SK!</b>",
            "",
            "Mahasiswa telah selesai memilih mata kuliah konversi pada pengajuan yang disetujui:",
            "",
            "• Mahasiswa : {$namaMhs} ({$nimMhs})",
            "• Prodi     : {$prodi}",
            "• Lomba     : {$namaLomba}",
            "• Bidang    : {$bidang}",
            "• Total SKS : {$totalSks} SKS (Nilai: <b>{$nilaiHuruf}</b>)",
            "• ID        : #{$pengajuan->id}",
            "",
            "<b>Mata Kuliah Konversi Dipilih:</b>",
            $mkSection,
            "",
            "Silakan buka menu <b>Pengajuan &amp; Upload SK</b> di SIMPRESMA untuk memproses dan mengunggah SK Final.",
            "",
            "— SIMPRESMA @{$botName}",
        ]);

        foreach ($tendikUsers as $tendik) {
            $this->telegram->sendMessage((string) $tendik->telegram_chat_id, $text);
        }
    }
}
