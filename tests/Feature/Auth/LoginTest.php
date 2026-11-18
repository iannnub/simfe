<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    protected bool $seed = true;

    public function test_login_dengan_email_berhasil(): void
    {
        $res = $this->postJson('/api/auth/login', [
            'email'    => 'mahasiswa@fasilkom.unej.ac.id',
            'password' => 'password',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'mahasiswa@fasilkom.unej.ac.id')
            ->assertJsonStructure(['data' => ['token', 'user' => ['id', 'nama', 'email', 'avatar', 'roles']]]);
    }

    public function test_login_dengan_nim_atau_nip_berhasil(): void
    {
        $res = $this->postJson('/api/auth/login', [
            'email'    => '242410101079',
            'password' => 'password',
        ]);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.nim_nip', '242410101079');
    }

    public function test_register_mahasiswa_baru_berhasil(): void
    {
        $res = $this->postJson('/api/auth/register', [
            'nama'        => 'Bima Sakti',
            'nim_nip'     => '242410101999',
            'email'       => 'bima.sakti@unej.ac.id',
            'password'    => 'rahasia123',
            'no_whatsapp' => '081234560000',
        ]);

        $res->assertStatus(201)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.user.email', 'bima.sakti@unej.ac.id');

        $this->assertDatabaseHas('users', ['email' => 'bima.sakti@unej.ac.id', 'nim_nip' => '242410101999']);
    }

    public function test_update_profil_dan_upload_foto_profil(): void
    {
        Storage::fake('public');

        $user = User::where('email', 'mahasiswa@fasilkom.unej.ac.id')->first();
        Sanctum::actingAs($user);

        $avatar = UploadedFile::fake()->image('profil.jpg', 200, 200);

        $res = $this->post('/api/auth/profile', [
            'nama'        => 'Chelsea Brilliant Updated',
            'no_whatsapp' => '089876543210',
            'avatar'      => $avatar,
        ], ['Accept' => 'application/json']);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.nama', 'Chelsea Brilliant Updated')
            ->assertJsonPath('data.no_whatsapp', '089876543210');

        $avatarUrl = $res->json('data.avatar');
        $this->assertNotNull($avatarUrl);
        $this->assertStringStartsWith('/storage/avatars/', $avatarUrl);

        // Remove avatar
        $resRemove = $this->postJson('/api/auth/profile', [
            'remove_avatar' => true,
        ]);

        $resRemove->assertStatus(200)
            ->assertJsonPath('data.avatar', null);
    }

    public function test_upload_dokumen_pdf(): void
    {
        Storage::fake('public');

        $user = User::where('email', 'mahasiswa@fasilkom.unej.ac.id')->first();
        Sanctum::actingAs($user);

        $pdf = UploadedFile::fake()->create('sertifikat.pdf', 120, 'application/pdf');

        $res = $this->post('/api/upload-dokumen', [
            'file' => $pdf,
        ], ['Accept' => 'application/json']);

        $res->assertStatus(200)
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.name', 'sertifikat.pdf');

        $this->assertStringStartsWith('/storage/dokumen/', $res->json('data.url'));
    }
}
