#include "Dungeon/RoomBase.h"
#include "Dungeon/DungeonThemeDataAsset.h"
#include "Character/WardenCharacter.h"
#include "Character/LoombornEnemyBase.h"
#include "Components/HealthComponent.h"
#include "Progression/UpgradePedestal.h"
#include "Components/BoxComponent.h"
#include "Components/ArrowComponent.h"
#include "TimerManager.h"
#include "Sunderloom.h"

ARoomBase::ARoomBase()
{
	PrimaryActorTick.bCanEverTick = false;

	RoomRoot = CreateDefaultSubobject<USceneComponent>(TEXT("RoomRoot"));
	RootComponent = RoomRoot;

	// Standardized 400cm-aligned footprint box on dedicated RoomBounds channel
	RoomFootprintBox = CreateDefaultSubobject<UBoxComponent>(TEXT("RoomFootprintBox"));
	RoomFootprintBox->SetupAttachment(RoomRoot);
	RoomFootprintBox->SetBoxExtent(FVector(600.0f, 600.0f, SunderloomMetrics::StandardCeilingCm * 0.5f));
	RoomFootprintBox->SetRelativeLocation(FVector(0.0f, 0.0f, SunderloomMetrics::StandardCeilingCm * 0.5f));
	RoomFootprintBox->SetCollisionObjectType(ECC_RoomBounds);
	RoomFootprintBox->SetCollisionResponseToAllChannels(ECR_Ignore);
	RoomFootprintBox->SetCollisionResponseToChannel(ECC_RoomBounds, ECR_Overlap);

	// Recessed inner encounter trigger so combat starts only after full room entry
	EncounterTriggerBox = CreateDefaultSubobject<UBoxComponent>(TEXT("EncounterTriggerBox"));
	EncounterTriggerBox->SetupAttachment(RoomRoot);
	EncounterTriggerBox->SetBoxExtent(FVector(460.0f, 460.0f, 160.0f));
	EncounterTriggerBox->SetRelativeLocation(FVector(0.0f, 0.0f, 160.0f));
	EncounterTriggerBox->SetCollisionProfileName(TEXT("Trigger"));
}

void ARoomBase::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(EncounterTriggerBox))
	{
		EncounterTriggerBox->OnComponentBeginOverlap.AddDynamic(this, &ARoomBase::HandleEncounterTriggerOverlap);
	}
}

void ARoomBase::InitializeRoomMetadata(ERoomType InRoomType, int32 InGraphDepth, int32 InFloorNumber, UDungeonThemeDataAsset* InTheme)
{
	RoomType = InRoomType;
	GraphDepth = InGraphDepth;
	FloorNumber = InFloorNumber;
	ActiveTheme = InTheme;
	RoomState = (RoomType == ERoomType::Start || RoomType == ERoomType::Hallway) ? ERoomState::Cleared : ERoomState::Dormant;
}

TArray<UArrowComponent*> ARoomBase::GetDoorwayMarkers() const
{
	TArray<UArrowComponent*> Arrows;
	GetComponents<UArrowComponent>(Arrows);
	return Arrows;
}

FBox ARoomBase::GetWorldFootprintBox(float ShrinkMarginCm) const
{
	if (!IsValid(RoomFootprintBox))
	{
		return FBox(GetActorLocation() - FVector(200.0f), GetActorLocation() + FVector(200.0f));
	}

	const FVector Center = RoomFootprintBox->GetComponentLocation();
	const FVector ScaledExtent = RoomFootprintBox->GetScaledBoxExtent();
	const FVector RotatedExtent = RoomFootprintBox->GetComponentTransform().TransformVectorNoScale(ScaledExtent).GetAbs();
	const FVector FinalExtent = (RotatedExtent - FVector(ShrinkMarginCm)).ComponentMax(FVector(10.0f));
	return FBox(Center - FinalExtent, Center + FinalExtent);
}

FTransform ARoomBase::GetPlayerStartTransform() const
{
	return FTransform(GetActorRotation(), GetActorLocation() + FVector(0.0f, 0.0f, 96.0f));
}

