#include "Components/CombatComponent.h"
#include "Components/HealthComponent.h"
#include "Components/StatsComponent.h"
#include "Components/RuneProjectile.h"
#include "Core/CombatInterface.h"
#include "Core/SunderloomPlayerController.h"
#include "GameFramework/Character.h"
#include "Components/SkeletalMeshComponent.h"
#include "Animation/AnimInstance.h"
#include "TimerManager.h"
#include "Sunderloom.h"

UCombatComponent::UCombatComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void UCombatComponent::BeginPlay()
{
	Super::BeginPlay();
	CurrentPoise = MaxPoise;
}

void UCombatComponent::SetCombatState(ECombatState NewState)
{
	if (CombatState == NewState) return;
	CombatState = NewState;
	OnCombatStateChanged.Broadcast(CombatState);
}

void UCombatComponent::RequestLightAttack()
{
	if (CombatState == ECombatState::Dead || CombatState == ECombatState::Staggered || CombatState == ECombatState::Dodging)
	{
		return;
	}

	// Input buffering during Active or Recovery chains cleanly at the Combo Window Notify
	if (CombatState == ECombatState::Active || CombatState == ECombatState::Recovery)
	{
		bBufferNextAttack = true;
		return;
	}

	if (CombatState == ECombatState::Idle)
	{
		ComboIndex = 0;
		ExecuteComboStep(ComboIndex, false);
	}
}

void UCombatComponent::RequestHeavyAttack()
{
	if (CombatState != ECombatState::Idle)
	{
		return;
	}
	ExecuteComboStep(2, true);
}

void UCombatComponent::RequestRuneLance()
{
	UWorld* World = GetWorld();
	if (!IsValid(World) || CombatState == ECombatState::Dead || CombatState == ECombatState::Staggered || CombatState == ECombatState::Dodging)
	{
		return;
	}

	if (World->GetTimeSeconds() - LastRuneLanceTime < RuneLanceCooldown)
	{
		return;
	}

	LastRuneLanceTime = World->GetTimeSeconds();
	SpawnRuneProjectileFromAim(1.25f);
}

void UCombatComponent::AddSuperCharge(float Amount)
{
	const float Next = FMath::Clamp(SuperCharge + Amount, 0.0f, 100.0f);
	if (!FMath::IsNearlyEqual(Next, SuperCharge))
	{
		SuperCharge = Next;
		OnSuperChargeChanged.Broadcast(SuperCharge);
	}
}

void UCombatComponent::RequestAetherSuper()
{
	UWorld* World = GetWorld();
	AActor* Owner = GetOwner();
	if (!IsValid(World) || !IsValid(Owner) || CombatState == ECombatState::Dead || SuperCharge < 100.0f)
	{
		return;
	}

	SuperCharge = 0.0f;
	OnSuperChargeChanged.Broadcast(SuperCharge);

	float BaseDamage = 24.0f;
	if (UStatsComponent* Stats = Owner->FindComponentByClass<UStatsComponent>())
	{
		BaseDamage = Stats->GetFinalStat(EStatType::MeleeDamage);
	}
	const float NovaDamage = BaseDamage * 3.2f;

	const ICombatInterface* OwnerCombat = Cast<ICombatInterface>(Owner);
	const EFactionID OwnerFaction = OwnerCombat ? OwnerCombat->GetFactionID() : EFactionID::Player;

	// Radial Sunder Nova Shockwave Sweep
	TArray<FOverlapResult> Overlaps;
	FCollisionQueryParams Params;
	Params.AddIgnoredActor(Owner);
	World->OverlapMultiByChannel(
		Overlaps,
		Owner->GetActorLocation(),
		FQuat::Identity,
		ECC_WeaponTrace,
		FCollisionShape::MakeSphere(SuperNovaRadiusCm),
		Params);

	TSet<AActor*> DamagedActors;
	for (const FOverlapResult& Res : Overlaps)
	{
		AActor* HitActor = Res.GetActor();
		if (!IsValid(HitActor) || DamagedActors.Contains(HitActor)) continue;
		ICombatInterface* TargetCombat = Cast<ICombatInterface>(HitActor);
		if (!TargetCombat || TargetCombat->IsCombatDead() || TargetCombat->GetFactionID() == OwnerFaction) continue;

		DamagedActors.Add(HitActor);
		if (UHealthComponent* TargetHealth = TargetCombat->GetHealthComponent())
		{
			TargetHealth->ApplyUnifiedDamage(NovaDamage, HitActor->GetActorLocation(), Owner, true, true);
		}
		const FVector PushDir = (HitActor->GetActorLocation() - Owner->GetActorLocation()).GetSafeNormal2D();
		TargetCombat->ApplyHitReaction(PushDir, 100.0f, true);
	}

	SpawnRadialSuperBolts();

	if (ACharacter* OwnerChar = Cast<ACharacter>(Owner))
	{
		if (ASunderloomPlayerController* PC = Cast<ASunderloomPlayerController>(OwnerChar->GetController()))
		{
			PC->TriggerScaledCameraShake(true, 1.85f);
		}
	}
}

