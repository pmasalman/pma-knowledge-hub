/**
 * PMA Knowledge Hub
 * Homepage controller — Supabase version.
 */

'use strict';

import { API } from './api.js?v=20260715-1';

/* ==========================================================
   CONFIGURATION
   ========================================================== */

const APP_CONFIG = Object.freeze({
  appTitle: 'PMA Knowledge Hub',
  initialModuleLimit: 6,

  storageKeys: Object.freeze({
    materialRequests: 'pma_material_requests',
    userSession: 'pma_user_session'
  })
});



/* ==========================================================
   APPLICATION STATE
   ========================================================== */

const state = {
  allModules: [],
  filteredModules: [],
  search: '',
  category: '',
  showAll: false,
  isLoading: false,
  currentUser: null,
  lastFocusedElement: null
};

const elements = {};


/* ==========================================================
   INITIALIZATION
   ========================================================== */

document.addEventListener('DOMContentLoaded', initializeHomePage);

async function initializeHomePage() {
  cacheElements();
  setCurrentYear();
  bindNavigationEvents();
  bindSearchEvents();
  bindCategoryEvents();
  bindModuleEvents();
  bindRequestEvents();

  await initializeUserInterface();
  await loadModules();
}


/* ==========================================================
   ELEMENT CACHE
   ========================================================== */

function cacheElements() {
  elements.currentYear = document.getElementById('current-year');

  elements.mobileMenuButton =
    document.getElementById('mobile-menu-button');
  elements.mobileNavigation =
    document.getElementById('mobile-navigation');

  elements.loginLink = document.getElementById('login-link');
  elements.loginMobileLink =
    document.getElementById('login-mobile-link');

  elements.userProfile =
    document.getElementById('user-profile');
  elements.userInitial =
    document.getElementById('user-initial');
  elements.userName =
    document.getElementById('user-name');
  elements.userRole =
    document.getElementById('user-role');

  elements.adminNavLink =
    document.getElementById('admin-nav-link');
  elements.adminMobileLink =
    document.getElementById('admin-mobile-link');
  elements.adminFooterLink =
    document.getElementById('admin-footer-link');

  elements.searchForm =
    document.getElementById('global-search-form');
  elements.searchInput =
    document.getElementById('global-search-input');
  elements.clearSearchButton =
    document.getElementById('clear-search-button');

  elements.quickSearchButtons = Array.from(
    document.querySelectorAll('.quick-search-button')
  );

  elements.categoryButtons = Array.from(
    document.querySelectorAll('[data-category]')
  );

  elements.moduleCount =
    document.getElementById('module-count');
  elements.categoryCount =
    document.getElementById('category-count');
  elements.latestUpdate =
    document.getElementById('latest-update');

  elements.moduleGrid =
    document.getElementById('module-grid');
  elements.loadingState =
    document.getElementById('loading-state');
  elements.errorState =
    document.getElementById('error-state');
  elements.errorMessage =
    document.getElementById('error-message');
  elements.emptyState =
    document.getElementById('empty-state');

  elements.retryButton =
    document.getElementById('retry-button');
  elements.emptyResetButton =
    document.getElementById('empty-reset-button');
  elements.showAllButton =
    document.getElementById('show-all-modules-button');

  elements.activeFilterBar =
    document.getElementById('active-filter-bar');
  elements.activeFilterText =
    document.getElementById('active-filter-text');
  elements.resetFilterButton =
    document.getElementById('reset-filter-button');

  elements.moduleSectionDescription =
    document.getElementById('module-section-description');
  elements.featuredModuleList =
    document.getElementById('featured-module-list');

  elements.requestModal =
    document.getElementById('request-modal');
  elements.openRequestModalButton =
    document.getElementById('open-request-modal-button');
  elements.closeRequestModalButton =
    document.getElementById('close-request-modal-button');
  elements.cancelRequestButton =
    document.getElementById('cancel-request-button');

  elements.requestForm =
    document.getElementById('request-material-form');
  elements.requestFormMessage =
    document.getElementById('request-form-message');
  elements.submitRequestButton =
    document.getElementById('submit-request-button');

  elements.submitRequestText =
    elements.submitRequestButton?.querySelector('.button-text') ?? null;
  elements.submitRequestLoading =
    elements.submitRequestButton?.querySelector('.button-loading') ?? null;

  elements.toastContainer =
    document.getElementById('toast-container');
}


