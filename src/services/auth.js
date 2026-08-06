/* ==========================================================================
   BLOOOM — LOCAL ACCOUNTS

   Blooom has no server: it is a browser-resident study tool, and every byte
   it stores lives in this browser's localStorage. Accounts therefore exist to
   separate PROFILES AND DATA on a shared device (a family computer, a school
   lab machine) — not to authenticate anyone to a remote system.

   That distinction drives two design decisions:

     · Passwords are never stored, not even obfuscated. Each account keeps a
       random 16-byte salt and a PBKDF2-HMAC-SHA-256 derivation at 210 000
       iterations (the OWASP 2023 floor), so a person reading localStorage
       cannot recover the password — which matters because students reuse
       passwords across real services.
     · The interface says plainly, on both the sign-up and sign-in screens,
       that the account is local. Implying server-side security we do not
       have would be worse than having no accounts at all.
   ========================================================================== */

const ACCOUNTS_KEY = 'blooom_accounts';
const SESSION_KEY = 'blooom_session';

const PBKDF2_ITERATIONS = 210000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

/* --------------------------------------------------------------------------
   STORAGE HELPERS — localStorage throws in private mode and when the quota is
   gone; a read failure must degrade to "no accounts", never to a crash.
   -------------------------------------------------------------------------- */
const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

/* --------------------------------------------------------------------------
   CRYPTO
   -------------------------------------------------------------------------- */
const subtle = () => globalThis.crypto?.subtle;

/* Secure contexts only — that is https and localhost, which covers every way
   Blooom is actually served. Anything else gets an explicit error rather than
   a silent downgrade to a weaker hash. */
export const cryptoAvailable = () => Boolean(subtle());

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

const derive = async (password, saltHex, iterations = PBKDF2_ITERATIONS) => {
  const api = subtle();
  if (!api) throw new Error('CRYPTO_UNAVAILABLE');

  const salt = Uint8Array.from(saltHex.match(/.{2}/g).map((byte) => parseInt(byte, 16)));

  const keyMaterial = await api.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const bits = await api.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_BITS
  );

  return toHex(bits);
};

/* Comparison in constant time with respect to the digest contents, so a
   timing signal can't leak how much of a guess was right. */
const timingSafeEqual = (a, b) => {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
};

/* --------------------------------------------------------------------------
   ACCOUNT RECORDS
   -------------------------------------------------------------------------- */
const normaliseEmail = (email) =>
  String(email || '')
    .trim()
    .toLowerCase();

const readAccounts = () => {
  const accounts = readJson(ACCOUNTS_KEY, []);
  return Array.isArray(accounts) ? accounts : [];
};

/* Never hand the caller the salt and digest — the UI has no use for them. */
const publicAccount = (account) =>
  account
    ? {
        id: account.id,
        name: account.name,
        email: account.email,
        role: account.role,
        avatar: account.avatar || null,
        gradeLevel: account.gradeLevel || null,
        createdAt: account.createdAt
      }
    : null;

/* --------------------------------------------------------------------------
   VALIDATION — the same rules the forms show as hints, in one place so the
   hint and the check can never drift apart.
   -------------------------------------------------------------------------- */
export const PASSWORD_MIN_LENGTH = 8;

export const validateEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normaliseEmail(email));

export const passwordIssues = (password) => {
  const issues = [];
  const value = String(password || '');
  if (value.length < PASSWORD_MIN_LENGTH) issues.push(`Ít nhất ${PASSWORD_MIN_LENGTH} ký tự`);
  if (!/[a-zA-Z]/.test(value)) issues.push('Có ít nhất một chữ cái');
  if (!/\d/.test(value)) issues.push('Có ít nhất một chữ số');
  return issues;
};

/* A rough strength read-out for the meter: length past the minimum plus
   character-class variety. Deliberately not presented as a security promise. */
export const passwordStrength = (password) => {
  const value = String(password || '');
  if (!value) return { score: 0, label: 'Chưa nhập', percent: 0 };

  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) =>
    re.test(value)
  ).length;
  const lengthScore = Math.min(3, Math.floor(value.length / 5));
  const score = Math.min(4, Math.max(1, Math.round((classes + lengthScore) / 1.6)));

  const labels = ['Chưa nhập', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
  return { score, label: labels[score], percent: (score / 4) * 100 };
};

