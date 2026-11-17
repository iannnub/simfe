<?php

namespace App\Http\Controllers\Kaprodi;

use App\Exports\PengajuanExport;
use App\Http\Controllers\Controller;
use App\Models\Pengajuan;
use App\Models\Prodi;
use App\Models\VerifikatorProdi;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Maatwebsite\Excel\Facades\Excel;
use Symfony\Component\HttpFoundation\BinaryFileResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class KaprodiController extends Controller
{
    /**
     * Resolves the target prodi_id based on user role and request.
     */
    protected function resolveProdiId(Request $request): int
    {
        $user = $request->user();

        // If user is kaprodi and has assigned prodi_id
        if ($user->prodi_id) {
            return (int) $user->prodi_id;
        }

        // If wadek or admin passed prodi_id in query
        if ($request->filled('prodi_id')) {
            return (int) $request->input('prodi_id');
        }

        // Default to first prodi
        $firstProdi = Prodi::orderBy('id')->first();
        return $firstProdi ? (int) $firstProdi->id : 1;
    }

    /**
     * GET /api/kaprodi/pengajuan
     */
    public function index(Request $request): JsonResponse
    {
        $prodiId = $this->resolveProdiId($request);

        $query = Pengajuan::where('prodi_id', $prodiId)
            ->with([
                'mahasiswa:id,nama,nim_nip,email',
                'prodi:id,kode,singkatan,nama',
                'bidang:id,nama',
                'tingkatan:id,nama',
                'tahapan:id,nama',
                'verifikator:id,nama',
                'tendik:id,nama',
                'pengajuanMataKuliahs.mataKuliah:id,kode_mk,nama_mk,sks',
            ]);

        // Search: nama lomba, nama mahasiswa, nim
        if ($request->filled('search')) {
            $search = '%' . trim($request->input('search')) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('nama_lomba', 'like', $search)
                  ->orWhereHas('mahasiswa', function ($mq) use ($search) {
                      $mq->where('nama', 'like', $search)
                         ->orWhere('nim_nip', 'like', $search);
                  });
            });
        }

        // Filter status
        if ($request->filled('status')) {
            $query->where('status', trim($request->input('status')));
        }

        // Filter tingkatan
        if ($request->filled('tingkatan_id')) {
            $query->where('tingkatan_id', (int) $request->input('tingkatan_id'));
        }

        // Filter bidang
        if ($request->filled('bidang_id')) {
            $query->where('bidang_id', (int) $request->input('bidang_id'));
        }

        $perPage = (int) $request->input('per_page', 15);
        $paginator = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'items' => $paginator->items(),
                'meta'  => [
                    'current_page' => $paginator->currentPage(),
                    'last_page'    => $paginator->lastPage(),
                    'per_page'     => $paginator->perPage(),
                    'total'        => $paginator->total(),
                    'prodi_id'     => $prodiId,
                ],
            ],
        ]);
    }

    /**
     * GET /api/kaprodi/pengajuan/{id}
     */
    public function show(Request $request, int $id): JsonResponse
    {
        $prodiId = $this->resolveProdiId($request);

        $pengajuan = Pengajuan::where('prodi_id', $prodiId)
            ->with([
                'mahasiswa:id,nama,nim_nip,email,no_whatsapp',
                'prodi:id,kode,singkatan,nama',
                'bidang:id,nama',
                'tingkatan:id,nama',
                'tahapan:id,nama',
                'verifikator:id,nama',
                'tendik:id,nama',
                'pengajuanMataKuliahs.mataKuliah:id,kode_mk,nama_mk,sks',
            ])
            ->findOrFail($id);

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $pengajuan,
        ]);
    }

    /**
     * GET /api/kaprodi/statistik
     */
    public function statistik(Request $request): JsonResponse
    {
        $prodiId = $this->resolveProdiId($request);
        $prodi = Prodi::find($prodiId);

        $total = Pengajuan::where('prodi_id', $prodiId)->count();
        $pending = Pengajuan::where('prodi_id', $prodiId)->where('status', 'pending')->count();
        $diterima = Pengajuan::where('prodi_id', $prodiId)->where('status', 'diterima')->count();
        $selesai = Pengajuan::where('prodi_id', $prodiId)->where('status', 'selesai')->count();
        $ditolak = Pengajuan::where('prodi_id', $prodiId)->where('status', 'ditolak')->count();

        // Breakdown per tingkatan
        $byTingkatan = Pengajuan::where('pengajuan.prodi_id', $prodiId)
            ->join('tingkatan_lomba', 'pengajuan.tingkatan_id', '=', 'tingkatan_lomba.id')
            ->selectRaw('tingkatan_lomba.nama as tingkatan, COUNT(*) as total')
            ->groupBy('tingkatan_lomba.nama')
            ->pluck('total', 'tingkatan');

        // Breakdown per bidang
        $byBidang = Pengajuan::where('pengajuan.prodi_id', $prodiId)
            ->join('bidang_lomba', 'pengajuan.bidang_id', '=', 'bidang_lomba.id')
            ->selectRaw('bidang_lomba.nama as bidang, COUNT(*) as total')
            ->groupBy('bidang_lomba.nama')
            ->pluck('total', 'bidang');

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => [
                'prodi'        => $prodi ? $prodi->nama : 'Unknown',
                'prodi_id'     => $prodiId,
                'total'        => $total,
                'pending'      => $pending,
                'diterima'     => $diterima,
                'selesai'      => $selesai,
                'ditolak'      => $ditolak,
                'by_tingkatan' => $byTingkatan,
                'by_bidang'    => $byBidang,
            ],
        ]);
    }

    /**
     * GET /api/kaprodi/verifikator-performa
     */
    public function performa(Request $request): JsonResponse
    {
        $prodiId = $this->resolveProdiId($request);

        $verifikatorProdis = VerifikatorProdi::where('prodi_id', $prodiId)
            ->where('is_active', 1)
            ->with('user:id,nama,email,nim_nip')
            ->get();

        $result = $verifikatorProdis->map(function ($vp) use ($prodiId) {
            $userId = $vp->user_id;

            $totalVerified = Pengajuan::where('prodi_id', $prodiId)
                ->where('verifikator_id', $userId)
                ->whereIn('status', ['diterima', 'ditolak', 'selesai'])
                ->count();

            $accepted = Pengajuan::where('prodi_id', $prodiId)
                ->where('verifikator_id', $userId)
                ->whereIn('status', ['diterima', 'selesai'])
                ->count();

            $rejected = Pengajuan::where('prodi_id', $prodiId)
                ->where('verifikator_id', $userId)
                ->where('status', 'ditolak')
                ->count();

            return [
                'user_id'        => $userId,
                'nama'           => $vp->user?->nama ?? 'Unknown',
                'email'          => $vp->user?->email ?? '-',
                'nip'            => $vp->user?->nim_nip ?? '-',
                'total_verified' => $totalVerified,
                'diterima'       => $accepted,
                'ditolak'        => $rejected,
                'assigned_at'    => $vp->created_at?->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'message' => 'OK',
            'data'    => $result,
        ]);
    }

    /**
     * GET /api/kaprodi/export
     */
    public function export(Request $request): BinaryFileResponse|StreamedResponse|Response
    {
        $prodiId = $this->resolveProdiId($request);
        $prodi = Prodi::find($prodiId);

        $query = Pengajuan::where('prodi_id', $prodiId)
            ->with([
                'mahasiswa:id,nama,nim_nip',
                'prodi:id,kode,singkatan,nama',
                'bidang:id,nama',
                'tingkatan:id,nama',
                'tahapan:id,nama',
                'verifikator:id,nama',
                'pengajuanMataKuliahs.mataKuliah:id,kode_mk,nama_mk,sks',
            ]);

        if ($request->filled('status')) {
            $query->where('status', trim($request->input('status')));
        }

        $data = $query->orderBy('created_at', 'desc')->get();

        $format = $request->input('format', 'xlsx');
        $prodiCode = $prodi ? strtolower($prodi->singkatan) : 'prodi';
        $timestamp = now()->format('Y-m-d-His');
        $filename = "rekap-prestasi-{$prodiCode}-{$timestamp}.{$format}";

        $writerType = match ($format) {
            'csv'   => \Maatwebsite\Excel\Excel::CSV,
            default => \Maatwebsite\Excel\Excel::XLSX,
        };

        return Excel::download(new PengajuanExport($data), $filename, $writerType, [
            'Access-Control-Expose-Headers' => 'Content-Disposition',
        ]);
    }
}
