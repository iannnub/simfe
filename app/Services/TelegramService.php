<?php

namespace App\Services;

use App\Models\Pengajuan;
use App\Models\User;
use App\Models\VerifikatorProdi;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    protected string $token;
    protected string $baseUrl;

    public function __construct()
    {
        $this->token   = (string) (config('services.telegram.bot_token') ?? '');
        $this->baseUrl = $this->token !== '' ? "https://api.telegram.org/bot{$this->token}" : '';
    }

    public function isConfigured(): bool
    {
        return $this->token !== '';
    }

    public function getBotUsername(): string
    {
        return ltrim((string) (config('services.telegram.bot_username') ?? 'simpresmafasilkom_bot'), '@');
    }

    public function escapeHtml(?string $value): string
    {
        return htmlspecialchars((string) ($value ?? '-'), ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    /**
     * Eksekusi panggilan HTTP ke Telegram Bot API secara aman.
     */
    protected function request(string $method, array $payload = [], int $timeout = 8): ?array
    {
        if (!$this->isConfigured()) {
            return null;
        }

        try {
            $response = Http::timeout($timeout)->post("{$this->baseUrl}/{$method}", $payload);

            if (!$response->successful()) {
                Log::warning("[TelegramService] API {$method} error", [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);
                return null;
            }

            $json = $response->json();
            return is_array($json) && ($json['ok'] ?? false) ? $json : null;
        } catch (\Throwable $e) {
            Log::error("[TelegramService] {$method} exception", [
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Kirim pesan teks HTML ke Telegram Chat ID.
     * Tidak melempar exception agar proses utama tidak terganggu.
     */
    public function sendMessage(string $chatId, string $text, array $extra = []): bool
    {
        if (!$this->isConfigured() || trim($chatId) === '') {
            return false;
        }

        $payload = array_merge([
            'chat_id'                  => $chatId,
            'text'                     => $text,
            'parse_mode'               => 'HTML',
            'disable_web_page_preview' => true,
        ], $extra);

        $json = $this->request('sendMessage', $payload, 8);
        return $json !== null;
    }

    public function getMe(): ?array
    {
        $json = $this->request('getMe', [], 8);
        return $json['result'] ?? null;
    }

    public function getWebhookInfo(): ?array
    {
        $json = $this->request('getWebhookInfo', [], 8);
        return $json['result'] ?? null;
    }

    public function getUpdates(?int $offset = null, int $timeout = 0, int $limit = 50): array
    {
        $payload = ['limit' => $limit];
        if ($offset !== null) {
            $payload['offset'] = $offset;
        }
        if ($timeout > 0) {
            $payload['timeout'] = $timeout;
        }

        $json = $this->request('getUpdates', $payload, max(8, $timeout + 5));
        $result = $json['result'] ?? [];
        return is_array($result) ? $result : [];
    }

    public function setWebhook(string $url, ?string $secretToken = null): bool
    {
        $payload = ['url' => $url];
        if (!empty($secretToken)) {
            $payload['secret_token'] = $secretToken;
        }

        return $this->request('setWebhook', $payload, 8) !== null;
    }

    public function deleteWebhook(bool $dropPendingUpdates = false): bool
    {
        return $this->request('deleteWebhook', [
            'drop_pending_updates' => $dropPendingUpdates,
        ], 8) !== null;
    }

    public function setMyCommands(array $commands): bool
    {
        return $this->request('setMyCommands', ['commands' => $commands], 8) !== null;
    }

    /**
     * Proses update dari Telegram (dipakai Webhook Controller, polling command, & check-link).
     */
    public function processUpdate(array $update): array
    {
        $message = $update['message'] ?? $update['channel_post'] ?? null;
        if (!is_array($message)) {
            return ['handled' => false, 'action' => 'ignored'];
        }

        $chatId = $message['chat']['id'] ?? null;
        $text   = trim((string) ($message['text'] ?? ''));

        if ($chatId === null || $chatId === '') {
            return ['handled' => false, 'action' => 'no_chat_id'];
        }

        $chatIdStr = (string) $chatId;
        $firstName = $this->escapeHtml($message['from']['first_name'] ?? 'pengguna');
        $botName   = $this->getBotUsername();

        // /start [optional_token] (atau /start@botname token)
        if (preg_match('/^\/start(?:@\S+)?(?:\s+(\S+))?/i', $text, $matches)) {
            $token = $matches[1] ?? '';

            if ($token !== '') {
                $userId = Cache::get("tg_link:{$token}");
                if ($userId && ($user = User::find($userId))) {
                    $alreadyTaken = User::where('telegram_chat_id', $chatIdStr)
                        ->where('id', '!=', $user->id)
                        ->exists();

                    if ($alreadyTaken) {
                        $this->sendMessage($chatIdStr, implode("\n", [
                            "⚠️ <b>Chat ID Sudah Terhubung</b>",
                            "",
                            "Akun Telegram ini sudah terhubung dengan akun SIMPRESMA lain.",
                            "Silakan putuskan koneksi pada akun sebelumnya terlebih dahulu jika ingin memindahkan.",
                            "",
                            "— SIMPRESMA @{$botName}",
                        ]));
                        return ['handled' => true, 'action' => 'conflict', 'chat_id' => $chatIdStr];
                    }

                    $user->update([
                        'telegram_chat_id'      => $chatIdStr,
                        'telegram_connected_at' => now(),
                    ]);
                    Cache::forget("tg_link:{$token}");
                    Cache::forget("tg_user_token:{$user->id}");

                    $this->sendMessage($chatIdStr, implode("\n", [
                        "✅ <b>Akun Berhasil Terhubung!</b>",
                        "",
                        "Halo <b>{$this->escapeHtml($user->nama)}</b>,",
                        "Akun SIMPRESMA Anda kini terhubung otomatis dengan Telegram.",
                        "",
                        "Anda akan menerima notifikasi real-time sesuai peran Anda di SIMPRESMA.",
                        "",
                        "— SIMPRESMA @{$botName}",
                    ]));

                    return [
                        'handled' => true,
                        'action'  => 'linked',
                        'user_id' => $user->id,
                        'chat_id' => $chatIdStr,
                    ];
                }
            }

            $this->sendMessage($chatIdStr, implode("\n", [
                "👋 Halo, <b>{$firstName}</b>!",
                "",
                "Selamat datang di <b>SIMPRESMA FASILKOM UNEJ Bot</b> (@{$botName}).",
                "",
                "🔑 <b>Chat ID kamu adalah:</b>",
                "<code>{$chatIdStr}</code>",
                "",
                "Salin angka di atas dan tempelkan pada menu <b>Profil → Notifikasi Telegram</b> di aplikasi SIMPRESMA, atau gunakan tombol <b>Hubungkan Otomatis</b>.",
                "",
                "Ketik /help untuk melihat daftar perintah.",
            ]));

            return ['handled' => true, 'action' => 'start', 'chat_id' => $chatIdStr];
        }

        if (preg_match('/^\/id(?:@\S+)?\b/i', $text)) {
            $this->sendMessage($chatIdStr, implode("\n", [
                "🔑 <b>Chat ID Telegram Anda:</b>",
                "<code>{$chatIdStr}</code>",
            ]));

            return ['handled' => true, 'action' => 'id', 'chat_id' => $chatIdStr];
        }

        if (preg_match('/^\/status(?:@\S+)?\b/i', $text)) {
            $user = User::with('roles')->where('telegram_chat_id', $chatIdStr)->first();

            if (!$user) {
                $this->sendMessage($chatIdStr, implode("\n", [
                    "ℹ️ <b>Akun Belum Terhubung</b>",
                    "",
                    "Chat ID <code>{$chatIdStr}</code> belum terhubung dengan akun SIMPRESMA mana pun.",
                    "Buka <b>Profil → Notifikasi Telegram</b> pada SIMPRESMA untuk menghubungkan akun Anda.",
                ]));
                return ['handled' => true, 'action' => 'status_unlinked', 'chat_id' => $chatIdStr];
            }

            $roles = is_array($user->role) && !empty($user->role)
                ? $user->role
                : $user->roles->pluck('name')->toArray();
            $roleLabel = !empty($roles) ? implode(', ', $roles) : '-';

            $lines = [
                "📊 <b>Status Akun SIMPRESMA</b>",
                "",
                "• Nama  : <b>{$this->escapeHtml($user->nama)}</b>",
                "• Peran : {$this->escapeHtml($roleLabel)}",
            ];

            if ($user->hasRole('mahasiswa')) {
                $latest = Pengajuan::where('user_id', $user->id)->latest('id')->first();
                $totalMhs = Pengajuan::where('user_id', $user->id)->count();
                $lines[] = "• Total Pengajuan : {$totalMhs}";
                if ($latest) {
                    $lines[] = "• Pengajuan Terakhir : <b>{$this->escapeHtml($latest->nama_lomba)}</b> ({$this->escapeHtml($latest->status)})";
                }
            }

            if ($user->hasRole('verifikator')) {
                $prodiIds = VerifikatorProdi::where('user_id', $user->id)
                    ->where('is_active', 1)
                    ->pluck('prodi_id');
                $pendingVerif = Pengajuan::whereIn('prodi_id', $prodiIds)
                    ->where('status', 'pending')
                    ->count();
                $lines[] = "• Antrean Verifikasi Prodi : {$pendingVerif} pending";
            }

            if ($user->hasRole('tendik')) {
                $siapSk = Pengajuan::where('status', 'diterima')
                    ->whereHas('pengajuanMataKuliahs')
                    ->count();
                $lines[] = "• Antrean Siap SK (MK Terpilih) : {$siapSk} pengajuan";
            }

            $lines[] = "";
            $lines[] = "— SIMPRESMA @{$botName}";

            $this->sendMessage($chatIdStr, implode("\n", $lines));

            return ['handled' => true, 'action' => 'status', 'user_id' => $user->id, 'chat_id' => $chatIdStr];
        }

        if (preg_match('/^\/help(?:@\S+)?\b/i', $text)) {
            $this->sendMessage($chatIdStr, implode("\n", [
                "🤖 <b>Bantuan SIMPRESMA Bot (@{$botName})</b>",
                "",
                "<b>Perintah Tersedia:</b>",
                "• /start — Mulai &amp; lihat Chat ID Anda",
                "• /id — Tampilkan Chat ID Telegram Anda",
                "• /status — Cek status akun &amp; ringkasan pengajuan",
                "• /help — Tampilkan bantuan ini",
                "",
                "<b>Notifikasi Otomatis:</b>",
                "1. Pengajuan baru mahasiswa → ke Verifikator Prodi terkait",
                "2. Keputusan Verifikator (Disetujui / Ditolak + alasan) → ke Mahasiswa",
                "3. Mahasiswa selesai memilih MK konversi → ke Tendik (siap buat SK)",
                "4. SK Final selesai diunggah Tendik → ke Mahasiswa (siap unduh)",
            ]));

            return ['handled' => true, 'action' => 'help', 'chat_id' => $chatIdStr];
        }

        return ['handled' => false, 'action' => 'unknown_command', 'chat_id' => $chatIdStr];
    }
}
