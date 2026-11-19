<?php

namespace App\Events;

use App\Models\Pengajuan;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MataKuliahKonversiSelected
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public readonly Pengajuan $pengajuan,
        public readonly User $mahasiswa,
    ) {}
}
