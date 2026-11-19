<?php

use App\Services\TelegramService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Cache;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Artisan::command('telegram:setup {--webhook= : HTTPS webhook URL (kosongkan untuk mode polling lokal)}', function (TelegramService $telegram) {
    if (!$telegram->isConfigured()) {
        $this->error('TELEGRAM_BOT_TOKEN belum dikonfigurasi di .env');
        return 1;
    }

    $me = $telegram->getMe();
    if (!$me) {
        $this->error('Gagal terhubung ke Telegram Bot API. Periksa token dan koneksi internet.');
        return 1;
    }

    $this->info("Bot terhubung: @{$me['username']} (ID: {$me['id']})");

    $commands = [
        ['command' => 'start', 'description' => 'Mulai & tampilkan Chat ID Telegram'],
        ['command' => 'id', 'description' => 'Lihat Chat ID Telegram Anda'],
        ['command' => 'status', 'description' => 'Cek status akun & pengajuan SIMPRESMA'],
        ['command' => 'help', 'description' => 'Bantuan & daftar notifikasi bot'],
    ];

    if ($telegram->setMyCommands($commands)) {
        $this->info('Menu perintah Telegram (/start, /id, /status, /help) berhasil didaftarkan.');
    } else {
        $this->warn('Gagal mendaftarkan menu perintah Telegram.');
    }

    $webhook = (string) ($this->option('webhook') ?? '');
    if ($webhook !== '') {
        $secret = config('services.telegram.webhook_secret');
        if ($telegram->setWebhook($webhook, is_string($secret) && $secret !== '' ? $secret : null)) {
            $this->info("Webhook aktif di: {$webhook}");
        } else {
            $this->error("Gagal menyetel webhook ke {$webhook}. Pastikan URL menggunakan HTTPS publik.");
            return 1;
        }
    } else {
        if ($telegram->deleteWebhook(false)) {
            $this->info('Webhook dihapus — bot siap untuk mode polling lokal (`php artisan telegram:poll`).');
        }
    }

    return 0;
})->purpose('Verifikasi bot Telegram, daftarkan menu perintah, dan atur webhook/polling');

Artisan::command('telegram:poll {--once : Ambil update sekali saja lalu keluar}', function (TelegramService $telegram) {
    if (!$telegram->isConfigured()) {
        $this->error('TELEGRAM_BOT_TOKEN belum dikonfigurasi di .env');
        return 1;
    }

    $me = $telegram->getMe();
    if (!$me) {
        $this->error('Gagal terhubung ke Telegram API.');
        return 1;
    }

    $telegram->deleteWebhook(false);
    $once = (bool) $this->option('once');
    $this->info("Mendengarkan pesan masuk untuk @{$me['username']}... " . ($once ? '(once)' : '(Tekan Ctrl+C untuk berhenti)'));

    do {
        $offset  = Cache::get('telegram_poll_offset');
        $updates = $telegram->getUpdates(is_numeric($offset) ? (int) $offset : null, $once ? 0 : 10);

        foreach ($updates as $update) {
            $updateId = (int) ($update['update_id'] ?? 0);
            $result   = $telegram->processUpdate($update);
            $this->line(sprintf(
                '[%s] update #%d -> %s',
                now()->format('H:i:s'),
                $updateId,
                $result['action'] ?? 'processed'
            ));
            if ($updateId > 0) {
                Cache::forever('telegram_poll_offset', $updateId + 1);
            }
        }
    } while (!$once);

    return 0;
})->purpose('Jalankan polling Telegram lokal agar /start dan perintah bot langsung merespons tanpa webhook publik');

Artisan::command('telegram:test {chat_id : Chat ID tujuan uji coba}', function (TelegramService $telegram) {
    if (!$telegram->isConfigured()) {
        $this->error('TELEGRAM_BOT_TOKEN belum dikonfigurasi di .env');
        return 1;
    }

    $chatId = (string) $this->argument('chat_id');
    $botName = $telegram->getBotUsername();
    $ok = $telegram->sendMessage($chatId, implode("\n", [
        "🔔 <b>Tes Koneksi SIMPRESMA Bot</b>",
        "",
        "Notifikasi Telegram dari <b>SIMPRESMA FASILKOM UNEJ</b> (@{$botName}) berfungsi dengan baik.",
        "Waktu server: " . now()->format('d M Y H:i:s') . " WIB",
    ]));

    if ($ok) {
        $this->info("Pesan uji coba berhasil dikirim ke Chat ID {$chatId}.");
        return 0;
    }

    $this->error("Gagal mengirim pesan ke Chat ID {$chatId}. Pastikan user sudah pernah klik Start di @{$botName}.");
    return 1;
})->purpose('Kirim pesan tes ke Chat ID Telegram tertentu');
