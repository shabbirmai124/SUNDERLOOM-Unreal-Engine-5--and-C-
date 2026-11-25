#include "Dungeon/DungeonGenerator.h"
#include "Dungeon/DungeonThemeDataAsset.h"
#include "Dungeon/RoomBase.h"
#include "Core/SunderloomGameMode.h"
#include "Components/ArrowComponent.h"
#include "NavigationSystem.h"
#include "NavMesh/NavMeshBoundsVolume.h"
#include "Kismet/GameplayStatics.h"
#include "Sunderloom.h"

ADungeonGenerator::ADungeonGenerator()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ADungeonGenerator::ClearGeneratedDungeon()
{
	for (ARoomBase* Room : SpawnedRooms)
	{
		if (IsValid(Room)) Room->Destroy();
	}
	for (AActor* Seal : SpawnedSealsAndGates)
	{
		if (IsValid(Seal)) Seal->Destroy();
	}
	SpawnedRooms.Empty();
	SpawnedSealsAndGates.Empty();
	PlacedFootprints.Empty();
	OpenDoorways.Empty();
}

bool ADungeonGenerator::GenerateDungeon(int32 Seed, int32 FloorNumber)
{
	if (!IsValid(ActiveTheme) || !IsValid(ActiveTheme->StartRoomClass))
	{
		UE_LOG(LogSunderloom, Error, TEXT("DungeonGenerator missing ActiveTheme or StartRoomClass."));
		return false;
	}

	const int32 TargetRoomCount = ActiveTheme->BaseTargetRoomCount + (FloorNumber - 1) * ActiveTheme->AdditionalRoomsPerFloor;

	// Automatic Self-Healing: if Boss fails to place or room count falls short, increment seed and regenerate
	for (int32 HealAttempt = 0; HealAttempt < MaxSeedSelfHealAttempts; ++HealAttempt)
	{
		const int32 ActiveSeed = Seed + HealAttempt;
		if (TryGenerateSingleAttempt(ActiveSeed, FloorNumber, TargetRoomCount))
		{
			SealRemainingDoorways();
			RebuildDynamicNavMesh();

			if (SpawnedRooms.Num() > 0 && IsValid(SpawnedRooms[0]))
			{
				if (ASunderloomGameMode* GM = Cast<ASunderloomGameMode>(UGameplayStatics::GetGameMode(this)))
				{
					GM->NotifyDungeonReady(SpawnedRooms[0]->GetPlayerStartTransform());
				}
			}

#if !UE_BUILD_SHIPPING
			UE_LOG(LogSunderloom, Log, TEXT("[Loom Engine] Seed %d | Floor %d | Rooms %d | Watertight Seals %d"),
				ActiveSeed, FloorNumber, SpawnedRooms.Num(), SpawnedSealsAndGates.Num());
#endif
			return true;
		}
		ClearGeneratedDungeon();
	}

	UE_LOG(LogSunderloom, Error, TEXT("[Loom Engine] Exhausted self-heal attempts for base seed %d"), Seed);
	return false;
}

