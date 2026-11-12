import { describe, it, expect, beforeEach } from 'vitest';
import { LocalAuth, AuthError, validatePassword, makeRecoveryCode } from '../src/core/auth';

describe('Auth lokal', () => {
  beforeEach(() => localStorage.clear());

  it('daftar, keluar, lalu masuk kembali', async () => {
    const a = new LocalAuth();
    const { user, recoveryCode } = await a.signUp('Fariz', 'Fariz@Contoh.id', 'rahasia123');
    expect(user.email).toBe('fariz@contoh.id');
    expect(recoveryCode).toMatch(/^[A-Z]+-\d{4}-[A-Z]+$/);
    a.signOut();
    expect(a.current()).toBeNull();
    const u = await a.signIn('fariz@contoh.id', 'rahasia123');
    expect(u.name).toBe('Fariz');
  });

  it('tidak menyimpan kata sandi mentah', async () => {
    const a = new LocalAuth();
    await a.signUp('Ana', 'ana@contoh.id', 'pelangi99');
    const raw = localStorage.getItem('storybook.users.v1')!;
    expect(raw).not.toContain('pelangi99');
  });

  it('menolak sandi salah & email ganda', async () => {
    const a = new LocalAuth();
    await a.signUp('Ana', 'ana@contoh.id', 'pelangi99');
    await expect(a.signIn('ana@contoh.id', 'salah1234')).rejects.toBeInstanceOf(AuthError);
    await expect(a.signUp('Ana2', 'ana@contoh.id', 'pelangi99')).rejects.toThrow(/sudah terdaftar/);
  });

  it('mengunci sementara setelah 5x gagal', async () => {
    const a = new LocalAuth();
    await a.signUp('Ana', 'ana@contoh.id', 'pelangi99');
    for (let i = 0; i < 5; i++) await a.signIn('ana@contoh.id', 'salah1234').catch(() => {});
    await expect(a.signIn('ana@contoh.id', 'pelangi99')).rejects.toThrow(/Terlalu banyak/);
  });

  it('pemulihan dengan kode mengganti sandi', async () => {
    const a = new LocalAuth();
    const { recoveryCode } = await a.signUp('Ana', 'ana@contoh.id', 'pelangi99');
    await expect(a.recover('ana@contoh.id', 'SALAH-0000-KODE', 'baru12345')).rejects.toBeInstanceOf(AuthError);
    await a.recover('ana@contoh.id', recoveryCode.toLowerCase(), 'baru12345');
    a.signOut();
    await expect(a.signIn('ana@contoh.id', 'baru12345')).resolves.toBeTruthy();
  });

  it('validasi sandi', () => {
    expect(() => validatePassword('pendek1')).toThrow();
    expect(() => validatePassword('hanyahuruf')).toThrow();
    expect(() => validatePassword('huruf123')).not.toThrow();
    expect(makeRecoveryCode()).not.toBe(makeRecoveryCode());
  });
});
