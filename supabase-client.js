/**
 * PMA Knowledge Hub
 * Inisialisasi Supabase untuk browser/GitHub Pages.
 */

'use strict';

import {
  SUPABASE_CONFIG
} from './config.js?v=20260715-1';

let clientInstance = null;

export function getSupabaseClient() {
  if (clientInstance) {
    return clientInstance;
  }

  validateConfig();

  const library = window.supabase;

  if (
    !library ||
    typeof library.createClient !== 'function'
  ) {
    throw new Error(
      'Library Supabase belum termuat. Periksa script CDN pada file HTML.'
    );
  }

  clientInstance = library.createClient(
    SUPABASE_CONFIG.url,
    SUPABASE_CONFIG.publishableKey,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      },
      db: {
        schema: 'public'
      },
      global: {
        headers: {
          'x-application-name': 'pma-knowledge-hub'
        }
      }
    }
  );

  return clientInstance;
}

function validateConfig() {
  const url = String(
    SUPABASE_CONFIG?.url || ''
  ).trim();

  const publishableKey = String(
    SUPABASE_CONFIG?.publishableKey || ''
  ).trim();

  if (
    !/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)
  ) {
    throw new Error(
      'Project URL Supabase pada assets/js/config.js belum valid.'
    );
  }

  if (
    !publishableKey ||
    publishableKey.includes('PASTE_')
  ) {
    throw new Error(
      'Publishable key pada assets/js/config.js belum diisi.'
    );
  }
}
