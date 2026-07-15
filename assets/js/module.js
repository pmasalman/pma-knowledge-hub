/**
 * PMA Knowledge Hub
 * Controller halaman detail modul.
 *
 * Sudah mendukung:
 * - Video embed YouTube dan Vimeo.
 * - Preview PDF.
 * - Preview JPG, PNG, GIF, dan WebP.
 * - PowerPoint/dokumen melalui tombol buka dan unduh.
 * - Materi terkait.
 * - View counter sementara di localStorage.
 *
 * Saat Supabase aktif, object API menjadi satu-satunya bagian
 * yang perlu diganti.
 */

'use strict';

import { API } from './api.js?v=20260715-1';


const APP_CONFIG = Object.freeze({
  viewStorageKey: 'pma_module_views',
  relatedLimit: 3
});

const state = {
  module: null,
  relatedModules: []
};

const elements = {};

document.addEventListener(
  'DOMContentLoaded',
  initializeModulePage
);

async function initializeModulePage() {
  cacheElements();
  setCurrentYear();
  bindMobileNavigation();
  bindCopyLinkButton();

  const moduleId = getModuleIdFromUrl();

  if (!moduleId) {
    showError('ID materi tidak tersedia pada alamat halaman.');
    return;
  }

  try {
    const module = await API.getModuleById(moduleId);

    if (!module) {
      showError('Materi yang kamu cari tidak ditemukan.');
      return;
    }

    state.module = module;
    state.relatedModules = await API.getRelatedModules(module);

    const viewCount = await API.recordModuleView(module.id);
    state.module.viewCount = viewCount;

    renderModule(module);
    renderRelatedModules(state.relatedModules);
    showModulePage();
  } catch (error) {
    console.error(error);
    showError(getErrorMessage(error));
  }
}



/* ==========================================================
   ELEMENTS AND EVENTS
   ========================================================== */

function cacheElements() {
  elements.loading =
    document.getElementById('module-detail-loading');

  elements.error =
    document.getElementById('module-detail-error');

  elements.errorMessage =
    document.getElementById('module-detail-error-message');

  elements.page =
    document.getElementById('module-detail-page');

  elements.breadcrumbTitle =
    document.getElementById('breadcrumb-title');

  elements.badges =
    document.getElementById('module-detail-badges');

  elements.title =
    document.getElementById('module-detail-title');

  elements.description =
    document.getElementById('module-detail-description');

  elements.cover =
    document.getElementById('module-detail-cover');

  elements.coverIcon =
    document.getElementById('module-detail-cover-icon');

  elements.viewerTitle =
    document.getElementById('module-viewer-title');

  elements.viewer =
    document.getElementById('module-content-viewer');

  elements.openButton =
    document.getElementById('open-material-button');

  elements.downloadButton =
    document.getElementById('download-material-button');

  elements.copyButton =
    document.getElementById('copy-module-link-button');

  elements.infoCategory =
    document.getElementById('module-info-category');

  elements.infoDepartment =
    document.getElementById('module-info-department');

  elements.infoType =
    document.getElementById('module-info-type');

  elements.infoOwner =
    document.getElementById('module-info-owner');

  elements.infoUpdated =
    document.getElementById('module-info-updated');

  elements.infoViews =
    document.getElementById('module-info-views');

  elements.relatedGrid =
    document.getElementById('related-module-grid');

  elements.mobileMenuButton =
    document.getElementById('mobile-menu-button');

  elements.mobileNavigation =
    document.getElementById('mobile-navigation');

  elements.toastContainer =
    document.getElementById('toast-container');

  elements.currentYear =
    document.getElementById('current-year');
}

