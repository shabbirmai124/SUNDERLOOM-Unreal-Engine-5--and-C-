#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "SunderloomTypes.generated.h"

UENUM(BlueprintType)
enum class EFactionID : uint8
{
	Player      UMETA(DisplayName = "Player"),
	Loomborn    UMETA(DisplayName = "Loomborn"),
	NeutralProp UMETA(DisplayName = "Neutral Prop")
};

UENUM(BlueprintType)
enum class ECameraViewPreset : uint8
{
	ThirdPerson UMETA(DisplayName = "3rd Person (Running)"),
	FirstPerson UMETA(DisplayName = "First Person (FPS / Valorant)"),
	TopDown     UMETA(DisplayName = "Top-Down Tactical"),
	Cinematic   UMETA(DisplayName = "Cinematic Dark Fantasy")
};

UENUM(BlueprintType)
enum class ECombatState : uint8
{
	Idle      UMETA(DisplayName = "Idle"),
	Windup    UMETA(DisplayName = "Windup"),
	Active    UMETA(DisplayName = "Active"),
	Recovery  UMETA(DisplayName = "Recovery"),
	Dodging   UMETA(DisplayName = "Dodging"),
	Staggered UMETA(DisplayName = "Staggered"),
	Dead      UMETA(DisplayName = "Dead")
};

UENUM(BlueprintType)
enum class ERoomType : uint8
{
	Start    UMETA(DisplayName = "Start Room"),
	Hallway  UMETA(DisplayName = "Hallway Connector"),
	Combat   UMETA(DisplayName = "Combat Room"),
	Treasure UMETA(DisplayName = "Treasure Room"),
	Boss     UMETA(DisplayName = "Boss Room")
};

UENUM(BlueprintType)
enum class ERoomState : uint8
{
	Dormant      UMETA(DisplayName = "Dormant"),
	LockedCombat UMETA(DisplayName = "Locked Combat"),
	Cleared      UMETA(DisplayName = "Cleared")
};

UENUM(BlueprintType)
enum class EEnemyArchetype : uint8
{
	ThreadlingRusher UMETA(DisplayName = "Threadling Rusher"),
	SpireArcanist    UMETA(DisplayName = "Spire Arcanist"),
	IroncladLoomguard UMETA(DisplayName = "Ironclad Loomguard"),
	WeaverWardenBoss UMETA(DisplayName = "The Weaver-Warden")
};

UENUM(BlueprintType)
enum class EStatType : uint8
{
	MaxHealth     UMETA(DisplayName = "Max Health"),
	MoveSpeed     UMETA(DisplayName = "Move Speed"),
	MeleeDamage   UMETA(DisplayName = "Melee Damage"),
	RangedDamage  UMETA(DisplayName = "Ranged Damage"),
	AttackSpeed   UMETA(DisplayName = "Attack Speed"),
	CritChance    UMETA(DisplayName = "Crit Chance"),
	DodgeCooldown UMETA(DisplayName = "Dodge Cooldown")
};

UENUM(BlueprintType)
enum class EModifierType : uint8
{
	FlatAdd       UMETA(DisplayName = "Flat Addition"),
	PercentMult   UMETA(DisplayName = "Percentage Multiplier")
};

UENUM(BlueprintType)
enum class ERelicRarity : uint8
{
	Common UMETA(DisplayName = "Common"),
	Rare   UMETA(DisplayName = "Rare"),
	Epic   UMETA(DisplayName = "Epic")
};

USTRUCT(BlueprintType)
struct FStatValue
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Stats")
	float BaseValue = 0.0f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Stats")
	float ModifiedValue = 0.0f;
};

USTRUCT(BlueprintType)
struct FLoomRelicData : public FTableRowBase
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Relic")
	FName RelicID = NAME_None;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Relic")
	FText DisplayName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Relic")
	FText Description;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Relic")
	TObjectPtr<UTexture2D> Icon = nullptr;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Relic")
	ERelicRarity Rarity = ERelicRarity::Common;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Relic")
	EStatType TargetStat = EStatType::MeleeDamage;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Relic")
	EModifierType ModifierType = EModifierType::PercentMult;

	UPROPERTY(EditAnywhere, BlueprintReadOnly, Category = "Relic")
	float ModifierValue = 0.15f;
};

USTRUCT(BlueprintType)
struct FActiveRunState
{
	GENERATED_BODY()

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Run")
	int32 CurrentFloor = 1;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Run")
	float SavedRunHealth = -1.0f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Run")
	TArray<FLoomRelicData> AcquiredRelicsList;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Run")
	int32 PendingAetherThreads = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Run")
	int32 RunKills = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Run")
	int32 ActiveSeed = 0;

	void Reset()
	{
		CurrentFloor = 1;
		SavedRunHealth = -1.0f;
		AcquiredRelicsList.Empty();
		PendingAetherThreads = 0;
		RunKills = 0;
		ActiveSeed = 0;
	}
};

USTRUCT(BlueprintType)
struct FDungeonStressTestResult
{
	GENERATED_BODY()

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "StressTest")
	int32 TotalSeedsTested = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "StressTest")
	int32 PassedSeeds = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "StressTest")
	int32 TotalOverlapsDetected = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "StressTest")
	int32 TotalUnsealedDoorways = 0;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "StressTest")
	int32 BossRoomsPlaced = 0;
};