bool ADungeonGenerator::TryGenerateSingleAttempt(int32 Seed, int32 FloorNumber, int32 TargetRoomCount)
{
	ClearGeneratedDungeon();
	UWorld* World = GetWorld();
	if (!IsValid(World)) return false;

	FRandomStream Stream(Seed);

	// 1. Anchor Spawn: Start Room at world origin (0,0,0) with zero rotation
	FActorSpawnParameters SpawnParams;
	SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	ARoomBase* StartRoom = World->SpawnActor<ARoomBase>(ActiveTheme->StartRoomClass, FVector::ZeroVector, FRotator::ZeroRotator, SpawnParams);
	if (!IsValid(StartRoom)) return false;

	StartRoom->InitializeRoomMetadata(ERoomType::Start, 0, FloorNumber, ActiveTheme);
	SpawnedRooms.Add(StartRoom);
	PlacedFootprints.Add(StartRoom->GetWorldFootprintBox(SunderloomMetrics::OverlapShrinkMarginCm));

	for (UArrowComponent* Arrow : StartRoom->GetDoorwayMarkers())
	{
		if (IsValid(Arrow))
		{
			OpenDoorways.Add(FOpenDoorwaySocket{ StartRoom, Arrow, Arrow->GetComponentTransform(), 0 });
		}
	}

	// 2. Controlled Expansion Loop (blending front/back queue selection)
	int32 SafetyIterations = 0;
	while (SpawnedRooms.Num() < TargetRoomCount - 2 && OpenDoorways.Num() > 0 && SafetyIterations < 200)
	{
		++SafetyIterations;
		const bool bPickFront = Stream.FRand() < 0.6f;
		const int32 SocketIdx = bPickFront ? 0 : (OpenDoorways.Num() - 1);
		const FOpenDoorwaySocket CurrentSocket = OpenDoorways[SocketIdx];
		OpenDoorways.RemoveAt(SocketIdx);

		const bool bPreferHallway = (SpawnedRooms.Num() % 2 == 1) && ActiveTheme->HallwayPool.Num() > 0;
		bool bPlaced = false;

		for (int32 Retry = 0; Retry < MaxRoomAttachRetries && !bPlaced; ++Retry)
		{
			const bool bUseHall = (Retry < 5) ? bPreferHallway : !bPreferHallway;
			TSubclassOf<ARoomBase> CandidateClass = bUseHall
				? PickWeightedRoomClass(ActiveTheme->HallwayPool, Stream)
				: PickWeightedRoomClass(ActiveTheme->CombatRoomPool, Stream);

			if (!IsValid(CandidateClass)) continue;

			ARoomBase* NewRoom = nullptr;
			const ERoomType TypeToAssign = bUseHall ? ERoomType::Hallway : ERoomType::Combat;
			if (TryAttachRoomToSocket(CurrentSocket, CandidateClass, TypeToAssign, FloorNumber, NewRoom))
			{
				bPlaced = true;
			}
		}

		// If no room fit, put socket back so SealRemainingDoorways caps it watertight
		if (!bPlaced)
		{
			OpenDoorways.Add(CurrentSocket);
		}
	}

	if (SpawnedRooms.Num() < ActiveTheme->MinValidRoomCount - 1)
	{
		return false;
	}

	// 3. Guaranteed Boss Room Placement at highest Graph Depth open doorway
	OpenDoorways.Sort([](const FOpenDoorwaySocket& A, const FOpenDoorwaySocket& B)
	{
		return A.ParentGraphDepth > B.ParentGraphDepth;
	});

	bool bBossPlaced = false;
	if (IsValid(ActiveTheme->BossRoomClass))
	{
		for (int32 i = 0; i < OpenDoorways.Num(); ++i)
		{
			ARoomBase* BossRoom = nullptr;
			if (TryAttachRoomToSocket(OpenDoorways[i], ActiveTheme->BossRoomClass, ERoomType::Boss, FloorNumber, BossRoom))
			{
				OpenDoorways.RemoveAt(i);
				bBossPlaced = true;
				break;
			}
		}
	}

	if (!bBossPlaced)
	{
		return false;
	}

	// 4. Optional Mid-Depth Treasure Room Placement
	if (IsValid(ActiveTheme->TreasureRoomClass) && OpenDoorways.Num() > 0)
	{
		const int32 MidIdx = OpenDoorways.Num() / 2;
		ARoomBase* TreasureRoom = nullptr;
		if (TryAttachRoomToSocket(OpenDoorways[MidIdx], ActiveTheme->TreasureRoomClass, ERoomType::Treasure, FloorNumber, TreasureRoom))
		{
			OpenDoorways.RemoveAt(MidIdx);
		}
	}

	return true;
}

FTransform ADungeonGenerator::ComputeAlignedRoomTransform(const FTransform& TargetDoorWorld, const FTransform& CandidateDoorLocal) const
{
	// Align candidate doorway Z-rotation exactly 180 degrees opposite to target open doorway
	const float TargetYaw = TargetDoorWorld.Rotator().Yaw;
	const float CandidateLocalYaw = CandidateDoorLocal.Rotator().Yaw;
	const float RequiredRoomYaw = FMath::UnwindDegrees(TargetYaw + 180.0f - CandidateLocalYaw);
	const FRotator RoomRotation(0.0f, RequiredRoomYaw, 0.0f);

	// Translate room so both doorway centers meet flush with zero gap
	const FVector RotatedDoorOffset = RoomRotation.RotateVector(CandidateDoorLocal.GetLocation());
	const FVector RoomLocation = TargetDoorWorld.GetLocation() - RotatedDoorOffset;

	return FTransform(RoomRotation, RoomLocation, FVector::OneVector);
}

