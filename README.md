# SUNDERLOOM: The Shifting Vault — Unreal Engine 5.8 C++ Project

**SUNDERLOOM: The Shifting Vault** is a commercial-grade **Third-Person Procedural Dungeon Roguelite with Modular Combat**, built strictly with **Unreal Engine 5.8 C++** (with an ultra-realistic real-time 3D PBR WebGL vertical slice included for instant browser playtesting).

All gameplay logic, combat pipelines, procedural dungeon room-stitching, AI Behavior Tree tasks/services, deterministic stat calculations, audio surface routing, settings, and asynchronous SaveGame persistence live inside pure **Unreal Engine 5.8 C++** under `/ue5-sunderloom/`.

---

## 1. How to Open, Build, and Run in Unreal Engine 5.8

### Prerequisites
- **Unreal Engine 5.8** (installed via Epic Games Launcher or source build)
- **Windows:** Visual Studio 2022 (with *Game development with C++*, *Windows 10/11 SDK*, and *Unreal Engine installer* workloads) — or **JetBrains Rider for Unreal Engine**
- **macOS / Linux:** Xcode 15+ or Clang toolchain configured for UnrealBuildTool

### Step-by-Step Build Instructions
1. Locate the complete Unreal Engine 5.8 project directory at:
   ```text
   ue5-sunderloom/
   ├── Sunderloom.uproject
   ├── Config/DefaultEngine.ini
   ├── Content/Data/DT_LoomRelics.csv
   ├── Content/Data/CT_FloorScaling.csv
   └── Source/
       ├── Sunderloom.Target.cs
       ├── SunderloomEditor.Target.cs
       └── Sunderloom/
           ├── Sunderloom.Build.cs
           ├── Core/
           ├── Character/
           ├── Components/
           ├── Dungeon/
           ├── AI/
           ├── Progression/
           ├── UI/
           └── SaveSystem/
   ```
2. **Generate IDE Project Files:**
   - Right-click `ue5-sunderloom/Sunderloom.uproject` and select **Generate Visual Studio project files** (or open `Sunderloom.uproject` directly in **JetBrains Rider**).
3. **Compile C++ Module:**
   - Open `Sunderloom.sln` in Visual Studio 2022.
   - Set Solution Configuration to **Development Editor** and Platform to **Win64**.
   - Build the **Sunderloom** target (`Ctrl + Shift + B`).
4. **Launch Unreal Editor 5.8:**
   - Press `F5` from Visual Studio or double-click `Sunderloom.uproject`.
5. **Import Data Assets & Create Thin Visual Child Blueprints (Law 1):**
   - Import `Content/Data/DT_LoomRelics.csv` into `/Game/Progression/DT_LoomRelics` using row struct `FLoomRelicData`.
   - Import `Content/Data/CT_FloorScaling.csv` into `/Game/Progression/CT_FloorScaling` as a `CurveTable`.
   - Create thin Blueprint subclasses inheriting from the C++ classes (`BP_WardenCharacter`, `BP_DungeonGenerator`, `BP_Room_Start`, `BP_Room_Combat`, `BP_Room_Treasure`, `BP_Room_Boss`, `BP_Enemy_ThreadlingRusher`, `BP_Enemy_SpireArcanist`, `BP_Enemy_IroncladLoomguard`, `BP_Boss_WeaverWarden`, `BP_UpgradePedestal`, `BP_DescentPortal`, `WBP_SunderloomHUD`, `WBP_SettingsMenu`, `WBP_RunSummary`) strictly to assign Nanite obsidian meshes, Skeletal Meshes, AnimMontages, MetaSounds, and Niagara systems.
6. **Press Play (PIE & Standalone Game):**
   - Launch in **Play-In-Editor (PIE)** or **Standalone Game** to run the full procedural vault loop.

---

## 2. Photorealistic Rendering & Engine Configuration (`Config/DefaultEngine.ini`)

