/**
 * PMA Knowledge Hub
 * Seluruh komunikasi database dan Storage Supabase.
 */

'use strict';

import {
  getSupabaseClient
} from './supabase-client.js?v=20260715-1';

const MODULE_SELECT = `
  id,
  module_code,
  title,
  slug,
  description,
  owner_name,
  thumbnail_path,
  file_path,
  external_url,
  video_url,
  status,
  is_featured,
  view_count,
  published_at,
  created_at,
  updated_at,
  category_id,
  department_id,
  content_type_id,
  category:categories (
    id,
    name,
    slug,
    icon
  ),
  department:departments (
    id,
    name,
    slug
  ),
  content_type:content_types (
    id,
    code,
    label,
    requires_file,
    requires_video_url,
    requires_external_url
  )
`;

export const API = Object.freeze({
  getPublishedModules,
  getModuleById,
  getRelatedModules,
  recordModuleView,
  getCurrentUser,
  submitMaterialRequest,
  createSignedModuleFileUrl,
  getPublicThumbnailUrl
});

async function getPublishedModules() {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('modules')
    .select(MODULE_SELECT)
    .eq('status', 'PUBLISHED')
    .order('is_featured', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(250);

  throwIfError(error, 'Data modul belum dapat dimuat.');
  return (data || []).map(mapModule);
}

async function getModuleById(identifier) {
  const value = cleanText(identifier);

  if (!value) {
    return null;
  }

  const supabase = getSupabaseClient();
  let query = supabase
    .from('modules')
    .select(MODULE_SELECT)
    .eq('status', 'PUBLISHED');

  if (isUuid(value)) {
    query = query.eq('id', value);
  } else if (value.toUpperCase().startsWith('MOD-')) {
    query = query.eq('module_code', value.toUpperCase());
  } else {
    query = query.eq('slug', value);
  }

  const { data, error } = await query.maybeSingle();
  throwIfError(error, 'Detail materi belum dapat dimuat.');
  return data ? mapModule(data) : null;
}

async function getRelatedModules(currentModule, limit = 3) {
  if (!currentModule?.id) {
    return [];
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('modules')
    .select(MODULE_SELECT)
    .eq('status', 'PUBLISHED')
    .neq('id', currentModule.id)
    .order('updated_at', { ascending: false })
    .limit(20);

  throwIfError(error, 'Materi terkait belum dapat dimuat.');

  return (data || [])
    .map(mapModule)
    .sort((first, second) => {
      const scoreDifference =
        getRelatedScore(second, currentModule) -
        getRelatedScore(first, currentModule);

      if (scoreDifference !== 0) {
        return scoreDifference;
      }

      return parseDate(second.updatedAt) - parseDate(first.updatedAt);
    })
    .slice(0, limit);
}

async function recordModuleView(moduleId, fallbackCount = 0) {
  if (!isUuid(moduleId)) {
    return Number(fallbackCount || 0);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc(
    'increment_module_view',
    { target_module_id: moduleId }
  );

  if (error) {
    console.warn('View counter belum dapat diperbarui:', error);
    return Number(fallbackCount || 0);
  }

  return Number(data || fallbackCount || 0);
}

async function getCurrentUser() {
  const supabase = getSupabaseClient();
  const {
    data: userData,
    error: userError
  } = await supabase.auth.getUser();

  if (userError) {
    console.warn('Session pengguna belum tersedia:', userError);
    return null;
  }

  const user = userData?.user;
  if (!user) {
    return null;
  }

  const {
    data: profile,
    error: profileError
  } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      role,
      status,
      department:departments (
        id,
        name,
        slug
      )
    `)
    .eq('id', user.id)
    .maybeSingle();

  throwIfError(profileError, 'Profil pengguna belum dapat dimuat.');

  if (!profile) {
    return {
      id: user.id,
      email: user.email || '',
      name:
        user.user_metadata?.full_name ||
        user.email?.split('@')[0] ||
        'Pengguna',
      role: 'VIEWER',
      status: 'ACTIVE',
      department: ''
    };
  }

  return {
    id: profile.id,
    email: cleanText(profile.email || user.email),
    name:
      cleanText(profile.full_name) ||
      cleanText(user.user_metadata?.full_name) ||
      'Pengguna',
    role: cleanText(profile.role || 'VIEWER').toUpperCase(),
    status: cleanText(profile.status || 'ACTIVE').toUpperCase(),
    department: cleanText(profile.department?.name)
  };
}

async function submitMaterialRequest(payload) {
  const supabase = getSupabaseClient();
  const requestCode = createPublicRequestCode();

  const request = {
    request_code: requestCode,
    requester_name: cleanText(payload?.name),
    requester_email: cleanText(payload?.email).toLowerCase(),
    department_name: cleanText(payload?.department) || null,
    requested_material: cleanText(payload?.requestedMaterial),
    description: cleanText(payload?.description) || null,
    status: 'NEW'
  };

  validateRequest(request);

  const { error } = await supabase
    .from('material_requests')
    .insert(request);

  throwIfError(error, 'Request materi belum dapat dikirim.');

  return {
    success: true,
    requestId: requestCode,
    message: `Request ${requestCode} berhasil dikirim.`
  };
}

function getPublicThumbnailUrl(path) {
  const cleanPath = cleanStoragePath(path);
  if (!cleanPath) {
    return '';
  }

  const supabase = getSupabaseClient();
  const { data } = supabase.storage
    .from('module-thumbnails')
    .getPublicUrl(cleanPath);

  return cleanText(data?.publicUrl);
}

async function createSignedModuleFileUrl(
  path,
  { expiresIn = 3600, download = false } = {}
) {
  const cleanPath = cleanStoragePath(path);
  if (!cleanPath) {
    return '';
  }

  const supabase = getSupabaseClient();
  const { data: sessionData } = await supabase.auth.getSession();

  if (!sessionData?.session) {
    const error = new Error('Silakan masuk untuk membuka file materi.');
    error.code = 'AUTH_REQUIRED';
    throw error;
  }

  const options = download ? { download: true } : undefined;
  const { data, error } = await supabase.storage
    .from('module-files')
    .createSignedUrl(cleanPath, expiresIn, options);

  if (error) {
    const accessError = new Error('File materi belum dapat dibuka.');
    accessError.code =
      error.statusCode === '403' ? 'ACCESS_DENIED' : 'STORAGE_ERROR';
    accessError.cause = error;
    throw accessError;
  }

  return cleanText(data?.signedUrl);
}

function mapModule(row) {
  const thumbnailPath = cleanStoragePath(row.thumbnail_path);

  return {
    id: cleanText(row.id),
    moduleCode: cleanText(row.module_code),
    title: cleanText(row.title),
    slug: cleanText(row.slug),
    description: cleanText(row.description),

    categoryId: cleanText(row.category_id),
    category: cleanText(row.category?.name) || 'Tanpa Kategori',
    categorySlug: cleanText(row.category?.slug),
    categoryIcon: cleanText(row.category?.icon),

    departmentId: cleanText(row.department_id),
    department: cleanText(row.department?.name) || 'Semua Departemen',

    contentTypeId: cleanText(row.content_type_id),
    contentType:
      cleanText(row.content_type?.label) ||
      cleanText(row.content_type?.code) ||
      'Materi',
    contentTypeCode: cleanText(row.content_type?.code).toUpperCase(),

    owner:
      cleanText(row.owner_name) ||
      cleanText(row.department?.name) ||
      'PMA',

    thumbnailPath,
    thumbnailUrl: getPublicThumbnailUrl(thumbnailPath),
    filePath: cleanStoragePath(row.file_path),
    externalUrl: cleanHttpsUrl(row.external_url),
    videoUrl: cleanHttpsUrl(row.video_url),

    status: cleanText(row.status).toUpperCase(),
    featured: Boolean(row.is_featured),
    viewCount: Number(row.view_count || 0),
    publishedAt: row.published_at || '',
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || ''
  };
}


function createPublicRequestCode() {
  const randomValue =
    typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now()}${Math.random().toString(16).slice(2)}`;

  return `REQ-${randomValue.slice(0, 8).toUpperCase()}`;
}

function validateRequest(request) {
  if (!request.requester_name) {
    throw new Error('Nama wajib diisi.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(request.requester_email)) {
    throw new Error('Alamat email belum valid.');
  }

  if (!request.requested_material) {
    throw new Error('Materi yang dibutuhkan wajib diisi.');
  }
}

function getRelatedScore(candidate, current) {
  let score = 0;

  if (candidate.categoryId && candidate.categoryId === current.categoryId) {
    score += 3;
  }

  if (
    candidate.departmentId &&
    candidate.departmentId === current.departmentId
  ) {
    score += 2;
  }

  if (
    candidate.contentTypeId &&
    candidate.contentTypeId === current.contentTypeId
  ) {
    score += 1;
  }

  return score;
}

function cleanStoragePath(value) {
  return cleanText(value)
    .replace(/^\/+/, '')
    .replace(/\.\.(\/|\\)/g, '');
}

function cleanHttpsUrl(value) {
  const url = cleanText(value);
  return /^https:\/\//i.test(url) ? url : '';
}

function cleanText(value) {
  return value === null || value === undefined ? '' : String(value).trim();
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    cleanText(value)
  );
}

function parseDate(value) {
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function throwIfError(error, fallbackMessage) {
  if (!error) {
    return;
  }

  console.error(error);
  const appError = new Error(cleanText(error.message) || fallbackMessage);
  appError.code = cleanText(error.code) || 'SUPABASE_ERROR';
  appError.cause = error;
  throw appError;
}
