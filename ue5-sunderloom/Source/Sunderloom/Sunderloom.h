#pragma once

#include "CoreMinimal.h"

DECLARE_LOG_CATEGORY_EXTERN(LogSunderloom, Log, All);

// Custom collision channels configured in Config/DefaultEngine.ini
#define ECC_WeaponTrace ECC_GameTraceChannel1
#define ECC_RoomBounds  ECC_GameTraceChannel2

// Six custom Physical Surface Types configured in Config/DefaultEngine.ini
#define SURFACE_ObsidianStone  SurfaceType1
#define SURFACE_WetStone       SurfaceType2
#define SURFACE_ForgedIron     SurfaceType3
#define SURFACE_AshDust        SurfaceType4
#define SURFACE_FleshConstruct SurfaceType5
#define SURFACE_EnergyShield   SurfaceType6

// Standardized SUNDERLOOM modular grid metrics (centimeters)
namespace SunderloomMetrics
{
	constexpr float GridUnitCm = 400.0f;
	constexpr float StandardCeilingCm = 400.0f;
	constexpr float BossCeilingCm = 800.0f;
	constexpr float DoorwayWidthCm = 300.0f;
	constexpr float DoorwayHeightCm = 300.0f;
	constexpr float OverlapShrinkMarginCm = 15.0f;
	constexpr float NavMeshBufferMarginCm = 500.0f;
}
