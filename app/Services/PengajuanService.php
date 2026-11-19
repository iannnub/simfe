<?php

namespace App\Services;

use App\Events\MataKuliahKonversiSelected;
use App\Events\PengajuanStatusChanged;
use App\Models\BidangLomba;
use App\Models\BidangMataKuliah;
use App\Models\MataKuliah;
use App\Models\Pengajuan;
use App\Models\PengajuanMataKuliah;
use App\Models\User;
use App\Models\VerifikatorProdi;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Pengajuan Service
 * Core business logic for student achievement conversion & verification workflow.
 *
 * @package App\Services
 * @architect iannnub
 * @signature d35c7c946e4c5248bf2956f4c4618528333ad26db652c7f5c2c6797afcd0de88
 */
class PengajuanService
{
    public function __construct(
        protected MatriksService $matriksService
    ) {}

    /**
     * Submit pengajuan prestasi mahasiswa.
     *
     * @throws ValidationException
     */
    public function submit(array $data, User $mahasiswa): Pengajuan
    {
        if (!$mahasiswa->prodi_id) {
            throw ValidationException::withMessages([
                'prodi_id' => ['Akun mahasiswa belum memiliki program studi yang terdaftar.'],
            ]);
        }

        // 1. Validasi duplikasi pengajuan aktif
        $isDuplicate = Pengajuan::where('user_id', $mahasiswa->id)
            ->where('nama_lomba', $data['nama_lomba'])
            ->whereIn('status', ['pending', 'diterima'])
            ->exists();

        if ($isDuplicate) {
            throw ValidationException::withMessages([
                'nama_lomba' => ['Pengajuan untuk nama lomba ini masih dalam proses aktif (status pending atau diterima).'],
            ]);
        }

        // 2. Lookup & Snapshot Matriks
        $matriks = $this->matriksService->snapshot(
            (int) $data['tingkatan_id'],
            (int) $data['tahapan_id']
        );

        $hasConversion = $matriks && $matriks->min_sks !== null && $matriks->max_sks !== null;

        // 3. Validasi Mata Kuliah jika ada yang dipilih oleh mahasiswa
        if (!empty($data['mata_kuliah_ids']) && is_array($data['mata_kuliah_ids'])) {
            $maxAllowedSks = $hasConversion ? (int) $matriks->max_sks : 0;
            $mataKuliahs = $this->validateMataKuliah(
                $data['mata_kuliah_ids'],
                (int) $data['bidang_id'],
                (int) $mahasiswa->prodi_id,
                $maxAllowedSks
            );
        } else {
            $mataKuliahs = collect();
        }

        // 4. Atomic Transaction: Simpan Pengajuan & Pivot Mata Kuliah
        return DB::transaction(function () use ($data, $mahasiswa, $matriks, $hasConversion, $mataKuliahs) {
            $pengajuan = Pengajuan::create([
                'user_id'                      => $mahasiswa->id,
                'prodi_id'                     => $mahasiswa->prodi_id,
                'nama_tim'                     => $this->sanitizeText($data['nama_tim'] ?? null),
                'no_whatsapp'                  => trim($data['no_whatsapp']),
                'nama_lomba'                   => $this->sanitizeText($data['nama_lomba']),
                'bidang_id'                    => $data['bidang_id'],
                'tingkatan_id'                 => $data['tingkatan_id'],
                'tahapan_id'                   => $data['tahapan_id'],
                'semester'                     => $data['semester'] ?? null,
                'detail_juara'                 => $this->sanitizeText($data['detail_juara'] ?? null),
                'snapshot_min_sks'             => $hasConversion ? $matriks->min_sks : null,
                'snapshot_max_sks'             => $hasConversion ? $matriks->max_sks : null,
                'snapshot_huruf_nilai'         => $hasConversion ? $matriks->huruf_nilai : null,
                'link_sertifikat'              => trim($data['link_sertifikat']),
                'status_surat_tugas_mahasiswa' => !empty($data['link_surat_tugas_mahasiswa']) ? 1 : (int) ($data['status_surat_tugas_mahasiswa'] ?? 0),
                'link_surat_tugas_mahasiswa'   => isset($data['link_surat_tugas_mahasiswa']) ? trim($data['link_surat_tugas_mahasiswa']) : null,
                'status_surat_tugas_dosen'     => !empty($data['link_surat_tugas_dosen']) ? 1 : (int) ($data['status_surat_tugas_dosen'] ?? 0),
                'link_surat_tugas_dosen'       => isset($data['link_surat_tugas_dosen']) ? trim($data['link_surat_tugas_dosen']) : null,
                'link_poster'                  => isset($data['link_poster']) ? trim($data['link_poster']) : null,
                'link_sosmed'                  => isset($data['link_sosmed']) ? trim($data['link_sosmed']) : null,
                'keterangan'                   => $this->sanitizeText($data['keterangan'] ?? null),
                'status'                       => 'pending',
            ]);

            foreach ($mataKuliahs as $mk) {
                PengajuanMataKuliah::create([
                    'pengajuan_id'   => $pengajuan->id,
                    'mata_kuliah_id' => $mk->id,
                    'sks_snapshot'   => $mk->sks,
                    'huruf_nilai'    => null,
                ]);
            }

            return $pengajuan->load(['mataKuliahs', 'bidang', 'tingkatan', 'tahapan', 'prodi', 'mahasiswa']);
        });
    }