function bindMobileNavigation() {
  if (
    !elements.mobileMenuButton ||
    !elements.mobileNavigation
  ) {
    return;
  }

  elements.mobileMenuButton.addEventListener(
    'click',
    () => {
      const isOpen =
        elements.mobileMenuButton.getAttribute(
          'aria-expanded'
        ) === 'true';

      elements.mobileMenuButton.setAttribute(
        'aria-expanded',
        String(!isOpen)
      );

      elements.mobileNavigation.hidden = isOpen;
    }
  );

  elements.mobileNavigation.addEventListener(
    'click',
    (event) => {
      if (event.target.closest('a')) {
        elements.mobileNavigation.hidden = true;
        elements.mobileMenuButton.setAttribute(
          'aria-expanded',
          'false'
        );
      }
    }
  );
}

function bindCopyLinkButton() {
  elements.copyButton?.addEventListener(
    'click',
    async () => {
      try {
        await navigator.clipboard.writeText(
          window.location.href
        );

        showToast(
          'Link materi berhasil disalin.',
          'success'
        );
      } catch (error) {
        showToast(
          'Link belum dapat disalin. Salin alamat dari browser.',
          'error'
        );
      }
    }
  );
}


/* ==========================================================
   MAIN RENDER
   ========================================================== */

async function renderModule(module) {
  document.title =
    `${module.title} — PMA Knowledge Hub`;

  setText(elements.breadcrumbTitle, module.title);
  setText(elements.title, module.title);
  setText(elements.description, module.description);

  setText(
    elements.coverIcon,
    getCategoryIcon(
      module.category,
      module.contentType
    )
  );

  renderBadges(module);

  setText(
    elements.infoCategory,
    module.category || '—'
  );

  setText(
    elements.infoDepartment,
    module.department || '—'
  );

  setText(
    elements.infoType,
    module.contentType || '—'
  );

  setText(
    elements.infoOwner,
    module.owner || '—'
  );

  setText(
    elements.infoUpdated,
    formatLongDate(module.updatedAt)
  );

  setText(
    elements.infoViews,
    formatNumber(module.viewCount)
  );

  applyCoverImage(module.thumbnailUrl);

  let fileUrl = cleanUrl(module.externalUrl);
  let downloadUrl = '';
  let fileAccessError = null;

  if (!fileUrl && module.filePath) {
    try {
      fileUrl = await API.createSignedModuleFileUrl(
        module.filePath,
        { expiresIn: 3600, download: false }
      );

      downloadUrl = await API.createSignedModuleFileUrl(
        module.filePath,
        { expiresIn: 3600, download: true }
      );
    } catch (error) {
      fileAccessError = error;
    }
  }

  const videoEmbedUrl = normalizeVideoEmbedUrl(
    module.videoUrl
  );

  if (fileAccessError?.code === 'AUTH_REQUIRED') {
    renderLoginRequiredViewer();
  } else {
    renderContentViewer(
      module,
      fileUrl,
      videoEmbedUrl
    );
  }

  configureActionButtons(
    module,
    fileUrl,
    videoEmbedUrl,
    downloadUrl
  );
}

function renderBadges(module) {
  elements.badges?.replaceChildren();

  const values = [
    module.category,
    module.contentType,
    module.department
  ]
    .map(cleanText)
    .filter(Boolean);

  values.forEach((value) => {
    const badge = document.createElement('span');
    badge.className = 'module-badge';
    badge.textContent = value;
    elements.badges.appendChild(badge);
  });
}

function applyCoverImage(thumbnailUrl) {
  const imageUrl = normalizeImageUrl(thumbnailUrl);

  if (!imageUrl || !elements.cover) {
    return;
  }

  const image = document.createElement('img');
  image.src = imageUrl;
  image.alt = '';
  image.loading = 'eager';

  image.addEventListener('load', () => {
    elements.cover.classList.add('has-image');
  });

  image.addEventListener('error', () => {
    image.remove();
    elements.cover.classList.remove('has-image');
  });

  elements.cover.prepend(image);
}


/* ==========================================================
   CONTENT VIEWER
   ========================================================== */