/* ==========================================================
   USER INTERFACE
   ========================================================== */

async function initializeUserInterface() {
  try {
    state.currentUser = await API.getCurrentUser();
  } catch (error) {
    console.warn('Profil pengguna belum dapat dimuat:', error);
    state.currentUser = null;
  }

  renderUserInterface();
}

function renderUserInterface() {
  const user = state.currentUser;

  if (!user) {
    setHidden(elements.loginLink, false);
    setHidden(elements.loginMobileLink, false);
    setHidden(elements.userProfile, true);
    setAdminLinksVisible(false);
    return;
  }

  const name = cleanText(user.name) || 'Pengguna PMA';
  const role = normalizeRole(user.role);
  const email = cleanText(user.email);

  setText(elements.userName, name);
  setText(elements.userRole, getRoleLabel(role));
  setText(elements.userInitial, name.charAt(0).toUpperCase() || 'P');

  if (elements.userProfile) {
    elements.userProfile.title = email || name;
  }

  setHidden(elements.loginLink, true);
  setHidden(elements.loginMobileLink, true);
  setHidden(elements.userProfile, false);
  setAdminLinksVisible(['ADMIN', 'EDITOR'].includes(role));
}

function setAdminLinksVisible(isVisible) {
  setHidden(elements.adminNavLink, !isVisible);
  setHidden(elements.adminMobileLink, !isVisible);
  setHidden(elements.adminFooterLink, !isVisible);
}


/* ==========================================================
   NAVIGATION
   ========================================================== */

function bindNavigationEvents() {
  if (elements.mobileMenuButton && elements.mobileNavigation) {
    elements.mobileMenuButton.addEventListener('click', toggleMobileMenu);

    elements.mobileNavigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) {
        closeMobileMenu();
      }
    });

    document.addEventListener('click', (event) => {
      const clickedInsideHeader = event.target.closest('#site-header');

      if (!clickedInsideHeader) {
        closeMobileMenu();
      }
    });
  }
}

function toggleMobileMenu() {
  const isOpen =
    elements.mobileMenuButton.getAttribute('aria-expanded') === 'true';

  elements.mobileMenuButton.setAttribute(
    'aria-expanded',
    String(!isOpen)
  );

  elements.mobileNavigation.hidden = isOpen;
}

function closeMobileMenu() {
  if (!elements.mobileMenuButton || !elements.mobileNavigation) {
    return;
  }

  elements.mobileNavigation.hidden = true;
  elements.mobileMenuButton.setAttribute('aria-expanded', 'false');
}


/* ==========================================================
   SEARCH
   ========================================================== */

function bindSearchEvents() {
  elements.searchForm?.addEventListener('submit', (event) => {
    event.preventDefault();

    state.search = cleanText(elements.searchInput?.value);
    state.showAll = true;

    applyFiltersAndRender();
    scrollToModules();
  });

  elements.searchInput?.addEventListener('input', () => {
    const hasValue = cleanText(elements.searchInput.value) !== '';
    setHidden(elements.clearSearchButton, !hasValue);
  });

  elements.clearSearchButton?.addEventListener('click', () => {
    if (elements.searchInput) {
      elements.searchInput.value = '';
      elements.searchInput.focus();
    }

    state.search = '';
    state.showAll = false;

    setHidden(elements.clearSearchButton, true);
    applyFiltersAndRender();
  });

  elements.quickSearchButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const term = cleanText(button.dataset.search);

      if (elements.searchInput) {
        elements.searchInput.value = term;
      }

      state.search = term;
      state.showAll = true;

      setHidden(elements.clearSearchButton, !term);
      applyFiltersAndRender();
      scrollToModules();
    });
  });
}


/* ==========================================================
   CATEGORY FILTER
   ========================================================== */

function bindCategoryEvents() {
  elements.categoryButtons.forEach((button) => {
    button.setAttribute('aria-pressed', 'false');

    button.addEventListener('click', () => {
      state.category = cleanText(button.dataset.category);
      state.showAll = true;

      markActiveCategory(button);
      applyFiltersAndRender();
      scrollToModules();
    });
  });
}

