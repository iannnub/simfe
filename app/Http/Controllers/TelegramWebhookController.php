<?php

namespace App\Http\Controllers;

use App\Services\TelegramService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class TelegramWebhookController extends Controller
{
    public function __construct(
        protected TelegramService $telegram
    ) {}

    /**
     * POST /api/telegram/webhook
     * Menerima update dari Telegram Bot API dan memproses command (/start, /id, /status, /help).
     */
    public function handle(Request $request): JsonResponse
    {
        $configuredSecret = (string) (config('services.telegram.webhook_secret') ?? '');
        if ($configuredSecret !== '') {
            $headerSecret = (string) $request->header('X-Telegram-Bot-Api-Secret-Token', '');
            if (!hash_equals($configuredSecret, $headerSecret)) {
                Log::warning('[TelegramWebhook] Invalid secret token attempt');
                return response()->json(['ok' => false, 'message' => 'Unauthorized webhook secret'], 403);
            }
        }

        $update = $request->all();
        Log::info('[TelegramWebhook] Incoming update', ['update_id' => $update['update_id'] ?? null]);

        $this->telegram->processUpdate($update);

        return response()->json(['ok' => true]);
    }
}