function renderContentViewer(
  module,
  fileUrl,
  videoEmbedUrl
) {
  if (!elements.viewer) {
    return;
  }

  elements.viewer.replaceChildren();

  const contentKind = detectContentKind(
    module,
    fileUrl,
    videoEmbedUrl
  );

  if (contentKind === 'video') {
    renderVideoViewer(
      module,
      videoEmbedUrl
    );
    return;
  }

  if (contentKind === 'pdf') {
    renderPdfViewer(
      module,
      fileUrl
    );
    return;
  }

  if (contentKind === 'image') {
    renderImageViewer(
      module,
      fileUrl
    );
    return;
  }

  if (contentKind === 'external') {
    renderExternalLinkViewer(
      module,
      fileUrl
    );
    return;
  }

  renderUnavailableViewer(module);
}

function renderVideoViewer(module, embedUrl) {
  setText(
    elements.viewerTitle,
    'Video E-Learning'
  );

  const wrapper = document.createElement('div');
  wrapper.className = 'video-embed-wrapper';

  const iframe = document.createElement('iframe');
  iframe.src = embedUrl;
  iframe.title = module.title;
  iframe.loading = 'lazy';
  iframe.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.referrerPolicy =
    'strict-origin-when-cross-origin';
  iframe.allowFullscreen = true;

  wrapper.appendChild(iframe);
  elements.viewer.appendChild(wrapper);
}

function renderPdfViewer(module, fileUrl) {
  setText(
    elements.viewerTitle,
    'Preview PDF'
  );

  const iframe = document.createElement('iframe');
  iframe.className = 'document-preview-frame';
  iframe.src = `${fileUrl}#toolbar=1&navpanes=0`;
  iframe.title = `Preview ${module.title}`;
  iframe.loading = 'lazy';

  elements.viewer.appendChild(iframe);
}

function renderImageViewer(module, fileUrl) {
  setText(
    elements.viewerTitle,
    'Preview Gambar'
  );

  const wrapper = document.createElement('div');
  wrapper.className = 'image-preview-wrapper';

  const image = document.createElement('img');
  image.src = fileUrl;
  image.alt = module.title;
  image.loading = 'lazy';

  wrapper.appendChild(image);
  elements.viewer.appendChild(wrapper);
}

function renderExternalLinkViewer(module, fileUrl) {
  setText(
    elements.viewerTitle,
    'Materi Eksternal'
  );

  const card = document.createElement('div');
  card.className = 'viewer-placeholder';

  const icon = document.createElement('span');
  icon.className = 'viewer-placeholder-icon';
  icon.textContent = '↗';

  const title = document.createElement('h3');
  title.textContent =
    'Materi dibuka melalui sumber eksternal';

  const description = document.createElement('p');
  description.textContent =
    'Klik tombol Buka Materi untuk mengakses konten pada tab baru.';

  const link = document.createElement('a');
  link.className = 'primary-button inline-button';
  link.href = fileUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = 'Buka Sumber';

  card.append(
    icon,
    title,
    description,
    link
  );

  elements.viewer.appendChild(card);
}

function renderLoginRequiredViewer() {
  setText(
    elements.viewerTitle,
    'Login Diperlukan'
  );

  const card = document.createElement('div');
  card.className = 'viewer-placeholder';

  const icon = document.createElement('span');
  icon.className = 'viewer-placeholder-icon';
  icon.textContent = '🔒';

  const title = document.createElement('h3');
  title.textContent = 'Masuk untuk membuka file materi';

  const description = document.createElement('p');
  description.textContent =
    'File PDF, gambar, dan PowerPoint disimpan secara privat untuk melindungi materi internal PMA.';

  const link = document.createElement('a');
  link.className = 'primary-button inline-button';
  link.href = `./login.html?redirect=${encodeURIComponent(window.location.href)}`;
  link.textContent = 'Masuk';

  card.append(icon, title, description, link);
  elements.viewer.replaceChildren(card);
}

