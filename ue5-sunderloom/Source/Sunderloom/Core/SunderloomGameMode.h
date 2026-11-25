#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "SunderloomGameMode.generated.h"

class ADungeonGenerator;
class AWardenCharacter;

UCLASS()
class SUNDERLOOM_API ASunderloomGameMode : public AGameModeBase
{
	GENERATED_BODY()

public:
	ASunderloomGameMode();

	virtual void BeginPlay() override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Run")
	void NotifyDungeonReady(const FTransform& StartSpawnTransform);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Run")
	void NotifyPlayerDied(AWardenCharacter* DeadWarden);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Run")
	void NotifyBossDefeated(const FVector& BossDeathLocation);

protected:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Dungeon")
	TSubclassOf<AActor> DescentPortalClass;
};
