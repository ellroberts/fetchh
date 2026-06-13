// =============================================================================
// ThreadCub Crypto Service
// Client-side encryption for conversation payloads using Web Crypto API (AES-GCM)
//
// Architecture:
//   - AES-GCM with 256-bit key, random 12-byte IV per encryption
//   - Key generated once per install via crypto.subtle.generateKey()
//   - Key exported as raw bytes -> base64 -> stored in chrome.storage.local
//   - On subsequent runs: base64 -> importKey() -> CryptoKey
//   - Encrypted output: base64( IV (12 bytes) + ciphertext + auth tag (16 bytes) )
//
// Security notes:
//   - Key is per-install/device (no password/PBKDF2 derivation yet)
//   - IV is random and never reused (crypto.getRandomValues)
//   - Auth tag (128-bit) provides integrity + authenticity
//   - Never logs full key material or plaintext payload contents
//
// Works in both content script (window) and service worker (self) contexts.
// =============================================================================

const CryptoService = {

  // ---------------------------------------------------------------------------
  // Configuration constants
  // ---------------------------------------------------------------------------

  // Key name in chrome.storage.local for the persisted encryption key
  STORAGE_KEY: 'threadcub_encryption_key',

  // AES-GCM parameters
  ALGORITHM: 'AES-GCM',
  KEY_LENGTH: 256,        // 256-bit key strength
  IV_LENGTH: 12,          // 12 bytes = 96 bits, the recommended IV size for AES-GCM

  // In-memory cache for the CryptoKey to avoid repeated storage reads + imports
  _cachedKey: null,

  // =============================================================================
  // KEY MANAGEMENT: Get existing key or generate a new one
  //
  // Flow:
  //   1. Check in-memory cache first (fast path for repeated calls)
  //   2. Try loading base64 key from chrome.storage.local
  //      -> If found: decode base64 -> importKey('raw') -> cache -> return
  //   3. If no key in storage (first run):
  //      -> generateKey() -> exportKey('raw') -> base64 -> store -> cache -> return
  //
  // The key is marked extractable:true so it can be exported for backup/migration
  // later. Allowed operations are ['encrypt', 'decrypt'].
  // =============================================================================

  async getOrCreateKey() {
    // Fast path: return cached key if we already loaded/generated it this session
    if (this._cachedKey) {
      return this._cachedKey;
    }

    try {
      // ------------------------------------------------------------------
      // Priority 1: Use server-synced key stored by AuthService on login.
      // This must match what the server uses to decrypt, so always prefer it.
      // ------------------------------------------------------------------
      const serverKey = await this._getFromStorage('threadcub_user_encryption_key');
      if (serverKey) {
        console.log('🔒 CryptoService: Loading server-synced encryption key');
        // Server key is a 64-char hex string (32 bytes = 256-bit)
        const keyBytes = new Uint8Array(serverKey.match(/.{1,2}/g).map(b => parseInt(b, 16)));
        const key = await crypto.subtle.importKey(
          'raw', keyBytes, { name: this.ALGORITHM }, true, ['encrypt', 'decrypt']
        );
        this._cachedKey = key;
        console.log('🔒 CryptoService: Server-synced key loaded successfully');
        return key;
      }

      // ------------------------------------------------------------------
      // Priority 2: Fall back to locally generated key (guests / no login)
      // ------------------------------------------------------------------
      const storedBase64 = await this._getFromStorage(this.STORAGE_KEY);

      if (storedBase64) {
        console.log('🔒 CryptoService: Loading existing encryption key from storage');

        // Decode base64 string back to raw bytes (ArrayBuffer)
        const keyBytes = this._base64ToArrayBuffer(storedBase64);

        // Import raw bytes back into a CryptoKey object
        // Parameters:
        //   'raw'         - key format (just the raw key bytes, no wrapping)
        //   keyBytes      - the actual key material
        //   { name: ... } - which algorithm this key is for
        //   true          - extractable (allows exportKey later for backup)
        //   [...]         - allowed operations
        const key = await crypto.subtle.importKey(
          'raw',
          keyBytes,
          { name: this.ALGORITHM },
          true,
          ['encrypt', 'decrypt']
        );

        this._cachedKey = key;
        console.log('🔒 CryptoService: Encryption key loaded successfully');
        return key;
      }

      // ------------------------------------------------------------------
      // No key found — first run. Generate a new 256-bit AES-GCM key.
      // ------------------------------------------------------------------
      console.log('🔒 CryptoService: No existing key found, generating new 256-bit AES-GCM key');

      const key = await crypto.subtle.generateKey(
        {
          name: this.ALGORITHM,
          length: this.KEY_LENGTH    // 256-bit
        },
        true,                        // extractable: true (needed for export + storage)
        ['encrypt', 'decrypt']       // usage: encrypt and decrypt
      );

      // Export the CryptoKey to raw bytes so we can persist it
      const rawKeyBuffer = await crypto.subtle.exportKey('raw', key);

      // Convert raw bytes to base64 string for safe storage in chrome.storage.local
      const base64Key = this._arrayBufferToBase64(rawKeyBuffer);

      // Persist the base64-encoded key
      await this._setInStorage(this.STORAGE_KEY, base64Key);

      this._cachedKey = key;
      console.log('🔒 CryptoService: New encryption key generated and stored');
      // Note: We intentionally never log the actual key value

      return key;

    } catch (error) {
      console.error('🔒 CryptoService: Key management failed:', error.message);
      throw new Error(`Encryption key management failed: ${error.message}`);
    }
  },

  // =============================================================================
  // ENCRYPTION: Encrypt a JavaScript object payload with AES-GCM
  //
  // Steps:
  //   1. JSON.stringify the data object to a UTF-8 string
  //   2. Encode the string to a Uint8Array via TextEncoder
  //   3. Generate a random 12-byte IV (never reused, per AES-GCM requirement)
  //   4. Encrypt with crypto.subtle.encrypt (AES-GCM)
  //      -> Produces ciphertext with 16-byte auth tag appended automatically
  //   5. Combine: [IV (12 bytes)] [ciphertext + auth tag]
  //   6. Convert the combined Uint8Array to a base64 string
  //
  // Returns: base64 string containing IV + ciphertext + auth tag
  //
  // To decrypt later:
  //   - Decode base64 -> Uint8Array
  //   - Split: first 12 bytes = IV, rest = ciphertext + auth tag
  //   - crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertextWithTag)
  // =============================================================================

  async encryptPayload(data) {
    try {
      // Get (or create) the encryption key
      const key = await this.getOrCreateKey();

      // Step 1-2: Serialize payload to JSON bytes
      const jsonString = JSON.stringify(data);
      const encoder = new TextEncoder();
      const plaintext = encoder.encode(jsonString);

      // Log original size without revealing contents
      console.log(`🔒 CryptoService: Original payload size: ${plaintext.byteLength} bytes`);

      // Step 3: Generate a cryptographically random 12-byte IV
      // AES-GCM spec recommends 96-bit (12-byte) IVs.
      // Using crypto.getRandomValues ensures uniqueness without a counter.
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // Step 4: Encrypt with AES-GCM
      // The returned ArrayBuffer contains ciphertext + 128-bit (16-byte) auth tag.
      // The auth tag provides integrity protection — any tampering will cause
      // decryption to fail with an error rather than producing corrupted plaintext.
      const ciphertextBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
          // tagLength defaults to 128 bits (16 bytes), the maximum and recommended value
        },
        key,
        plaintext
      );

      // Step 5: Combine IV + ciphertext into a single Uint8Array
      // Wire format: [IV: 12 bytes][ciphertext: variable][auth tag: 16 bytes]
      // The receiver knows the first 12 bytes are the IV and can split accordingly.
      const combined = new Uint8Array(iv.byteLength + ciphertextBuffer.byteLength);
      combined.set(iv, 0);                                         // Bytes 0-11: IV
      combined.set(new Uint8Array(ciphertextBuffer), iv.byteLength); // Bytes 12+: ciphertext + tag

      // Step 6: Convert to base64 for safe JSON transport
      const base64String = this._uint8ArrayToBase64(combined);

      console.log(`🔒 CryptoService: Encrypted payload base64 length: ${base64String.length} chars`);
      console.log('🔒 CryptoService: Encryption successful');

      return base64String;

    } catch (error) {
      console.error('🔒 CryptoService: Encryption failed:', error.message);
      throw new Error(`Payload encryption failed: ${error.message}`);
    }
  },

  // =============================================================================
  // STORAGE HELPERS: Promisified wrappers around chrome.storage.local
  // =============================================================================

  /**
   * Read a single key from chrome.storage.local.
   * Returns the value or null if not found.
   */
  _getFromStorage(key) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(result[key] || null);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * Write a single key-value pair to chrome.storage.local.
   */
  _setInStorage(key, value) {
    return new Promise((resolve, reject) => {
      try {
        chrome.storage.local.set({ [key]: value }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  },

  // =============================================================================
  // ENCODING HELPERS: ArrayBuffer / Uint8Array <-> Base64
  // Uses btoa/atob which are available in both browser and service worker contexts.
  // =============================================================================

  /**
   * Convert an ArrayBuffer to a base64 string.
   */
  _arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    return this._uint8ArrayToBase64(bytes);
  },

  /**
   * Convert a Uint8Array to a base64 string.
   * Builds a binary string character-by-character, then uses btoa().
   */
  _uint8ArrayToBase64(bytes) {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  },

  /**
   * Convert a base64 string to an ArrayBuffer.
   * Decodes via atob(), then maps each character to its byte value.
   */
  _base64ToArrayBuffer(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

};

// =============================================================================
// Export to both contexts:
//   - window.CryptoService  (for content scripts injected into web pages)
//   - self.CryptoService    (for the background service worker)
// =============================================================================
if (typeof window !== 'undefined') {
  window.CryptoService = CryptoService;
}
if (typeof self !== 'undefined') {
  self.CryptoService = CryptoService;
}

console.log('🔒 ThreadCub: CryptoService module loaded');