function markActiveCategory(activeButton) {
  elements.categoryButtons.forEach((button) => {
    const isActive = button === activeButton;

    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  });
}


/* ==========================================================
   MODULE DATA
   ========================================================== */

async function loadModules() {
  if (state.isLoading) {
    return;
  }

  setLoadingState(true);
  hideError();
  hideEmpty();

  try {
    const modules = await API.getPublishedModules();

    state.allModules = Array.isArray(modules)
      ? modules
      : [];

    state.showAll = false;

    applyFiltersAndRender();
    renderStatistics();
    renderFeaturedModules();
  } catch (error) {
    showError(getErrorMessage(error));
  } finally {
    setLoadingState(false);
  }
}

function bindModuleEvents() {
  elements.retryButton?.addEventListener('click', loadModules);
  elements.emptyResetButton?.addEventListener('click', resetFilters);
  elements.resetFilterButton?.addEventListener('click', resetFilters);

  elements.showAllButton?.addEventListener('click', () => {
    state.showAll = !state.showAll;

    renderModules();
    updateShowAllButton();
  });
}

function applyFiltersAndRender() {
  const search = state.search.toLowerCase();
  const category = state.category.toLowerCase();

  state.filteredModules = state.allModules.filter((module) => {
    if (
      category &&
      cleanText(module.category).toLowerCase() !== category
    ) {
      return false;
    }

    if (!search) {
      return true;
    }

    const searchableText = [
      module.title,
      module.description,
      module.category,
      module.department,
      module.contentType,
      module.owner
    ]
      .map(cleanText)
      .join(' ')
      .toLowerCase();

    return searchableText.includes(search);
  });

  renderModules();
  updateFilterBar();
  updateShowAllButton();
  updateModuleSectionDescription();
}

function renderModules() {
  if (!elements.moduleGrid) {
    return;
  }

  elements.moduleGrid.replaceChildren();

  if (!state.filteredModules.length) {
    showEmpty();
    return;
  }

  hideEmpty();

  const modulesToDisplay = state.showAll
    ? state.filteredModules
    : state.filteredModules.slice(
        0,
        APP_CONFIG.initialModuleLimit
      );

  const fragment = document.createDocumentFragment();

  modulesToDisplay.forEach((module) => {
    fragment.appendChild(createModuleCard(module));
  });

  elements.moduleGrid.appendChild(fragment);
}

function createModuleCard(module) {
  const article = document.createElement('article');
  article.className = 'module-card';

  const detailUrl = buildModuleUrl(module.id);

  const imageLink = document.createElement('a');
  imageLink.className = 'module-card-image';
  imageLink.href = detailUrl;
  imageLink.setAttribute(
    'aria-label',
    `Lihat detail ${cleanText(module.title) || 'modul'}`
  );

  const imageUrl = normalizeImageUrl(module.thumbnailUrl);

  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = cleanText(module.title) || 'Thumbnail modul';
    image.loading = 'lazy';

    image.addEventListener('error', () => {
      image.remove();
    });

    imageLink.appendChild(image);
  }

  const fallback = document.createElement('span');
  fallback.setAttribute('aria-hidden', 'true');
  fallback.textContent = getCategoryIcon(
    module.category,
    module.contentType
  );

  Object.assign(fallback.style, {
    position: 'absolute',
    inset: '0',
    display: 'grid',
    placeItems: 'center',
    fontSize: '54px'
  });

  imageLink.appendChild(fallback);

  const cardBody = document.createElement('div');
  cardBody.className = 'module-card-body';

  const meta = document.createElement('div');
  meta.className = 'module-card-meta';

  const categoryBadge = document.createElement('span');
  categoryBadge.className = 'module-badge';
  categoryBadge.textContent = cleanText(module.category) || 'Materi';
  meta.appendChild(categoryBadge);

  if (cleanText(module.contentType)) {
    const typeBadge = document.createElement('span');
    typeBadge.className = 'module-type';
    typeBadge.textContent = cleanText(module.contentType);
    meta.appendChild(typeBadge);
  }

  const title = document.createElement('h3');
  title.textContent = cleanText(module.title) || 'Tanpa judul';

  const description = document.createElement('p');
  description.textContent =
    cleanText(module.description) ||
    'Belum ada deskripsi untuk materi ini.';

  const footer = document.createElement('div');
  footer.className = 'module-card-footer';

  const date = document.createElement('small');
  date.textContent = formatDate(module.updatedAt);

  const detailLink = document.createElement('a');
  detailLink.className = 'module-link';
  detailLink.href = detailUrl;
  detailLink.textContent = 'Lihat Detail →';

  footer.append(date, detailLink);
  cardBody.append(meta, title, description, footer);
  article.append(imageLink, cardBody);

  return article;
}