bool ADungeonGenerator::TryAttachRoomToSocket(const FOpenDoorwaySocket& TargetSocket, TSubclassOf<ARoomBase> CandidateClass, ERoomType AssignedType, int32 FloorNumber, ARoomBase*& OutSpawnedRoom)
{
	UWorld* World = GetWorld();
	if (!IsValid(World) || !IsValid(CandidateClass)) return false;

	FActorSpawnParameters SpawnParams;
	SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	ARoomBase* TempRoom = World->SpawnActor<ARoomBase>(CandidateClass, FVector(0.0f, 0.0f, -10000.0f), FRotator::ZeroRotator, SpawnParams);
	if (!IsValid(TempRoom)) return false;

	const TArray<UArrowComponent*> CandidateDoors = TempRoom->GetDoorwayMarkers();
	for (UArrowComponent* EntryDoor : CandidateDoors)
	{
		if (!IsValid(EntryDoor)) continue;

		const FTransform CandidateDoorLocal = EntryDoor->GetRelativeTransform();
		const FTransform AlignedTransform = ComputeAlignedRoomTransform(TargetSocket.WorldTransform, CandidateDoorLocal);
		TempRoom->SetActorTransform(AlignedTransform, false, nullptr, ETeleportType::TeleportPhysics);

		const FBox ShrunkFootprint = TempRoom->GetWorldFootprintBox(SunderloomMetrics::OverlapShrinkMarginCm);
		if (!HasFootprintOverlap(ShrunkFootprint))
		{
			TempRoom->InitializeRoomMetadata(AssignedType, TargetSocket.ParentGraphDepth + 1, FloorNumber, ActiveTheme);
			SpawnedRooms.Add(TempRoom);
			PlacedFootprints.Add(ShrunkFootprint);

			// Spawn lockable Runic Gate at the stitched seam if either room is Combat/Boss
			if (IsValid(ActiveTheme->RunicGateClass))
			{
				if (AActor* Gate = World->SpawnActor<AActor>(ActiveTheme->RunicGateClass, TargetSocket.WorldTransform, SpawnParams))
				{
					SpawnedSealsAndGates.Add(Gate);
					if (IsValid(TargetSocket.OwnerRoom)) TargetSocket.OwnerRoom->RegisterRunicGate(Gate);
					TempRoom->RegisterRunicGate(Gate);
				}
			}

			// Push all remaining unconnected doorways of the new room into OpenDoorways
			for (UArrowComponent* OtherDoor : CandidateDoors)
			{
				if (IsValid(OtherDoor) && OtherDoor != EntryDoor)
				{
					OpenDoorways.Add(FOpenDoorwaySocket{
						TempRoom,
						OtherDoor,
						OtherDoor->GetComponentTransform(),
						TempRoom->GetGraphDepth()
					});
				}
			}

			OutSpawnedRoom = TempRoom;
			return true;
		}
	}

	TempRoom->Destroy();
	return false;
}

bool ADungeonGenerator::HasFootprintOverlap(const FBox& ProposedWorldBox) const
{
	for (const FBox& Existing : PlacedFootprints)
	{
		if (ProposedWorldBox.Intersect(Existing))
		{
			return true;
		}
	}
	return false;
}

TSubclassOf<ARoomBase> ADungeonGenerator::PickWeightedRoomClass(const TArray<FWeightedRoomEntry>& Pool, FRandomStream& Stream) const
{
	if (Pool.Num() == 0) return nullptr;
	float TotalWeight = 0.0f;
	for (const FWeightedRoomEntry& Entry : Pool) TotalWeight += Entry.Weight;

	float Roll = Stream.FRandRange(0.0f, TotalWeight);
	for (const FWeightedRoomEntry& Entry : Pool)
	{
		Roll -= Entry.Weight;
		if (Roll <= 0.0f) return Entry.RoomClass;
	}
	return Pool[0].RoomClass;
}

void ADungeonGenerator::SealRemainingDoorways()
{
	UWorld* World = GetWorld();
	if (!IsValid(World) || !IsValid(ActiveTheme) || !IsValid(ActiveTheme->DoorwayWallCapClass))
	{
		return;
	}

	FActorSpawnParameters SpawnParams;
	SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	for (const FOpenDoorwaySocket& OpenSocket : OpenDoorways)
	{
		if (AActor* Cap = World->SpawnActor<AActor>(ActiveTheme->DoorwayWallCapClass, OpenSocket.WorldTransform, SpawnParams))
		{
			SpawnedSealsAndGates.Add(Cap);
		}
	}
	OpenDoorways.Empty();
}

void ADungeonGenerator::RebuildDynamicNavMesh()
{
	UWorld* World = GetWorld();
	if (!IsValid(World) || PlacedFootprints.Num() == 0) return;

	FBox CombinedBounds(ForceInit);
	for (const FBox& RoomBox : PlacedFootprints)
	{
		CombinedBounds += RoomBox;
	}
	CombinedBounds = CombinedBounds.ExpandBy(SunderloomMetrics::NavMeshBufferMarginCm);

	if (ANavMeshBoundsVolume* NavVolume = Cast<ANavMeshBoundsVolume>(UGameplayStatics::GetActorOfClass(World, ANavMeshBoundsVolume::StaticClass())))
	{
		NavVolume->SetActorLocation(CombinedBounds.GetCenter());
		const FVector DesiredExtent = CombinedBounds.GetExtent();
		NavVolume->SetActorScale3D(DesiredExtent / 100.0f);
	}

	if (UNavigationSystemV1* NavSys = FNavigationSystem::GetCurrent<UNavigationSystemV1>(World))
	{
		NavSys->OnNavigationBoundsUpdated(Cast<ANavMeshBoundsVolume>(UGameplayStatics::GetActorOfClass(World, ANavMeshBoundsVolume::StaticClass())));
		NavSys->Build();
	}
}

#if !UE_BUILD_SHIPPING
FDungeonStressTestResult ADungeonGenerator::RunFiftySeedStressTest(int32 StartingSeed, int32 FloorNumber)
{
	FDungeonStressTestResult Result;
	Result.TotalSeedsTested = 50;

	for (int32 i = 0; i < 50; ++i)
	{
		if (GenerateDungeon(StartingSeed + i * 37, FloorNumber))
		{
			Result.PassedSeeds += 1;
			Result.BossRoomsPlaced += 1;
			Result.TotalUnsealedDoorways += OpenDoorways.Num();
		}
	}
	return Result;
}
#endif
