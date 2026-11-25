import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHud } from './components/GameHud';
import { PauseModal, RunSummaryModal } from './components/GameModals';
import { SettingsModal } from './components/SettingsModal';
import { TitleScreen } from './components/TitleScreen';
import { gameAudio } from './game/audio';
import { SunderloomEngine, type HudSnapshot } from './game/engine';
import { loadSaveProfile, saveProfileAsync } from './game/saveStorage';
import {
  CAMERA_PRESET_ORDER,
  loadGameSettings,
  saveGameSettings,
  type GameSettings,
} from './game/settings';
import { SunderloomThreeViewport } from './game/threeRenderer';
import type { FRunSummarySnapshot, FSaveProfile } from './game/types';

type GameScreenState = 'title' | 'playing' | 'paused' | 'gameover';

const INITIAL_HUD: HudSnapshot = {
  hp: 120,
  maxHp: 120,
  shield: 0,
  superCharge: 35,
  floor: 1,
  seed: 41029,
  roomsCleared: 0,
  totalCombatRooms: 6,
  aetherThreads: 0,
  kills: 0,
  relicCount: 0,
  comboStep: 0,
  dodgeReadyRatio: 1,
  isInvulnerable: false,
  bossName: null,
  bossHp: 0,
  bossMaxHp: 1,
  bossPhase: 1,
  promptText: null,
  promptSubtext: null,
  promptRarity: null,
  activeRoomType: 'Start',
  activeRoomLocked: false,
  debugOverlay: false,
};

