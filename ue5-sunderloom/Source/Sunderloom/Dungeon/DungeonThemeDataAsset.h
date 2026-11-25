#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Engine/CurveTable.h"
#include "Engine/DataTable.h"
#include "DungeonThemeDataAsset.generated.h"

class ARoomBase;
class ALoombornEnemyBase;
class AUpgradePedestal;

USTRUCT(BlueprintType)
struct FWeightedRoomEntry
{
	GENERATED_BODY()

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Room")
	TSubclassOf<ARoomBase> RoomClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Room", meta = (ClampMin = "0.1"))
	float Weight = 1.0f;
};

UCLASS(BlueprintType)
class SUNDERLOOM_API UDungeonThemeDataAsset : public UPrimaryDataAsset
{
	GENERATED_BODY()

public:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Theme")
	FText BiomeDisplayName = FText::FromString(TEXT("The Obsidian Weave"));

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rooms")
	TSubclassOf<ARoomBase> StartRoomClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rooms")
	TArray<FWeightedRoomEntry> CombatRoomPool;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rooms")
	TArray<FWeightedRoomEntry> HallwayPool;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rooms")
	TSubclassOf<ARoomBase> TreasureRoomClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rooms")
	TSubclassOf<ARoomBase> BossRoomClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sealing")
	TSubclassOf<AActor> DoorwayWallCapClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sealing")
	TSubclassOf<AActor> RunicGateClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Encounters")
	TArray<TSubclassOf<ALoombornEnemyBase>> RegularEnemyClasses;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Encounters")
	TSubclassOf<ALoombornEnemyBase> FloorBossClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Progression")
	TObjectPtr<UDataTable> LoomRelicDataTable;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Progression")
	TSubclassOf<AUpgradePedestal> UpgradePedestalClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Scaling")
	TObjectPtr<UCurveTable> FloorDifficultyCurveTable;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rules", meta = (ClampMin = "8"))
	int32 BaseTargetRoomCount = 12;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rules", meta = (ClampMin = "6"))
	int32 MinValidRoomCount = 8;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Rules")
	int32 AdditionalRoomsPerFloor = 3;
};