void ARoomBase::RegisterRunicGate(AActor* GateActor)
{
	if (IsValid(GateActor))
	{
		ConnectedRunicGates.AddUnique(GateActor);
		GateActor->SetActorHiddenInGame(true);
		GateActor->SetActorEnableCollision(false);
	}
}

void ARoomBase::HandleEncounterTriggerOverlap(UPrimitiveComponent* OverlappedComp, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (RoomState != ERoomState::Dormant || !Cast<AWardenCharacter>(OtherActor))
	{
		return;
	}

	if (RoomType == ERoomType::Treasure)
	{
		RoomState = ERoomState::Cleared;
		SpawnThreeUniqueRelicPedestals();
		OnRoomCleared.Broadcast(this);
		return;
	}

	// Dormant -> LockedCombat transition
	RoomState = ERoomState::LockedCombat;
	SetRunicGatesLocked(true);

	// 1.0-second portal spawn telegraph before materializing Loomborn wave
	if (UWorld* World = GetWorld())
	{
		World->GetTimerManager().SetTimer(WaveTelegraphTimerHandle, this, &ARoomBase::SpawnWaveAfterTelegraph, 1.0f, false);
	}
}

void ARoomBase::SpawnWaveAfterTelegraph()
{
	UWorld* World = GetWorld();
	if (!IsValid(World) || !IsValid(ActiveTheme))
	{
		RoomState = ERoomState::Cleared;
		SetRunicGatesLocked(false);
		return;
	}

	const float HealthMult = 1.0f + (FloorNumber - 1) * 0.35f;
	const float DamageMult = 1.0f + (FloorNumber - 1) * 0.22f;

	FActorSpawnParameters SpawnParams;
	SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

	if (RoomType == ERoomType::Boss && IsValid(ActiveTheme->FloorBossClass))
	{
		if (ALoombornEnemyBase* Boss = World->SpawnActor<ALoombornEnemyBase>(ActiveTheme->FloorBossClass, GetActorLocation() + FVector(0.0f, 0.0f, 96.0f), GetActorRotation(), SpawnParams))
		{
			Boss->ApplyFloorDifficultyScaling(HealthMult, DamageMult);
			if (UHealthComponent* BossHealth = Boss->GetHealthComponent())
			{
				BossHealth->OnDeath.AddDynamic(this, &ARoomBase::HandleSpawnedEnemyDeath);
				LivingEnemiesCount += 1;
			}
		}
		return;
	}

	if (ActiveTheme->RegularEnemyClasses.Num() == 0)
	{
		RoomState = ERoomState::Cleared;
		SetRunicGatesLocked(false);
		return;
	}

	const int32 SpawnCount = FMath::Clamp(3 + FloorNumber, 3, 7);
	for (int32 i = 0; i < SpawnCount; ++i)
	{
		const float AngleRad = (2.0f * PI * i) / SpawnCount;
		const FVector Offset(FMath::Cos(AngleRad) * 260.0f, FMath::Sin(AngleRad) * 260.0f, 96.0f);
		const int32 ClassIdx = i % ActiveTheme->RegularEnemyClasses.Num();
		TSubclassOf<ALoombornEnemyBase> EnemyClass = ActiveTheme->RegularEnemyClasses[ClassIdx];

		if (IsValid(EnemyClass))
		{
			if (ALoombornEnemyBase* Enemy = World->SpawnActor<ALoombornEnemyBase>(EnemyClass, GetActorLocation() + Offset, GetActorRotation(), SpawnParams))
			{
				Enemy->ApplyFloorDifficultyScaling(HealthMult, DamageMult);
				if (UHealthComponent* EnemyHealth = Enemy->GetHealthComponent())
				{
					EnemyHealth->OnDeath.AddDynamic(this, &ARoomBase::HandleSpawnedEnemyDeath);
					LivingEnemiesCount += 1;
				}
			}
		}
	}
}