/* --------------------------------------------------------------------------
   PUBLIC API
   -------------------------------------------------------------------------- */
export const authService = {
  listAccounts: () => readAccounts().map(publicAccount),

  emailTaken: (email) => readAccounts().some((a) => a.email === normaliseEmail(email)),

  register: async ({ name, email, password, gradeLevel = null }) => {
    const cleanName = String(name || '').trim();
    const cleanEmail = normaliseEmail(email);

    if (cleanName.length < 2) throw new Error('Vui lòng nhập họ tên đầy đủ.');
    if (!validateEmail(cleanEmail)) throw new Error('Địa chỉ email không hợp lệ.');

    const issues = passwordIssues(password);
    if (issues.length > 0)
      throw new Error(`Mật khẩu chưa đạt: ${issues.join(', ').toLowerCase()}.`);

    if (!cryptoAvailable()) {
      throw new Error(
        'Trình duyệt không cung cấp Web Crypto trong ngữ cảnh này. Hãy mở Blooom qua https hoặc localhost.'
      );
    }

    const accounts = readAccounts();
    if (accounts.some((a) => a.email === cleanEmail)) {
      throw new Error('Email này đã được đăng ký trên thiết bị.');
    }

    const saltHex = toHex(globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES)));
    const hash = await derive(password, saltHex);

    const account = {
      id: `usr-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      name: cleanName,
      email: cleanEmail,
      gradeLevel,
      role: 'student',
      avatar: null,
      salt: saltHex,
      iterations: PBKDF2_ITERATIONS,
      hash,
      createdAt: new Date().toISOString()
    };

    accounts.push(account);
    if (!writeJson(ACCOUNTS_KEY, accounts)) {
      throw new Error('Trình duyệt đang chặn bộ nhớ cục bộ nên không thể lưu tài khoản.');
    }

    writeJson(SESSION_KEY, { userId: account.id, startedAt: new Date().toISOString() });
    return publicAccount(account);
  },

  login: async ({ email, password }) => {
    if (!cryptoAvailable()) {
      throw new Error(
        'Trình duyệt không cung cấp Web Crypto trong ngữ cảnh này. Hãy mở Blooom qua https hoặc localhost.'
      );
    }

    const cleanEmail = normaliseEmail(email);
    const account = readAccounts().find((a) => a.email === cleanEmail);

    /* Same message for "no such email" and "wrong password" — telling the two
       apart would confirm which addresses have accounts on this device. */
    const rejection = new Error('Email hoặc mật khẩu không đúng.');
    if (!account) {
      // Still burn a derivation so a missing account isn't visibly faster.
      await derive(String(password || ''), '00'.repeat(SALT_BYTES));
      throw rejection;
    }

    const hash = await derive(password, account.salt, account.iterations || PBKDF2_ITERATIONS);
    if (!timingSafeEqual(hash, account.hash)) throw rejection;

    writeJson(SESSION_KEY, { userId: account.id, startedAt: new Date().toISOString() });
    return publicAccount(account);
  },

  logout: () => {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* Nothing to clear if storage is unavailable. */
    }
  },

  /* The account the stored session points at, or null. A session naming an
     account that no longer exists is treated as signed out. */
  currentAccount: () => {
    const session = readJson(SESSION_KEY, null);
    if (!session?.userId) return null;
    return publicAccount(readAccounts().find((a) => a.id === session.userId)) || null;
  },

  updateAccount: (id, patch) => {
    const accounts = readAccounts();
    const index = accounts.findIndex((a) => a.id === id);
    if (index === -1) return null;

    /* Whitelist: a profile edit must never be able to rewrite the digest. */
    const { name, avatar, role, gradeLevel } = patch;
    accounts[index] = {
      ...accounts[index],
      ...(name !== undefined ? { name } : null),
      ...(avatar !== undefined ? { avatar } : null),
      ...(role !== undefined ? { role } : null),
      ...(gradeLevel !== undefined ? { gradeLevel } : null)
    };

    writeJson(ACCOUNTS_KEY, accounts);
    return publicAccount(accounts[index]);
  }
};
