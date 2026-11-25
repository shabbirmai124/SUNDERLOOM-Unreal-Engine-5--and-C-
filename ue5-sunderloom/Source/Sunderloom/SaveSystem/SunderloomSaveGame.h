#pragma once

#include "CoreMinimal.h"
#include "GameFramework/SaveGame.h"
#include "Core/SunderloomTypes.h"
#include "SunderloomSaveGame.generated.h"

UCLASS()
class SUNDERLOOM_API USunderloomSaveGame : public USaveGame
{
	GENERATED_BODY()

public:
	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Sunderloom|Save")
	int32 SaveVersion = 1;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Sunderloom|Save")
	int32 TotalAetherThreads = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Sunderloom|Save")
	TArray<FName> UnlockedWeapons;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Sunderloom|Save")
	TMap<EStatType, int32> PermanentStatRanks;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Sunderloom|Save")
	int32 HighestFloorReached = 1;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Sunderloom|Save")
	int32 TotalBossesSlain = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Sunderloom|Settings")
	float MasterVolume = 0.8f;

	UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Sunderloom|Settings")
	bool bCameraShakeEnabled = true;

	USunderloomSaveGame()
	{
		UnlockedWeapons.Add(FName(TEXT("Weapon_ObsidianBlade")));
	}
};