    /**
     * Validasi mata kuliah yang dipilih mahasiswa:
     * - Tidak duplikat dalam list
     * - Terdaftar aktif pada mapping bidang dan prodi mahasiswa
     * - Total SKS berada di dalam rentang [min_sks, max_sks]
     *
     * @throws ValidationException
     */
    public function validateMataKuliah(
        array $mkIds,
        int $bidangId,
        int $prodiId,
        int $maxSks = 0
    ): Collection {
        if (empty($mkIds)) {
            return new Collection();
        }

        $uniqueMkIds = array_unique($mkIds);
        if (count($uniqueMkIds) !== count($mkIds)) {
            throw ValidationException::withMessages([
                'mata_kuliah_ids' => ['Terdapat mata kuliah yang duplikat dalam pilihan.'],
            ]);
        }

        // Scope validation: MK harus aktif, prodi sesuai, dan terhubung ke bidang_lomba
        $validMkIds = BidangMataKuliah::where('bidang_id', $bidangId)
            ->where('is_active', 1)
            ->whereHas('mataKuliah', fn($q) => $q->where('prodi_id', $prodiId)->where('is_active', 1))
            ->pluck('mata_kuliah_id')
            ->map(fn($id) => (int) $id)
            ->toArray();

        foreach ($mkIds as $mkId) {
            if (!in_array((int) $mkId, $validMkIds, true)) {
                throw ValidationException::withMessages([
                    'mata_kuliah_ids' => ['Satu atau lebih mata kuliah yang dipilih tidak sesuai dengan bidang lomba dan program studi mahasiswa.'],
                ]);
            }
        }

        $mataKuliahs = MataKuliah::whereIn('id', $mkIds)->get();
        $totalSks = $mataKuliahs->sum('sks');

        // Validasi batas maksimum: mahasiswa diperbolehkan mengambil di bawah min_sks jika sisa MK kurikulumnya sedikit
        if ($maxSks === 0 && $totalSks > 0) {
            throw ValidationException::withMessages([
                'mata_kuliah_ids' => ["Tahapan lomba ini tidak menyediakan konversi SKS (hanya pencatatan portofolio/SKPI). Tidak dapat memilih mata kuliah."],
            ]);
        }

        if ($maxSks > 0 && $totalSks > $maxSks) {
            throw ValidationException::withMessages([
                'mata_kuliah_ids' => ["Total SKS mata kuliah yang dipilih ({$totalSks} SKS) melebihi batas maksimum konversi ({$maxSks} SKS)."],
            ]);
        }

        return $mataKuliahs;
    }

