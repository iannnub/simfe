<?php

namespace Tests\Feature;

use App\Models\Prodi;
use App\Models\Role;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KaprodiModuleTest extends TestCase
{
    use RefreshDatabase;

    protected User $kaprodi;
    protected Prodi $prodi;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed();

        $this->prodi = Prodi::where('singkatan', 'SI')->first();
        $this->kaprodi = User::where('email', 'kaprodi.si@fasilkom.unej.ac.id')->first();
    }

    public function test_kaprodi_can_view_pengajuan_list(): void
    {
        $response = $this->actingAs($this->kaprodi, 'sanctum')
            ->getJson('/api/kaprodi/pengajuan');

        $response->assertStatus(200)
            ->assertJsonPath('success', true);
    }

    public function test_kaprodi_can_view_statistik(): void
    {
        $response = $this->actingAs($this->kaprodi, 'sanctum')
            ->getJson('/api/kaprodi/statistik');

        $response->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonStructure([
                'success',
                'message',
                'data' => [
                    'prodi',
                    'prodi_id',
                    'total',
                    'pending',
                    'diterima',
                    'selesai',
                    'ditolak',
                ],
            ]);
    }

    public function test_unauthenticated_user_cannot_access_kaprodi_routes(): void
    {
        $response = $this->getJson('/api/kaprodi/statistik');
        $response->assertStatus(401);
    }
}