function renderStatistics() {
  setText(
    elements.moduleCount,
    formatNumber(state.allModules.length)
  );

  const categories = new Set(
    state.allModules
      .map((module) =>
        cleanText(module.category).toLowerCase()
      )
      .filter(Boolean)
  );

  setText(
    elements.categoryCount,
    formatNumber(categories.size)
  );

  const latestTimestamp = state.allModules.reduce(
    (latest, module) => {
      const timestamp = parseDate(module.updatedAt);
      return timestamp > latest ? timestamp : latest;
    },
    0
  );

  setText(
    elements.latestUpdate,
    latestTimestamp
      ? formatShortDate(new Date(latestTimestamp))
      : '—'
  );
}

function renderFeaturedModules() {
  if (!elements.featuredModuleList) {
    return;
  }

  let featuredModules = state.allModules
    .filter((module) => toBoolean(module.featured))
    .slice(0, 5);

  if (!featuredModules.length) {
    featuredModules = state.allModules.slice(0, 3);
  }

  elements.featuredModuleList.replaceChildren();

  if (!featuredModules.length) {
    const placeholder = document.createElement('div');
    placeholder.className = 'featured-placeholder';
    placeholder.textContent = 'Belum ada materi unggulan.';
    elements.featuredModuleList.appendChild(placeholder);
    return;
  }

  const fragment = document.createDocumentFragment();

  featuredModules.forEach((module, index) => {
    const item = document.createElement('article');
    item.className = 'featured-module-item';

    const content = document.createElement('div');

    const badge = document.createElement('span');
    badge.className = 'module-badge';
    badge.textContent = `Pilihan ${index + 1}`;

    const title = document.createElement('h3');
    title.textContent = cleanText(module.title) || 'Tanpa judul';

    const details = document.createElement('p');
    details.textContent = [
      module.category,
      module.department,
      module.contentType
    ]
      .map(cleanText)
      .filter(Boolean)
      .join(' • ');

    const link = document.createElement('a');
    link.className = 'module-link';
    link.href = buildModuleUrl(module.id);
    link.textContent = 'Buka Materi →';

    content.append(badge, title, details);
    item.append(content, link);
    fragment.appendChild(item);
  });

  elements.featuredModuleList.appendChild(fragment);
}

function updateFilterBar() {
  if (!elements.activeFilterBar || !elements.activeFilterText) {
    return;
  }

  const labels = [];

  if (state.search) {
    labels.push(`Pencarian: “${state.search}”`);
  }

  if (state.category) {
    labels.push(`Kategori: ${state.category}`);
  }

  elements.activeFilterBar.hidden = labels.length === 0;
  elements.activeFilterText.textContent = labels.join(' • ');
}

function updateShowAllButton() {
  if (!elements.showAllButton) {
    return;
  }

  const shouldHide =
    state.filteredModules.length <= APP_CONFIG.initialModuleLimit;

  elements.showAllButton.hidden = shouldHide;
  elements.showAllButton.textContent = state.showAll
    ? 'Tampilkan Lebih Sedikit'
    : 'Lihat Semua Modul';
}

function updateModuleSectionDescription() {
  if (!elements.moduleSectionDescription) {
    return;
  }

  elements.moduleSectionDescription.textContent =
    state.search || state.category
      ? `${formatNumber(
          state.filteredModules.length
        )} materi ditemukan berdasarkan filter yang dipilih.`
      : 'Materi terbaru dan pilihan untuk mendukung pekerjaanmu.';
}

