<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Prodi;
use App\Models\Role;
use App\Models\User;
use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * POST /api/auth/login
     * Login — email atau NIM/NIP + password
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email'    => 'required|string',
            'password' => 'required|string',
        ]);

        $loginKey = trim($request->email);
        $user = User::with(['prodi', 'roles'])
            ->where('email', $loginKey)
            ->orWhere('nim_nip', $loginKey)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email / NIM / NIP atau password salah.'],
            ]);
        }

        $token = $user->createToken('simpresma-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login berhasil.',
            'data'    => [
                'token' => $token,
                'user'  => $this->formatUser($user),
            ],
        ]);
    }

    /**
     * POST /api/auth/register
     * Registrasi akun Mahasiswa baru SIMPRESMA
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nama'        => 'required|string|max:150',
            'nim_nip'     => 'required|string|max:30|unique:users,nim_nip',
            'email'       => 'required|email|max:150|unique:users,email',
            'password'    => 'required|string|min:6',
            'prodi_id'    => 'nullable|exists:prodi,id',
            'no_whatsapp' => 'nullable|string|max:20',
        ]);

        $prodiId = $validated['prodi_id'] ?? Prodi::orderBy('id')->value('id');

        $user = User::create([
            'nama'        => $validated['nama'],
            'nim_nip'     => $validated['nim_nip'],
            'email'       => $validated['email'],
            'password'    => Hash::make($validated['password']),
            'prodi_id'    => $prodiId,
            'no_whatsapp' => $validated['no_whatsapp'] ?? null,
            'role'        => ['mahasiswa'],
        ]);

        if ($roleMhs = Role::where('name', 'mahasiswa')->first()) {
            $user->roles()->syncWithoutDetaching([$roleMhs->id]);
        }

        $token = $user->createToken('simpresma-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Pendaftaran akun mahasiswa berhasil.',
            'data'    => [
                'token' => $token,
                'user'  => $this->formatUser($user->fresh(['prodi', 'roles'])),
            ],
        ], 201);
    }

    /**
     * POST|PUT /api/auth/profile
     * Middleware: auth:sanctum
     * Update profil pengguna, password, & foto profil (avatar)
     */
    public function updateProfile(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'nama'          => 'sometimes|required|string|max:150',
            'email'         => ['sometimes', 'required', 'email', 'max:150', Rule::unique('users', 'email')->ignore($user->id)],
            'nim_nip'       => ['sometimes', 'nullable', 'string', 'max:30', Rule::unique('users', 'nim_nip')->ignore($user->id)],
            'no_whatsapp'   => 'sometimes|nullable|string|max:20',
            'password'      => 'sometimes|nullable|string|min:6',
            'avatar'        => 'sometimes|nullable',
            'remove_avatar' => 'sometimes|boolean',
        ]);

        $updateData = [];
        foreach (['nama', 'email', 'nim_nip', 'no_whatsapp'] as $field) {
            if (array_key_exists($field, $validated)) {
                $updateData[$field] = $validated[$field];
            }
        }

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        if ($request->boolean('remove_avatar')) {
            if ($user->avatar && str_starts_with($user->avatar, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar));
            }
            $updateData['avatar'] = null;
        } elseif ($request->hasFile('avatar')) {
            $request->validate([
                'avatar' => 'image|mimes:jpeg,png,jpg,webp|max:5120',
            ]);
            if ($user->avatar && str_starts_with($user->avatar, '/storage/')) {
                Storage::disk('public')->delete(str_replace('/storage/', '', $user->avatar));
            }
            $path = $request->file('avatar')->store('avatars', 'public');
            $updateData['avatar'] = '/storage/' . $path;
        } elseif (is_string($request->input('avatar')) && strlen($request->input('avatar')) <= 500) {
            $updateData['avatar'] = $request->input('avatar');
        }

        if (!empty($updateData)) {
            $user->update($updateData);
        }

        return response()->json([
            'success' => true,
            'message' => 'Profil berhasil diperbarui.',
            'data'    => $this->formatUser($user->fresh(['prodi', 'roles'])),
        ]);
    }

    /**
     * POST /api/upload-dokumen
     * Middleware: auth:sanctum
     * Upload dokumen PDF asli ke storage publik
     */
    public function uploadDokumen(Request $request): JsonResponse
    {
        $request->validate([
            'file' => 'required|file|mimes:pdf|max:10240',
        ]);

        $file = $request->file('file');
        $path = $file->store('dokumen', 'public');

        return response()->json([
            'success' => true,
            'message' => 'Dokumen berhasil diunggah.',
            'data'    => [
                'name' => $file->getClientOriginalName(),
                'url'  => '/storage/' . $path,
                'size' => $file->getSize(),
            ],
        ]);
    }

    /**
     * POST /api/auth/logout
     * Middleware: auth:sanctum
     */
    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logout berhasil.',
        ]);
    }

    /**
     * GET /api/auth/me
     * Middleware: auth:sanctum
     */
    public function me(Request $request): JsonResponse
    {
        $user = $request->user()->load(['prodi', 'roles']);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $this->formatUser($user),
        ]);
    }

    /**
     * POST /api/auth/connect-telegram
     * Hubungkan akun user dengan Telegram Chat ID.
     * Middleware: auth:sanctum
     */
    public function connectTelegram(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'telegram_chat_id' => ['required', 'string', 'regex:/^\d+$/'],
        ], [
            'telegram_chat_id.required' => 'Chat ID Telegram wajib diisi.',
            'telegram_chat_id.regex'    => 'Chat ID Telegram harus berupa angka.',
        ]);

        $user = $request->user();

        // Cek apakah chat_id sudah dipakai akun lain
        $existing = User::where('telegram_chat_id', $validated['telegram_chat_id'])
            ->where('id', '!=', $user->id)
            ->exists();

        if ($existing) {
            throw ValidationException::withMessages([
                'telegram_chat_id' => ['Chat ID ini sudah terhubung dengan akun lain.'],
            ]);
        }

        $user->update([
            'telegram_chat_id'      => $validated['telegram_chat_id'],
            'telegram_connected_at' => now(),
        ]);

        // Kirim pesan konfirmasi ke user
        try {
            $telegram = app(TelegramService::class);
            $telegram->sendMessage(
                $validated['telegram_chat_id'],
                implode("\n", [
                    "✅ <b>Akun Berhasil Terhubung!</b>",
                    "",
                    "Halo <b>{$telegram->escapeHtml($user->nama)}</b>,",
                    "Akun SIMPRESMA Anda kini terhubung dengan Telegram.",
                    "",
                    "Anda akan menerima notifikasi real-time untuk setiap update pengajuan prestasi.",
                    "",
                    "— SIMPRESMA @{$telegram->getBotUsername()}",
                ])
            );
        } catch (\Throwable) {
            // Jangan gagalkan request jika Telegram API error
        }

        return response()->json([
            'success' => true,
            'message' => 'Akun Telegram berhasil dihubungkan.',
            'data'    => $this->formatUser($user->fresh(['prodi', 'roles'])),
        ]);
    }

    /**
     * POST /api/auth/telegram/link-token
     * Hasilkan tautan deep-link satu klik menuju bot Telegram untuk menghubungkan akun otomatis.
     */
    public function createTelegramLinkToken(Request $request, TelegramService $telegram): JsonResponse
    {
        $user  = $request->user();
        $token = Str::random(32);

        Cache::put("tg_link:{$token}", $user->id, now()->addMinutes(10));
        Cache::put("tg_user_token:{$user->id}", $token, now()->addMinutes(10));

        $botUsername = $telegram->getBotUsername();

        return response()->json([
            'success' => true,
            'message' => 'Tautan penghubung Telegram siap digunakan.',
            'data'    => [
                'deep_link'    => "https://t.me/{$botUsername}?start={$token}",
                'bot_username' => $botUsername,
                'expires_in'   => 600,
            ],
        ]);
    }

    /**
     * POST /api/auth/telegram/check-link
     * Cek status koneksi Telegram user (sekaligus sinkronisasi getUpdates saat berjalan di lokal).
     */
    public function checkTelegramLink(Request $request, TelegramService $telegram): JsonResponse
    {
        $user  = $request->user();
        $fresh = $user->fresh(['prodi', 'roles']);

        if (empty($fresh->telegram_chat_id) && $telegram->isConfigured()) {
            $webhookUrl  = (string) (config('services.telegram.webhook_url') ?? '');
            $webhookHost = (string) (parse_url($webhookUrl, PHP_URL_HOST) ?? '');
            $isLocalMode = $webhookUrl === '' || in_array($webhookHost, ['localhost', '127.0.0.1', '0.0.0.0'], true);

            if ($isLocalMode) {
                $expectedToken = Cache::get("tg_user_token:{$user->id}");
                $offset        = Cache::get('telegram_poll_offset');
                $updates       = $telegram->getUpdates(is_numeric($offset) ? (int) $offset : null, 0, 50);

                foreach ($updates as $update) {
                    $text = (string) ($update['message']['text'] ?? '');
                    if ($expectedToken && str_contains($text, $expectedToken)) {
                        $telegram->processUpdate($update);
                        $updateId = (int) ($update['update_id'] ?? 0);
                        if ($updateId > 0) {
                            Cache::forever('telegram_poll_offset', $updateId + 1);
                        }
                    }
                }

                $fresh = $user->fresh(['prodi', 'roles']);
            }
        }

        $connected = !empty($fresh->telegram_chat_id);

        return response()->json([
            'success'   => true,
            'message'   => $connected ? 'Akun Telegram sudah terhubung.' : 'Akun Telegram belum terhubung.',
            'connected' => $connected,
            'data'      => $this->formatUser($fresh),
        ]);
    }

    /**
     * POST /api/auth/telegram/test
     * Kirim pesan uji coba ke Telegram user yang sedang login.
     */
    public function testTelegram(Request $request, TelegramService $telegram): JsonResponse
    {
        $user = $request->user();

        if (empty($user->telegram_chat_id)) {
            return response()->json([
                'success' => false,
                'message' => 'Akun Anda belum terhubung dengan Telegram Chat ID.',
            ], 422);
        }

        $botName = $telegram->getBotUsername();
        $sent = $telegram->sendMessage(
            (string) $user->telegram_chat_id,
            implode("\n", [
                "🔔 <b>Tes Notifikasi SIMPRESMA Berhasil!</b>",
                "",
                "Halo <b>{$telegram->escapeHtml($user->nama)}</b>,",
                "Pesan ini mengonfirmasi bahwa notifikasi Telegram SIMPRESMA (@{$botName}) siap mengirim pembaruan real-time ke akun Anda.",
            ])
        );

        if (!$sent) {
            return response()->json([
                'success' => false,
                'message' => "Gagal mengirim pesan ke Telegram. Pastikan Anda sudah menekan Start di bot @{$botName}.",
            ], 502);
        }

        return response()->json([
            'success' => true,
            'message' => 'Pesan tes berhasil dikirim ke Telegram Anda.',
        ]);
    }

    /**
     * POST /api/auth/disconnect-telegram
     * Putuskan koneksi Telegram dari akun user.
     * Middleware: auth:sanctum
     */
    public function disconnectTelegram(Request $request): JsonResponse
    {
        $user = $request->user();

        $user->update([
            'telegram_chat_id'      => null,
            'telegram_connected_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Koneksi Telegram berhasil diputus.',
            'data'    => $this->formatUser($user->fresh(['prodi', 'roles'])),
        ]);
    }

    // ─── Private Helper ──────────────────────────────────

    private function formatUser(User $user): array
    {
        return [
            'id'                     => $user->id,
            'nim_nip'                => $user->nim_nip,
            'nama'                   => $user->nama,
            'email'                  => $user->email,
            'no_whatsapp'            => $user->no_whatsapp,
            'avatar'                 => $user->avatar,
            'telegram_chat_id'       => $user->telegram_chat_id,
            'telegram_connected'     => !empty($user->telegram_chat_id),
            'telegram_connected_at'  => $user->telegram_connected_at?->toISOString(),
            'prodi'                  => $user->prodi ? [
                'id'        => $user->prodi->id,
                'singkatan' => $user->prodi->singkatan,
                'nama'      => $user->prodi->nama,
            ] : null,
            'roles' => is_array($user->role) && !empty($user->role) ? $user->role : $user->roles->pluck('name')->toArray(),
        ];
    }
}
