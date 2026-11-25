#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "Core/SunderloomTypes.h"
#include "SunderloomGameInstance.generated.h"

UCLASS()
class SUNDERLOOM_API USunderloomGameInstance : public UGameInstance
{
	GENERATED_BODY()

public:
	virtual void Init() override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Run")
	void StartFreshRun(int32 OptionalSeed = 0);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Run")
	void AdvanceToNextFloor(float RemainingHealth, const TArray<FLoomRelicData>& ActiveRelics);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Run")
	void CompleteRunAndBankThreads(bool bBossDefeated);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Run")
	void RecordEnemyKill(int32 ThreadReward);

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Run")
	const FActiveRunState& GetActiveRunState() const { return RunState; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Run")
	int32 GetCurrentFloor() const { return RunState.CurrentFloor; }

protected:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Maps")
	FName DungeonMapName = FName(TEXT("Map_Dungeon"));

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Maps")
	FName MainMenuMapName = FName(TEXT("Map_MainMenu"));

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Run")
	FActiveRunState RunState;
};
