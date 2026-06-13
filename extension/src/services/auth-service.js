// =============================================================================
// ThreadCub Auth Service
// Handles token storage, retrieval, validation, and auth state management
// =============================================================================

// ⚠️ CHANGE BACK TO PRODUCTION BEFORE RELOADING EXTENSION FOR NORMAL USE
// Must match IS_LOCAL_DEV in api-service.js
const AUTH_IS_LOCAL_DEV = false;
const AUTH_BASE = AUTH_IS_LOCAL_DEV ? 'http://localhost:3000' : 'https://threadcub.com';

const AuthService = {
  // Storage key for the auth token
  TOKEN_KEY: 'threadcub_auth_token',
  USER_KEY: 'threadcub_auth_user',
  ENCRYPTION_KEY: 'threadcub_user_encryption_key',

  // API endpoints
  VALIDATE_URL: `${AUTH_BASE}/api/auth/validate`,
  LOGIN_URL: `${AUTH_BASE}/auth/extension-login`,

  // =========================================================================
  // TOKEN STORAGE
  // =========================================================================

  /**
   * Store auth token in chrome.storage.local
   */
  async storeToken(token) {
    console.log('🔐 AuthService: Storing auth token...');
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [this.TOKEN_KEY]: token }, () => {
          if (chrome.runtime.lastError) {
            console.error('🔐 AuthService: Error storing token:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log('🔐 AuthService: Token stored successfully');
            resolve();
          }
        });
      } else {
        // Fallback to localStorage
        try {
          localStorage.setItem(this.TOKEN_KEY, token);
          console.log('🔐 AuthService: Token stored in localStorage (fallback)');
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    });
  },

  /**
   * Get auth token from chrome.storage.local
   */
  async getToken() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([this.TOKEN_KEY], (result) => {
          if (chrome.runtime.lastError) {
            console.log('🔐 AuthService: Error getting token:', chrome.runtime.lastError);
            resolve(null);
          } else {
            const token = result[this.TOKEN_KEY] || null;
            console.log('🔐 AuthService: Token retrieved:', !!token);
            resolve(token);
          }
        });
      } else {
        // Fallback to localStorage
        try {
          const token = localStorage.getItem(this.TOKEN_KEY);
          resolve(token);
        } catch (error) {
          resolve(null);
        }
      }
    });
  },

  /**
   * Clear auth token (logout)
   */
  async clearToken() {
    console.log('🔐 AuthService: Clearing auth token...');
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.remove([this.TOKEN_KEY, this.USER_KEY, this.ENCRYPTION_KEY], () => {
          if (chrome.runtime.lastError) {
            console.error('🔐 AuthService: Error clearing token:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log('🔐 AuthService: Token cleared successfully');
            resolve();
          }
        });
      } else {
        try {
          localStorage.removeItem(this.TOKEN_KEY);
          localStorage.removeItem(this.USER_KEY);
          localStorage.removeItem(this.ENCRYPTION_KEY);
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    });
  },

  // =========================================================================
  // USER DATA STORAGE
  // =========================================================================

  /**
   * Store user data (email, etc.) from validation response
   */
  async storeUser(userData) {
    console.log('🔐 AuthService: Storing user data...');
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [this.USER_KEY]: userData }, () => {
          if (chrome.runtime.lastError) {
            reject(chrome.runtime.lastError);
          } else {
            console.log('🔐 AuthService: User data stored');
            resolve();
          }
        });
      } else {
        try {
          localStorage.setItem(this.USER_KEY, JSON.stringify(userData));
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    });
  },

  /**
   * Get stored user data
   */
  async getUser() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([this.USER_KEY], (result) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(result[this.USER_KEY] || null);
          }
        });
      } else {
        try {
          const userData = localStorage.getItem(this.USER_KEY);
          resolve(userData ? JSON.parse(userData) : null);
        } catch (error) {
          resolve(null);
        }
      }
    });
  },

  // =========================================================================
  // ENCRYPTION KEY STORAGE
  // =========================================================================

  /**
   * Store per-user encryption key from auth session
   */
  async storeEncryptionKey(key) {
    console.log('🔐 AuthService: Storing per-user encryption key...');
    return new Promise((resolve, reject) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ [this.ENCRYPTION_KEY]: key }, () => {
          if (chrome.runtime.lastError) {
            console.error('🔐 AuthService: Error storing encryption key:', chrome.runtime.lastError);
            reject(chrome.runtime.lastError);
          } else {
            console.log('🔐 AuthService: Per-user encryption key stored successfully');
            resolve();
          }
        });
      } else {
        try {
          localStorage.setItem(this.ENCRYPTION_KEY, key);
          console.log('🔐 AuthService: Encryption key stored in localStorage (fallback)');
          resolve();
        } catch (error) {
          reject(error);
        }
      }
    });
  },

  /**
   * Get per-user encryption key from storage
   * Returns null if no key stored
   */
  async getEncryptionKey() {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get([this.ENCRYPTION_KEY], (result) => {
          if (chrome.runtime.lastError) {
            console.log('🔐 AuthService: Error getting encryption key:', chrome.runtime.lastError);
            resolve(null);
          } else {
            const key = result[this.ENCRYPTION_KEY] || null;
            console.log('🔐 AuthService: Encryption key retrieved:', !!key);
            resolve(key);
          }
        });
      } else {
        try {
          const key = localStorage.getItem(this.ENCRYPTION_KEY);
          resolve(key);
        } catch (error) {
          resolve(null);
        }
      }
    });
  },

  // =========================================================================
  // TOKEN VALIDATION
  // =========================================================================

  /**
   * Validate token with the API
   * Returns user data if valid, null if invalid/expired
   */
  async validateToken(token) {
    if (!token) {
      console.log('🔐 AuthService: No token to validate');
      return null;
    }

    console.log('🔐 AuthService: Validating token with API...');

    try {
      const response = await fetch(this.VALIDATE_URL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('🔐 AuthService: Token is valid, user:', data);
        if (data.encryptionKey) {
          await this.storeEncryptionKey(data.encryptionKey);
          console.log('🔐 AuthService: Encryption key stored from validate response');
        }
        return data;
      } else if (response.status === 401) {
        console.log('🔐 AuthService: Token expired or invalid (401)');
        // Clear expired token
        await this.clearToken();
        return null;
      } else {
        console.error('🔐 AuthService: Validation request failed:', response.status);
        return null;
      }
    } catch (error) {
      console.error('🔐 AuthService: Validation error:', error);
      return null;
    }
  },

  // =========================================================================
  // AUTH STATE HELPERS
  // =========================================================================

  /**
   * Check if user is authenticated (has a stored token)
   */
  async isAuthenticated() {
    const token = await this.getToken();
    return !!token;
  },

  /**
   * Get token and validate it, returning user data if valid
   * Clears token if expired/invalid
   */
  async getValidatedAuth() {
    const token = await this.getToken();
    if (!token) {
      return { authenticated: false, token: null, user: null };
    }

    const userData = await this.validateToken(token);
    if (userData) {
      // Store user data for quick access
      await this.storeUser(userData);
      return { authenticated: true, token, user: userData };
    }

    return { authenticated: false, token: null, user: null };
  },

  /**
   * Logout: clear token and user data
   */
  async logout() {
    console.log('🔐 AuthService: Logging out...');
    await this.clearToken();
    console.log('🔐 AuthService: Logout complete');
  },

  /**
   * Open login page in a new tab
   */
  openLoginPage() {
    console.log('🔐 AuthService: Opening login page...');
    if (typeof chrome !== 'undefined' && chrome.tabs) {
      chrome.tabs.create({ url: this.LOGIN_URL });
    } else {
      window.open(this.LOGIN_URL, '_blank');
    }
  }
};

// Export based on the context (content script vs background service worker)
if (typeof window !== 'undefined') {
  window.AuthService = AuthService;
}
if (typeof self !== 'undefined') {
  self.AuthService = AuthService;
}

console.log('🔐 ThreadCub: AuthService module loaded');