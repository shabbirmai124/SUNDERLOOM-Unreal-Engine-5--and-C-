#include "Character/LoombornEnemyBase.h"
#include "Components/HealthComponent.h"
#include "Components/CombatComponent.h"
#include "Components/CapsuleComponent.h"
#include "Core/SunderloomGameInstance.h"
#include "Core/SunderloomGameMode.h"
#include "AI/EnemyAIController.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "Kismet/GameplayStatics.h"
#include "TimerManager.h"

ALoombornEnemyBase::ALoombornEnemyBase()
{
	PrimaryActorTick.bCanEverTick = false;

	AIControllerClass = AEnemyAIController::StaticClass();
	AutoPossessAI = EAutoPossessAI::PlacedInWorldOrSpawned;

	HealthComponent = CreateDefaultSubobject<UHealthComponent>(TEXT("HealthComponent"));
	CombatComponent = CreateDefaultSubobject<UCombatComponent>(TEXT("CombatComponent"));

	GetCharacterMovement()->bOrientRotationToMovement = true;
	GetCharacterMovement()->RotationRate = FRotator(0.0f, 540.0f, 0.0f);
}

void ALoombornEnemyBase::BeginPlay()
{
	Super::BeginPlay();

	// Configure baseline metrics per Loomborn archetype
	switch (Archetype)
	{
	case EEnemyArchetype::ThreadlingRusher:
		GetCharacterMovement()->MaxWalkSpeed = 540.0f;
		PreferredAttackRange = 190.0f;
		TelegraphWindupSeconds = 0.42f;
		AetherThreadReward = 12;
		break;
	case EEnemyArchetype::SpireArcanist:
		GetCharacterMovement()->MaxWalkSpeed = 380.0f;
		PreferredAttackRange = 1150.0f;
		TelegraphWindupSeconds = 0.60f;
		AetherThreadReward = 18;
		break;
	case EEnemyArchetype::IroncladLoomguard:
		GetCharacterMovement()->MaxWalkSpeed = 290.0f;
		PreferredAttackRange = 260.0f;
		TelegraphWindupSeconds = 0.78f;
		AetherThreadReward = 25;
		break;
	case EEnemyArchetype::WeaverWardenBoss:
		GetCharacterMovement()->MaxWalkSpeed = 420.0f;
		PreferredAttackRange = 300.0f;
		TelegraphWindupSeconds = 0.65f;
		AetherThreadReward = 120;
		break;
	}

	if (IsValid(HealthComponent))
	{
		HealthComponent->OnHealthChanged.AddDynamic(this, &ALoombornEnemyBase::HandleHealthChanged);
		HealthComponent->OnDeath.AddDynamic(this, &ALoombornEnemyBase::HandleEnemyDeath);
	}
}

void ALoombornEnemyBase::ApplyFloorDifficultyScaling(float HealthMultiplier, float DamageMultiplier)
{
	ScaledDamageMultiplier = FMath::Max(0.5f, DamageMultiplier);
	if (IsValid(HealthComponent))
	{
		HealthComponent->SetMaxHealth(HealthComponent->GetMaxHealth() * FMath::Max(0.5f, HealthMultiplier), true);
	}
}

void ALoombornEnemyBase::ExecuteTelegraphedAttack(AActor* TargetActor)
{
	if (IsCombatDead() || !IsValid(TargetActor))
	{
		return;
	}

	PendingAttackTarget = TargetActor;
	const FVector LookDir = (TargetActor->GetActorLocation() - GetActorLocation()).GetSafeNormal2D();
	if (!LookDir.IsNearlyZero())
	{
		SetActorRotation(LookDir.Rotation());
	}

	if (IsValid(CombatComponent))
	{
		CombatComponent->SetCombatState(ECombatState::Windup);
	}

	// Enforce 0.4 to 0.8s fair telegraph windup before striking (faster in Boss Phase 2)
	const float ActualWindup = (IsBoss() && BossPhase >= 2) ? (TelegraphWindupSeconds * 0.75f) : TelegraphWindupSeconds;
	if (UWorld* World = GetWorld())
	{
		World->GetTimerManager().SetTimer(TelegraphTimerHandle, this, &ALoombornEnemyBase::FinishTelegraphAndStrike, ActualWindup, false);
	}
}

void ALoombornEnemyBase::FinishTelegraphAndStrike()
{
	if (IsCombatDead() || !IsValid(CombatComponent))
	{
		return;
	}

	if (Archetype == EEnemyArchetype::SpireArcanist)
	{
		CombatComponent->RequestRuneLance();
	}
	else if (Archetype == EEnemyArchetype::IroncladLoomguard)
	{
		CombatComponent->RequestHeavyAttack();
	}
	else
	{
		CombatComponent->RequestLightAttack();
	}
}

void ALoombornEnemyBase::HandleHealthChanged(float CurrentHealth, float MaxHealth, float Delta)
{
	// Weaver-Warden Boss Phase 2 transition at <= 50% HP with 2-second invulnerable roar
	if (IsBoss() && BossPhase == 1 && MaxHealth > 0.0f && (CurrentHealth / MaxHealth) <= 0.50f && !IsCombatDead())
	{
		BossPhase = 2;
		if (IsValid(HealthComponent))
		{
			HealthComponent->SetInvulnerable(true);
		}
		if (IsValid(BossPhaseTwoRoarMontage))
		{
			PlayAnimMontage(BossPhaseTwoRoarMontage);
		}
		GetCharacterMovement()->MaxWalkSpeed *= 1.22f;
		OnBossPhaseChanged.Broadcast(BossPhase);

		if (UWorld* World = GetWorld())
		{
			World->GetTimerManager().SetTimer(BossRoarTimerHandle, this, &ALoombornEnemyBase::CompleteBossPhaseTwoRoar, 2.0f, false);
		}
	}
}

void ALoombornEnemyBase::CompleteBossPhaseTwoRoar()
{
	if (IsValid(HealthComponent))
	{
		HealthComponent->SetInvulnerable(false);
	}
}

void ALoombornEnemyBase::HandleEnemyDeath(AActor* DeadActor)
{
	if (IsValid(CombatComponent))
	{
		CombatComponent->SetCombatState(ECombatState::Dead);
	}
	if (IsValid(GetCapsuleComponent()))
	{
		GetCapsuleComponent()->SetCollisionEnabled(ECollisionEnabled::NoCollision);
	}

	if (USunderloomGameInstance* GI = Cast<USunderloomGameInstance>(GetGameInstance()))
	{
		GI->RecordEnemyKill(AetherThreadReward);
	}

	if (IsBoss())
	{
		if (ASunderloomGameMode* GM = Cast<ASunderloomGameMode>(UGameplayStatics::GetGameMode(this)))
		{
			GM->NotifyBossDefeated(GetActorLocation());
		}
	}

	SetLifeSpan(2.5f);
}

bool ALoombornEnemyBase::IsCombatDead() const
{
	return IsValid(HealthComponent) ? HealthComponent->IsDead() : true;
}

void ALoombornEnemyBase::ApplyHitReaction(const FVector& HitDirection, float PoiseDamage, bool bIsHeavyHit)
{
	if (IsValid(CombatComponent))
	{
		CombatComponent->ApplyPoiseDamage(PoiseDamage, HitDirection);
	}
}
