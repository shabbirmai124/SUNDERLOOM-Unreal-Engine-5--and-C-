#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/SunderloomTypes.h"
#include "DungeonGenerator.generated.h"

class UDungeonThemeDataAsset;
class ARoomBase;
class UArrowComponent;

USTRUCT()
struct FOpenDoorwaySocket
{
	GENERATED_BODY()

	UPROPERTY()
	TObjectPtr<ARoomBase> OwnerRoom = nullptr;

	UPROPERTY()
	TObjectPtr<UArrowComponent> DoorArrow = nullptr;

	FTransform WorldTransform = FTransform::Identity;
	int32 ParentGraphDepth = 0;
};

UCLASS()
class SUNDERLOOM_API ADungeonGenerator : public AActor
{
	GENERATED_BODY()

public:
	ADungeonGenerator();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Dungeon")
	bool GenerateDungeon(int32 Seed, int32 FloorNumber);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Dungeon")
	void ClearGeneratedDungeon();

#if !UE_BUILD_SHIPPING
	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Debug")
	FDungeonStressTestResult RunFiftySeedStressTest(int32 StartingSeed = 1000, int32 FloorNumber = 1);
#endif

protected:
	bool TryGenerateSingleAttempt(int32 Seed, int32 FloorNumber, int32 TargetRoomCount);
	bool TryAttachRoomToSocket(const FOpenDoorwaySocket& TargetSocket, TSubclassOf<ARoomBase> CandidateClass, ERoomType AssignedType, int32 FloorNumber, ARoomBase*& OutSpawnedRoom);
	FTransform ComputeAlignedRoomTransform(const FTransform& TargetDoorWorld, const FTransform& CandidateDoorLocal) const;
	bool HasFootprintOverlap(const FBox& ProposedWorldBox) const;
	TSubclassOf<ARoomBase> PickWeightedRoomClass(const TArray<struct FWeightedRoomEntry>& Pool, FRandomStream& Stream) const;
	void SealRemainingDoorways();
	void RebuildDynamicNavMesh();

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Sunderloom|Dungeon")
	TObjectPtr<UDungeonThemeDataAsset> ActiveTheme;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Dungeon")
	int32 MaxRoomAttachRetries = 10;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Dungeon")
	int32 MaxSeedSelfHealAttempts = 20;

private:
	UPROPERTY()
	TArray<TObjectPtr<ARoomBase>> SpawnedRooms;

	UPROPERTY()
	TArray<TObjectPtr<AActor>> SpawnedSealsAndGates;

	TArray<FBox> PlacedFootprints;
	TArray<FOpenDoorwaySocket> OpenDoorways;
};
