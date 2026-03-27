/**
 * LIFETOPIA PREMIUM AUDIO SYSTEM
 * Robust, seamless, and professional audio management
 */

class AudioController {
  private bgm: HTMLAudioElement | null = null;
  private currentBgmPath: string = "";
  private sfxCache: Record<string, HTMLAudioElement> = {};
  private initialized: boolean = false;
  private volume: number = 0.4;
  private fadeInterval: any = null;

  // PUBLIC SFX URLs (Mixkit/OpenGameArt style)
  private readonly SFX_URLS: Record<string, string> = {
    click: "https://assets.mixkit.co/sfx/preview/mixkit-selection-click-vibe-2101.mp3",
    hoe: "https://assets.mixkit.co/sfx/preview/mixkit-digging-ground-dirt-mechanic-2420.mp3",
    water: "https://assets.mixkit.co/sfx/preview/mixkit-splashing-water-in-pool-1187.mp3",
    plant: "https://assets.mixkit.co/sfx/preview/mixkit-small-item-drop-on-ground-2121.mp3",
    harvest: "https://assets.mixkit.co/sfx/preview/mixkit-magical-coin-win-1936.mp3",
    levelUp: "https://assets.mixkit.co/sfx/preview/mixkit-winning-an-extra-bonus-2098.mp3",
  };

  constructor() {
    this.bgm = new Audio();
    this.bgm.loop = true;
    this.bgm.volume = 0; // Start muted for fade-in
    this.bgm.crossOrigin = "anonymous";
  }

  /**
   * Browser security requires interaction to start audio.
   * Call this on first click (e.g. Start Game).
   */
  public init() {
    if (this.initialized) return;
    this.initialized = true;
    console.log("[Audio] System Initialized");
    
    // Resume audio context if needed
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const actx = new AudioCtx();
      if (actx.state === "suspended") actx.resume();
    }
  }

  /**
   * Plays BGM with professional cross-fade
   */
  public playBGM(file: string) {
    if (!this.bgm) return;
    if (this.currentBgmPath === file) {
        if (this.bgm.paused) this.bgm.play().catch(() => {});
        return;
    }

    this.currentBgmPath = file;
    console.log("[Audio] Switching BGM to:", file);

    const startNewBgm = () => {
      this.bgm!.src = file;
      this.bgm!.load();
      this.bgm!.volume = 0;
      this.bgm!.muted = false;
      this.bgm!.play()
        .then(() => {
          console.log("[Audio] BGM Playback Started");
          this.fadeIn();
        })
        .catch(e => {
          console.error("[Audio] BGM Playback Blocked/Failed:", e);
          // Retry later on any click if blocked
          window.addEventListener('click', () => this.bgm!.play(), { once: true });
        });
    };

    if (this.bgm.paused) {
      startNewBgm();
    } else {
      this.fadeOut(() => startNewBgm());
    }
  }

  /**
   * Plays a one-shot SFX
   */
  public playSFX(type: string) {
    if (!this.initialized) {
        this.init(); // Auto-init on SFX if possible
    }

    const url = this.SFX_URLS[type];
    if (!url) return;

    try {
        let sound = this.sfxCache[type];
        if (!sound) {
          sound = new Audio(url);
          sound.crossOrigin = "anonymous";
          this.sfxCache[type] = sound;
        }

        const instance = sound.cloneNode(true) as HTMLAudioElement;
        instance.volume = 0.5;
        instance.play().catch(() => {
            // Silently fail SFX if not ready
        });
    } catch(e) {
        console.warn("[Audio] SFX Error:", e);
    }
  }

  private fadeOut(callback: () => void) {
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    if (!this.bgm) return callback();

    this.fadeInterval = setInterval(() => {
      if (this.bgm!.volume > 0.05) {
        this.bgm!.volume -= 0.05;
      } else {
        this.bgm!.volume = 0;
        clearInterval(this.fadeInterval);
        callback();
      }
    }, 50);
  }

  private fadeIn() {
    if (this.fadeInterval) clearInterval(this.fadeInterval);
    if (!this.bgm) return;

    this.fadeInterval = setInterval(() => {
      if (this.bgm!.volume < this.volume - 0.05) {
        this.bgm!.volume += 0.05;
      } else {
        this.bgm!.volume = this.volume;
        clearInterval(this.fadeInterval);
      }
    }, 50);
  }

  public setVolume(v: number) {
    this.volume = v;
    if (this.bgm) this.bgm.volume = v;
  }
}

// Singleton export
export const AudioManager = new AudioController();
