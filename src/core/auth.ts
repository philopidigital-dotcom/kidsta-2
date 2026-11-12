/**
 * Autentikasi LOKAL untuk prototipe.
 * - Kata sandi tidak pernah disimpan mentah: PBKDF2-SHA256 (150.000 iterasi) + salt acak.
 * - Kode pemulihan dibuat saat daftar & disimpan dalam bentuk hash.
 * - Pembatasan percobaan login (5x gagal → jeda 30 detik).
 *
 * Antarmuka `AuthProvider` sengaja dipisah agar nanti tinggal diganti ke
 * backend asli (mis. Supabase Auth) tanpa mengubah layar.
 * CATATAN: auth berbasis browser BUKAN pengganti keamanan server untuk produksi.
 */
import { storage } from './storage';

export interface User { email: string; name: string; createdAt: number; guest?: boolean }
export interface SignUpResult { user: User; recoveryCode: string }

export interface AuthProvider {
  current(): User | null;
  signUp(name: string, email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<User>;
  guest(): User;
  signOut(): void;
  recover(email: string, code: string, newPassword: string): Promise<User>;
}

interface StoredUser { email: string; name: string; createdAt: number; salt: string; hash: string; rSalt: string; rHash: string }

const USERS_KEY = 'storybook.users.v1';
const SESSION_KEY = 'storybook.session.v1';
const ITER = 150_000;

export class AuthError extends Error {
  constructor(message: string, public field?: 'name' | 'email' | 'password' | 'code') { super(message); }
}

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

function subtle(): SubtleCrypto {
  const s = globalThis.crypto?.subtle;
  if (!s) throw new AuthError('Browser ini belum mendukung penyimpanan sandi yang aman. Buka lewat https atau localhost.');
  return s;
}

export async function hashSecret(secret: string, saltB64?: string) {
  const salt = saltB64 ? fromB64(saltB64) : crypto.getRandomValues(new Uint8Array(16));
  const key = await subtle().importKey('raw', enc.encode(secret), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: ITER }, key, 256);
  return { salt: b64(salt), hash: b64(bits) };
}

/** Perbandingan waktu-konstan agar tidak membocorkan informasi lewat durasi. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const normEmail = (e: string) => e.trim().toLowerCase();

export function validateEmail(e: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normEmail(e))) throw new AuthError('Format email belum benar.', 'email');
}
export function validatePassword(p: string) {
  if (p.length < 8) throw new AuthError('Kata sandi minimal 8 karakter.', 'password');
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) throw new AuthError('Gunakan gabungan huruf dan angka.', 'password');
}

const WORDS = ['BINTANG', 'BULAN', 'PELANGI', 'KUNANG', 'NAGA', 'PERI', 'AWAN', 'LENTERA', 'MUTIARA', 'SAMUDRA', 'KOMET', 'PUTRI'];
export function makeRecoveryCode() {
  const r = crypto.getRandomValues(new Uint32Array(3));
  return `${WORDS[r[0] % WORDS.length]}-${String(r[1] % 10000).padStart(4, '0')}-${WORDS[r[2] % WORDS.length]}`;
}

export class LocalAuth implements AuthProvider {
  private fails = 0;
  private lockedUntil = 0;

  private users(): Record<string, StoredUser> { return storage.get(USERS_KEY, {} as Record<string, StoredUser>); }
  private save(u: Record<string, StoredUser>) { storage.set(USERS_KEY, u); }
  private toUser(s: StoredUser): User { return { email: s.email, name: s.name, createdAt: s.createdAt }; }

  current(): User | null { return storage.get<User | null>(SESSION_KEY, null); }

  async signUp(name: string, email: string, password: string): Promise<SignUpResult> {
    const nm = name.trim();
    if (nm.length < 2) throw new AuthError('Tuliskan nama (minimal 2 huruf).', 'name');
    validateEmail(email); validatePassword(password);
    const key = normEmail(email);
    const users = this.users();
    if (users[key]) throw new AuthError('Email ini sudah terdaftar. Silakan masuk.', 'email');
    const { salt, hash } = await hashSecret(password);
    const recoveryCode = makeRecoveryCode();
    const rec = await hashSecret(recoveryCode);
    users[key] = { email: key, name: nm, createdAt: Date.now(), salt, hash, rSalt: rec.salt, rHash: rec.hash };
    this.save(users);
    const user = this.toUser(users[key]);
    storage.set(SESSION_KEY, user);
    return { user, recoveryCode };
  }

  async signIn(email: string, password: string): Promise<User> {
    const now = Date.now();
    if (now < this.lockedUntil) {
      throw new AuthError(`Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil((this.lockedUntil - now) / 1000)} detik.`);
    }
    validateEmail(email);
    if (!password) throw new AuthError('Kata sandi belum diisi.', 'password');
    const s = this.users()[normEmail(email)];
    // Tetap hitung hash meski akun tidak ada, supaya waktu respons serupa.
    const { hash } = await hashSecret(password, s?.salt ?? 'AAAAAAAAAAAAAAAAAAAAAA==');
    if (!s || !safeEqual(hash, s.hash)) {
      if (++this.fails >= 5) { this.lockedUntil = Date.now() + 30_000; this.fails = 0; }
      throw new AuthError('Email atau kata sandi tidak cocok.', 'password');
    }
    this.fails = 0;
    const user = this.toUser(s);
    storage.set(SESSION_KEY, user);
    return user;
  }

  guest(): User {
    const user: User = { email: 'tamu@storybook.local', name: 'Penjelajah', createdAt: Date.now(), guest: true };
    storage.set(SESSION_KEY, user);
    return user;
  }

  signOut() { storage.remove(SESSION_KEY); }

  async recover(email: string, code: string, newPassword: string): Promise<User> {
    validateEmail(email); validatePassword(newPassword);
    const users = this.users();
    const key = normEmail(email);
    const s = users[key];
    const cleaned = code.trim().toUpperCase().replace(/\s+/g, '');
    const { hash } = await hashSecret(cleaned, s?.rSalt ?? 'AAAAAAAAAAAAAAAAAAAAAA==');
    if (!s || !safeEqual(hash, s.rHash)) throw new AuthError('Email atau kode pemulihan tidak cocok.', 'code');
    const next = await hashSecret(newPassword);
    users[key] = { ...s, salt: next.salt, hash: next.hash };
    this.save(users);
    const user = this.toUser(users[key]);
    storage.set(SESSION_KEY, user);
    return user;
  }
}

export const auth: AuthProvider = new LocalAuth();