void ARoomBase::HandleSpawnedEnemyDeath(AActor* DeadEnemy)
{
	LivingEnemiesCount = FMath::Max(0, LivingEnemiesCount - 1);
	if (LivingEnemiesCount == 0 && RoomState == ERoomState::LockedCombat)
	{
		RoomState = ERoomState::Cleared;
		SetRunicGatesLocked(false);
		if (RoomType == ERoomType::Combat)
		{
			SpawnThreeUniqueRelicPedestals();
		}
		OnRoomCleared.Broadcast(this);
	}
}

void ARoomBase::SetRunicGatesLocked(bool bLocked)
{
	for (AActor* Gate : ConnectedRunicGates)
	{
		if (IsValid(Gate))
		{
			Gate->SetActorHiddenInGame(!bLocked);
			Gate->SetActorEnableCollision(bLocked);
		}
	}
}

void ARoomBase::SpawnThreeUniqueRelicPedestals()
{
	UWorld* World = GetWorld();
	if (!IsValid(World) || !IsValid(ActiveTheme) || !IsValid(ActiveTheme->LoomRelicDataTable) || !IsValid(ActiveTheme->UpgradePedestalClass))
	{
		return;
	}

	TArray<FLoomRelicData*> AllRows;
	ActiveTheme->LoomRelicDataTable->GetAllRows<FLoomRelicData>(TEXT("RollRoomRelics"), AllRows);
	if (AllRows.Num() == 0) return;

	// Select 3 strictly unique rarity-weighted relics
	TArray<FLoomRelicData> ChosenRelics;
	TArray<FLoomRelicData*> Pool = AllRows;
	const int32 DesiredCount = FMath::Min(3, Pool.Num());

	for (int32 Pick = 0; Pick < DesiredCount; ++Pick)
	{
		float TotalWeight = 0.0f;
		for (const FLoomRelicData* Row : Pool)
		{
			TotalWeight += (Row->Rarity == ERelicRarity::Common) ? 60.0f : (Row->Rarity == ERelicRarity::Rare ? 30.0f : 10.0f);
		}
		float Roll = FMath::FRandRange(0.0f, TotalWeight);
		int32 ChosenIdx = 0;
		for (int32 i = 0; i < Pool.Num(); ++i)
		{
			const float W = (Pool[i]->Rarity == ERelicRarity::Common) ? 60.0f : (Pool[i]->Rarity == ERelicRarity::Rare ? 30.0f : 10.0f);
			Roll -= W;
			if (Roll <= 0.0f)
			{
				ChosenIdx = i;
				break;
			}
		}
		ChosenRelics.Add(*Pool[ChosenIdx]);
		Pool.RemoveAtSwap(ChosenIdx);
	}

	FActorSpawnParameters SpawnParams;
	SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

	for (int32 i = 0; i < ChosenRelics.Num(); ++i)
	{
		const float LateralOffset = (i - 1) * 180.0f;
		const FVector SpawnLoc = GetActorLocation() + FVector(0.0f, LateralOffset, 40.0f);
		if (AUpgradePedestal* Pedestal = World->SpawnActor<AUpgradePedestal>(ActiveTheme->UpgradePedestalClass, SpawnLoc, GetActorRotation(), SpawnParams))
		{
			Pedestal->AssignRelic(ChosenRelics[i]);
			Pedestal->OnRelicClaimed.AddDynamic(this, &ARoomBase::HandleRelicPedestalClaimed);
			ActivePedestals.Add(Pedestal);
		}
	}
}

void ARoomBase::HandleRelicPedestalClaimed(AUpgradePedestal* ClaimedPedestal)
{
	// Enforce mutual exclusion: dissolve the other 2 sibling pedestals immediately
	for (AUpgradePedestal* Pedestal : ActivePedestals)
	{
		if (IsValid(Pedestal) && Pedestal != ClaimedPedestal)
		{
			Pedestal->DissolveUnclaimed();
		}
	}
	ActivePedestals.Empty();
}
