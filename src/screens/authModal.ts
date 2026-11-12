/**
 * Modal masuk/daftar di atas dunia visual (tidak mengganti layar).
 * Masuk · Daftar · Lupa sandi (kode pemulihan) · Mode tamu.
 */
import { gsap } from 'gsap';
import { auth, AuthError, type User } from '../core/auth';
import { icons } from '../core/icons';
import { audio } from '../core/audio';
import { motion } from '../core/motion';

type Mode = 'resume' | 'login' | 'signup' | 'recover' | 'code' | 'success';

export function openAuthModal(host: HTMLElement): Promise<User | null> {
  return new Promise((resolve) => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
      <svg class="modal__frame" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><rect x="1.5" y="1.5" width="97" height="97" rx="4" fill="none" stroke="#c99a45" stroke-width=".6" vector-effect="non-scaling-stroke"/></svg>
      <button class="modal__close" aria-label="Tutup">${icons.close}</button>
      <div class="modal__body"></div></div>`;
    host.appendChild(back);
    const modal = back.querySelector<HTMLElement>('.modal')!;
    const body = back.querySelector<HTMLElement>('.modal__body')!;
    let mode: Mode = 'login';
    let pendingUser: User | null = null;

    const close = async (u: User | null) => {
      document.removeEventListener('keydown', onKey, true);
      await gsap.to(modal, { y: 30, opacity: 0, scale: .94, duration: motion.d(.4), ease: 'power2.in' });
      await gsap.to(back, { opacity: 0, duration: motion.d(.25) });
      back.remove();
      prevFocus?.focus?.();
      resolve(u);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode !== 'success' && mode !== 'code') { e.stopPropagation(); close(null); }
      if (e.key === 'Tab') { // perangkap fokus
        const f = Array.from(modal.querySelectorAll<HTMLElement>('button, input, a[href]')).filter((x) => !x.hasAttribute('disabled') && x.offsetParent !== null);
        if (!f.length) return;
        const first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', onKey, true);
    back.querySelector<HTMLButtonElement>('.modal__close')!.onclick = () => close(null);
    back.addEventListener('pointerdown', (e) => { if (e.target === back && mode !== 'code') close(null); });

    const field = (id: string, label: string, type: string, auto: string, extra = '') => `
      <label class="fld" for="${id}"><span class="fld__lbl">${label}</span>
        <span class="fld__box"><input id="${id}" name="${id}" type="${type}" autocomplete="${auto}" ${extra} required/>${type === 'password' ? `<button type="button" class="fld__eye" aria-label="Tampilkan kata sandi" data-eye="${id}">${icons.eye}</button>` : ''}</span>
        <span class="fld__err" id="${id}-err" role="alert"></span></label>`;

    const render = (m: Mode, code = '') => {
      mode = m;
      if (m === 'resume') { const cu = auth.current()!; body.innerHTML = `
        <h2 class="modal__title" id="auth-title">Masuk ke Story Book</h2>
        <p class="modal__sub">Kamu sudah pernah masuk di perangkat ini.</p>
        <div class="resume-who"><span class="resume-who__seal">${escapeText((cu.name || '?').trim().charAt(0).toUpperCase())}</span>
          <span><b>${escapeText(cu.name)}</b><small>${cu.guest ? 'Mode tamu' : escapeText(cu.email)}</small></span></div>
        <button class="btn-magic modal__submit" data-go="continue">Lanjutkan sebagai ${escapeText(cu.name.split(' ')[0])}</button>
        <div class="modal__links"><button class="lnk" data-go="switch">Masuk dengan akun lain</button></div>`; }
      if (m === 'login') body.innerHTML = `
        <h2 class="modal__title" id="auth-title">Masuk ke Story Book</h2>
        <p class="modal__sub">Lanjutkan petualangan dongengmu.</p>
        <form novalidate data-form="login">${field('email', 'Email', 'email', 'email')}${field('password', 'Kata sandi', 'password', 'current-password')}
          <p class="form-err" role="alert"></p>
          <button class="btn-magic modal__submit" type="submit">Masuk</button></form>
        <div class="modal__links"><button class="lnk" data-go="recover">Lupa sandi?</button><span>·</span><button class="lnk" data-go="signup">Daftar akun</button></div>
        <button class="lnk lnk--guest" data-go="guest">Coba tanpa akun (mode tamu)</button>`;
      if (m === 'signup') body.innerHTML = `
        <h2 class="modal__title" id="auth-title">Buat Akun Baru</h2>
        <p class="modal__sub">Progres membaca tersimpan di akunmu.</p>
        <form novalidate data-form="signup">${field('name', 'Nama panggilan', 'text', 'nickname', 'maxlength="40"')}${field('email', 'Email', 'email', 'email')}${field('password', 'Kata sandi (min. 8, huruf & angka)', 'password', 'new-password')}
          <p class="form-err" role="alert"></p>
          <button class="btn-magic modal__submit" type="submit">Daftar</button></form>
        <div class="modal__links"><span>Sudah punya akun?</span><button class="lnk" data-go="login">Masuk</button></div>`;
      if (m === 'recover') body.innerHTML = `
        <h2 class="modal__title" id="auth-title">Pulihkan Akun</h2>
        <p class="modal__sub">Masukkan kode pemulihan yang kamu simpan saat mendaftar.</p>
        <form novalidate data-form="recover">${field('email', 'Email', 'email', 'email')}${field('code', 'Kode pemulihan', 'text', 'off', 'placeholder="BINTANG-1234-PERI" spellcheck="false"')}${field('password', 'Kata sandi baru', 'password', 'new-password')}
          <p class="form-err" role="alert"></p>
          <button class="btn-magic modal__submit" type="submit">Atur Ulang & Masuk</button></form>
        <div class="modal__links"><button class="lnk" data-go="login">Kembali ke Masuk</button></div>`;
      if (m === 'code') body.innerHTML = `
        <h2 class="modal__title" id="auth-title">Simpan Kode Pemulihan</h2>
        <p class="modal__sub">Kode ini hanya ditampilkan sekali. Simpan di tempat aman untuk memulihkan akun bila lupa sandi.</p>
        <div class="rcode"><code>${code}</code><button class="btn-magic btn-magic--sm btn-magic--ghost" data-copy>Salin</button></div>
        <button class="btn-magic modal__submit" data-go="success">Sudah kusimpan, lanjut</button>`;
      if (m === 'success') body.innerHTML = `
        <div class="ok-seal"><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="50" fill="#3f9a4e" stroke="#f6e2a8" stroke-width="5"/><path class="ok-check" d="M36 62 L54 80 L86 44" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
        <h2 class="modal__title" id="auth-title">Berhasil Masuk!</h2>
        <p class="modal__sub">Selamat datang di Story Book${pendingUser ? `, ${escapeText(pendingUser.name)}` : ''}.</p>`;
      wire();
      gsap.fromTo(body.children, { opacity: 0, y: 10 }, { opacity: 1, y: 0, stagger: .05, duration: motion.d(.4), ease: 'power2.out' });
      body.querySelector<HTMLElement>('input, [data-go="success"], [data-go="continue"]')?.focus();
      if (m === 'success') {
        audio.sfx('correct');
        const chk = body.querySelector<SVGPathElement>('.ok-check')!;
        gsap.fromTo(chk, { strokeDasharray: 90, strokeDashoffset: 90 }, { strokeDashoffset: 0, duration: motion.d(.6), delay: .15, ease: 'power2.out' });
        gsap.fromTo(body.querySelector('.ok-seal'), { scale: .3 }, { scale: 1, duration: motion.d(.7), ease: 'back.out(2)' });
        setTimeout(() => close(pendingUser), motion.reduced ? 600 : 1500);
      }
    };

    const setErr = (e: unknown) => {
      body.querySelectorAll('.fld__err, .form-err').forEach((n) => (n.textContent = ''));
      body.querySelectorAll('input').forEach((i) => i.removeAttribute('aria-invalid'));
      const msg = e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.';
      const f = e instanceof AuthError ? e.field : undefined;
      const target = f ? body.querySelector(`#${f}-err`) : null;
      (target ?? body.querySelector('.form-err'))!.textContent = msg;
      if (f) { const inp = body.querySelector<HTMLInputElement>(`#${f}`); inp?.setAttribute('aria-invalid', 'true'); inp?.setAttribute('aria-describedby', `${f}-err`); inp?.focus(); }
      audio.sfx('retry');
      gsap.fromTo(modal, { x: -8 }, { x: 0, duration: .5, ease: 'elastic.out(1, .3)' });
    };

    const wire = () => {
      body.querySelectorAll<HTMLButtonElement>('[data-go]').forEach((b) => b.onclick = () => {
        const g = b.dataset.go!;
        if (g === 'guest') { pendingUser = auth.guest(); render('success'); return; }
        if (g === 'continue') { pendingUser = auth.current(); render('success'); return; }
        if (g === 'switch') { auth.signOut(); render('login'); return; }
        render(g as Mode);
      });
      body.querySelectorAll<HTMLButtonElement>('[data-eye]').forEach((b) => b.onclick = () => {
        const inp = body.querySelector<HTMLInputElement>(`#${b.dataset.eye}`)!;
        const show = inp.type === 'password'; inp.type = show ? 'text' : 'password';
        b.innerHTML = show ? icons.eyeOff : icons.eye; b.setAttribute('aria-label', show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi');
      });
      body.querySelector<HTMLButtonElement>('[data-copy]')?.addEventListener('click', async (e) => {
        const code = body.querySelector('code')!.textContent!;
        try { await navigator.clipboard.writeText(code); (e.target as HTMLElement).textContent = 'Tersalin ✓'; } catch { (e.target as HTMLElement).textContent = 'Salin manual'; }
      });
      const form = body.querySelector<HTMLFormElement>('form');
      form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const v = (n: string) => (form.querySelector<HTMLInputElement>(`#${n}`)?.value ?? '');
        const btn = form.querySelector<HTMLButtonElement>('.modal__submit')!;
        btn.disabled = true; const label = btn.textContent; btn.textContent = 'Sebentar…';
        try {
          if (form.dataset.form === 'login') { pendingUser = await auth.signIn(v('email'), v('password')); render('success'); }
          else if (form.dataset.form === 'signup') { const r = await auth.signUp(v('name'), v('email'), v('password')); pendingUser = r.user; render('code', r.recoveryCode); }
          else if (form.dataset.form === 'recover') { pendingUser = await auth.recover(v('email'), v('code'), v('password')); render('success'); }
        } catch (err) { setErr(err); btn.disabled = false; btn.textContent = label; }
      });
    };

    render(auth.current() ? 'resume' : 'login');
    gsap.fromTo(back, { opacity: 0 }, { opacity: 1, duration: motion.d(.35) });
    gsap.fromTo(modal, { y: 40, opacity: 0, scale: .9, rotationX: 12 }, { y: 0, opacity: 1, scale: 1, rotationX: 0, duration: motion.d(.7), ease: 'back.out(1.4)' });
  });
}

const escapeText = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
