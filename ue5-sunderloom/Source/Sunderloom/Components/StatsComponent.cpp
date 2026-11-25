#include "Components/StatsComponent.h"
#include "Components/HealthComponent.h"
#include "GameFramework/Character.h"
#include "GameFramework/CharacterMovementComponent.h"

UStatsComponent::UStatsComponent()
{
	PrimaryComponentTick.bCanEverTick = false;

	// Default Warden baseline stats
	StatTable.Add(EStatType::MaxHealth,     FStatValue{ 120.0f, 120.0f });
	StatTable.Add(EStatType::MoveSpeed,     FStatValue{ 600.0f, 600.0f });
	StatTable.Add(EStatType::MeleeDamage,   FStatValue{ 24.0f,  24.0f });
	StatTable.Add(EStatType::RangedDamage,  FStatValue{ 18.0f,  18.0f });
	StatTable.Add(EStatType::AttackSpeed,   FStatValue{ 1.0f,   1.0f });
	StatTable.Add(EStatType::CritChance,    FStatValue{ 0.10f,  0.10f });
	StatTable.Add(EStatType::DodgeCooldown, FStatValue{ 0.90f,  0.90f });
}

void UStatsComponent::BeginPlay()
{
	Super::BeginPlay();
	RecalculateAllStats();
}

void UStatsComponent::AddRelic(const FLoomRelicData& Relic)
{
	AcquiredRelics.Add(Relic);
	RecalculateAllStats();
}

void UStatsComponent::RestoreRelicsFromRunState(const TArray<FLoomRelicData>& SavedRelics)
{
	AcquiredRelics = SavedRelics;
	RecalculateAllStats();
}

void UStatsComponent::RecalculateAllStats()
{
	// Deterministic formula strictly enforced:
	// FinalStat = (BaseStat + Sum of Flat Additions) * (1.0 + Sum of Percentage Multipliers)
	for (TPair<EStatType, FStatValue>& Pair : StatTable)
	{
		const EStatType StatType = Pair.Key;
		float SumFlat = 0.0f;
		float SumPercent = 0.0f;

		for (const FLoomRelicData& Relic : AcquiredRelics)
		{
			if (Relic.TargetStat == StatType)
			{
				if (Relic.ModifierType == EModifierType::FlatAdd)
				{
					SumFlat += Relic.ModifierValue;
				}
				else
				{
					SumPercent += Relic.ModifierValue;
				}
			}
		}

		float FinalValue = (Pair.Value.BaseValue + SumFlat) * FMath::Max(0.15f, 1.0f + SumPercent);
		if (StatType == EStatType::CritChance)
		{
			FinalValue = FMath::Clamp(FinalValue, 0.0f, 0.95f);
		}
		else if (StatType == EStatType::DodgeCooldown)
		{
			FinalValue = FMath::Max(0.25f, FinalValue);
		}

		Pair.Value.ModifiedValue = FinalValue;
		OnStatRecalculated.Broadcast(StatType, FinalValue);
	}

	// Push recalculated MaxHealth and MoveSpeed immediately to sibling components
	if (AActor* Owner = GetOwner())
	{
		if (UHealthComponent* HealthComp = Owner->FindComponentByClass<UHealthComponent>())
		{
			HealthComp->SetMaxHealth(GetFinalStat(EStatType::MaxHealth), true);
		}
		if (ACharacter* OwnerChar = Cast<ACharacter>(Owner))
		{
			if (UCharacterMovementComponent* MoveComp = OwnerChar->GetCharacterMovement())
			{
				MoveComp->MaxWalkSpeed = GetFinalStat(EStatType::MoveSpeed);
			}
		}
	}
}

float UStatsComponent::GetFinalStat(EStatType StatType) const
{
	if (const FStatValue* Found = StatTable.Find(StatType))
	{
		return Found->ModifiedValue;
	}
	return 0.0f;
}
