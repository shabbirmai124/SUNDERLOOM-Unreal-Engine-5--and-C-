# SUNDERLOOM: The Shifting Vault

> **Dark-Fantasy 3D Procedural Dungeon Roguelite** — delivered with **two cleanly divided, mechanism-identical implementations**:
> 1. **Native Unreal Engine 5.8 C++ Project** (`/ue5-sunderloom/`)
> 2. **Playable 3D WebGL / Three.js Build** (`/src/`)

![Sunderloom Title Sanctuary](docs/images/01-title-sanctuary.png)

---

## Table of Contents

1. [Dual-Environment Parity Overview](#1-dual-environment-parity-overview)
2. [Visual Showcase (20 In-Game Screenshots)](#2-visual-showcase-20-in-game-screenshots)
3. [Complete File & Folder Organization](#3-complete-file--folder-organization)
4. [1-to-1 Mechanism Parity: TypeScript ↔ Unreal Engine 5.8 C++](#4-1-to-1-mechanism-parity-typescript--unreal-engine-58-c)
5. [How to Run on Windows 10 / Windows 11](#5-how-to-run-on-windows-10--windows-11)
   - [Part A: Running & Building Unreal Engine 5.8 C++ on Windows](#part-a-running--building-unreal-engine-58-c-on-windows)
   - [Part B: Running the 3D WebGL / Three.js Game on Windows](#part-b-running-the-3d-webgl--threejs-game-on-windows)
6. [How the Game Works — Deep Learning Guide](#6-how-the-game-works--deep-learning-guide)
   - [Procedural Dungeon Map Architecture](#procedural-dungeon-map-architecture)
   - [4 Camera View Modes & Battlefield Clear Room View](#4-camera-view-modes--battlefield-clear-room-view)
   - [Combat System & Controls](#combat-system--controls)
   - [Bright-Contrast Matte PBR Calibration (Zero Mirror Glare)](#bright-contrast-matte-pbr-calibration-zero-mirror-glare)
   - [Relic Progression & Scaling Formulas](#relic-progression--scaling-formulas)
7. [Automated Verification & Stress Testing](#7-automated-verification--stress-testing)
8. [Proprietary License & Third-Party Notices](#8-proprietary-license--third-party-notices)

---

## 1. Dual-Environment Parity Overview

This repository separates the **native Unreal Engine 5.8 C++ project** and the **playable 3D Three.js / WebGL build** into two completely clean, independent directories while keeping **every single gameplay, camera, combat, dungeon, progression, and lighting mechanism identical** between both languages:

| Feature / Mechanism | Native Unreal Engine 5.8 C++ (`/ue5-sunderloom/`) | Playable 3D WebGL / Three.js (`/src/`) |
|---|---|---|
| **Language & Runtime** | Pure C++20 + Unreal Engine 5.8 (`Sunderloom.uproject`) | TypeScript + React + Three.js PBR (`Vite`) |
| **4 Camera View Modes (`V` / Settings)** | `ECameraViewPreset` (`ThirdPerson`, `FirstPerson`, `TopDown`, `Cinematic`) | `CameraPreset` (`ThirdPerson`, `FirstPerson`, `TopDown`, `Cinematic`) |
| **Valorant-Style FPS View** | `FirstPersonCamera` eye-level view + controller yaw + FPS FOV | Eye-level FPS camera + center crosshair + Runeblade viewmodel |
| **Battlefield Clear Room View** | `ARoomBase::SetBattlefieldWallCutaway(true)` + expanded `CameraBoom` | Active combat room walls drop to low plinths + room-center framing |
| **Auto-Follow Travel View** | Smooth `FixedTurn` velocity-aligned travel camera in `AWardenCharacter::Tick` | Smooth velocity-aligned travel camera in `SunderloomThreeViewport` |
| **Strict Mouse Combat Split** | **LMB** = Sword Slice ONLY · **RMB** = Shoot Rune Lance ONLY | **LMB** = Sword Slice ONLY · **RMB** = Shoot Rune Lance ONLY |
| **Sunder Nova Super (`R` / `F`)** | `UCombatComponent::RequestAetherSuper()` (0–100% charge, shockwave + 8 bolts) | `SunderloomEngine::requestAetherSuper()` (0–100% charge, shockwave + 8 bolts) |
| **Procedural Vault Map** | `ADungeonGenerator` (400cm grid, 12+ rooms/floor, 0 overlaps, wall caps) | `generateProceduralDungeon` (400cm grid, 12+ rooms/floor, 0 overlaps, wall caps) |
| **Matte PBR Contrast Calibration** | `DefaultEngine.ini` + `FollowCamera`/`FirstPersonCamera` PostProcess + `RoomBase` MID clamp | `threeTextures.ts` + `threeModels.ts` + `threeDungeon.ts` + `threeRenderer.ts` (`exposure=1.16`, `bloomThreshold=1.45`, matte `roughness=0.88–0.92`) |

---

## 2. Visual Showcase (20 In-Game Screenshots)

All 20 screenshots below are captured directly from the live 3D renderer (`1440×900`, matte bright-contrast PBR calibration, zero console errors).

### A. Title Sanctuary, Settings & Full Control Mapping

| #1 — Title Sanctuary (Matte Obsidian Cathedral) | #2 — Settings: Display & 4 Camera Modes |
| :---: | :---: |
| ![01 Title Sanctuary](docs/images/01-title-sanctuary.png) | ![02 Settings Display & Camera](docs/images/02-settings-camera-modes.png) |
| *Cinematic 3D Cathedral Sanctuary with standing iron braziers and the Unbound Warden.* | *Choose `3rd Person`, `FPS (Valorant)`, `Top-Down`, or `Cinematic` plus `Battlefield Clear Room View`.* |

| #3 — Settings: Strict Mouse Combat Controls | #4 — Settings: Audio & Combat Feel |
| :---: | :---: |
| ![03 Settings Controls](docs/images/03-settings-controls.png) | ![11 Settings Audio & Feel](docs/images/11-settings-audio-feel.png) |
| *Strict split: `Left Click` slices with sword only; `Right Click` shoots Rune Lance only.* | *Master/SFX/Music volumes, Camera Shake, Hit-Stop Freeze, and Floating Damage Numbers.* |

---

### B. All 4 Switchable Camera View Modes (`V` Key or Settings)

| #5 — 3rd Person Over-the-Shoulder View | #6 — First-Person (`FPS / Valorant`) View |
| :---: | :---: |
| ![04 Third Person Vault](docs/images/04-third-person-vault.png) | ![05 First Person FPS View](docs/images/05-first-person-fps-view.png) |
| *Default action-roguelite running view with matte weathered ashlar stone and antique bronze trim.* | *Valorant-style eye-level FPS perspective with crisp center crosshair and Runeblade viewmodel.* |

| #7 — FPS Aiming Down Vault Archway | #8 — Top-Down Tactical Overhead View |
| :---: | :---: |
| ![18 FPS Corridor Aim](docs/images/18-fps-corridor-aim.png) | ![06 Top-Down Tactical View](docs/images/06-top-down-tactical-view.png) |
| *First-person corridor sightline looking straight through the gothic stone archway.* | *High overhead tactical view revealing surrounding rooms, pillars, and doorways at a glance.* |

| #9 — Cinematic Dark-Fantasy View | #10 — Top-Down Multi-Chamber Wing |
| :---: | :---: |
| ![07 Cinematic View](docs/images/07-cinematic-view.png) | ![19 Top-Down Multi-Chamber](docs/images/19-top-down-multi-chamber.png) |
| *Dramatic angled architectural perspective showcasing gothic columns and volumetric brazier fire.* | *Overhead tactical layout across interconnected Eastern chambers during exploration.* |

---

### C. Manual Camera Orbit, Auto-Follow Traversal & Expanded Full-Vault Map

| #11 — Expanded Full-Vault Map (`Tab`) | #12 — Manual Orbit Left (`Z` / Middle-Mouse) |
| :---: | :---: |
| ![08 Full Vault Map](docs/images/08-full-vault-map.png) | ![12 Orbit Camera Left](docs/images/12-orbit-camera-left.png) |
| *Full procedural floor blueprint showing 12+ interconnected Start, Hallway, Combat, Treasure, and Boss rooms.* | *Smart Dynamic Wall Cutaway adapts seamlessly when rotating the camera left.* |

| #13 — Manual Orbit Right (`C` / Middle-Mouse) | #14 — Auto-Follow East Hallway Traversal |
| :---: | :---: |
| ![13 Orbit Camera Right](docs/images/13-orbit-camera-right.png) | ![17 East Hallway Traversal](docs/images/17-east-hallway-traversal.png) |
| *Rotating right reveals adjacent archway passages without wall obstruction.* | *Auto-Follow Travel View smoothly aligns behind the Warden while sprinting through hallways.* |

---

### D. Strict Mouse Combat, Phase Step Dodge, Battlefield Clear Room View & Pause Menu

| #15 — Left-Click Sword Slice ONLY (3-Hit Melee) | #16 — Right-Click Shoot Rune Lance ONLY |
| :---: | :---: |
| ![15 Left Click Sword Slash](docs/images/15-left-click-sword-slash.png) | ![16 Right Click Rune Lance](docs/images/16-right-click-rune-lance.png) |
| *`LMB` executes the 3-hit Runeblade cleave with zero ranged projectile fired.* | *`RMB` fires a ranged Rune Lance bolt toward the 3D aim cursor.* |

| #17 — Space Phase Step Dodge (I-Frames) | #18 — Battlefield Enemy Zone Entry |
| :---: | :---: |
| ![14 Phase Step Dodge](docs/images/14-phase-step-dodge.png) | ![09 Battlefield Combat Room](docs/images/09-battlefield-combat-shoot.png) |
| *Instant directional dash with Aether Ward invulnerability frames (`0.34s`).* | *Entering an enemy combat room locks runic gates and activates Battlefield Clear Room View.* |

| #19 — Combat Room Clear View & Ranged Fire | #20 — Pause Menu & Warden Record (`Esc`) |
| :---: | :---: |
| ![20 Combat Room Clear View](docs/images/20-combat-room-clear-view.png) | ![10 Pause and Warden Record](docs/images/10-pause-and-warden-record.png) |
| *Obstructing walls drop cleanly to plinth height so combat sightlines stay 100% unobstructed.* | *Pause overlay displaying floor stats, active build relics, and direct Settings access.* |

---

## 3. Complete File & Folder Organization

Every file in the repository is organized cleanly into two dedicated top-level environments plus shared documentation and licensing:

```text
sunderloom-shifting-vault/
├── README.md                                  # Master documentation, 20 screenshots, Windows run guides & architecture
├── LICENSE                                    # Strict Proprietary All Rights Reserved License
├── LICENSE-THIRD-PARTY.md                     # Third-party engine/library license notices (UE5, Three.js, React, etc.)
├── index.html                                 # WebGL SPA entry HTML (<title>, dark basalt root styling)
├── package.json                               # Node.js / Vite / TypeScript / Three.js dependencies & npm scripts
├── tsconfig.json                              # Strict TypeScript compiler configuration
├── vite.config.ts                             # Vite dev server (port 3000) & production bundler configuration
├── docs/
│   └── images/                                # All 20 verified 1440x900 in-game PNG screenshots (01 through 20)
│
├── src/                                       # ═══ ENVIRONMENT B: PLAYABLE 3D WEBGL / THREE.JS BUILD ═══
│   ├── main.tsx                               # React root mount entry point
│   ├── index.css                              # Tailwind CSS v4 global stylesheet
│   ├── App.tsx                                # Top-level game shell, input routing (LMB/RMB/V/R/Tab/Z/C), modals & loop
│   ├── components/
│   │   ├── TitleScreen.tsx                    # Cathedral Sanctuary title UI & Enter Vault trigger
│   │   ├── GameHud.tsx                        # HP/Shield/Nova % bars, FPS crosshair, View Mode button & clickable Minimap
│   │   ├── SettingsModal.tsx                  # Display & Camera (4 views + Clear Room View), Audio & Feel, Controls tabs
│   │   └── GameModals.tsx                     # Pause menu, Expanded Full-Vault Map (Tab), Victory/Death Run Summary
│   └── game/
│       ├── types.ts                           # Shared TypeScript interfaces mirroring UE5 SunderloomTypes.h
│       ├── settings.ts                        # CameraPreset enum, FOV, Auto-Follow & Battlefield Clear View persistence
│       ├── stats.ts                           # Deterministic (Base + SumFlat) * (1 + SumPercent) stat & relic calculator
│       ├── dungeonGenerator.ts                # 400cm-snapped procedural 12+ room vault generator & 50-seed stress validator
│       ├── engine.ts                          # Pure simulation engine: LMB Sword / RMB Shoot / R Nova / AI / Room Locks
│       ├── audio.ts                           # Procedural Web Audio synthesizer (footsteps, blade cleave, lance, nova)
│       ├── saveStorage.ts                     # Persistent Warden meta-progression & best-floor localStorage store
│       ├── threeTextures.ts                   # Procedural matte PBR albedo, bump & roughness canvas textures (0.80–0.97)
│       ├── threeModels.ts                     # Procedural 3D articulated Warden, 4 enemy archetypes, braziers & matte PBR mats
│       ├── threeDungeon.ts                    # 3D cathedral room builder with per-side Cutaway Wall Groups & archways
│       ├── threeRenderer.ts                   # Three.js WebGLRenderer, 4 cameras, FPS viewmodel, Clear Room cutaway & bloom
│       └── sunderloom.test.ts                 # Node.js native unit test suite (7/7 tests + 50-seed dungeon stress gate)
│
└── ue5-sunderloom/                            # ═══ ENVIRONMENT A: NATIVE UNREAL ENGINE 5.8 C++ PROJECT ═══
    ├── Sunderloom.uproject                    # Unreal Engine 5.8 project descriptor (EnhancedInput, Navigation, UMG, Niagara)
    ├── LICENSE                                # Strict Proprietary All Rights Reserved License (UE5 copy)
    ├── README_UNREAL_SETUP.md                 # Quick Unreal Editor Blueprint wiring reference
    ├── .gitignore                             # Clean UE5 ignore rules (Binaries/, DerivedDataCache/, Intermediate/, Saved/)
    ├── Config/
    │   └── DefaultEngine.ini                  # Lumen GI, Nanite, matte roughness/bloom CVars, EnhancedInput, Dynamic NavMesh
    ├── Content/
    │   └── Data/
    │       ├── DT_LoomRelics.csv              # 12 Loom Relics DataTable (Common / Rare / Mythic flat & percent modifiers)
    │       └── CT_FloorScaling.csv            # Floor-by-floor enemy HP & damage difficulty scaling CurveTable
    └── Source/
        ├── Sunderloom.Target.cs               # Native Windows Game build target
        ├── SunderloomEditor.Target.cs         # Unreal Editor build target (Development Editor | Win64)
        └── Sunderloom/
            ├── Sunderloom.Build.cs            # C++ module dependencies (Engine, EnhancedInput, AIModule, NavigationSystem, UMG)
            ├── Sunderloom.h / .cpp            # Primary game module entry & global 400cm metrics
            ├── Core/
            │   ├── SunderloomTypes.h          # ECameraViewPreset, ERoomType, ERoomState, ECombatState, FLoomRelicData
            │   ├── SunderloomGameUserSettings.h/.cpp  # Persisted CameraPreset, FOV, AutoFollow, BattlefieldClearView (.ini)
            │   ├── SunderloomGameMode.h/.cpp  # Vault floor lifecycle, seed orchestration & run reset
            │   ├── SunderloomGameInstance.h/.cpp      # Cross-floor run state persistence (HP, relics, floor index)
            │   ├── SunderloomPlayerController.h/.cpp  # EnhancedInput mapping context & HUD/Pause/Settings routing
            │   ├── CombatInterface.h/.cpp     # Decoupled combat damage & poise hit contract
            │   └── InteractionInterface.h/.cpp# Decoupled pedestal & portal E-key interaction contract
            ├── Character/
            │   ├── WardenCharacter.h/.cpp     # Player pawn: 4 camera presets, FPS camera, matte post-process, Clear Room boom
            │   └── LoombornEnemyBase.h/.cpp   # Base enemy class with telegraphing, floor scaling & death dispatch
            ├── Components/
            │   ├── CombatComponent.h/.cpp     # Strict LMB Sword Combo ONLY, RMB Rune Lance ONLY, R Sunder Nova Super
            │   ├── HealthComponent.h/.cpp     # Invulnerability frames, Shield-first absorption, single-death guard
            │   ├── StatsComponent.h/.cpp      # Deterministic (Base + SumFlat) * (1 + SumPercent) stat pipeline
            │   ├── RuneProjectile.h/.cpp      # Ranged Rune Lance & radial Sunder Nova bolt projectile actor
            │   ├── WeaponSweepNotifyState.h/.cpp      # AnimNotifyState for sub-stepped melee Runeblade socket traces
            │   └── SurfaceAudioComponent.h/.cpp       # PhysicalMaterial footstep & impact audio router
            ├── Dungeon/
            │   ├── DungeonGenerator.h/.cpp    # Deterministic seeded 400cm-grid 12+ room generator with wall-cap sealing
            │   ├── DungeonThemeDataAsset.h/.cpp       # Biome room pools, enemy classes, DataTables & room count rules
            │   ├── RoomBase.h/.cpp            # Encounter lock, BattlefieldWallCutaway, matte MID calibration, 3 relic spawns
            │   ├── DescentPortal.h/.cpp       # Post-boss floor transition portal actor
            │   └── DestructibleVaultProp.h/.cpp       # Breakable cathedral urns & pillars
            ├── AI/
            │   ├── EnemyAIController.h/.cpp   # BehaviorTree & Blackboard controller
            │   ├── BTService_UpdateCombatState.h/.cpp # Distance/LOS combat state evaluation service
            │   └── BTTask_ExecuteAttack.h/.cpp        # Telegraphed melee/ranged attack execution task
            ├── Progression/
            │   └── UpgradePedestal.h/.cpp     # Mutually exclusive 3-relic choice pedestal (dissolves sibling pedestals)
            ├── SaveSystem/
            │   ├── SunderloomSaveGame.h/.cpp  # USaveGame schema for lifetime records & meta-progression
            │   └── SaveManagerSubsystem.h/.cpp# Async slot save/load GameInstanceSubsystem
            └── UI/
                ├── SunderloomHUDWidget.h/.cpp # Health/Shield/Nova HUD & camera mode indicator
                ├── SettingsMenuWidget.h/.cpp  # 4 Camera Preset selector, Auto-Follow & Battlefield Clear View checkboxes
                ├── FloatingDamageWidget.h/.cpp# Projected world-space damage popups
                └── RunSummaryWidget.h/.cpp    # Victory / Death run breakdown widget
```

---

## 4. 1-to-1 Mechanism Parity: TypeScript ↔ Unreal Engine 5.8 C++

Use this table to trace **any** mechanic side-by-side across both languages:

| Game System | WebGL / Three.js File (`/src/`) | Native Unreal Engine 5.8 C++ File (`/ue5-sunderloom/`) | Shared Exact Behavior |
|---|---|---|---|
| **Types & Enums** | `src/game/types.ts` & `settings.ts` | `Source/Sunderloom/Core/SunderloomTypes.h` | `ThirdPerson`, `FirstPerson`, `TopDown`, `Cinematic`; `Start`, `Hallway`, `Combat`, `Treasure`, `Boss` |
| **User Settings** | `src/game/settings.ts` | `Core/SunderloomGameUserSettings.{h,cpp}` | Saves `CameraPreset`, `FOV`, `AutoFollowCamera`, `BattlefieldClearView`, audio & feel toggles |
| **Settings UI** | `src/components/SettingsModal.tsx` | `UI/SettingsMenuWidget.{h,cpp}` | Direct 4-view camera switcher, Clear Room toggle, Auto-Follow toggle, Controls legend |
| **Player & Cameras** | `src/game/threeRenderer.ts` + `App.tsx` | `Character/WardenCharacter.{h,cpp}` | `ApplyCameraPreset()`, `V` cycling, FPS eye-level camera, Auto-Follow travel alignment, Clear Room zoom |
| **Combat Split** | `src/game/engine.ts` | `Components/CombatComponent.{h,cpp}` | **LMB** = 3-Hit Sword Slice ONLY (0 projectiles) · **RMB** = Shoot Rune Lance ONLY · **R/F** = Sunder Nova Super (8 bolts + shockwave) |
| **Health & Shields** | `src/game/stats.ts` + `engine.ts` | `Components/HealthComponent.{h,cpp}` | Dead/I-Frame guard → Shield-first absorption → HP clamp → Single death broadcast |
| **Stat Pipeline** | `src/game/stats.ts` | `Components/StatsComponent.{h,cpp}` | Strictly `(Base + SumFlat) * (1 + SumPercent)` |
| **Vault Generator** | `src/game/dungeonGenerator.ts` | `Dungeon/DungeonGenerator.{h,cpp}` | Seeded 400cm grid, `12+` rooms/floor, 0 overlaps, doorway wall-cap sealing, Boss at deepest node |
| **Room Encounters & Cutaway** | `src/game/engine.ts` + `threeDungeon.ts` | `Dungeon/RoomBase.{h,cpp}` | Locks runic gates on entry, drops obstructing walls for Clear Room View, spawns 3 unique mutually exclusive relics on clear |
| **Matte PBR Calibration** | `threeTextures.ts` + `threeModels.ts` + `threeRenderer.ts` | `Config/DefaultEngine.ini` + `WardenCharacter.cpp` + `RoomBase.cpp` | Bright neutral exposure (`1.16` / `0.0 EV`), `BloomThreshold=1.45`, `BloomIntensity=0.08`, matte roughness (`0.88–0.92`), low metalness (`0.18–0.22`) |

---

## 5. How to Run on Windows 10 / Windows 11

You can run **either** the Native Unreal Engine 5.8 C++ project **or** the instant Playable 3D WebGL build on Windows 10/11 (64-bit).

---

### Part A: Running & Building Unreal Engine 5.8 C++ on Windows

#### Prerequisites (Windows 10 / 11 64-bit)
1. **Epic Games Launcher & Unreal Engine 5.8**
   - Download and install the **Epic Games Launcher** from [unrealengine.com](https://www.unrealengine.com/).
   - Open **Unreal Engine → Library → Engine Versions (`+`)** and install **Unreal Engine 5.8** (make sure **Editor symbols for debugging** is checked if you plan to debug C++).
2. **Visual Studio 2022 Community (Free)**
   - Download **Visual Studio 2022** from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/).
   - In the **Visual Studio Installer**, check the workload:
     - ✅ **Desktop development with C++**
     - ✅ **Game development with C++**
   - Under **Individual Components**, verify these are selected:
     - ✅ **MSVC v143 - VS 2022 C++ x64/x86 build tools (Latest)**
     - ✅ **Windows 10 SDK (10.0.22621.0 or newer)** or **Windows 11 SDK**
     - ✅ **IDE support for Unreal Engine** / **Unreal Engine Installer**
     - ✅ **.NET 8.0 Runtime** (required by UnrealBuildTool)

#### Step-by-Step Build & Play in Unreal Engine 5.8 (Windows)

1. **Navigate to the UE5 project folder** in Windows File Explorer:
   ```text
   <your-repo-folder>\ue5-sunderloom\
   ```
2. **Generate Visual Studio Solution Files**:
   - Right-click **`Sunderloom.uproject`** → click **Show more options** (Windows 11) → **Generate Visual Studio project files**.
   - *(PowerShell alternative)*:
     ```powershell
     & "C:\Program Files\Epic Games\UE_5.8\Engine\Binaries\DotNET\UnrealBuildTool\UnrealBuildTool.exe" -projectfiles -project="$PWD\ue5-sunderloom\Sunderloom.uproject" -game -rocket -progress
     ```
3. **Compile the C++ Project in Visual Studio 2022**:
   - Double-click the newly generated **`Sunderloom.sln`**.
   - In the top toolbar, set:
     - **Solution Configuration**: `Development Editor`
     - **Solution Platform**: `Win64`
   - Right-click **`Sunderloom`** in Solution Explorer → **Set as Startup Project**.
   - Press **`Ctrl + Shift + B`** (or **Build → Build Solution**). Wait for `Build: 1 succeeded, 0 failed`.
4. **Launch Unreal Editor & Play**:
   - Press **`F5`** in Visual Studio (or double-click **`Sunderloom.uproject`** directly).
   - Once Unreal Editor opens, import the CSV tables in `Content/Data/`:
     - `DT_LoomRelics.csv` → select row struct **`LoomRelicData`**
     - `CT_FloorScaling.csv` → import as **CurveTable**
   - Follow `ue5-sunderloom/README_UNREAL_SETUP.md` to verify Input Actions (`IA_LightAttack` → LMB, `IA_RuneLance` → RMB, `IA_AetherSuper` → R/F, `IA_CycleCamera` → V, `IA_PhaseStep` → Space).
   - Click **Play (PIE)** (`Alt + P`) to play natively with Lumen GI, Nanite, and all 4 camera modes!
5. **Package a Standalone Windows `.exe` Build (Optional)**:
   - Inside Unreal Editor, go to **Platforms → Windows → Package Project**.
   - Choose an output folder (e.g., `C:\Builds\SunderloomWin64`).
   - Run `C:\Builds\SunderloomWin64\Windows\Sunderloom.exe`.

#### Common Windows UE5 Troubleshooting
- **"Missing Sunderloom Modules / Rebuild Now?"** → Click **Yes**, or rebuild `Development Editor | Win64` in Visual Studio 2022.
- **"Generate Visual Studio project files" missing on Windows 11** → Click **Show more options** at the bottom of the right-click menu, or run the PowerShell `UnrealBuildTool.exe` command in Step 2.
- **Lumen Reflections look too glossy on custom meshes** → Ensure your custom Material exposes `Roughness`, `Metallic`, and `Specular` scalar parameters; `ARoomBase::ApplyMatteDarkFantasyCalibration()` automatically clamps them on `BeginPlay`, and `DefaultEngine.ini` enforces `r.Lumen.Reflections.MaxRoughnessToTrace=0.35`.

---

### Part B: Running the 3D WebGL / Three.js Game on Windows

#### Prerequisites (Windows 10 / 11)
1. Install **Node.js 20 LTS** (or newer) from [nodejs.org](https://nodejs.org/) (keep *Add to PATH* checked during setup).
2. Open **Windows Terminal** or **PowerShell** and verify:
   ```powershell
   node -v
   npm -v
   ```

#### Step-by-Step Run Commands (PowerShell)

1. **Open the repository root folder**:
   ```powershell
   cd C:\path\to\sunderloom-shifting-vault
   ```
2. **Install dependencies** (first time only):
   ```powershell
   npm install
   ```
3. **Start the live 3D game server on port 3000**:
   ```powershell
   npm run dev
   ```
4. **Play in your browser**:
   - Open Chrome, Edge, or Firefox and go to: **`http://localhost:3000`**
   - Click **Enter The Shifting Vault** (or visit `http://localhost:3000/?autostart=1` to jump straight into Floor 1).
5. **Run the automated unit tests & 50-seed dungeon stress test**:
   ```powershell
   npx tsx --test src/game/sunderloom.test.ts
   ```
6. **Build a production bundle (Optional)**:
   ```powershell
   npm run build
   npm run preview
   ```

---

## 6. How the Game Works — Deep Learning Guide

### Procedural Dungeon Map Architecture

Both `ADungeonGenerator` (UE5 C++) and `generateProceduralDungeon` (TypeScript) use the exact same deterministic **branching breadth-first spatial graph**:
1. **400 cm Grid Snapping**: Every room footprint and doorway socket snaps strictly to `400 cm` (`4.0 m` in Three.js) intervals so hallways and chambers join flush with zero seams.
2. **Guaranteed 12+ Chambers Per Floor**: Floor 1 builds a sprawling **12+ chamber vault** (`BaseTargetRoomCount = 12`, scaling by `+3` chambers per deeper floor) composed of:
   - **Start Sanctuary** (safe hub with multiple open wings)
   - **Vault Hallways** (connective corridors linking wings)
   - **Combat Arenas** (lock behind glowing runic gates upon entry; drop 3 mutually exclusive Loom Relics when cleared)
   - **Treasure Shrines** (bonus relic sanctuaries)
   - **Boss Sanctum** (placed at the maximum graph depth from Start; clearing spawns the **Descent Portal** to the next floor)
3. **Zero Overlaps & Complete Wall-Cap Sealing**: Every candidate room is tested against all placed bounding boxes with a `10 cm` shrink tolerance. Any unused doorway socket is sealed with a recessed carved stone alcove (**Wall Cap**), guaranteeing **0 open voids** across 50/50 automated seed stress tests.
4. **Full-Vault Map (`Tab`)**: Press **`Tab`** (or click the top-right minimap) at any time to inspect the entire vault blueprint, room states, and boss sanctum path.

---

### 4 Camera View Modes & Battlefield Clear Room View

Switch camera perspectives anytime in **Settings → Display & Camera** or live in-game by pressing **`V`** (or clicking the `View:` HUD button):

1. **`3rd Person` (`ThirdPerson`)** — Classic over-the-shoulder action view with smooth velocity-aligned **Auto-Follow Travel View** and manual `Z` / `C` / Middle-Mouse orbit.
2. **`FPS (Valorant)` (`FirstPerson`)** — Eye-level first-person tactical view with a crisp center crosshair, wider responsive FOV, mouse-look control, and an animated first-person Runeblade viewmodel.
3. **`Top-Down` (`TopDown`)** — Pure overhead tactical view showing full chamber footprints, enemy formations, and adjacent corridors.
4. **`Cinematic` (`Cinematic`)** — Dramatic low-angle cathedral framing emphasizing vertical gothic pillars and firelit stone vaults.

**Battlefield Clear Room View** (enabled by default in Settings in **both** UE5 C++ and WebGL):
- The instant you step into an active enemy **Combat** or **Boss** room (in non-FPS modes), obstructing perimeter walls smoothly drop down to low stone plinth height and camera framing widens toward the room center — guaranteeing a **100% clear, unobstructed view of every enemy and telegraph** until the chamber is cleared!

---

### Combat System & Controls

| Input | Action | Mechanism Details |
|---|---|---|
| **`W` `A` `S` `D`** | Move | Camera-relative directional movement (auto-aligned in Auto-Follow & FPS) |
| **`Left Click (LMB)`** | **Sword Slice ONLY** | 3-Hit Runeblade Melee Combo (high poise cleave; **never** fires a ranged projectile) |
| **`Right Click (RMB)`** | **Shoot Rune Lance ONLY** | Fires a focused ranged Rune Lance projectile along your 3D aim line |
| **`Space`** | **Phase Step Dodge** | Instant directional dash granting `0.34s` Aether Ward invulnerability frames (I-Frames) & attack-cancel |
| **`R` or `F`** | **Sunder Nova Super** | Triggers at `100%` Nova charge: unleashes a massive radial shockwave + 8-way solar rune bolts |
| **`V`** | **Cycle Camera Mode** | Cycles `3rd Person → FPS (Valorant) → Top-Down → Cinematic` |
| **`Z` / `C` or `MMB Drag`** | **Orbit / Look Camera** | Rotates view left/right (smoothly pauses Auto-Follow briefly while inspecting) |
| **`Tab`** | **Full-Vault Map** | Toggles the expanded 12+ chamber floor blueprint overlay |
| **`E`** | **Interact / Claim Relic** | Claims one of 3 mutually exclusive Loom Relics (dissolving the other 2) or enters the Descent Portal |
| **`Esc`** | **Pause & Settings** | Opens Pause menu, Warden Build Record, and Settings |

---

### Bright-Contrast Matte PBR Calibration (Zero Mirror Glare)

Both rendering pipelines are calibrated together so stone, hammered bronze trim, and blackened armor look **bright, crisp, and tactile** — with **zero glossy mirror glare and zero white-hot bloom clipping**:

- **Roughness & Metalness Floor**: All procedural stone, wall, floor, armor, and bronze materials enforce matte roughness (`0.84–0.96`) and low metalness (`0.04–0.22`) across both Three.js (`threeTextures.ts` / `threeModels.ts` / `threeDungeon.ts`) and Unreal Engine 5.8 (`ARoomBase::ApplyMatteDarkFantasyCalibration()` + `r.Lumen.Reflections.MaxRoughnessToTrace=0.35`).
- **Balanced Exposure & Restrained Bloom**: Bright readable exposure (`toneMappingExposure = 1.16` in Three.js; neutral `0.0 EV` + `ColorContrast = 1.06` in UE5 `WardenCharacter.cpp`) paired with a strict high bloom threshold (`1.45`) and subtle bloom strength (`0.08`) so only true spell/fire energy carries a soft halo.

---

### Relic Progression & Scaling Formulas

- **Stat Calculation (`StatsComponent` / `stats.ts`)**: Every stat strictly follows deterministic order:
  $$\text{FinalStat} = (\text{Base} + \sum \text{FlatModifiers}) \times (1 + \sum \text{PercentModifiers})$$
- **Damage Pipeline (`HealthComponent` / `engine.ts`)**: `IsDead / Invulnerable Guard` → `Shield-First Absorption` → `HP Clamping` → `Single-Death Dispatch`.
- **Floor Scaling (`CT_FloorScaling.csv` / `stats.ts`)**: Enemy Health scales by `1 + (Floor - 1) × 0.35` and Enemy Damage scales by `1 + (Floor - 1) × 0.22`.

---

## 7. Automated Verification & Stress Testing

Run the full TypeScript verification suite at any time:

```powershell
npx tsx --test src/game/sunderloom.test.ts
```

It validates **7 automated checks**:
1. Deterministic `StatsComponent` `(Base + SumFlat) * (1 + SumPercent)` math.
2. `HealthComponent` dead/I-frame guard, shield-first absorption, clamping, and single-death dispatch.
3. Guaranteed 3 strictly unique Loom Relics per room reward roll.
4. Monotonic floor difficulty CurveTable scaling.
5. Deterministic identical vault layouts for identical seeds.
6. **50-Seed Automated Dungeon Stress Test (`50/50 PASS`)**: 0 room overlaps, 0 unsealed doorways, ≥12 connected chambers per seed.
7. Core combat verification: strict **LMB = Sword Slice ONLY (0 projectiles)**, **RMB = Shoot Rune Lance**, `Space` Phase Step I-Frames, `R` Sunder Nova 8-way blast, and mutually exclusive Relic Pedestals.

---

## 8. Proprietary License & Third-Party Notices

- **Original Code, Game Design, C++ Source, TypeScript Source, Shaders, Data & Documentation**:
  **Copyright © All Rights Reserved.** Governed by the strict proprietary license in [`LICENSE`](LICENSE) and [`ue5-sunderloom/LICENSE`](ue5-sunderloom/LICENSE). **No individual or organization may use, copy, modify, publish, distribute, or create derivative works from this project without explicit prior written permission from the owner.**
- **Third-Party Kits & Libraries**:
  See [`LICENSE-THIRD-PARTY.md`](LICENSE-THIRD-PARTY.md) for license notices covering Unreal Engine 5, Three.js, React, Vite, Tailwind CSS, Lucide Icons, and TypeScript (applicable strictly to those external third-party packages, not to Sunderloom's proprietary code).