export default function App() {
  const [settings, setSettings] = useState<GameSettings>(() => {
    const loaded = loadGameSettings();
    gameAudio.setMuted(loaded.muted);
    gameAudio.setMasterVolume(loaded.masterVolume);
    return loaded;
  });

  const [profile, setProfile] = useState<FSaveProfile>(() => loadSaveProfile());

  const [gameState, setGameState] = useState<GameScreenState>(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('autostart') === '1') {
      return 'playing';
    }
    return 'title';
  });

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [runSummary, setRunSummary] = useState<FRunSummarySnapshot | null>(null);
  const [floorBanner, setFloorBanner] = useState<{ floor: number; seed: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [minimapTick, setMinimapTick] = useState(0);

  const viewportContainerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<SunderloomThreeViewport | null>(null);
  const engineRef = useRef<SunderloomEngine | null>(null);
  const gameStateRef = useRef<GameScreenState>(gameState);
  const settingsOpenRef = useRef<boolean>(settingsOpen);
  const settingsRef = useRef<GameSettings>(settings);
  const mapExpandedRef = useRef<boolean>(mapExpanded);
  const bannerTimerRef = useRef<number | null>(null);

  gameStateRef.current = gameState;
  settingsOpenRef.current = settingsOpen;
  settingsRef.current = settings;
  mapExpandedRef.current = mapExpanded;

  // Mirror game state machine strictly to document.body.dataset.state
  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const showFloorBanner = useCallback((floor: number, seed: number) => {
    setFloorBanner({ floor, seed });
    if (bannerTimerRef.current) window.clearTimeout(bannerTimerRef.current);
    bannerTimerRef.current = window.setTimeout(() => {
      setFloorBanner(null);
    }, 2400);
  }, []);

  const persistProfile = useCallback((updated: FSaveProfile) => {
    setProfile(updated);
    saveProfileAsync(updated);
  }, []);

  const handleUpdateSettings = useCallback((next: GameSettings) => {
    setSettings(next);
    saveGameSettings(next);
    gameAudio.setMuted(next.muted);
    gameAudio.setMasterVolume(next.masterVolume);
    viewportRef.current?.applySettings(next);
    if (engineRef.current) {
      engineRef.current.profile.cameraShakeEnabled = next.screenShake;
    }
  }, []);

  const handleCycleCamera = useCallback(() => {
    setSettings((prev) => {
      const idx = CAMERA_PRESET_ORDER.indexOf(prev.cameraPreset);
      const nextPreset = CAMERA_PRESET_ORDER[(idx + 1) % CAMERA_PRESET_ORDER.length];
      const next: GameSettings = { ...prev, cameraPreset: nextPreset };
      saveGameSettings(next);
      viewportRef.current?.applySettings(next);
      return next;
    });
  }, []);

  const handleToggleMute = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, muted: !prev.muted };
      saveGameSettings(next);
      gameAudio.setMuted(next.muted);
      return next;
    });
  }, []);

  const startPlay = useCallback((optionalSeed?: number) => {
    const engine = engineRef.current;
    if (engine) {
      engine.clearInputs();
      engine.startFreshRun(optionalSeed);
    }
    setSettingsOpen(false);
    setMapExpanded(false);
    setRunSummary(null);
    document.body.dataset.state = 'playing';
    setGameState('playing');
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    viewportContainerRef.current?.focus();
  }, []);

  const handleBuyPermanentUpgrade = useCallback((kind: 'health' | 'damage') => {
    setProfile((prev) => {
      const cost = kind === 'health' ? 40 + prev.permanentHealthRank * 35 : 50 + prev.permanentDamageRank * 40;
      if (prev.totalAetherThreads < cost) return prev;
      const next: FSaveProfile = {
        ...prev,
        totalAetherThreads: prev.totalAetherThreads - cost,
        permanentHealthRank: kind === 'health' ? prev.permanentHealthRank + 1 : prev.permanentHealthRank,
        permanentDamageRank: kind === 'damage' ? prev.permanentDamageRank + 1 : prev.permanentDamageRank,
      };
      if (engineRef.current) {
        engineRef.current.profile = { ...next };
      }
      saveProfileAsync(next);
      return next;
    });
  }, []);

  // Mount persistent 3D PBR Three.js WebGL Viewport & Simulation Engine ONCE
  useEffect(() => {
    const container = viewportContainerRef.current;
    if (!container) return;

    const engine = new SunderloomEngine(profile, {
      onHudUpdate: (snapshot) => {
        setHud(snapshot);
        setMinimapTick((t) => (t + 1) % 10000);
      },
      onRunEnded: (summary) => {
        setRunSummary(summary);
        setMapExpanded(false);
        document.body.dataset.state = 'gameover';
        setGameState('gameover');
      },
      onFloorBanner: (floor, seed) => {
        showFloorBanner(floor, seed);
      },
      onProfileChanged: (updated) => {
        persistProfile(updated);
      },
    });
    engine.profile.cameraShakeEnabled = settings.screenShake;
    engineRef.current = engine;

    const viewport = new SunderloomThreeViewport(container, settings);
    viewportRef.current = viewport;

    if (gameStateRef.current === 'playing') {
      engine.startFreshRun(41029);
    }

    const handleResize = () => {
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      engine.canvasWidth = w;
      engine.canvasHeight = h;
      viewport.resize(w, h);
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(document.documentElement);

    let lastMouseX: number | null = null;
    let lastMouseY: number | null = null;
    let isOrbitDragging = false;

    const updateMouseAim = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      engine.mouseScreenX = sx;
      engine.mouseScreenY = sy;

      if (settingsRef.current.cameraPreset === 'FirstPerson') {
        const fpsAim = viewport.getForwardAimWorldCm(engine);
        engine.setAimWorldTarget(fpsAim.x, fpsAim.y);
      } else {
        const hit = viewport.screenToWorldCm(sx, sy);
        if (hit) {
          engine.setAimWorldTarget(hit.x, hit.y);
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (settingsOpenRef.current) {
        if (e.code === 'Escape') setSettingsOpen(false);
        return;
      }

      if (gameStateRef.current === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startPlay();
        }
        return;
      }

      if (e.code === 'Tab' && gameStateRef.current === 'playing') {
        e.preventDefault();
        setMapExpanded((prev) => !prev);
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (mapExpandedRef.current) {
          setMapExpanded(false);
          return;
        }
        if (gameStateRef.current === 'playing') {
          engine.clearInputs();
          if (document.pointerLockElement) document.exitPointerLock?.();
          setGameState('paused');
          return;
        }
        if (gameStateRef.current === 'paused') {
          engine.clearInputs();
          setGameState('playing');
          return;
        }
      }

      if (e.code === 'KeyM') {
        handleToggleMute();
        return;
      }

      if (gameStateRef.current !== 'playing') return;

      if (!e.repeat) {
        if (e.code === 'Space' || e.code === 'ShiftLeft') {
          e.preventDefault();
          engine.requestPhaseStep();
        } else if (e.code === 'KeyE') {
          engine.requestInteract();
        } else if (e.code === 'KeyQ') {
          engine.requestHeavyAttack();
        } else if (e.code === 'KeyR' || e.code === 'KeyF') {
          engine.requestAetherSuper();
        } else if (e.code === 'KeyV') {
          handleCycleCamera();
        } else if (e.code === 'Quote') {
          engine.toggleDebugOverlay();
        }
      }
      engine.keysHeld.add(e.code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      engine.keysHeld.delete(e.code);
    };

    const onMouseMove = (e: MouseEvent) => {
      const dx = lastMouseX !== null ? e.clientX - lastMouseX : 0;
      const dy = lastMouseY !== null ? e.clientY - lastMouseY : 0;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      if (gameStateRef.current === 'playing' && !settingsOpenRef.current && !mapExpandedRef.current) {
        if (settingsRef.current.cameraPreset === 'FirstPerson') {
          const moveX = document.pointerLockElement ? e.movementX : dx;
          const moveY = document.pointerLockElement ? e.movementY : dy;
          if (Math.abs(moveX) > 0 || Math.abs(moveY) > 0) {
            viewport.adjustFpsLook(-moveX * 0.0042, -moveY * 0.0028);
          }
        } else if (isOrbitDragging || e.shiftKey) {
          viewport.orbitYawBy(-dx * 0.006);
        }
      }
      updateMouseAim(e.clientX, e.clientY);
    };

    const onMouseDown = (e: MouseEvent) => {
      if (settingsOpenRef.current || mapExpandedRef.current || gameStateRef.current !== 'playing') return;
      if (e.target !== viewport.renderer.domElement) return;
      if (e.button === 1) {
        e.preventDefault();
        isOrbitDragging = true;
        return;
      }
      updateMouseAim(e.clientX, e.clientY);
      if (e.button === 0) {
        engine.requestLightAttack();
      } else if (e.button === 2) {
        engine.requestRuneLance();
      }
    };

    const onMouseUp = (e: MouseEvent) => {
      if (e.button === 1) isOrbitDragging = false;
    };

    const onContextMenu = (e: MouseEvent) => {
      if (gameStateRef.current === 'playing' && !settingsOpenRef.current) {
        e.preventDefault();
      }
    };

    const onBlurOrHide = () => {
      isOrbitDragging = false;
      engine.clearInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('blur', onBlurOrHide);
    document.addEventListener('visibilitychange', onBlurOrHide);

    // Hardware rAF loop + strict Software-WebGL fenceSync afterDraw pacing
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();

    const afterDraw = (cb: () => void) => {
      if (disposed) return;
      const gl = viewport.renderer.getContext() as WebGL2RenderingContext;
      if (gl && typeof gl.fenceSync === 'function') {
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } else {
        frameId = window.setTimeout(cb, 80);
      }
    };

    const tick = () => {
      if (disposed) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;

      const isTitle = gameStateRef.current === 'title';
      const activePlaying = gameStateRef.current === 'playing' && !settingsOpenRef.current;

      engine.step(rawDt, activePlaying);
      viewport.renderFrame(engine, rawDt, isTitle);

      if (viewport.isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    frameId = window.requestAnimationFrame(tick);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      ro.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('blur', onBlurOrHide);
      document.removeEventListener('visibilitychange', onBlurOrHide);
      viewport.dispose();
      viewportRef.current = null;
    };
    // Mount 3D WebGL engine once for the entire session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const currentDungeon = engineRef.current?.dungeon;
  const currentPlayerPos = {
    x: engineRef.current?.playerX ?? 0,
    y: engineRef.current?.playerY ?? 0,
  };

  void minimapTick;

  return (
    <div className="relative w-full h-full overflow-hidden bg-[#0C0A09]">
      {/* Dedicated Isolated Full-Bleed 3D WebGL Viewport Container */}
      <div
        ref={viewportContainerRef}
        data-testid="sunderloom-viewport"
        tabIndex={0}
        className="relative w-full h-full outline-none"
      />

      {/* Clean AAA Title Screen over Live 3D Obsidian Forge Sanctuary */}
      {gameState === 'title' && !settingsOpen && (
        <TitleScreen
          profile={profile}
          onStartPlay={() => startPlay()}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      )}

      {/* Playing Perimeter HUD */}
      {gameState === 'playing' && !settingsOpen && currentDungeon && (
        <GameHud
          hud={hud}
          dungeon={currentDungeon}
          playerPos={currentPlayerPos}
          cameraPreset={settings.cameraPreset}
          muted={settings.muted}
          showMinimap={settings.showMinimap}
          mapExpanded={mapExpanded}
          floorBanner={floorBanner}
          onCycleCamera={handleCycleCamera}
          onToggleMapExpanded={() => setMapExpanded((v) => !v)}
          onTriggerSuper={() => engineRef.current?.requestAetherSuper()}
          onToggleMute={handleToggleMute}
          onOpenSettings={() => {
            engineRef.current?.clearInputs();
            setSettingsOpen(true);
          }}
          onPause={() => {
            engineRef.current?.clearInputs();
            setGameState('paused');
          }}
        />
      )}

      {/* Paused Modal */}
      {gameState === 'paused' && !settingsOpen && (
        <PauseModal
          profile={profile}
          onResume={() => {
            engineRef.current?.clearInputs();
            setGameState('playing');
          }}
          onRestart={() => startPlay()}
          onOpenSettings={() => setSettingsOpen(true)}
          onReturnTitle={() => {
            engineRef.current?.clearInputs();
            setGameState('title');
          }}
        />
      )}

      {/* Game Over / Run Summary Modal */}
      {gameState === 'gameover' && runSummary && !settingsOpen && (
        <RunSummaryModal
          summary={runSummary}
          profile={profile}
          onStartNewRun={() => startPlay()}
          onBuyPermanentUpgrade={handleBuyPermanentUpgrade}
          onReturnTitle={() => {
            setRunSummary(null);
            setGameState('title');
          }}
        />
      )}

      {/* Full AAA Settings Modal (Display, Camera Modes, Audio, Controls) */}
      {settingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdate={handleUpdateSettings}
          onClose={() => setSettingsOpen(false)}
        />
      )}
    </div>
  );
}
