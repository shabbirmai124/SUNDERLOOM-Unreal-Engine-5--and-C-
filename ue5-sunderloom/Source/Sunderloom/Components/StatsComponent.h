#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Core/SunderloomTypes.h"
#include "StatsComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FOnStatRecalculatedSignature, EStatType, StatType, float, NewFinalValue);

UCLASS(ClassGroup=(Sunderloom), meta=(BlueprintSpawnableComponent))
class SUNDERLOOM_API UStatsComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UStatsComponent();

	virtual void BeginPlay() override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Stats")
	void AddRelic(const FLoomRelicData& Relic);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Stats")
	void RestoreRelicsFromRunState(const TArray<FLoomRelicData>& SavedRelics);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Stats")
	void RecalculateAllStats();

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Stats")
	float GetFinalStat(EStatType StatType) const;

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Stats")
	const TArray<FLoomRelicData>& GetAcquiredRelics() const { return AcquiredRelics; }

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Stats")
	FOnStatRecalculatedSignature OnStatRecalculated;

protected:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Stats")
	TMap<EStatType, FStatValue> StatTable;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Stats")
	TArray<FLoomRelicData> AcquiredRelics;
};
