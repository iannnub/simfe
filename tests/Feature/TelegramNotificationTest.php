<?php

namespace Tests\Feature;

use App\Models\BidangLomba;
use App\Models\BidangMataKuliah;
use App\Models\MataKuliah;
use App\Models\Pengajuan;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TelegramNotificationTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    protected User $mhsSI;
    protected User $verifSI;
    protected User $verifTI;
    protected User $tendik;
    protected BidangLomba $bidangProgramming;
    protected MataKuliah $mkSI;

    protected function setUp(): void
    {
        parent::setUp();

        Config::set('services.telegram.bot_token', '123456:TEST_TOKEN');
        Config::set('services.telegram.bot_username', 'simpresmafasilkom_bot');
        Config::set('services.telegram.webhook_secret', '');

        $this->mhsSI   = User::where('email', 'mhs.si@test.com')->firstOrFail();
        $this->verifSI = User::where('email', 'verif.si@test.com')->firstOrFail();
        $this->verifTI = User::where('email', 'verif.ti@test.com')->firstOrFail();
        $this->tendik  = User::where('email', 'tendik@test.com')->firstOrFail();

        $this->mhsSI->update(['telegram_chat_id' => '100100100']);
        $this->verifSI->update(['telegram_chat_id' => '200200201']);
        $this->verifTI->update(['telegram_chat_id' => '200200202']);
        $this->tendik->update(['telegram_chat_id' => '300300301']);

        $this->bidangProgramming = BidangLomba::where('nama', 'Programming')->firstOrFail();
        $this->mkSI = BidangMataKuliah::where('bidang_id', $this->bidangProgramming->id)
            ->where('is_active', 1)
            ->whereHas('mataKuliah', fn ($q) => $q->where('prodi_id', $this->mhsSI->prodi_id)->where('is_active', 1))
            ->with('mataKuliah')
            ->firstOrFail()
            ->mataKuliah;
    }

    private function createSubmittedPengajuan(string $namaLomba = 'Gemastik XIX', array $mkIds = []): Pengajuan
    {
        Sanctum::actingAs($this->mhsSI);

        $res = $this->postJson('/api/mahasiswa/pengajuan', [
            'no_whatsapp'                  => '081234567890',
            'semester'                     => 6,
            'nama_lomba'                   => $namaLomba,
            'bidang_id'                    => $this->bidangProgramming->id,
            'tingkatan_id'                 => 1, // Internasional
            'tahapan_id'                   => 2, // Lolos Tahap Awal (2-3 SKS, AB)
            'mata_kuliah_ids'              => $mkIds,
            'link_sertifikat'              => 'https://example.com/sertifikat.pdf',
            'link_surat_tugas_mahasiswa'   => 'https://example.com/st-mhs.pdf',
            'link_surat_tugas_dosen'       => 'https://example.com/st-dsn.pdf',
            'link_poster'                  => 'https://example.com/poster.pdf',
            'link_sosmed'                  => 'https://instagram.com/p/gemastik',
            'status_surat_tugas_mahasiswa' => 1,
            'status_surat_tugas_dosen'     => 1,
        ]);

        $res->assertStatus(201);
        return Pengajuan::findOrFail($res->json('data.id'));
    }

    public function test_flow1_pengajuan_baru_notifies_matching_prodi_verifikator_only(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 1]], 200),
        ]);

        $pengajuan = $this->createSubmittedPengajuan('Hackathon Prodi SI');

        // Verifikator SI mendapat notifikasi
        Http::assertSent(function ($request) use ($pengajuan) {
            return str_contains($request->url(), '/sendMessage')
                && ($request['chat_id'] ?? null) === '200200201'
                && str_contains((string) ($request['text'] ?? ''), 'Pengajuan Prestasi Baru')
                && str_contains((string) ($request['text'] ?? ''), 'Hackathon Prodi SI')
                && str_contains((string) ($request['text'] ?? ''), "#{$pengajuan->id}");
        });

        // Verifikator TI tidak mendapat notifikasi pengajuan prodi SI
        Http::assertNotSent(function ($request) {
            return str_contains($request->url(), '/sendMessage')
                && ($request['chat_id'] ?? null) === '200200202';
        });
    }

    public function test_flow2a_verifikator_terima_notifies_mahasiswa_and_not_tendik_prematurely(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 2]], 200),
        ]);

        $pengajuan = $this->createSubmittedPengajuan('Gemastik Approved');

        Sanctum::actingAs($this->verifSI);
        $this->postJson("/api/verifikator/pengajuan/{$pengajuan->id}/terima", [
            'feedback_verifikator' => 'Berkas lengkap, silakan pilih mata kuliah konversi.',
        ])->assertStatus(200);

        // Mahasiswa menerima notifikasi persetujuan
        Http::assertSent(function ($request) {
            $text = (string) ($request['text'] ?? '');
            return str_contains($request->url(), '/sendMessage')
                && ($request['chat_id'] ?? null) === '100100100'
                && str_contains($text, 'Pengajuan Prestasi Disetujui')
                && str_contains($text, 'Gemastik Approved')
                && str_contains($text, 'Pilih Matkul');
        });

        // Tendik TIDAK boleh menerima notifikasi sebelum mahasiswa memilih mata kuliah konversi
        Http::assertNotSent(function ($request) {
            return str_contains($request->url(), '/sendMessage')
                && ($request['chat_id'] ?? null) === '300300301';
        });
    }

    public function test_flow2b_verifikator_tolak_notifies_mahasiswa_with_alasan_penolakan_and_html_escape(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 3]], 200),
        ]);

        $pengajuan = $this->createSubmittedPengajuan('Lomba Rejected & Test');

        Sanctum::actingAs($this->verifSI);
        // Gunakan alias field `feedback` (juga harus diterima) + karakter HTML berbahaya
        $this->postJson("/api/verifikator/pengajuan/{$pengajuan->id}/tolak", [
            'feedback' => 'Sertifikat <b>buram</b> & belum bertanda tangan',
        ])->assertStatus(200);

        Http::assertSent(function ($request) {
            $text = (string) ($request['text'] ?? '');
            return str_contains($request->url(), '/sendMessage')
                && ($request['chat_id'] ?? null) === '100100100'
                && str_contains($text, 'Pengajuan Prestasi Ditolak')
                && str_contains($text, 'Lomba Rejected &amp; Test')
                && str_contains($text, 'buram &amp; belum bertanda tangan')
                && !str_contains($text, '<b>buram</b>');
        });
    }

    public function test_flow3_pilih_mata_kuliah_notifies_tendik_siap_sk(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 4]], 200),
        ]);

        $pengajuan = $this->createSubmittedPengajuan('ICPC Regional Asia');

        Sanctum::actingAs($this->verifSI);
        $this->postJson("/api/verifikator/pengajuan/{$pengajuan->id}/terima")->assertStatus(200);

        // Mahasiswa lain tidak bisa memilih MK untuk pengajuan orang lain (403)
        $mhsLain = User::where('email', 'mhs.ti@test.com')->firstOrFail();
        Sanctum::actingAs($mhsLain);
        $this->postJson("/api/mahasiswa/pengajuan/{$pengajuan->id}/mata-kuliah", [
            'mata_kuliah_ids' => [$this->mkSI->id],
        ])->assertStatus(403);

        // Mahasiswa pemilik memilih mata kuliah konversi
        Sanctum::actingAs($this->mhsSI);
        $res = $this->postJson("/api/mahasiswa/pengajuan/{$pengajuan->id}/mata-kuliah", [
            'mata_kuliah_ids' => [$this->mkSI->id],
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('pengajuan_mata_kuliah', [
            'pengajuan_id'   => $pengajuan->id,
            'mata_kuliah_id' => $this->mkSI->id,
            'sks_snapshot'   => $this->mkSI->sks,
        ]);

        // Tendik menerima notifikasi Siap Dibuatkan SK
        Http::assertSent(function ($request) {
            $text = (string) ($request['text'] ?? '');
            return str_contains($request->url(), '/sendMessage')
                && ($request['chat_id'] ?? null) === '300300301'
                && str_contains($text, 'Pengajuan Siap Dibuatkan SK')
                && str_contains($text, 'ICPC Regional Asia')
                && str_contains($text, $this->mkSI->nama_mk);
        });
    }

    public function test_flow3_rejects_selecting_courses_when_pengajuan_still_pending(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true], 200),
        ]);

        $pengajuan = $this->createSubmittedPengajuan('Belum Disetujui');

        Sanctum::actingAs($this->mhsSI);
        $this->postJson("/api/mahasiswa/pengajuan/{$pengajuan->id}/mata-kuliah", [
            'mata_kuliah_ids' => [$this->mkSI->id],
        ])->assertStatus(422)
          ->assertJsonValidationErrors(['status']);
    }

    public function test_flow4_tendik_upload_sk_final_notifies_mahasiswa_ready_to_download(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 5]], 200),
        ]);

        $pengajuan = $this->createSubmittedPengajuan('COMPFEST XVI');

        Sanctum::actingAs($this->verifSI);
        $this->postJson("/api/verifikator/pengajuan/{$pengajuan->id}/terima")->assertStatus(200);

        Sanctum::actingAs($this->mhsSI);
        $this->postJson("/api/mahasiswa/pengajuan/{$pengajuan->id}/mata-kuliah", [
            'mata_kuliah_ids' => [$this->mkSI->id],
        ])->assertStatus(200);

        Sanctum::actingAs($this->tendik);
        // Tendik finalisasi tanpa nilai_per_mk -> auto-isi huruf_nilai dari snapshot ('AB')
        $res = $this->postJson("/api/tendik/pengajuan/{$pengajuan->id}/finalisasi", [
            'link_sk_konversi' => 'https://siakad.unej.ac.id/sk/compfest-xvi.pdf',
            'catatan_tendik'   => 'SK telah ditandatangani Dekan.',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('data.status', 'selesai');

        $this->assertDatabaseHas('pengajuan_mata_kuliah', [
            'pengajuan_id'   => $pengajuan->id,
            'mata_kuliah_id' => $this->mkSI->id,
            'huruf_nilai'    => 'AB',
        ]);

        // Mahasiswa menerima notifikasi SK Final Siap Diunduh
        Http::assertSent(function ($request) {
            $text = (string) ($request['text'] ?? '');
            return str_contains($request->url(), '/sendMessage')
                && ($request['chat_id'] ?? null) === '100100100'
                && str_contains($text, 'SK Final Konversi Siap Diunduh')
                && str_contains($text, 'COMPFEST XVI')
                && str_contains($text, 'https://siakad.unej.ac.id/sk/compfest-xvi.pdf')
                && str_contains($text, 'SK telah ditandatangani Dekan.');
        });
    }

    public function test_webhook_commands_and_deep_link_auto_connect(): void
    {
        Http::fake([
            'api.telegram.org/*' => Http::response(['ok' => true, 'result' => ['message_id' => 6]], 200),
        ]);

        // 1. /start mengembalikan Chat ID
        $this->postJson('/api/telegram/webhook', [
            'update_id' => 1001,
            'message'   => [
                'chat' => ['id' => 555666777],
                'from' => ['first_name' => 'Budi'],
                'text' => '/start',
            ],
        ])->assertStatus(200)->assertJson(['ok' => true]);

        Http::assertSent(function ($request) {
            return str_contains($request->url(), '/sendMessage')
                && ($request['chat_id'] ?? null) === '555666777'
                && str_contains((string) ($request['text'] ?? ''), '555666777')
                && str_contains((string) ($request['text'] ?? ''), 'simpresmafasilkom_bot');
        });

        // 2. Deep-link token connect otomatis
        $newMhs = User::where('email', 'mhs.if@test.com')->firstOrFail();
        $newMhs->update(['telegram_chat_id' => null]);

        Sanctum::actingAs($newMhs);
        $tokenRes = $this->postJson('/api/auth/telegram/link-token');
        $tokenRes->assertStatus(200);

        $deepLink = (string) $tokenRes->json('data.deep_link');
        $this->assertStringContainsString('https://t.me/simpresmafasilkom_bot?start=', $deepLink);
        parse_str((string) parse_url($deepLink, PHP_URL_QUERY), $query);
        $linkToken = $query['start'] ?? '';
        $this->assertNotEmpty($linkToken);

        $this->postJson('/api/telegram/webhook', [
            'update_id' => 1002,
            'message'   => [
                'chat' => ['id' => 888999000],
                'from' => ['first_name' => 'Mahasiswa IF'],
                'text' => "/start {$linkToken}",
            ],
        ])->assertStatus(200);

        $newMhs->refresh();
        $this->assertEquals('888999000', $newMhs->telegram_chat_id);
        $this->assertNotNull($newMhs->telegram_connected_at);

        // 3. Test send notification endpoint & disconnect
        $this->postJson('/api/auth/telegram/test')->assertStatus(200);
        $this->postJson('/api/auth/disconnect-telegram')->assertStatus(200);
        $newMhs->refresh();
        $this->assertNull($newMhs->telegram_chat_id);

        // 4. Secret token enforcement
        Config::set('services.telegram.webhook_secret', 'rahasia-webhook');
        $this->postJson('/api/telegram/webhook', ['update_id' => 1003])
            ->assertStatus(403);
        $this->postJson('/api/telegram/webhook', [
            'update_id' => 1004,
            'message'   => ['chat' => ['id' => 100100100], 'text' => '/status'],
        ], ['X-Telegram-Bot-Api-Secret-Token' => 'rahasia-webhook'])
            ->assertStatus(200);
    }
}