    /**
     * Mahasiswa memilih / menyimpan mata kuliah konversi pada pengajuan yang telah diterima.
     *
     * @throws ValidationException
     */
    public function pilihMataKuliah(
        Pengajuan $pengajuan,
        User $mahasiswa,
        array $mkIds = [],
        array $mkNames = []
    ): Pengajuan {
        if ($pengajuan->user_id !== $mahasiswa->id) {
            abort(403, 'Akses ditolak. Anda tidak berhak mengubah pengajuan ini.');
        }

        if ($pengajuan->status !== 'diterima') {
            throw ValidationException::withMessages([
                'status' => ['Mata kuliah konversi hanya dapat dipilih pada pengajuan yang telah disetujui (diterima) oleh Verifikator.'],
            ]);
        }

        $maxAllowedSks = (int) ($pengajuan->snapshot_max_sks ?? 0);

        if (!empty($mkIds)) {
            $mataKuliahs = $this->validateMataKuliah(
                $mkIds,
                (int) $pengajuan->bidang_id,
                (int) $pengajuan->prodi_id,
                $maxAllowedSks
            );
        } else {
            $mataKuliahs = $this->resolveMataKuliahByNames(
                $mkNames,
                (int) $pengajuan->bidang_id,
                (int) $pengajuan->prodi_id,
                $maxAllowedSks
            );
        }

        DB::transaction(function () use ($pengajuan, $mataKuliahs) {
            PengajuanMataKuliah::where('pengajuan_id', $pengajuan->id)->delete();

            foreach ($mataKuliahs as $mk) {
                PengajuanMataKuliah::create([
                    'pengajuan_id'   => $pengajuan->id,
                    'mata_kuliah_id' => $mk->id,
                    'sks_snapshot'   => $mk->sks,
                    'huruf_nilai'    => null,
                ]);
            }
        });

        $fresh = $pengajuan->fresh([
            'mataKuliahs',
            'pengajuanMataKuliahs.mataKuliah',
            'bidang',
            'tingkatan',
            'tahapan',
            'prodi',
            'verifikator',
            'mahasiswa',
        ]);

        event(new MataKuliahKonversiSelected($fresh, $mahasiswa));

        return $fresh;
    }

    /**
     * Resolusi daftar nama/kode MK (fallback dari UI) ke entitas MataKuliah pada prodi terkait.
     *
     * @throws ValidationException
     */
    protected function resolveMataKuliahByNames(
        array $mkNames,
        int $bidangId,
        int $prodiId,
        int $maxSks = 0
    ): Collection {
        if ($maxSks === 0) {
            throw ValidationException::withMessages([
                'mata_kuliah_ids' => ['Tahapan lomba ini tidak menyediakan konversi SKS (hanya pencatatan portofolio/SKPI). Tidak dapat memilih mata kuliah.'],
            ]);
        }

        $cleanNames = collect($mkNames)
            ->map(function ($name) {
                $str = trim((string) $name);
                if (str_contains($str, ' - ')) {
                    return trim(substr($str, strpos($str, ' - ') + 3));
                }
                return $str;
            })
            ->filter()
            ->values();

        if ($cleanNames->isEmpty()) {
            throw ValidationException::withMessages([
                'mata_kuliah_names' => ['Pilih minimal satu mata kuliah konversi.'],
            ]);
        }

        $prodiCourses = MataKuliah::where('prodi_id', $prodiId)
            ->where('is_active', 1)
            ->get();

        $matched = $prodiCourses->filter(function ($mk) use ($cleanNames) {
            $mkNameLower = mb_strtolower(trim($mk->nama_mk));
            $mkCodeLower = mb_strtolower(trim($mk->kode_mk));
            return $cleanNames->contains(function ($needle) use ($mkNameLower, $mkCodeLower) {
                $needleLower = mb_strtolower($needle);
                return $needleLower === $mkNameLower || $needleLower === $mkCodeLower;
            });
        })->values();

        if ($matched->isEmpty()) {
            $mappedIds = BidangMataKuliah::where('bidang_id', $bidangId)
                ->where('is_active', 1)
                ->pluck('mata_kuliah_id');

            $fallbackCandidates = $prodiCourses->whereIn('id', $mappedIds)->values();
            if ($fallbackCandidates->isEmpty()) {
                $fallbackCandidates = $prodiCourses;
            }

            $selected = new Collection();
            $accSks = 0;
            foreach ($fallbackCandidates as $candidate) {
                if ($maxSks > 0 && ($accSks + (int) $candidate->sks) > $maxSks) {
                    continue;
                }
                $selected->push($candidate);
                $accSks += (int) $candidate->sks;
                if ($selected->count() >= $cleanNames->count()) {
                    break;
                }
            }
            $matched = $selected;
        }

        if ($matched->isEmpty()) {
            throw ValidationException::withMessages([
                'mata_kuliah_names' => ['Mata kuliah konversi yang sesuai untuk program studi Anda tidak ditemukan.'],
            ]);
        }

        $totalSks = $matched->sum('sks');
        if ($maxSks > 0 && $totalSks > $maxSks) {
            throw ValidationException::withMessages([
                'mata_kuliah_names' => ["Total SKS mata kuliah yang dipilih ({$totalSks} SKS) melebihi batas maksimum konversi ({$maxSks} SKS)."],
            ]);
        }

        return $matched;
    }