The Unreal Engine 5.8 project is pre-configured out of the box for commercial dark-fantasy photorealism:
- **Nanite Virtualized Micropolygon Geometry:** `r.Nanite=True`
- **Lumen Global Illumination & Reflections:** `r.DynamicGlobalIlluminationMethod=1`, `r.ReflectionMethod=1`
- **Virtual Shadow Maps (VSM):** `r.Shadow.Virtual.Enable=1`
- **Temporal Super Resolution (TSR):** `r.AntiAliasingMethod=4`, `r.TemporalAA.Upsampling=True`
- **Extended Luminance Range & ACES Filmic Sharpening:** `r.DefaultFeature.AutoExposure.ExtendDefaultLuminanceRange=True`, `r.ToneMapper.Sharpen=0.35`
- **6 Physical Surface Types:** `ObsidianStone`, `WetStone`, `ForgedIron`, `AshDust`, `FleshConstruct`, `EnergyShield`
- **Custom Collision Channels:** `WeaponTrace` (`ECC_GameTraceChannel1`) and `RoomBounds` (`ECC_GameTraceChannel2`)
- **Runtime Dynamic NavMesh:** `RuntimeGeneration=Dynamic`, `bRebuildAtRuntime=True`
- **Native Persistent Settings:** `USunderloomGameUserSettings` registered via `GameUserSettingsClassName=/Script/Sunderloom.SunderloomGameUserSettings`

---

## 3. Complete C++ Architecture & Phase 0–7 Compliance Matrix

Every Non-Negotiable Engineering Law is enforced strictly in C++:
- **Law 1 (Strict C++ vs. Blueprint Separation):** 100% of gameplay logic, math, state machines, interfaces, dungeon stitching, AI tasks, and SaveGame serialization live in C++.
- **Law 2 (Modular Composition over Inheritance):** Reusable `UHealthComponent`, `UStatsComponent`, `UCombatComponent`, and `USurfaceAudioComponent` attach cleanly to Players, Enemies, and Chaos Destructibles.
- **Law 3 (Zero-Tick Discipline):** Zero per-frame UI polling or status checks in `Tick()`. All HUD updates, room locks, and damage reactions are event/delegate-driven.
- **Law 4 (Data-Driven Architecture):** Relics (`DT_LoomRelics.csv`), floor scaling (`CT_FloorScaling.csv`), and dungeon themes (`UDungeonThemeDataAsset`) are externalized from C++ code.
- **Law 5 (Hardened Memory & Null Safety):** All `UObject` references use `TObjectPtr<>` / `TWeakObjectPtr<>`, strict null checks, and `FTimerHandle` cleanup in `EndPlay`.
- **Law 6 (Grid-Locked Procedural Precision):** Every room and socket snaps to strict `400cm` increments with `300cm` doorway sockets and a `15cm` bounds overlap tolerance margin.

