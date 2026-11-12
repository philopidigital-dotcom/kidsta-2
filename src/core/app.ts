/**
 * Aplikasi: konteks bersama + router layar (state machine) + HUD.
 * Setiap layar mengatur animasi masuk/keluarnya sendiri, sehingga transisi
 * antar-layar terasa sebagai satu gerakan kamera di dunia yang sama.
 */
import { gsap } from 'gsap';
import { auth, type User } from './auth';
import { progress, type Progress } from './progress';
import { audio } from './audio';
import { icons } from './icons';
import { createWorld, type World } from '../components/world';
import { Transitions } from '../components/transitions';

export type ScreenName = 'journey' | 'landing' | 'age' | 'activity' | 'category' | 'books' | 'chapters' | 'reader' | 'complete';

export interface HudSpec { back?: boolean; home?: boolean; sound?: boolean; account?: boolean }

export interface Screen {
  el: HTMLElement;
  hud: HudSpec;
  /** Judul untuk pembaca layar. */
  label: string;
  enter(from?: ScreenName): Promise<void> | void;
  leave(to: ScreenName): Promise<void> | void;
  onKey?(e: KeyboardEvent): void;
  /** Tangani tombol kembali di dalam layar (mis. antar-halaman buku). true = sudah ditangani. */
  onBack?(): boolean;
  destroy?(): void;
}

export type ScreenFactory = (app: App, params: Record<string, string>) => Screen;

export interface Selection { ageId?: string; activityId?: string; categoryId?: string; bookId?: string; chapterId?: string }

export class App {
  user: User | null = auth.current();
  progress: Progress = { completed: {}, sound: true };
  sel: Selection = {};
  world: World;
  fx: Transitions;
  stage: HTMLElement;
  lastNavBack = false;
  private factories = new Map<ScreenName, ScreenFactory>();
  private current: { name: ScreenName; screen: Screen; params: Record<string, string> } | null = null;
  private history: { name: ScreenName; params: Record<string, string> }[] = [];
  private busy = false;
  private hudEl: HTMLElement;
  private live: HTMLElement;

  constructor(public root: HTMLElement) {
    this.world = createWorld(root);
    this.stage = document.createElement('main');
    this.stage.className = 'stage';
    root.appendChild(this.stage);
    this.fx = new Transitions(root, this.world, this.stage);
    this.hudEl = this.buildHud();
    root.appendChild(this.hudEl);
    this.live = document.createElement('div');
    this.live.className = 'sr-only'; this.live.setAttribute('aria-live', 'polite');
    root.appendChild(this.live);
    if (this.user) this.loadProgress();

    audio.onChange((on) => this.syncSound(on));
    window.addEventListener('keydown', (e) => {
      if ((e.target as HTMLElement)?.closest?.('input, textarea, [role="dialog"]')) return;
      if (e.key === 'Escape' && this.current?.screen.hud.back) { e.preventDefault(); this.back(); return; }
      this.current?.screen.onKey?.(e);
    });
  }

  register(name: ScreenName, f: ScreenFactory) { this.factories.set(name, f); }

  loadProgress() {
    if (!this.user) return;
    this.progress = progress.get(this.user.email);
    this.sel = { ageId: this.progress.ageId, activityId: this.progress.activityId, categoryId: this.progress.categoryId, bookId: this.progress.lastBookId };
    audio.setEnabled(this.progress.sound);
  }

  saveSel(patch: Partial<Selection>) {
    Object.assign(this.sel, patch);
    if (!this.user) return;
    this.progress = progress.update(this.user.email, {
      ageId: this.sel.ageId, activityId: this.sel.activityId, categoryId: this.sel.categoryId,
      ...(patch.bookId ? { lastBookId: patch.bookId } : {}),
      ...(patch.chapterId ? { lastChapterId: patch.chapterId } : {}),
    });
  }

  setUser(u: User | null) {
    this.user = u;
    if (u) this.loadProgress(); else { this.progress = { completed: {}, sound: audio.enabled }; this.sel = {}; }
    this.renderAccount();
  }

  announce(text: string) { this.live.textContent = ''; setTimeout(() => (this.live.textContent = text), 30); }

  get isBusy() { return this.busy; }

  async go(name: ScreenName, params: Record<string, string> = {}, opts: { replace?: boolean; isBack?: boolean } = {}) {
    if (this.busy) return;
    const f = this.factories.get(name);
    if (!f) throw new Error(`Layar tidak dikenal: ${name}`);
    this.busy = true;
    this.lastNavBack = !!opts.isBack;
    const prev = this.current;
    try {
      if (prev) {
        if (!opts.replace && !opts.isBack) this.history.push({ name: prev.name, params: prev.params });
        this.setHud({});
        await prev.screen.leave(name);
        prev.screen.destroy?.();
        prev.screen.el.remove();
        gsap.set(this.stage, { clearProps: 'transform,opacity' });
      }
      audio.music.play(name === 'reader' ? 'forest' : name === 'complete' ? 'celebrate' : 'library');
      const screen = f(this, params);
      screen.el.setAttribute('aria-label', screen.label);
      this.stage.appendChild(screen.el);
      this.current = { name, screen, params };
      this.announce(screen.label);
      await screen.enter(prev?.name);
      this.setHud(screen.hud);
      const focusable = screen.el.querySelector<HTMLElement>('[data-autofocus]');
      focusable?.focus({ preventScroll: true });
    } catch (err) {
      console.error(err);
      gsap.set(this.stage, { clearProps: 'all' });
    } finally {
      this.busy = false;
    }
  }

