#include "Components/HealthComponent.h"
#include "Components/MeshComponent.h"
#include "Perception/AISense_Damage.h"
#include "Kismet/GameplayStatics.h"
#include "TimerManager.h"
#include "Sunderloom.h"

UHealthComponent::UHealthComponent()
{
	// Law 2: Zero-Tick Gameplay Mandate
	PrimaryComponentTick.bCanEverTick = false;
}

void UHealthComponent::BeginPlay()
{
	Super::BeginPlay();

	CurrentHealth = MaxHealth;
	bIsDead = false;

	AActor* Owner = GetOwner();
	if (IsValid(Owner))
	{
		Owner->OnTakeAnyDamage.AddDynamic(this, &UHealthComponent::HandleOwnerTakeAnyDamage);

		// Prepare dynamic material instances for 0.12s emissive HitFlash decay
		TArray<UMeshComponent*> Meshes;
		Owner->GetComponents<UMeshComponent>(Meshes);
		for (UMeshComponent* Mesh : Meshes)
		{
			if (!IsValid(Mesh)) continue;
			const int32 MatCount = Mesh->GetNumMaterials();
			for (int32 i = 0; i < MatCount; ++i)
			{
				if (UMaterialInstanceDynamic* MID = Mesh->CreateAndSetMaterialInstanceDynamic(i))
				{
					DynamicMaterials.Add(MID);
				}
			}
		}
	}

	OnHealthChanged.Broadcast(CurrentHealth, MaxHealth, 0.0f);
}

void UHealthComponent::SetMaxHealth(float NewMaxHealth, bool bHealDifference)
{
	const float ClampedNewMax = FMath::Max(1.0f, NewMaxHealth);
	const float DeltaMax = ClampedNewMax - MaxHealth;
	MaxHealth = ClampedNewMax;

	if (bHealDifference && DeltaMax > 0.0f && !bIsDead)
	{
		CurrentHealth = FMath::Clamp(CurrentHealth + DeltaMax, 0.0f, MaxHealth);
	}
	else
	{
		CurrentHealth = FMath::Clamp(CurrentHealth, 0.0f, MaxHealth);
	}

	OnHealthChanged.Broadcast(CurrentHealth, MaxHealth, DeltaMax);
}

void UHealthComponent::SetCurrentHealthExact(float NewHealth)
{
	if (bIsDead) return;
	const float Previous = CurrentHealth;
	CurrentHealth = FMath::Clamp(NewHealth, 1.0f, MaxHealth);
	OnHealthChanged.Broadcast(CurrentHealth, MaxHealth, CurrentHealth - Previous);
}

void UHealthComponent::SetInvulnerable(bool bNewInvulnerable)
{
	bIsInvulnerable = bNewInvulnerable;
}

void UHealthComponent::HandleOwnerTakeAnyDamage(AActor* DamagedActor, float Damage, const UDamageType* DamageType, AController* InstigatedBy, AActor* DamageCauser)
{
	const FVector HitLoc = IsValid(DamagedActor) ? DamagedActor->GetActorLocation() : FVector::ZeroVector;
	ApplyUnifiedDamage(Damage, HitLoc, DamageCauser, false, false);
}

void UHealthComponent::ApplyUnifiedDamage(float RawDamage, const FVector& HitLocation, AActor* DamageCauser, bool bIsHeavyHit, bool bIsCritical)
{
	// Strict pipeline order: reject if Dead, Invulnerable, or non-positive damage
	if (bIsDead || bIsInvulnerable || RawDamage <= 0.0f)
	{
		return;
	}

	float RemainingDamage = RawDamage;

	// Absorb through Shield first
	if (CurrentShield > 0.0f)
	{
		const float Absorbed = FMath::Min(CurrentShield, RemainingDamage);
		CurrentShield -= Absorbed;
		RemainingDamage -= Absorbed;
	}

	const float PreviousHealth = CurrentHealth;
	CurrentHealth = FMath::Clamp(CurrentHealth - RemainingDamage, 0.0f, MaxHealth);
	const float HealthDelta = CurrentHealth - PreviousHealth;

	// Report Damage Perception Event so ambushed Loomborn immediately turn and engage
	if (UWorld* World = GetWorld())
	{
		if (AActor* Owner = GetOwner())
		{
			UAISense_Damage::ReportDamageEvent(World, Owner, DamageCauser, RawDamage, HitLocation, HitLocation);
		}
	}

	TriggerHitFlash();

	OnHealthChanged.Broadcast(CurrentHealth, MaxHealth, HealthDelta);
	OnDamageTaken.Broadcast(RawDamage, HitLocation, DamageCauser, bIsCritical);

	if (CurrentHealth <= 0.0f)
	{
		bIsDead = true;
		TriggerHitStop(0.070f); // 70ms killing blow Hit-Stop
		OnDeath.Broadcast(GetOwner());
	}
	else if (bIsHeavyHit || bIsCritical)
	{
		TriggerHitStop(0.045f); // 45ms heavy strike Hit-Stop
	}
}

void UHealthComponent::TriggerHitFlash()
{
	CurrentHitFlashAlpha = 1.0f;
	for (UMaterialInstanceDynamic* MID : DynamicMaterials)
	{
		if (IsValid(MID))
		{
			MID->SetScalarParameterValue(HitFlashParamName, 1.0f);
		}
	}

	if (UWorld* World = GetWorld())
	{
		World->GetTimerManager().SetTimer(HitFlashTimerHandle, this, &UHealthComponent::UpdateHitFlashDecay, 0.02f, true);
	}
}

void UHealthComponent::UpdateHitFlashDecay()
{
	CurrentHitFlashAlpha = FMath::Max(0.0f, CurrentHitFlashAlpha - (0.02f / 0.12f));
	for (UMaterialInstanceDynamic* MID : DynamicMaterials)
	{
		if (IsValid(MID))
		{
			MID->SetScalarParameterValue(HitFlashParamName, CurrentHitFlashAlpha);
		}
	}

	if (CurrentHitFlashAlpha <= 0.0f)
	{
		if (UWorld* World = GetWorld())
		{
			World->GetTimerManager().ClearTimer(HitFlashTimerHandle);
		}
	}
}

void UHealthComponent::TriggerHitStop(float DurationSeconds)
{
	UWorld* World = GetWorld();
	if (!IsValid(World)) return;

	UGameplayStatics::SetGlobalTimeDilation(World, 0.05f);
	// Scale timer delay by time dilation so real-time duration stays accurate (45ms or 70ms)
	World->GetTimerManager().SetTimer(HitStopTimerHandle, this, &UHealthComponent::RestoreTimeDilation, DurationSeconds * 0.05f, false);
}

void UHealthComponent::RestoreTimeDilation()
{
	if (UWorld* World = GetWorld())
	{
		UGameplayStatics::SetGlobalTimeDilation(World, 1.0f);
	}
}