| Phase | Core C++ Modules | Key Systems Implemented |
| :--- | :--- | :--- |
| **Phase 0** | `Sunderloom.uproject`, `Sunderloom.Build.cs`, `DefaultEngine.ini`, `SunderloomTypes.h`, `SunderloomGameUserSettings.{h,cpp}` | Mirrored module layout, Nanite/Lumen/VSM/TSR config, custom collision & physical surface channels, persistent C++ GameUserSettings. |
| **Phase 1** | `WardenCharacter.{h,cpp}`, `SunderloomPlayerController.{h,cpp}` | Enhanced Input bindings (`IA_Move`, `IA_Look`, `IA_Dodge`, `IA_LightAttack`, `IA_HeavyAttack`, `IA_RangedSpell`, `IA_Interact`, `IA_Pause`), SpringArm camera lag, Phase Step impulse + `FTimerHandle` I-Frames. |
| **Phase 2** | `HealthComponent.{h,cpp}`, `CombatComponent.{h,cpp}`, `CombatInterface.{h,cpp}`, `WeaponSweepNotifyState.{h,cpp}`, `RuneProjectile.{h,cpp}`, `DestructibleVaultProp.{h,cpp}` | Unified shield-first damage pipeline, 3-hit buffered melee combo, anti-tunneling swept multi-sphere weapon trace (`HitActorsThisSwing`), Rune Lance projectile, and Chaos destructible vault props. |
| **Phase 3** | `DungeonGenerator.{h,cpp}`, `RoomBase.{h,cpp}`, `DungeonThemeDataAsset.{h,cpp}` | Seeded `FRandomStream` room-stitching Loom Engine, 15cm overlap rejection, watertight Obsidian Wall Caps, Runic Gate combat lock/unlock, Dynamic NavMesh rebuild, and `RunFiftySeedStressTest()`. |
| **Phase 4** | `LoombornEnemyBase.{h,cpp}`, `EnemyAIController.{h,cpp}`, `BTTask_ExecuteAttack.{h,cpp}`, `BTService_UpdateCombatState.{h,cpp}` | 4 Loomborn archetypes (Threadling Rusher, Spire Arcanist, Ironclad Loomguard, 2-Phase Weaver-Warden Boss), dual Sight/Damage `UAIPerceptionComponent`, fair 0.4–0.8s telegraphs, EQS spacing & flanking. |
| **Phase 5** | `StatsComponent.{h,cpp}`, `UpgradePedestal.{h,cpp}`, `DescentPortal.{h,cpp}`, `InteractionInterface.{h,cpp}`, `DT_LoomRelics.csv`, `CT_FloorScaling.csv` | Deterministic `(Base + SumFlat) * (1 + SumPercent)` stat formula, 15 Starter Loom Relics, 3 mutually exclusive reward pedestals per cleared room, and Boss Descent Portal floor progression. |
| **Phase 6** | `SunderloomHUDWidget.{h,cpp}`, `SettingsMenuWidget.{h,cpp}`, `RunSummaryWidget.{h,cpp}`, `FloatingDamageWidget.{h,cpp}`, `SurfaceAudioComponent.{h,cpp}`, `SunderloomSaveGame.{h,cpp}`, `SaveManagerSubsystem.{h,cpp}` | Zero-Tick `BindWidget` UMG HUD & Settings Menu, MetaSounds physical surface routing across 6 materials, Hit-Stop & Camera Shake juice, and asynchronous `UGameInstanceSubsystem` SaveGame persistence. |

---

## 4. Running the Mandatory 50-Seed Automated Stress Test

### Inside Unreal Engine 5.8 Editor
Call the Blueprint/Console-callable C++ function on `ADungeonGenerator`:
```cpp
ADungeonGenerator::RunFiftySeedStressTest(int32 StartSeed = 1000, int32 NumSeeds = 50);
```
This runs 50 consecutive deterministic `FRandomStream` vault generations and logs pass/fail verification for:
- **0 Room Overlaps** (15cm shrink tolerance)
- **0 Unsealed Doorways** (100% connected or capped with Obsidian Wall Caps)
- **50 / 50 Guaranteed Boss Rooms** placed at maximum room graph depth

### Automated Core Verification Suite (CLI)
You can also run the deterministic core verification test suite directly from the terminal:
```bash
npx --yes tsx --test src/game/sunderloom.test.ts
```

---

## 5. Controls (Unreal Engine 5.8 & 3D WebGL Playtest)
- **W / A / S / D:** Move Unbound Warden
- **Mouse Cursor:** Aim Runeblade & Spells
- **Left Mouse Button:** 3-Hit Buffered Melee Combo
- **Q:** Heavy Cleave Strike
- **Right Mouse Button:** Cast Rune Lance
- **Space / Left Shift:** Phase Step Dodge (Brief Invulnerability Frames)
- **E:** Claim Loom Relic Pedestal / Enter Boss Descent Portal
- **Esc / P:** Pause & Settings Menu