function resetFilters() {
  state.search = '';
  state.category = '';
  state.showAll = false;

  if (elements.searchInput) {
    elements.searchInput.value = '';
  }

  setHidden(elements.clearSearchButton, true);
  markActiveCategory(null);
  applyFiltersAndRender();
}

function setLoadingState(isLoading) {
  state.isLoading = isLoading;

  setHidden(elements.loadingState, !isLoading);

  if (isLoading && elements.moduleGrid) {
    elements.moduleGrid.replaceChildren();
  }
}

function showError(message) {
  setHidden(elements.errorState, false);
  setText(elements.errorMessage, message);

  if (elements.moduleGrid) {
    elements.moduleGrid.replaceChildren();
  }
}

function hideError() {
  setHidden(elements.errorState, true);
}

function showEmpty() {
  setHidden(elements.emptyState, false);
}

function hideEmpty() {
  setHidden(elements.emptyState, true);
}


/* ==========================================================
   MATERIAL REQUEST MODAL
   ========================================================== */

function bindRequestEvents() {
  elements.openRequestModalButton?.addEventListener(
    'click',
    openRequestModal
  );

  elements.closeRequestModalButton?.addEventListener(
    'click',
    closeRequestModal
  );

  elements.cancelRequestButton?.addEventListener(
    'click',
    closeRequestModal
  );

  elements.requestModal?.addEventListener('click', (event) => {
    if (event.target === elements.requestModal) {
      closeRequestModal();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (
      event.key === 'Escape' &&
      elements.requestModal &&
      !elements.requestModal.hidden
    ) {
      closeRequestModal();
    }
  });

  elements.requestForm?.addEventListener(
    'submit',
    submitMaterialRequest
  );
}

function openRequestModal() {
  if (!elements.requestModal) {
    return;
  }

  state.lastFocusedElement = document.activeElement;

  prefillRequestForm();
  clearRequestMessage();

  elements.requestModal.hidden = false;
  document.body.classList.add('modal-open');

  window.setTimeout(() => {
    elements.requestForm
      ?.querySelector('input, textarea, button')
      ?.focus();
  }, 40);
}

function closeRequestModal() {
  if (!elements.requestModal) {
    return;
  }

  elements.requestModal.hidden = true;
  document.body.classList.remove('modal-open');
  clearRequestMessage();

  if (
    state.lastFocusedElement &&
    typeof state.lastFocusedElement.focus === 'function'
  ) {
    state.lastFocusedElement.focus();
  }
}

function prefillRequestForm() {
  if (!elements.requestForm || !state.currentUser) {
    return;
  }

  const nameInput =
    elements.requestForm.querySelector('[name="name"]');
  const emailInput =
    elements.requestForm.querySelector('[name="email"]');
  const departmentInput =
    elements.requestForm.querySelector('[name="department"]');

  if (nameInput && !nameInput.value) {
    nameInput.value = cleanText(state.currentUser.name);
  }

  if (emailInput && !emailInput.value) {
    emailInput.value = cleanText(state.currentUser.email);
  }

  if (departmentInput && !departmentInput.value) {
    departmentInput.value = cleanText(
      state.currentUser.department
    );
  }
}

async function submitMaterialRequest(event) {
  event.preventDefault();

  if (
    !elements.requestForm ||
    !elements.requestForm.reportValidity()
  ) {
    return;
  }

  const formData = new FormData(elements.requestForm);

  const payload = {
    name: cleanText(formData.get('name')),
    email: cleanText(formData.get('email')),
    department: cleanText(formData.get('department')),
    requestedMaterial: cleanText(
      formData.get('requestedMaterial')
    ),
    description: cleanText(formData.get('description'))
  };

  setRequestSubmitting(true);
  clearRequestMessage();

  try {
    const response = await API.submitMaterialRequest(payload);

    showRequestMessage(
      response.message || 'Request materi berhasil dikirim.',
      'success'
    );

    showToast(
      'Request materi berhasil disimpan.',
      'success'
    );

    elements.requestForm.reset();
    prefillRequestForm();

    window.setTimeout(closeRequestModal, 1500);
  } catch (error) {
    const message = getErrorMessage(error);

    showRequestMessage(message, 'error');
    showToast(message, 'error');
  } finally {
    setRequestSubmitting(false);
  }
}

function setRequestSubmitting(isSubmitting) {
  if (!elements.submitRequestButton) {
    return;
  }

  elements.submitRequestButton.disabled = isSubmitting;

  setHidden(elements.submitRequestText, isSubmitting);
  setHidden(elements.submitRequestLoading, !isSubmitting);
}

function showRequestMessage(message, type) {
  if (!elements.requestFormMessage) {
    return;
  }

  elements.requestFormMessage.hidden = false;
  elements.requestFormMessage.className =
    `form-message ${type || ''}`.trim();
  elements.requestFormMessage.textContent = message;
}

function clearRequestMessage() {
  if (!elements.requestFormMessage) {
    return;
  }

  elements.requestFormMessage.hidden = true;
  elements.requestFormMessage.className = 'form-message';
  elements.requestFormMessage.textContent = '';
}


/* ==========================================================
   TOAST
   ========================================================== */

function showToast(message, type = '') {
  if (!elements.toastContainer) {
    return;
  }

  const toast = document.createElement('div');
  toast.className = `toast ${type}`.trim();
  toast.setAttribute('role', 'status');
  toast.textContent = cleanText(message);

  elements.toastContainer.appendChild(toast);

  window.setTimeout(() => {
    toast.remove();
  }, 3500);
}


/* ==========================================================
   URL AND IMAGE HELPERS
   ========================================================== */

function buildModuleUrl(moduleId) {
  const url = new URL('./module.html', window.location.href);
  url.searchParams.set('id', cleanText(moduleId));
  return url.href;
}

function normalizeImageUrl(url) {
  const value = cleanText(url);

  if (!value || !/^https:\/\//i.test(value)) {
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
        '&sz=w1000'
      );
    }
  }

  return value;
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

  if (text.includes('template')) {
    return '🧩';
  }

  if (
    text.includes('powerpoint') ||
    text.includes('ppt')
  ) {
    return '📊';
  }

  return '📘';
}


