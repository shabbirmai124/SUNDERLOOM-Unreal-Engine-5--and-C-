#include "Core/SunderloomGameMode.h"
#include "Core/SunderloomGameInstance.h"
#include "Core/SunderloomPlayerController.h"
#include "Character/WardenCharacter.h"
#include "Dungeon/DungeonGenerator.h"
#include "Kismet/GameplayStatics.h"
#include "Sunderloom.h"

ASunderloomGameMode::ASunderloomGameMode()
{
	PrimaryActorTick.bCanEverTick = false;
	DefaultPawnClass = AWardenCharacter::StaticClass();
	PlayerControllerClass = ASunderloomPlayerController::StaticClass();
}

void ASunderloomGameMode::BeginPlay()
{
	Super::BeginPlay();

	UWorld* World = GetWorld();
	if (!IsValid(World))
	{
		return;
	}

	if (ADungeonGenerator* Generator = Cast<ADungeonGenerator>(UGameplayStatics::GetActorOfClass(World, ADungeonGenerator::StaticClass())))
	{
		int32 SeedToUse = FMath::RandRange(10000, 999999);
		int32 CurrentFloor = 1;

		if (USunderloomGameInstance* GI = Cast<USunderloomGameInstance>(GetGameInstance()))
		{
			if (GI->GetActiveRunState().ActiveSeed != 0)
			{
				SeedToUse = GI->GetActiveRunState().ActiveSeed;
			}
			CurrentFloor = GI->GetCurrentFloor();
		}

		Generator->GenerateDungeon(SeedToUse, CurrentFloor);
	}
}

void ASunderloomGameMode::NotifyDungeonReady(const FTransform& StartSpawnTransform)
{
	APlayerController* PC = UGameplayStatics::GetPlayerController(this, 0);
	if (IsValid(PC))
	{
		if (APawn* Pawn = PC->GetPawn())
		{
			Pawn->SetActorTransform(StartSpawnTransform, false, nullptr, ETeleportType::TeleportPhysics);
		}
		if (ASunderloomPlayerController* SunderPC = Cast<ASunderloomPlayerController>(PC))
		{
			SunderPC->ApplyGameOnlyInputMode();
		}
	}
}

void ASunderloomGameMode::NotifyPlayerDied(AWardenCharacter* DeadWarden)
{
	USunderloomGameInstance* GI = Cast<USunderloomGameInstance>(GetGameInstance());
	FActiveRunState Snapshot;
	if (IsValid(GI))
	{
		Snapshot = GI->GetActiveRunState();
		GI->CompleteRunAndBankThreads(false);
	}

	if (ASunderloomPlayerController* PC = Cast<ASunderloomPlayerController>(UGameplayStatics::GetPlayerController(this, 0)))
	{
		PC->ShowRunSummary(Snapshot, false);
	}
}

void ASunderloomGameMode::NotifyBossDefeated(const FVector& BossDeathLocation)
{
	UWorld* World = GetWorld();
	if (IsValid(World) && IsValid(DescentPortalClass))
	{
		FActorSpawnParameters SpawnParams;
		SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;
		World->SpawnActor<AActor>(DescentPortalClass, BossDeathLocation + FVector(0.0f, 0.0f, 40.0f), FRotator::ZeroRotator, SpawnParams);
	}
}
