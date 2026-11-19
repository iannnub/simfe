<?php

namespace App\Http\Requests\Mahasiswa;

use Illuminate\Foundation\Http\FormRequest;

class PilihMataKuliahRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user() && $this->user()->hasRole('mahasiswa');
    }

    public function rules(): array
    {
        return [
            'mata_kuliah_ids'     => ['required_without:mata_kuliah_names', 'array', 'min:1'],
            'mata_kuliah_ids.*'   => ['integer', 'exists:mata_kuliah,id'],
            'mata_kuliah_names'   => ['required_without:mata_kuliah_ids', 'array', 'min:1'],
            'mata_kuliah_names.*' => ['string', 'max:200'],
        ];
    }

    public function messages(): array
    {
        return [
            'mata_kuliah_ids.required_without'   => 'Pilih minimal satu mata kuliah konversi.',
            'mata_kuliah_ids.min'                => 'Pilih minimal satu mata kuliah konversi.',
            'mata_kuliah_ids.*.exists'           => 'Mata kuliah yang dipilih tidak ditemukan.',
            'mata_kuliah_names.required_without' => 'Pilih minimal satu mata kuliah konversi.',
            'mata_kuliah_names.min'              => 'Pilih minimal satu mata kuliah konversi.',
        ];
    }
}
