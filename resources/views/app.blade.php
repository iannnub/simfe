<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>SIMPRESMA - Sistem Informasi Prestasi Mahasiswa Fasilkom UNEJ</title>
    <meta name="description" content="SIMPRESMA - Sistem Informasi Manajemen Prestasi Mahasiswa Fakultas Ilmu Komputer Universitas Jember. Layanan terpadu pengajuan, verifikasi, konversi SKS, dan penerbitan SK prestasi mahasiswa.">
    <meta name="keywords" content="SIMPRESMA, Prestasi Mahasiswa, Fasilkom UNEJ, Universitas Jember, Konversi SKS, Gemastik, PKM, Mahasiswa Berprestasi">
    <meta name="author" content="Fakultas Ilmu Komputer Universitas Jember">
    <meta name="robots" content="index, follow">
    <link rel="canonical" href="{{ url()->current() }}">

    <!-- Open Graph / Facebook / WhatsApp / Telegram -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="SIMPRESMA Fasilkom UNEJ">
    <meta property="og:url" content="{{ url()->current() }}">
    <meta property="og:title" content="SIMPRESMA - Sistem Informasi Prestasi Mahasiswa Fasilkom UNEJ">
    <meta property="og:description" content="Layanan digital pengajuan capaian prestasi, validasi verifikator, konversi mata kuliah & SKS, serta monitoring prestasi mahasiswa Fakultas Ilmu Komputer UNEJ.">
    <meta property="og:image" content="{{ asset('images/logo/logo.svg') }}">
    <meta property="og:locale" content="id_ID">

    <!-- Twitter / X Cards -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:url" content="{{ url()->current() }}">
    <meta name="twitter:title" content="SIMPRESMA - Sistem Informasi Prestasi Mahasiswa Fasilkom UNEJ">
    <meta name="twitter:description" content="Layanan digital pengajuan capaian prestasi, validasi verifikator, konversi mata kuliah & SKS, serta monitoring prestasi mahasiswa Fakultas Ilmu Komputer UNEJ.">
    <meta name="twitter:image" content="{{ asset('images/logo/logo.svg') }}">

    <!-- Mobile Theme -->
    <meta name="theme-color" content="#465fff">
    <link rel="icon" type="image/svg+xml" href="{{ asset('images/logo/logo-icon.svg') }}">
    <link rel="shortcut icon" href="{{ asset('favicon.ico') }}">

    <!-- Schema.org JSON-LD -->
    <script type="application/ld+json">
    {
      "@@context": "https://schema.org",
      "@@graph": [
        {
          "@@type": "SoftwareApplication",
          "name": "SIMPRESMA Fasilkom UNEJ",
          "applicationCategory": "EducationalApplication",
          "operatingSystem": "Web Browser",
          "description": "Sistem Informasi Manajemen Prestasi Mahasiswa Fakultas Ilmu Komputer Universitas Jember.",
          "offers": {
            "@@type": "Offer",
            "price": "0",
            "priceCurrency": "IDR"
          }
        },
        {
          "@@type": "EducationalOrganization",
          "name": "Fakultas Ilmu Komputer Universitas Jember",
          "url": "https://fasilkom.unej.ac.id",
          "parentOrganization": {
            "@@type": "CollegeOrUniversity",
            "name": "Universitas Jember",
            "url": "https://unej.ac.id"
          }
        }
      ]
    }
    </script>

    @viteReactRefresh
    @vite('resources/js/main.tsx')
</head>

<body class="dark:bg-gray-900 antialiased font-sans">
    <div id="root"></div>
</body>
</html>
