# SUNDERLOOM: The Shifting Vault — Unreal Engine 5 C++ Setup Guide

## 1. Prerequisites
- Unreal Engine 5.4+ (compatible with 5.3–5.5)
- Visual Studio 2022 with **Game Development with C++**, **Desktop Development with C++**, and Windows SDK (or JetBrains Rider)

## 2. Generate & Compile Project
1. Extract this archive into a clean folder (e.g., `D:/Projects/Sunderloom`).
2. Right-click `Sunderloom.uproject` and select **Generate Visual Studio project files**.
3. Open `Sunderloom.sln` in Visual Studio 2022, set Solution Configuration to **Development Editor** and Platform to **Win64**, and build (`Ctrl+Shift+B`).
4. Launch `Sunderloom.uproject`.

## 3. Editor Asset Hookup Checklist (Law 1: Blueprints Own Visuals & Tuning Only)
- **Maps (`Content/Maps/`):** Create `Map_TestArena`, `Map_Dungeon` (place one `ADungeonGenerator` and one `ANavMeshBoundsVolume`), and `Map_MainMenu`.
- **Blueprint Children (`Content/Core/`, `Content/Character/`):**
  - `BP_SunderloomGameMode` (parent: `ASunderloomGameMode`)
  - `BP_SunderloomGameInstance` (parent: `USunderloomGameInstance`)
  - `BP_SunderloomPlayerController` (parent: `ASunderloomPlayerController`)
  - `BP_WardenCharacter` (parent: `AWardenCharacter`) — assign 8 Input Actions + `IMC_Sunderloom`, skeletal mesh, weapon mesh with `BladeBase`/`BladeTip` sockets, and Montages.
- **Data Tables (`Content/Progression/`):**
  - Import `Content/Data/DT_LoomRelics.csv` using row struct `FLoomRelicData`.
  - Import `Content/Data/CT_FloorScaling.csv` as a CurveTable.
- **Modular Rooms (`Content/Dungeon/`):**
  - Create Blueprint children of `ARoomBase` following strict 400cm grid / 300x300cm doorway metrics with outward-facing ArrowComponents (`Doorway_*`), `RoomBoundsBox`, `EncounterTrigger`, `EnemySpawn_*`, and `RelicMarker_*`.
  - Create `DA_ObsidianWeave` (`UDungeonThemeDataAsset`) and assign it to `ADungeonGenerator`.
- **AI (`Content/AI/`):**
  - Create `BB_Loomborn` Blackboard with keys `TargetActor`, `LastKnownLocation`, `DistanceToTarget`, `HealthPercent`, `CanSeeTarget`, `IsStaggered`, and `MoveToLocation`.
  - Create `BT_Loomborn` using `UBTService_UpdateCombatState`, `UBTTask_ExecuteAttack`, and EQS ring queries.
- **UMG (`Content/UI/`):**
  - Create `WBP_SunderloomHUD` (parent: `USunderloomHUDWidget`), `WBP_RunSummary` (parent: `URunSummaryWidget`), and `WBP_FloatingDamage` (parent: `UFloatingDamageWidget`) with matching `BindWidget` names.