/* ==========================================================
   GENERAL UTILITIES
   ========================================================== */

function setCurrentYear() {
  setText(
    elements.currentYear,
    String(new Date().getFullYear())
  );
}

function scrollToModules() {
  document
    .getElementById('bank-modul')
    ?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
}

function setText(element, value) {
  if (element) {
    element.textContent = cleanText(value);
  }
}

function setHidden(element, isHidden) {
  if (element) {
    element.hidden = Boolean(isHidden);
  }
}

function cleanText(value) {
  return value === null || value === undefined
    ? ''
    : String(value).trim();
}

function normalizeRole(role) {
  const normalizedRole = cleanText(role).toUpperCase();

  return ['ADMIN', 'EDITOR', 'VIEWER'].includes(normalizedRole)
    ? normalizedRole
    : 'VIEWER';
}

function getRoleLabel(role) {
  const labels = {
    ADMIN: 'Admin Human Capital',
    EDITOR: 'Editor Materi',
    VIEWER: 'Employee'
  };

  return labels[role] || labels.VIEWER;
}

function toBoolean(value) {
  if (typeof value === 'boolean') {
    return value;
  }

  return ['true', '1', 'yes', 'ya', 'y'].includes(
    cleanText(value).toLowerCase()
  );
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

function formatDate(value) {
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

function formatShortDate(date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(
    Number(value || 0)
  );
}

function createId(prefix) {
  const randomPart = crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);

  return `${prefix}-${randomPart.toUpperCase()}`;
}

function readLocalStorage(key, fallbackValue) {
  try {
    const value = window.localStorage.getItem(key);

    if (value === null) {
      return fallbackValue;
    }

    return JSON.parse(value);
  } catch (error) {
    console.warn(
      `Data localStorage "${key}" gagal dibaca:`,
      error
    );

    return fallbackValue;
  }
}

function writeLocalStorage(key, value) {
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    throw new Error(
      'Browser tidak dapat menyimpan request materi.'
    );
  }
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, milliseconds);
  });
}

function getErrorMessage(error) {
  if (!error) {
    return 'Terjadi kesalahan yang tidak diketahui.';
  }

  if (typeof error === 'string') {
    return error;
  }

  return (
    cleanText(error.message) ||
    'Terjadi kesalahan saat memproses data.'
  );
}