bool UCombatComponent::TryCancelIntoDodge()
{
	// Dodge-canceling permitted out of Idle or Recovery frames
	if (CombatState == ECombatState::Idle || CombatState == ECombatState::Recovery)
	{
		if (UWorld* World = GetWorld())
		{
			World->GetTimerManager().ClearTimer(AttackRecoveryTimerHandle);
		}
		bBufferNextAttack = false;
		ComboIndex = 0;
		EndWeaponSweep();
		SetCombatState(ECombatState::Dodging);
		return true;
	}
	return false;
}

void UCombatComponent::ExecuteComboStep(int32 StepIndex, bool bHeavy)
{
	bBufferNextAttack = false;
	bCurrentAttackIsHeavy = bHeavy || (StepIndex >= 2);
	SetCombatState(ECombatState::Windup);

	ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
	float AttackSpeedMult = 1.0f;
	if (IsValid(OwnerChar))
	{
		if (UStatsComponent* Stats = OwnerChar->FindComponentByClass<UStatsComponent>())
		{
			AttackSpeedMult = FMath::Max(0.4f, Stats->GetFinalStat(EStatType::AttackSpeed));
		}

		UAnimMontage* MontageToPlay = bHeavy
			? HeavyAttackMontage.Get()
			: (LightComboMontages.IsValidIndex(StepIndex) ? LightComboMontages[StepIndex].Get() : nullptr);

		float MontageDuration = 0.55f / AttackSpeedMult;
		if (IsValid(MontageToPlay) && IsValid(OwnerChar->GetMesh()))
		{
			if (UAnimInstance* AnimInst = OwnerChar->GetMesh()->GetAnimInstance())
			{
				const float PlayedLen = AnimInst->Montage_Play(MontageToPlay, AttackSpeedMult);
				if (PlayedLen > 0.0f)
				{
					MontageDuration = PlayedLen;
				}
			}
		}

		if (UWorld* World = GetWorld())
		{
			World->GetTimerManager().SetTimer(
				AttackRecoveryTimerHandle,
				this,
				&UCombatComponent::FinishAttackRecovery,
				MontageDuration,
				false);
		}
	}
}

void UCombatComponent::NotifyComboWindowOpened()
{
	if (CombatState == ECombatState::Dead || CombatState == ECombatState::Staggered)
	{
		return;
	}

	if (bBufferNextAttack && ComboIndex < 2)
	{
		ComboIndex += 1;
		ExecuteComboStep(ComboIndex, false);
	}
	else
	{
		SetCombatState(ECombatState::Recovery);
	}
}

void UCombatComponent::FinishAttackRecovery()
{
	if (CombatState == ECombatState::Dead || CombatState == ECombatState::Staggered)
	{
		return;
	}
	bBufferNextAttack = false;
	ComboIndex = 0;
	EndWeaponSweep();
	SetCombatState(ECombatState::Idle);
}

void UCombatComponent::BeginWeaponSweep(USkeletalMeshComponent* WeaponMesh)
{
	HitActorsThisSwing.Empty();
	bHasPrevSweepSample = false;
	SetCombatState(ECombatState::Active);

	if (IsValid(WeaponMesh))
	{
		PrevBladeBase = WeaponMesh->GetSocketLocation(BladeBaseSocket);
		PrevBladeTip = WeaponMesh->GetSocketLocation(BladeTipSocket);
		bHasPrevSweepSample = true;
	}
}

