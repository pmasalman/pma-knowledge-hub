/**
 * Data demo PMA Knowledge Hub.
 *
 * File ini menjadi satu sumber data sementara untuk homepage dan
 * halaman detail. Saat Supabase sudah aktif, file ini akan diganti
 * oleh API database tanpa mengubah struktur tampilan.
 */

export const DEMO_MODULES = Object.freeze([
  {
    id: 'MOD-0001',
    title: 'Onboarding Program PMA',
    description:
      'Panduan dasar bagi karyawan baru untuk memahami perusahaan, budaya kerja, proses onboarding, serta informasi penting selama masa awal bekerja.',
    category: 'Onboarding',
    department: 'Human Capital',
    contentType: 'PDF',
    thumbnailUrl: '',
    fileUrl: '',
    videoUrl: 'https://youtu.be/wtwENU39G5U',
    owner: 'Human Capital',
    status: 'PUBLISHED',
    featured: true,
    viewCount: 128,
    createdAt: '2026-07-01T08:00:00+07:00',
    updatedAt: '2026-07-15T09:00:00+07:00'
  },
  {
    id: 'MOD-0002',
    title: 'SOP Hygiene dan Sanitasi Area Kerja',
    description:
      'Panduan kebersihan dan sanitasi untuk mendukung standar operasional, keamanan pangan, serta konsistensi kualitas lingkungan kerja.',
    category: 'SOP & Panduan Kerja',
    department: 'Operations',
    contentType: 'PDF',
    thumbnailUrl: '',
    fileUrl: '',
    videoUrl: '',
    owner: 'Operations',
    status: 'PUBLISHED',
    featured: true,
    viewCount: 96,
    createdAt: '2026-07-02T08:00:00+07:00',
    updatedAt: '2026-07-14T10:15:00+07:00'
  },
  {
    id: 'MOD-0003',
    title: 'Effective Communication in Workplace',
    description:
      'Materi komunikasi efektif untuk meningkatkan koordinasi, kolaborasi, penyampaian informasi, dan kualitas hubungan kerja.',
    category: 'Leadership & Soft Skill',
    department: 'Human Capital',
    contentType: 'PowerPoint',
    thumbnailUrl: '',
    fileUrl: '',
    videoUrl: '',
    owner: 'Human Capital',
    status: 'PUBLISHED',
    featured: true,
    viewCount: 84,
    createdAt: '2026-07-03T08:00:00+07:00',
    updatedAt: '2026-07-13T13:30:00+07:00'
  },
  {
    id: 'MOD-0004',
    title: 'Product Knowledge Dasar',
    description:
      'Pengenalan informasi produk, karakteristik utama, manfaat, dan pengetahuan dasar yang dibutuhkan untuk mendukung pekerjaan.',
    category: 'Product Knowledge',
    department: 'Sales',
    contentType: 'PDF',
    thumbnailUrl: '',
    fileUrl: '',
    videoUrl: '',
    owner: 'Sales Capability',
    status: 'PUBLISHED',
    featured: false,
    viewCount: 72,
    createdAt: '2026-07-04T08:00:00+07:00',
    updatedAt: '2026-07-12T11:45:00+07:00'
  },
  {
    id: 'MOD-0005',
    title: 'Video Learning: Coaching Dasar',
    description:
      'Video pembelajaran tentang teknik coaching sederhana untuk membantu anggota tim mengenali kebutuhan pengembangan dan menyusun tindak lanjut.',
    category: 'Video Learning',
    department: 'Human Capital',
    contentType: 'Video',
    thumbnailUrl: '',
    fileUrl: '',
    /*
     * Isi dengan salah satu format berikut:
     * https://youtu.be/VIDEO_ID
     * https://www.youtube.com/watch?v=VIDEO_ID
     * https://www.youtube.com/embed/VIDEO_ID
     * https://vimeo.com/VIDEO_ID
     */
    videoUrl: '',
    owner: 'Human Capital',
    status: 'PUBLISHED',
    featured: false,
    viewCount: 61,
    createdAt: '2026-07-05T08:00:00+07:00',
    updatedAt: '2026-07-11T15:20:00+07:00'
  },
  {
    id: 'MOD-0006',
    title: 'Modul Training Pelayanan Pelanggan',
    description:
      'Materi pengembangan keterampilan pelayanan pelanggan untuk meningkatkan kualitas interaksi dan pengalaman pelanggan.',
    category: 'Modul Training',
    department: 'Sales',
    contentType: 'PowerPoint',
    thumbnailUrl: '',
    fileUrl: '',
    videoUrl: '',
    owner: 'Sales Capability',
    status: 'PUBLISHED',
    featured: false,
    viewCount: 49,
    createdAt: '2026-07-06T08:00:00+07:00',
    updatedAt: '2026-07-10T09:40:00+07:00'
  },
  {
    id: 'MOD-0007',
    title: 'Panduan Pengajuan Cuti Karyawan',
    description:
      'Panduan proses pengajuan cuti, persetujuan atasan, dokumen pendukung, serta ketentuan administrasi yang berlaku.',
    category: 'SOP & Panduan Kerja',
    department: 'Human Capital',
    contentType: 'PDF',
    thumbnailUrl: '',
    fileUrl: '',
    videoUrl: '',
    owner: 'Human Capital',
    status: 'PUBLISHED',
    featured: false,
    viewCount: 44,
    createdAt: '2026-07-07T08:00:00+07:00',
    updatedAt: '2026-07-09T14:00:00+07:00'
  },
  {
    id: 'MOD-0008',
    title: 'Leadership Fundamental',
    description:
      'Materi dasar kepemimpinan untuk membantu leader membangun tim yang produktif, kolaboratif, dan bertanggung jawab.',
    category: 'Leadership & Soft Skill',
    department: 'Human Capital',
    contentType: 'PDF',
    thumbnailUrl: '',
    fileUrl: '',
    videoUrl: '',
    owner: 'Human Capital',
    status: 'PUBLISHED',
    featured: false,
    viewCount: 38,
    createdAt: '2026-07-08T08:00:00+07:00',
    updatedAt: '2026-07-08T16:10:00+07:00'
  }
]);