function renderUnavailableViewer(module) {
  setText(
    elements.viewerTitle,
    'Materi Belum Tersedia'
  );

  const card = document.createElement('div');
  card.className = 'viewer-placeholder';

  const icon = document.createElement('span');
  icon.className = 'viewer-placeholder-icon';
  icon.textContent = getCategoryIcon(
    module.category,
    module.contentType
  );

  const title = document.createElement('h3');
  title.textContent =
    'File atau link materi belum ditambahkan';

  const description = document.createElement('p');
  description.textContent =
    module.contentType.toLowerCase().includes('video')
      ? 'Admin perlu menambahkan link YouTube atau Vimeo pada kolom video.'
      : 'Admin perlu mengunggah file PDF/JPG ke Supabase Storage dan menyimpan lokasi filenya.';

  card.append(
    icon,
    title,
    description
  );

  elements.viewer.appendChild(card);
}


/* ==========================================================
   ACTION BUTTONS
   ========================================================== */

function configureActionButtons(
  module,
  fileUrl,
  videoEmbedUrl,
  downloadUrl = ''
) {
  setHidden(elements.openButton, true);
  setHidden(elements.downloadButton, true);

  if (videoEmbedUrl) {
    configureLinkButton(
      elements.openButton,
      videoEmbedUrl,
      'Buka Video'
    );
    return;
  }

  if (!fileUrl) {
    return;
  }

  configureLinkButton(
    elements.openButton,
    fileUrl,
    'Buka Materi'
  );

  if (
    ['pdf', 'image', 'document'].includes(
      detectContentKind(module, fileUrl, '')
    )
  ) {
    configureLinkButton(
      elements.downloadButton,
      downloadUrl || fileUrl,
      'Unduh File'
    );

    elements.downloadButton.setAttribute(
      'download',
      ''
    );
  }
}

function configureLinkButton(
  element,
  url,
  label
) {
  if (!element) {
    return;
  }

  element.href = url;
  element.textContent = label;
  element.hidden = false;
}


/* ==========================================================
   RELATED MODULES
   ========================================================== */

function renderRelatedModules(modules) {
  if (!elements.relatedGrid) {
    return;
  }

  elements.relatedGrid.replaceChildren();

  if (!modules.length) {
    const empty = document.createElement('div');
    empty.className = 'featured-placeholder';
    empty.textContent =
      'Belum ada materi terkait.';
    elements.relatedGrid.appendChild(empty);
    return;
  }

  const fragment =
    document.createDocumentFragment();

  modules.forEach((module) => {
    fragment.appendChild(
      createRelatedModuleCard(module)
    );
  });

  elements.relatedGrid.appendChild(fragment);
}

function createRelatedModuleCard(module) {
  const article = document.createElement('article');
  article.className = 'module-card';

  const imageLink = document.createElement('a');
  imageLink.className = 'module-card-image';
  imageLink.href = buildModuleUrl(module.id);
  imageLink.setAttribute(
    'aria-label',
    `Lihat detail ${module.title}`
  );

  const icon = document.createElement('span');
  icon.textContent = getCategoryIcon(
    module.category,
    module.contentType
  );

  imageLink.appendChild(icon);

  const body = document.createElement('div');
  body.className = 'module-card-body';

  const meta = document.createElement('div');
  meta.className = 'module-card-meta';

  [module.category, module.contentType]
    .map(cleanText)
    .filter(Boolean)
    .forEach((value) => {
      const badge = document.createElement('span');
      badge.className = 'module-badge';
      badge.textContent = value;
      meta.appendChild(badge);
    });

  const title = document.createElement('h3');
  title.textContent = module.title;

  const description = document.createElement('p');
  description.textContent = module.description;

  const footer = document.createElement('div');
  footer.className = 'module-card-footer';

  const date = document.createElement('small');
  date.textContent = formatShortDate(
    module.updatedAt
  );

  const link = document.createElement('a');
  link.className = 'module-link';
  link.href = buildModuleUrl(module.id);
  link.textContent = 'Lihat Detail →';

  footer.append(date, link);
  body.append(meta, title, description, footer);
  article.append(imageLink, body);

  return article;
}