void UCombatComponent::TickWeaponSweep(USkeletalMeshComponent* WeaponMesh)
{
	UWorld* World = GetWorld();
	AActor* Owner = GetOwner();
	if (!IsValid(World) || !IsValid(Owner) || !IsValid(WeaponMesh))
	{
		return;
	}

	const FVector CurrBase = WeaponMesh->GetSocketLocation(BladeBaseSocket);
	const FVector CurrTip = WeaponMesh->GetSocketLocation(BladeTipSocket);

	FCollisionQueryParams QueryParams;
	QueryParams.AddIgnoredActor(Owner);

	TArray<FHitResult> Hits;
	const FCollisionShape Sphere = FCollisionShape::MakeSphere(SweepSphereRadius);

	// Anti-tunneling Multi-Sphere Sweeps along current blade and frame-to-frame tip trajectory
	World->SweepMultiByChannel(Hits, CurrBase, CurrTip, FQuat::Identity, ECC_WeaponTrace, Sphere, QueryParams);

	if (bHasPrevSweepSample)
	{
		TArray<FHitResult> MotionHits;
		World->SweepMultiByChannel(MotionHits, PrevBladeTip, CurrTip, FQuat::Identity, ECC_WeaponTrace, Sphere, QueryParams);
		Hits.Append(MotionHits);
	}

	PrevBladeBase = CurrBase;
	PrevBladeTip = CurrTip;
	bHasPrevSweepSample = true;

	const ICombatInterface* OwnerCombat = Cast<ICombatInterface>(Owner);
	const EFactionID OwnerFaction = OwnerCombat ? OwnerCombat->GetFactionID() : EFactionID::NeutralProp;

	float DamageAmount = 24.0f;
	float CritChance = 0.10f;
	if (UStatsComponent* Stats = Owner->FindComponentByClass<UStatsComponent>())
	{
		DamageAmount = Stats->GetFinalStat(EStatType::MeleeDamage);
		CritChance = Stats->GetFinalStat(EStatType::CritChance);
	}

	if (bCurrentAttackIsHeavy)
	{
		DamageAmount *= 1.45f;
	}

	for (const FHitResult& Hit : Hits)
	{
		AActor* HitActor = Hit.GetActor();
		if (!IsValid(HitActor) || HitActorsThisSwing.Contains(HitActor))
		{
			continue;
		}

		ICombatInterface* TargetCombat = Cast<ICombatInterface>(HitActor);
		if (!TargetCombat || TargetCombat->IsCombatDead())
		{
			continue;
		}

		// Strict Faction Isolation: prevent friendly fire within the Loomborn faction
		if (TargetCombat->GetFactionID() == OwnerFaction && OwnerFaction != EFactionID::NeutralProp)
		{
			continue;
		}

		HitActorsThisSwing.Add(HitActor);

		const bool bCrit = FMath::FRand() < CritChance;
		const float FinalDamage = bCrit ? DamageAmount * 1.75f : DamageAmount;
		const FVector HitDir = (HitActor->GetActorLocation() - Owner->GetActorLocation()).GetSafeNormal2D();

		if (UHealthComponent* TargetHealth = TargetCombat->GetHealthComponent())
		{
			TargetHealth->ApplyUnifiedDamage(FinalDamage, Hit.ImpactPoint, Owner, bCurrentAttackIsHeavy, bCrit);
			AddSuperCharge(TargetHealth->IsDead() ? 20.0f : 8.0f);
		}

		const float PoiseDmg = bCurrentAttackIsHeavy ? 40.0f : 15.0f;
		TargetCombat->ApplyHitReaction(HitDir, PoiseDmg, bCurrentAttackIsHeavy);

		if (ACharacter* OwnerChar = Cast<ACharacter>(Owner))
		{
			if (ASunderloomPlayerController* PC = Cast<ASunderloomPlayerController>(OwnerChar->GetController()))
			{
				PC->TriggerScaledCameraShake(bCurrentAttackIsHeavy || bCrit, bCrit ? 1.25f : 0.75f);
			}
		}
	}
}

void UCombatComponent::EndWeaponSweep()
{
	HitActorsThisSwing.Empty();
	bHasPrevSweepSample = false;
	if (CombatState == ECombatState::Active)
	{
		SetCombatState(ECombatState::Recovery);
	}
}

