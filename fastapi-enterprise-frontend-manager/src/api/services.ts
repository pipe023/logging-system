import { apiClient } from './client';
import { ENDPOINTS } from './urls';

// ==========================================
// TYPE DEFINITIONS
// ==========================================

export interface LogItem {
  id: string | number;
  timestamp: string;
  level: string;
  service_name: string;
  user_id?: string | null;
  message: string;
  path?: string | null;
  method?: string | null;
  extra?: Record<string, any> | null;
}

export interface LogQueryParams {
  page?: number;
  limit?: number;
  level?: string;
  service?: string;
  user_id?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface PaginatedLogsResponse {
  data: LogItem[];
  total: number;
  page: number;
  totalPages: number;
}

// ==========================================
// SERVICES
// ==========================================

export const AuthService = {
  login: async (credentials: any) => {
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await apiClient.post(ENDPOINTS.auth.login, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    
    return response.data;
  },

  verifyMfa: async (payload: { mfa_token: string; code: string }) => {
    const response = await apiClient.post(ENDPOINTS.auth.mfaVerify, payload);
    if (response.data.access_token) {
      localStorage.setItem('access_token', response.data.access_token);
      localStorage.setItem('refresh_token', response.data.refresh_token);
    }
    
    return response.data;
  },

  register: async (payload: any) => {
    const response = await apiClient.post((ENDPOINTS.auth as any).register || '/auth/register', payload);
    return response.data;
  },

  changePassword: async (payload: { old_password: string; new_password: string }) => {
    const response = await apiClient.post((ENDPOINTS.auth as any).changePassword || '/auth/change-password', payload);
    return response.data;
  }
};

export const SystemService = {
  getUserList: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.users.list);
      return response.data;
    } catch (error: any) {
      console.error("UserService Error:", error.response?.data || error.message);
      throw error;
    }
  },

  getDashboardMetrics: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.system.dashboard);
      
      return {
        metrics: response.data.metrics,
        apps: response.data.installed_apps,
        logs: response.data.recent_logs,
        fetchedAt: new Date().toISOString()
      };
    } catch (error: any) {
      console.error("SystemService Error:", error.response?.data || error.message);
      throw error;
    }
  },

  pingSystem: async () => {
    const response = await apiClient.get('/api/v1/system/health');
    return response.data;
  },

  getUserById: async (userId: string) => {
    const response = await apiClient.get(`${ENDPOINTS.users.list}${userId}`);
    return response.data;
  },

  deleteUser: async (userId: string | number) => {
    const response = await apiClient.delete(`/system/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId: string | number, payload: { 
    is_active?: boolean, 
    permissions?: Record<string, string[]> 
  }) => {
    const response = await apiClient.patch(`/system/users/${userId}`, payload);
    return response.data;
  },

  unlockUser: async (userId: string | number) => {
    const response = await apiClient.post(`/system/users/${userId}/unlock`);
    return response.data;
  }
};

export const UserService = {
  getKey2FA: async () => {
    const response = await apiClient.get(ENDPOINTS.users.mfa);
    return response.data;
  },

  getMe: async () => {
    const response = await apiClient.get(ENDPOINTS.users.me);
    return response.data;
  },

  setupMfa: async () => {
    const response = await apiClient.post('/users/me/mfa/setup');
    return response.data;
  },
  
  verifyMfaSetup: async (code: string) => {
    const response = await apiClient.post(ENDPOINTS.users.mfaVerify, { code });
    return response.data;
  },

  disableMFA: async (password: string) => {
    const response = await apiClient.post(ENDPOINTS.users.mfaDisable, { password });
    return response.data;
  },

  updateProfile: async (payload: {
    email: string;
    full_name: string;
    date_of_birth: string;
    phone_number: string;
  }) => {
    const response = await apiClient.patch(ENDPOINTS.users.me, payload);
    return response.data;
  },
};

export const UserRegistrationService = {
  registerUser: async (userData: { 
    username: string; 
    password: string; 
    confirm_password: string; 
    permissions: Record<string, any> 
  }) => {
    const response = await apiClient.post(ENDPOINTS.users.register, userData);
    return response.data;
  }
};

export const InstalledAppsService = {
  getInstalledApps: async () => {
    try {
      const response = await apiClient.get(ENDPOINTS.system.installedApps);
      return response.data.installed_apps; 
    } catch (error: any) {
      console.error("System Registry Error:", error.response?.data || error.message);
      throw error;
    }
  }
};

export const GenerateApiKeyService = {
  generateApiKey: async (id: string | number) => {
    const response = await apiClient.post(ENDPOINTS.users.generateAPIKey(id));
    return response.data;
  }
};

export const ChangePasswordService = {
  resetPassword: async (id: string | number, newPassword: string) => {
    const response = await apiClient.post(`/system/users/${id}/reset-password`, {
      new_password: newPassword 
    });
    return response.data;
  }
};

export const LoggingService = {
  /**
   * Fetches server-paginated and filtered logs from backend.
   * Strips out empty values or default 'ALL' dropdown options automatically.
   */
  getLogs: async (params: LogQueryParams = {}): Promise<PaginatedLogsResponse> => {
    const cleanParams: Record<string, any> = {};

    Object.entries(params).forEach(([key, value]) => {
      if (
        value !== undefined && 
        value !== null && 
        value !== '' && 
        value !== 'ALL'
      ) {
        cleanParams[key] = value;
      }
    });

    const response = await apiClient.get(ENDPOINTS.logging_app.list, { 
      params: cleanParams 
    });
    return response.data;
  },

  getSummary: async () => {
    const response = await apiClient.get(ENDPOINTS.logging_app.summary);
    return response.data;
  },

  getUsers: async () => {
    const response = await apiClient.get(ENDPOINTS.logging_app.users);
    return response.data;
  },

  ingestLog: async (logData: { service_name: string; level: string; message: string; metadata?: any }) => {
    const response = await apiClient.post(ENDPOINTS.logging_app.ingest || "/ingest", logData);
    return response.data;
  }
};