/* ==========================================================
   VIDEO URL NORMALIZATION
   ========================================================== */

function normalizeVideoEmbedUrl(rawUrl) {
  const value = cleanUrl(rawUrl);

  if (!value) {
    return '';
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname
      .replace(/^www\./, '')
      .toLowerCase();

    if (
      hostname === 'youtube.com' ||
      hostname === 'm.youtube.com'
    ) {
      if (url.pathname === '/watch') {
        const videoId = url.searchParams.get('v');
        return videoId
          ? buildYouTubeEmbedUrl(videoId)
          : '';
      }

      if (
        url.pathname.startsWith('/embed/') ||
        url.pathname.startsWith('/shorts/')
      ) {
        const videoId = url.pathname
          .split('/')
          .filter(Boolean)
          .pop();

        return videoId
          ? buildYouTubeEmbedUrl(videoId)
          : '';
      }
    }

    if (hostname === 'youtu.be') {
      const videoId = url.pathname
        .split('/')
        .filter(Boolean)[0];

      return videoId
        ? buildYouTubeEmbedUrl(videoId)
        : '';
    }

    if (hostname === 'vimeo.com') {
      const videoId = url.pathname
        .split('/')
        .filter(Boolean)
        .pop();

      return /^\d+$/.test(videoId || '')
        ? `https://player.vimeo.com/video/${videoId}`
        : '';
    }

    if (hostname === 'player.vimeo.com') {
      return value;
    }

    return value.includes('/embed/')
      ? value
      : '';
  } catch (error) {
    return '';
  }
}

function buildYouTubeEmbedUrl(videoId) {
  const safeId = cleanText(videoId)
    .replace(/[^a-zA-Z0-9_-]/g, '');

  return safeId
    ? `https://www.youtube-nocookie.com/embed/${safeId}`
    : '';
}


/* ==========================================================
   CONTENT DETECTION
   ========================================================== */

function detectContentKind(
  module,
  fileUrl,
  videoEmbedUrl
) {
  if (videoEmbedUrl) {
    return 'video';
  }

  if (!fileUrl) {
    return 'unavailable';
  }

  const contentType =
    cleanText(module.contentType).toLowerCase();

  const pathname = getUrlPathname(fileUrl);

  if (
    contentType.includes('pdf') ||
    pathname.endsWith('.pdf')
  ) {
    return 'pdf';
  }

  if (
    contentType.includes('image') ||
    contentType.includes('jpg') ||
    contentType.includes('png') ||
    /\.(jpe?g|png|gif|webp|avif)$/i.test(pathname)
  ) {
    return 'image';
  }

  if (
    contentType.includes('powerpoint') ||
    contentType.includes('document') ||
    /\.(ppt|pptx|doc|docx|xls|xlsx)$/i.test(pathname)
  ) {
    return 'document';
  }

  return 'external';
}


/* ==========================================================
   HELPERS
   ========================================================== */

function getModuleIdFromUrl() {
  const params = new URLSearchParams(
    window.location.search
  );

  return cleanText(params.get('id'));
}

function getRelatedScore(candidate, current) {
  let score = 0;

  if (
    cleanText(candidate.category).toLowerCase() ===
    cleanText(current.category).toLowerCase()
  ) {
    score += 3;
  }

  if (
    cleanText(candidate.department).toLowerCase() ===
    cleanText(current.department).toLowerCase()
  ) {
    score += 2;
  }

  if (
    cleanText(candidate.contentType).toLowerCase() ===
    cleanText(current.contentType).toLowerCase()
  ) {
    score += 1;
  }

  return score;
}