void UCombatComponent::SpawnRuneProjectileFromAim(float DamageMultiplier)
{
	UWorld* World = GetWorld();
	ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
	if (!IsValid(World) || !IsValid(OwnerChar) || !IsValid(RuneProjectileClass))
	{
		return;
	}

	FVector MuzzleLoc = OwnerChar->GetActorLocation() + OwnerChar->GetActorForwardVector() * 60.0f + FVector(0.0f, 0.0f, 40.0f);
	if (IsValid(OwnerChar->GetMesh()) && OwnerChar->GetMesh()->DoesSocketExist(RangedMuzzleSocket))
	{
		MuzzleLoc = OwnerChar->GetMesh()->GetSocketLocation(RangedMuzzleSocket);
	}

	FVector AimPoint = MuzzleLoc + OwnerChar->GetActorForwardVector() * 2500.0f;
	if (APlayerController* PC = Cast<APlayerController>(OwnerChar->GetController()))
	{
		FVector CamLoc;
		FRotator CamRot;
		PC->GetPlayerViewPoint(CamLoc, CamRot);

		FHitResult AimHit;
		FCollisionQueryParams Params;
		Params.AddIgnoredActor(OwnerChar);
		const FVector TraceEnd = CamLoc + CamRot.Vector() * 4000.0f;
		if (World->LineTraceSingleByChannel(AimHit, CamLoc, TraceEnd, ECC_Visibility, Params))
		{
			AimPoint = AimHit.ImpactPoint;
		}
		else
		{
			AimPoint = TraceEnd;
		}
	}

	const FRotator LaunchRot = (AimPoint - MuzzleLoc).Rotation();
	FActorSpawnParameters SpawnParams;
	SpawnParams.Owner = OwnerChar;
	SpawnParams.Instigator = OwnerChar;
	SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	if (ARuneProjectile* Proj = World->SpawnActor<ARuneProjectile>(RuneProjectileClass, MuzzleLoc, LaunchRot, SpawnParams))
	{
		float RangedDamage = 18.0f;
		if (UStatsComponent* Stats = OwnerChar->FindComponentByClass<UStatsComponent>())
		{
			RangedDamage = Stats->GetFinalStat(EStatType::RangedDamage);
		}
		const ICombatInterface* OwnerCombat = Cast<ICombatInterface>(OwnerChar);
		const EFactionID Faction = OwnerCombat ? OwnerCombat->GetFactionID() : EFactionID::Player;
		Proj->InitializeProjectile(Faction, RangedDamage * DamageMultiplier);
	}
}

void UCombatComponent::SpawnRadialSuperBolts()
{
	UWorld* World = GetWorld();
	ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
	if (!IsValid(World) || !IsValid(OwnerChar) || !IsValid(RuneProjectileClass))
	{
		return;
	}

	float RangedDamage = 18.0f;
	if (UStatsComponent* Stats = OwnerChar->FindComponentByClass<UStatsComponent>())
	{
		RangedDamage = Stats->GetFinalStat(EStatType::RangedDamage);
	}
	const ICombatInterface* OwnerCombat = Cast<ICombatInterface>(OwnerChar);
	const EFactionID Faction = OwnerCombat ? OwnerCombat->GetFactionID() : EFactionID::Player;

	FActorSpawnParameters SpawnParams;
	SpawnParams.Owner = OwnerChar;
	SpawnParams.Instigator = OwnerChar;
	SpawnParams.SpawnCollisionHandlingOverride = ESpawnActorCollisionHandlingMethod::AlwaysSpawn;

	const FVector Origin = OwnerChar->GetActorLocation() + FVector(0.0f, 0.0f, 45.0f);
	for (int32 i = 0; i < 8; ++i)
	{
		const float YawDeg = i * 45.0f;
		const FRotator BoltRot(0.0f, YawDeg, 0.0f);
		const FVector SpawnLoc = Origin + BoltRot.Vector() * 50.0f;
		if (ARuneProjectile* Proj = World->SpawnActor<ARuneProjectile>(RuneProjectileClass, SpawnLoc, BoltRot, SpawnParams))
		{
			Proj->InitializeProjectile(Faction, RangedDamage * 1.6f);
		}
	}
}

void UCombatComponent::ApplyPoiseDamage(float PoiseAmount, const FVector& HitDirection)
{
	if (CombatState == ECombatState::Dead) return;

	CurrentPoise -= PoiseAmount;
	if (CurrentPoise <= 0.0f)
	{
		CurrentPoise = MaxPoise;
		EndWeaponSweep();
		SetCombatState(ECombatState::Staggered);

		if (ACharacter* OwnerChar = Cast<ACharacter>(GetOwner()))
		{
			OwnerChar->LaunchCharacter(HitDirection * 420.0f + FVector(0.0f, 0.0f, 120.0f), true, false);
			if (IsValid(StaggerMontage) && IsValid(OwnerChar->GetMesh()))
			{
				if (UAnimInstance* AnimInst = OwnerChar->GetMesh()->GetAnimInstance())
				{
					AnimInst->Montage_Play(StaggerMontage);
				}
			}
		}

		if (UWorld* World = GetWorld())
		{
			World->GetTimerManager().SetTimer(StaggerTimerHandle, this, &UCombatComponent::RecoverFromStagger, StaggerDuration, false);
		}
	}
}

void UCombatComponent::RecoverFromStagger()
{
	if (CombatState == ECombatState::Staggered)
	{
		SetCombatState(ECombatState::Idle);
	}
}
