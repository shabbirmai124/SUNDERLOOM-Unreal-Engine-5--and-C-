#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/SunderloomTypes.h"
#include "RoomBase.generated.h"

class UBoxComponent;
class UArrowComponent;
class UDungeonThemeDataAsset;
class ALoombornEnemyBase;
class AUpgradePedestal;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnRoomClearedSignature, ARoomBase*, ClearedRoom);

UCLASS()
class SUNDERLOOM_API ARoomBase : public AActor
{
	GENERATED_BODY()

public:
	ARoomBase();

	virtual void BeginPlay() override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Room")
	void InitializeRoomMetadata(ERoomType InRoomType, int32 InGraphDepth, int32 InFloorNumber, UDungeonThemeDataAsset* InTheme);

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Room")
	TArray<UArrowComponent*> GetDoorwayMarkers() const;

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Room")
	FBox GetWorldFootprintBox(float ShrinkMarginCm = 0.0f) const;

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Room")
	FTransform GetPlayerStartTransform() const;

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Room")
	int32 GetGraphDepth() const { return GraphDepth; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Room")
	ERoomState GetRoomState() const { return RoomState; }

	void RegisterRunicGate(AActor* GateActor);

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Room")
	FOnRoomClearedSignature OnRoomCleared;

protected:
	UFUNCTION()
	void HandleEncounterTriggerOverlap(UPrimitiveComponent* OverlappedComp, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	void SpawnWaveAfterTelegraph();
	void SetRunicGatesLocked(bool bLocked);
	void SetBattlefieldWallCutaway(bool bCutaway);
	void ApplyMatteDarkFantasyCalibration();
	void SpawnThreeUniqueRelicPedestals();

	UFUNCTION()
	void HandleSpawnedEnemyDeath(AActor* DeadEnemy);

	UFUNCTION()
	void HandleRelicPedestalClaimed(AUpgradePedestal* ClaimedPedestal);

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Room")
	TObjectPtr<USceneComponent> RoomRoot;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Room")
	TObjectPtr<UBoxComponent> RoomFootprintBox;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Room")
	TObjectPtr<UBoxComponent> EncounterTriggerBox;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Room")
	ERoomType RoomType = ERoomType::Combat;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Room")
	ERoomState RoomState = ERoomState::Dormant;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Room")
	int32 GraphDepth = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Room")
	int32 FloorNumber = 1;

private:
	UPROPERTY()
	TObjectPtr<UDungeonThemeDataAsset> ActiveTheme;

	UPROPERTY()
	TWeakObjectPtr<AWardenCharacter> ActiveWarden;

	UPROPERTY()
	TArray<TObjectPtr<AActor>> ConnectedRunicGates;

	UPROPERTY()
	TArray<TObjectPtr<AUpgradePedestal>> ActivePedestals;

	int32 LivingEnemiesCount = 0;
	FTimerHandle WaveTelegraphTimerHandle;
};
