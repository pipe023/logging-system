// Base URL for your backend server
export const API_BASE_URL = 'http://127.0.0.1:8000/api/v1';

// Dictionary of all available API endpoints
export const ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    refreshToken: '/auth/refresh',
    mfaVerify: '/auth/login/mfa-verify'
  },
  users: {
    list: '/system/users/',
    create: '/system/users',
    register : '/system/register',
    details: (id: string | number) => `/system/users/${id}`,
    permissions: (id: string | number) => `/system/users/${id}/permissions`,
    delete: (id: string | number) => `/system/users/${id}`,
    lock: (id: string | number) => `/system/users/${id}/lock`,
    unlock: (id: string | number) => `/system/users/${id}/unlock`,
    generateAPIKey: (id: string | number) => `/system/users/${id}/generate-api-key`,
    me: '/users/me',
    mfa: '/mfa/setup/totp',
    mfaVerify: '/mfa/verify/totp',
    mfaDisable: '/mfa/disable'
  },
  apps: {
    config: '/apps/config',
    list: '/apps',
  },
  system: {
    health: '/health',
    auditLogs: '/audit-logs',
    dashboard: '/system/dashboard',
    installedApps: '/system/installed-apps'
  },
  logging_app: {
    ingest: '/logging_app/ingest',
    list: '/logging_app/',
    dashboard: '/logging_app/dashboard',
    summary: '/logging_app/analytics/summary', 
    analysis: '/logging_app/analytics/graph',
    users: '/logging_app/system/users'
  }
} as const;