    /**
     * Verifikator menerima pengajuan.
     *
     * @throws ValidationException
     */
    public function terima(Pengajuan $pengajuan, User $verifikator, ?string $feedback = null, ?int $bidangId = null): Pengajuan
    {
        $this->validateVerifikatorScope($verifikator, $pengajuan->prodi_id);

        if ($pengajuan->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Hanya pengajuan dengan status pending yang dapat diverifikasi.'],
            ]);
        }

        $updateData = [
            'status'               => 'diterima',
            'feedback_verifikator' => $feedback ? strip_tags(trim($feedback)) : 'Pengajuan telah diperiksa dan disetujui oleh Dosen Verifikator.',
            'verifikator_id'       => $verifikator->id,
            'verified_at'          => now(),
        ];

        if ($bidangId !== null && BidangLomba::where('id', $bidangId)->where('is_active', 1)->exists()) {
            $updateData['bidang_id'] = $bidangId;
        }

        $pengajuan->update($updateData);

        $fresh = $pengajuan->fresh(['mataKuliahs', 'bidang', 'tingkatan', 'tahapan', 'prodi', 'verifikator', 'mahasiswa']);

        // Kirim notifikasi Telegram (async via queue)
        event(new PengajuanStatusChanged($fresh, 'diterima', $verifikator));

        return $fresh;
    }

    /**
     * Verifikator menolak pengajuan.
     *
     * @throws ValidationException
     */
    public function tolak(Pengajuan $pengajuan, User $verifikator, string $feedback): Pengajuan
    {
        $this->validateVerifikatorScope($verifikator, $pengajuan->prodi_id);

        if ($pengajuan->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => ['Hanya pengajuan dengan status pending yang dapat diverifikasi.'],
            ]);
        }

        $cleanFeedback = strip_tags(trim($feedback));
        if ($cleanFeedback === '') {
            throw ValidationException::withMessages([
                'feedback_verifikator' => ['Feedback atau alasan penolakan wajib diisi jika menolak pengajuan.'],
            ]);
        }

        $pengajuan->update([
            'status'               => 'ditolak',
            'feedback_verifikator' => $cleanFeedback,
            'verifikator_id'       => $verifikator->id,
            'verified_at'          => now(),
        ]);

        $fresh = $pengajuan->fresh(['mataKuliahs', 'bidang', 'tingkatan', 'tahapan', 'prodi', 'verifikator', 'mahasiswa']);

        // Kirim notifikasi Telegram (async via queue)
        event(new PengajuanStatusChanged($fresh, 'ditolak', $verifikator));

        return $fresh;
    }

    /**
     * Tendik finalisasi konversi nilai (strict = snapshot_huruf_nilai).
     *
     * @throws ValidationException
     */
    public function finalisasi(Pengajuan $pengajuan, User $tendik, array $data): Pengajuan
    {
        if ($pengajuan->status !== 'diterima') {
            throw ValidationException::withMessages([
                'status' => ['Hanya pengajuan berstatus diterima yang dapat difinalisasi oleh Tendik.'],
            ]);
        }

        $hasExplicitNilai = array_key_exists('nilai_per_mk', $data) && $data['nilai_per_mk'] !== null;
        $nilaiList        = $data['nilai_per_mk'] ?? [];
        $pengajuanMks     = $pengajuan->pengajuanMataKuliahs()->get();

        $inputMap = collect($nilaiList)->keyBy('mk_id');

        // Jika nilai_per_mk dikirim explicitly oleh Tendik, validasi huruf nilainya strict = snapshot_huruf_nilai.
        // Jika nilai_per_mk tidak dikirim (otomatis mengikuti matriks), gunakan snapshot_huruf_nilai.
        if ($hasExplicitNilai && $pengajuanMks->isNotEmpty()) {
            foreach ($pengajuanMks as $pmk) {
                if (!$inputMap->has($pmk->mata_kuliah_id)) {
                    throw ValidationException::withMessages([
                        'nilai_per_mk' => ["Nilai untuk seluruh mata kuliah yang dipilih wajib diisi."],
                    ]);
                }

                $inputNilai = trim($inputMap->get($pmk->mata_kuliah_id)['huruf_nilai'] ?? '');
                if ($inputNilai !== $pengajuan->snapshot_huruf_nilai) {
                    throw ValidationException::withMessages([
                        'nilai_per_mk' => ["Huruf nilai yang diinput ({$inputNilai}) wajib persis sama dengan nilai matriks ({$pengajuan->snapshot_huruf_nilai})."],
                    ]);
                }
            }
        }

        $result = DB::transaction(function () use ($pengajuan, $pengajuanMks, $inputMap, $hasExplicitNilai, $tendik, $data) {
            if ($pengajuanMks->isNotEmpty()) {
                foreach ($pengajuanMks as $pmk) {
                    $hurufNilai = $hasExplicitNilai
                        ? ($inputMap->get($pmk->mata_kuliah_id)['huruf_nilai'] ?? $pengajuan->snapshot_huruf_nilai)
                        : $pengajuan->snapshot_huruf_nilai;
                    if ($hurufNilai !== null && $hurufNilai !== '') {
                        $pmk->update(['huruf_nilai' => $hurufNilai]);
                    }
                }
            }

            $pengajuan->update([
                'link_sk_konversi' => isset($data['link_sk_konversi']) ? trim($data['link_sk_konversi']) : null,
                'catatan_tendik'   => isset($data['catatan_tendik']) ? strip_tags(trim($data['catatan_tendik'])) : null,
                'tendik_id'        => $tendik->id,
                'processed_at'     => now(),
                'status'           => 'selesai',
            ]);

            return $pengajuan->fresh(['mataKuliahs', 'bidang', 'tingkatan', 'tahapan', 'prodi', 'verifikator', 'tendik', 'mahasiswa']);
        });

        // Kirim notifikasi Telegram setelah transaction commit (async via queue)
        event(new PengajuanStatusChanged($result, 'selesai', $tendik));

        return $result;
    }

    /**
     * Memastikan verifikator memiliki hak akses aktif pada prodi pengajuan.
     */
    protected function validateVerifikatorScope(User $verifikator, int $prodiId): void
    {
        $isInScope = VerifikatorProdi::where('user_id', $verifikator->id)
            ->where('prodi_id', $prodiId)
            ->where('is_active', 1)
            ->exists();

        if (!$isInScope) {
            abort(403, 'Anda tidak memiliki wewenang verifikasi untuk program studi pengajuan ini.');
        }
    }

    /**
     * Sanitasi teks dari tag HTML dan blok script berbahaya.
     */
    public function sanitizeText(?string $input): ?string
    {
        if ($input === null) {
            return null;
        }

        $cleaned = preg_replace('/<script\b[^>]*>(.*?)<\/script>/is', '', $input);
        $cleaned = strip_tags($cleaned);

        return trim($cleaned);
    }
}
