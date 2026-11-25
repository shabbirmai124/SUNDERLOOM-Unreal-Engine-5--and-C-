#include "Core/SunderloomGameInstance.h"
#include "SaveSystem/SaveManagerSubsystem.h"
#include "Kismet/GameplayStatics.h"
#include "Sunderloom.h"

void USunderloomGameInstance::Init()
{
	Super::Init();

	if (USaveManagerSubsystem* SaveSub = GetSubsystem<USaveManagerSubsystem>())
	{
		SaveSub->LoadProfileAsync();
	}
}

void USunderloomGameInstance::StartFreshRun(int32 OptionalSeed)
{
	RunState.Reset();
	RunState.CurrentFloor = 1;
	RunState.ActiveSeed = (OptionalSeed != 0) ? OptionalSeed : FMath::RandRange(10000, 999999);

	UGameplayStatics::OpenLevel(this, DungeonMapName);
}

void USunderloomGameInstance::AdvanceToNextFloor(float RemainingHealth, const TArray<FLoomRelicData>& ActiveRelics)
{
	RunState.SavedRunHealth = FMath::Max(1.0f, RemainingHealth);
	RunState.AcquiredRelicsList = ActiveRelics;
	RunState.CurrentFloor += 1;
	RunState.ActiveSeed += 7919;

	if (USaveManagerSubsystem* SaveSub = GetSubsystem<USaveManagerSubsystem>())
	{
		SaveSub->RecordFloorReached(RunState.CurrentFloor);
		SaveSub->SaveProfileAsync();
	}

	UGameplayStatics::OpenLevel(this, DungeonMapName);
}

void USunderloomGameInstance::CompleteRunAndBankThreads(bool bBossDefeated)
{
	if (USaveManagerSubsystem* SaveSub = GetSubsystem<USaveManagerSubsystem>())
	{
		SaveSub->AddAetherThreads(RunState.PendingAetherThreads);
		SaveSub->RecordFloorReached(RunState.CurrentFloor);
		if (bBossDefeated)
		{
			SaveSub->IncrementBossesSlain();
		}
		SaveSub->SaveProfileAsync();
	}

	RunState.Reset();
}

void USunderloomGameInstance::RecordEnemyKill(int32 ThreadReward)
{
	RunState.RunKills += 1;
	RunState.PendingAetherThreads += FMath::Max(0, ThreadReward);
}