function buildModuleUrl(moduleId) {
  const url = new URL(
    './module.html',
    window.location.href
  );

  url.searchParams.set(
    'id',
    cleanText(moduleId)
  );

  return url.href;
}

function normalizeImageUrl(rawUrl) {
  const value = cleanUrl(rawUrl);

  if (!value) {
    return '';
  }

  const drivePatterns = [
    /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i,
    /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/i,
    /[?&]id=([a-zA-Z0-9_-]+)/i
  ];

  for (const pattern of drivePatterns) {
    const match = value.match(pattern);

    if (match?.[1]) {
      return (
        'https://drive.google.com/thumbnail?id=' +
        encodeURIComponent(match[1]) +
        '&sz=w1200'
      );
    }
  }

  return value;
}

function cleanUrl(rawUrl) {
  const value = cleanText(rawUrl);

  if (
    !value ||
    value === '#' ||
    !/^https:\/\//i.test(value)
  ) {
    return '';
  }

  return value;
}

function getUrlPathname(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch (error) {
    return '';
  }
}

function getCategoryIcon(category, contentType) {
  const text = [
    cleanText(category),
    cleanText(contentType)
  ]
    .join(' ')
    .toLowerCase();

  if (text.includes('video')) {
    return '🎥';
  }

  if (
    text.includes('sop') ||
    text.includes('panduan') ||
    text.includes('guide')
  ) {
    return '📋';
  }

  if (text.includes('product')) {
    return '💡';
  }

  if (
    text.includes('leadership') ||
    text.includes('soft skill')
  ) {
    return '👥';
  }

  if (
    text.includes('powerpoint') ||
    text.includes('ppt')
  ) {
    return '📊';
  }

  if (
    text.includes('image') ||
    text.includes('jpg') ||
    text.includes('png')
  ) {
    return '🖼️';
  }

  return '📘';
}

function setCurrentYear() {
  setText(
    elements.currentYear,
    String(new Date().getFullYear())
  );
}

function showModulePage() {
  setHidden(elements.loading, true);
  setHidden(elements.error, true);
  setHidden(elements.page, false);
}

function showError(message) {
  setHidden(elements.loading, true);
  setHidden(elements.page, true);
  setHidden(elements.error, false);
  setText(elements.errorMessage, message);
}

function showToast(message, type = '') {
  if (!elements.toastContainer) {
    return;
  }

  const toast = document.createElement('div');
  toast.className =
    `toast ${type}`.trim();
  toast.setAttribute('role', 'status');
  toast.textContent = message;

  elements.toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3200);
}

function setText(element, value) {
  if (element) {
    element.textContent =
      cleanText(value);
  }
}

function setHidden(element, hidden) {
  if (element) {
    element.hidden = Boolean(hidden);
  }
}

function cleanText(value) {
  return value === null || value === undefined
    ? ''
    : String(value).trim();
}

function parseDate(value) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp)
    ? 0
    : timestamp;
}

function formatLongDate(value) {
  const timestamp = parseDate(value);

  if (!timestamp) {
    return 'Belum diperbarui';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(timestamp));
}

function formatShortDate(value) {
  const timestamp = parseDate(value);

  if (!timestamp) {
    return 'Belum diperbarui';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(new Date(timestamp));
}

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(
    Number(value || 0)
  );
}

function readLocalStorage(key, fallback) {
  try {
    const rawValue =
      window.localStorage.getItem(key);

    return rawValue === null
      ? fallback
      : JSON.parse(rawValue);
  } catch (error) {
    return fallback;
  }
}

function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.warn(
      'View count sementara tidak dapat disimpan.',
      error
    );
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getErrorMessage(error) {
  if (typeof error === 'string') {
    return error;
  }

  return (
    cleanText(error?.message) ||
    'Terjadi kesalahan saat membuka materi.'
  );
}