  back() {
    if (this.busy) return;
    if (this.current?.screen.onBack?.()) return;
    const prev = this.history.pop();
    if (prev) this.go(prev.name, prev.params, { isBack: true });
  }

  /** Kembali ke layar tertentu, membuang riwayat di atasnya. */
  backTo(name: ScreenName, params: Record<string, string> = {}) {
    const i = this.history.map((x) => x.name).lastIndexOf(name);
    if (i >= 0) { const entry = this.history[i]; this.history.length = i; return this.go(name, { ...entry.params, ...params }, { isBack: true }); }
    return this.go(name, params, { isBack: true });
  }

  resetHistory() { this.history = []; }
  /** Perbarui parameter layar aktif (agar kembali ke posisi yang sama dari layar berikutnya). */
  setParams(p: Record<string, string>) { if (this.current) this.current.params = { ...this.current.params, ...p }; }

  /* ---------------- HUD ---------------- */

  private hudBtns!: Record<'back' | 'home' | 'sound' | 'account', HTMLButtonElement>;
  private acctMenu!: HTMLElement;

  private buildHud() {
    const el = document.createElement('div');
    el.className = 'hud';
    el.innerHTML = `
      <div class="hud__slot hud__slot--l">
        <button class="ring-btn" data-hud="back" aria-label="Kembali (Esc)" title="Kembali">${icons.back}</button>
      </div>
      <div class="hud__slot hud__slot--r">
        <button class="ring-btn" data-hud="sound" aria-label="Suara" aria-pressed="true" title="Suara narator & efek">${icons.soundOn}</button>
        <button class="ring-btn" data-hud="home" aria-label="Kembali ke daftar isi" title="Daftar Isi">${icons.home}</button>
        <button class="ring-btn ring-btn--acct" data-hud="account" aria-label="Akun" aria-haspopup="true" aria-expanded="false" title="Akun"><span class="acct-initial"></span></button>
      </div>
      <div class="acct-menu" role="menu" hidden>
        <p class="acct-menu__name"></p><p class="acct-menu__mail"></p>
        <button class="btn-magic btn-magic--sm btn-magic--ghost" data-act="logout" role="menuitem">Keluar</button>
      </div>`;
    const q = (k: string) => el.querySelector<HTMLButtonElement>(`[data-hud="${k}"]`)!;
    this.hudBtns = { back: q('back'), home: q('home'), sound: q('sound'), account: q('account') };
    this.acctMenu = el.querySelector('.acct-menu')!;

    this.hudBtns.back.onclick = () => { audio.sfx('select'); this.back(); };
    this.hudBtns.home.onclick = () => { audio.sfx('select'); this.resetHistory(); this.go('journey', { stage: 'toc' }, { replace: true }); };
    this.hudBtns.sound.onclick = () => {
      audio.unlock();
      const on = !audio.enabled;
      audio.setEnabled(on);
      if (this.user) this.progress = progress.update(this.user.email, { sound: on });
      if (on) audio.sfx('select');
    };
    this.hudBtns.account.onclick = () => this.toggleAcct();
    el.querySelector<HTMLButtonElement>('[data-act="logout"]')!.onclick = () => {
      this.toggleAcct(false);
      auth.signOut(); audio.stopSpeech(); audio.setAmbience('none');
      this.setUser(null); this.resetHistory();
      this.go('journey', {}, { replace: true });
    };
    document.addEventListener('pointerdown', (e) => {
      if (!this.acctMenu.hidden && !(e.target as HTMLElement).closest('.acct-menu, [data-hud="account"]')) this.toggleAcct(false);
    });
    this.syncSound(audio.enabled);
    queueMicrotask(() => this.renderAccount());
    return el;
  }

  private toggleAcct(force?: boolean) {
    const open = force ?? this.acctMenu.hidden;
    this.acctMenu.hidden = !open;
    this.hudBtns.account.setAttribute('aria-expanded', String(open));
    if (open) { gsap.fromTo(this.acctMenu, { opacity: 0, scale: .9 }, { opacity: 1, scale: 1, duration: .3, ease: 'back.out(2)' }); this.acctMenu.querySelector<HTMLElement>('button')?.focus(); }
  }

  private renderAccount() {
    const u = this.user;
    this.hudBtns.account.querySelector('.acct-initial')!.textContent = u ? u.name.trim()[0].toUpperCase() : '';
    this.acctMenu.querySelector('.acct-menu__name')!.textContent = u?.name ?? '';
    this.acctMenu.querySelector('.acct-menu__mail')!.textContent = u?.guest ? 'Mode tamu — progres tersimpan di perangkat ini' : (u?.email ?? '');
  }

  private syncSound(on: boolean) {
    const b = this.hudBtns?.sound; if (!b) return;
    b.innerHTML = on ? icons.soundOn : icons.soundOff;
    b.setAttribute('aria-pressed', String(on));
    b.setAttribute('aria-label', on ? 'Matikan suara' : 'Nyalakan suara');
  }

  setHud(spec: HudSpec) {
    const show = { ...spec, account: spec.account && !!this.user };
    (Object.keys(this.hudBtns) as (keyof typeof this.hudBtns)[]).forEach((k) => {
      const on = !!show[k];
      this.hudBtns[k].classList.toggle('is-on', on);
      this.hudBtns[k].tabIndex = on ? 0 : -1;
      this.hudBtns[k].setAttribute('aria-hidden', String(!on));
    });
    if (!show.account) this.toggleAcct(false);
  }
}
