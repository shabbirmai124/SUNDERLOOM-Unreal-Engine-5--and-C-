#include "Character/WardenCharacter.h"
#include "Components/HealthComponent.h"
#include "Components/CombatComponent.h"
#include "Components/StatsComponent.h"
#include "Core/InteractionInterface.h"
#include "Core/SunderloomGameInstance.h"
#include "Core/SunderloomGameMode.h"
#include "Core/SunderloomGameUserSettings.h"
#include "Core/SunderloomPlayerController.h"
#include "Camera/CameraComponent.h"
#include "GameFramework/SpringArmComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "EnhancedInputComponent.h"
#include "Kismet/GameplayStatics.h"
#include "TimerManager.h"
#include "Sunderloom.h"

AWardenCharacter::AWardenCharacter()
{
	PrimaryActorTick.bCanEverTick = true;

	bUseControllerRotationPitch = false;
	bUseControllerRotationYaw = false;
	bUseControllerRotationRoll = false;

	UCharacterMovementComponent* MoveComp = GetCharacterMovement();
	MoveComp->bOrientRotationToMovement = true;
	MoveComp->RotationRate = FRotator(0.0f, 720.0f, 0.0f);
	MoveComp->MaxWalkSpeed = 600.0f;
	MoveComp->GroundFriction = 8.0f;
	MoveComp->BrakingDecelerationWalking = 2400.0f;

	CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
	CameraBoom->SetupAttachment(RootComponent);
	CameraBoom->TargetArmLength = 520.0f;
	CameraBoom->bUsePawnControlRotation = true;
	CameraBoom->bDoCollisionTest = true;
	CameraBoom->bEnableCameraLag = true;
	CameraBoom->CameraLagSpeed = 10.0f;

	FollowCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FollowCamera"));
	FollowCamera->SetupAttachment(CameraBoom, USpringArmComponent::SocketName);
	FollowCamera->bUsePawnControlRotation = false;
	// Matte dark-fantasy bright-contrast post-process calibration (matches WebGL exposure=1.16, bloomThreshold=1.45, zero glare)
	FollowCamera->PostProcessSettings.bOverride_BloomIntensity = true;
	FollowCamera->PostProcessSettings.BloomIntensity = 0.08f;
	FollowCamera->PostProcessSettings.bOverride_BloomThreshold = true;
	FollowCamera->PostProcessSettings.BloomThreshold = 1.45f;
	FollowCamera->PostProcessSettings.bOverride_AutoExposureBias = true;
	FollowCamera->PostProcessSettings.AutoExposureBias = 0.0f;
	FollowCamera->PostProcessSettings.bOverride_ColorContrast = true;
	FollowCamera->PostProcessSettings.ColorContrast = FVector4(1.06f, 1.06f, 1.06f, 1.0f);
	FollowCamera->PostProcessSettings.bOverride_LumenReflectionQuality = true;
	FollowCamera->PostProcessSettings.LumenReflectionQuality = 0.50f;

	// Valorant-style Eye-Level First-Person Tactical Camera
	FirstPersonCamera = CreateDefaultSubobject<UCameraComponent>(TEXT("FirstPersonCamera"));
	FirstPersonCamera->SetupAttachment(RootComponent);
	FirstPersonCamera->SetRelativeLocation(FVector(12.0f, 0.0f, 68.0f));
	FirstPersonCamera->bUsePawnControlRotation = true;
	FirstPersonCamera->PostProcessSettings = FollowCamera->PostProcessSettings;
	FirstPersonCamera->SetActive(false);

	HealthComponent = CreateDefaultSubobject<UHealthComponent>(TEXT("HealthComponent"));
	CombatComponent = CreateDefaultSubobject<UCombatComponent>(TEXT("CombatComponent"));
	StatsComponent = CreateDefaultSubobject<UStatsComponent>(TEXT("StatsComponent"));
}

void AWardenCharacter::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(HealthComponent))
	{
		HealthComponent->OnDeath.AddDynamic(this, &AWardenCharacter::HandleWardenDeath);
	}

	// Restore run upgrades and health from GameInstance across floor reloads
	if (USunderloomGameInstance* GI = Cast<USunderloomGameInstance>(GetGameInstance()))
	{
		const FActiveRunState& RunState = GI->GetActiveRunState();
		if (IsValid(StatsComponent) && RunState.AcquiredRelicsList.Num() > 0)
		{
			StatsComponent->RestoreRelicsFromRunState(RunState.AcquiredRelicsList);
		}
		if (IsValid(HealthComponent) && RunState.SavedRunHealth > 0.0f)
		{
			HealthComponent->SetCurrentHealthExact(RunState.SavedRunHealth);
		}
	}

	if (USunderloomGameUserSettings* Settings = USunderloomGameUserSettings::GetSunderloomUserSettings())
	{
		ApplyCameraPreset(Settings->CameraViewPreset);
	}
	else
	{
		ApplyCameraPreset(ECameraViewPreset::ThirdPerson);
	}
}

void AWardenCharacter::Tick(float DeltaSeconds)
{
	Super::Tick(DeltaSeconds);

	if (ManualLookCooldown > 0.0f)
	{
		ManualLookCooldown = FMath::Max(0.0f, ManualLookCooldown - DeltaSeconds);
	}

	const USunderloomGameUserSettings* Settings = USunderloomGameUserSettings::GetSunderloomUserSettings();
	const bool bAutoFollow = Settings ? Settings->bAutoFollowCamera : true;
	const bool bBattleClear = Settings ? Settings->bBattlefieldClearView : true;

	// Smooth Battlefield Clear Room Framing: pulls camera back & widens sightlines in combat rooms
	if (IsValid(CameraBoom) && ActiveCameraPreset != ECameraViewPreset::FirstPerson)
	{
		const float DesiredLen = TargetArmLengthCm + (bInActiveBattleRoom && bBattleClear ? 240.0f : 0.0f);
		CameraBoom->TargetArmLength = FMath::FInterpTo(CameraBoom->TargetArmLength, DesiredLen, DeltaSeconds, 6.0f);
	}

	// Auto-Follow Travel View: gently aligns yaw behind Warden's movement direction
	if (bAutoFollow && ActiveCameraPreset != ECameraViewPreset::FirstPerson && ManualLookCooldown <= 0.0f && IsValid(Controller))
	{
		const FVector Vel2D(GetVelocity().X, GetVelocity().Y, 0.0f);
		if (Vel2D.SizeSquared() > 14400.0f)
		{
			const float TargetYaw = Vel2D.Rotation().Yaw;
			FRotator ControlRot = Controller->GetControlRotation();
			const float DeltaYaw = FMath::FindDeltaAngleDegrees(ControlRot.Yaw, TargetYaw);
			if (FMath::Abs(DeltaYaw) < 135.0f)
			{
				ControlRot.Yaw = FMath::FixedTurn(ControlRot.Yaw, TargetYaw, 65.0f * DeltaSeconds);
				Controller->SetControlRotation(ControlRot);
			}
		}
	}
}

void AWardenCharacter::ApplyCameraPreset(ECameraViewPreset NewPreset)
{
	ActiveCameraPreset = NewPreset;
	const USunderloomGameUserSettings* Settings = USunderloomGameUserSettings::GetSunderloomUserSettings();
	const float BaseFov = Settings ? Settings->CameraFieldOfView : 54.0f;

	const bool bIsFps = (NewPreset == ECameraViewPreset::FirstPerson);
	if (IsValid(FollowCamera))
	{
		FollowCamera->SetActive(!bIsFps);
		FollowCamera->SetFieldOfView(BaseFov);
	}
	if (IsValid(FirstPersonCamera))
	{
		FirstPersonCamera->SetActive(bIsFps);
		FirstPersonCamera->SetFieldOfView(FMath::Clamp(BaseFov + 20.0f, 76.0f, 105.0f));
	}
	if (IsValid(GetMesh()))
	{
		GetMesh()->SetOwnerNoSee(bIsFps);
	}

	bUseControllerRotationYaw = bIsFps;
	if (UCharacterMovementComponent* MoveComp = GetCharacterMovement())
	{
		MoveComp->bOrientRotationToMovement = !bIsFps;
	}

	if (IsValid(CameraBoom))
	{
		switch (NewPreset)
		{
		case ECameraViewPreset::ThirdPerson:
			TargetArmLengthCm = 620.0f;
			CameraBoom->bUsePawnControlRotation = true;
			CameraBoom->bDoCollisionTest = true;
			CameraBoom->SetRelativeRotation(FRotator(-28.0f, 0.0f, 0.0f));
			break;
		case ECameraViewPreset::TopDown:
			TargetArmLengthCm = 1580.0f;
			CameraBoom->bUsePawnControlRotation = false;
			CameraBoom->bDoCollisionTest = false;
			CameraBoom->SetRelativeRotation(FRotator(-76.0f, 0.0f, 0.0f));
			break;
		case ECameraViewPreset::Cinematic:
			TargetArmLengthCm = 1040.0f;
			CameraBoom->bUsePawnControlRotation = true;
			CameraBoom->bDoCollisionTest = false;
			CameraBoom->SetRelativeRotation(FRotator(-44.0f, 0.0f, 0.0f));
			break;
		case ECameraViewPreset::FirstPerson:
			TargetArmLengthCm = 0.0f;
			break;
		}
	}
}

void AWardenCharacter::CycleCameraView()
{
	const uint8 NextIdx = (static_cast<uint8>(ActiveCameraPreset) + 1) % 4;
	const ECameraViewPreset NextPreset = static_cast<ECameraViewPreset>(NextIdx);
	ApplyCameraPreset(NextPreset);

	if (USunderloomGameUserSettings* Settings = USunderloomGameUserSettings::GetSunderloomUserSettings())
	{
		Settings->CameraViewPreset = NextPreset;
		Settings->SaveSettings();
	}
}

void AWardenCharacter::SetInActiveBattleRoom(bool bInBattle)
{
	bInActiveBattleRoom = bInBattle;
}

void AWardenCharacter::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
	Super::SetupPlayerInputComponent(PlayerInputComponent);

	UEnhancedInputComponent* EIC = Cast<UEnhancedInputComponent>(PlayerInputComponent);
	if (!IsValid(EIC)) return;

	if (IsValid(IA_Move))        EIC->BindAction(IA_Move,        ETriggerEvent::Triggered, this, &AWardenCharacter::HandleMove);
	if (IsValid(IA_Look))        EIC->BindAction(IA_Look,        ETriggerEvent::Triggered, this, &AWardenCharacter::HandleLook);
	if (IsValid(IA_PhaseStep))   EIC->BindAction(IA_PhaseStep,   ETriggerEvent::Started,   this, &AWardenCharacter::HandlePhaseStep);
	if (IsValid(IA_LightAttack)) EIC->BindAction(IA_LightAttack, ETriggerEvent::Started,   this, &AWardenCharacter::HandleLightAttack);
	if (IsValid(IA_HeavyAttack)) EIC->BindAction(IA_HeavyAttack, ETriggerEvent::Started,   this, &AWardenCharacter::HandleHeavyAttack);
	if (IsValid(IA_RuneLance))   EIC->BindAction(IA_RuneLance,   ETriggerEvent::Started,   this, &AWardenCharacter::HandleRuneLance);
	if (IsValid(IA_AetherSuper)) EIC->BindAction(IA_AetherSuper, ETriggerEvent::Started,   this, &AWardenCharacter::HandleAetherSuper);
	if (IsValid(IA_CycleCamera)) EIC->BindAction(IA_CycleCamera, ETriggerEvent::Started,   this, &AWardenCharacter::HandleCycleCamera);
	if (IsValid(IA_Interact))    EIC->BindAction(IA_Interact,    ETriggerEvent::Started,   this, &AWardenCharacter::HandleInteract);
	if (IsValid(IA_Pause))       EIC->BindAction(IA_Pause,       ETriggerEvent::Started,   this, &AWardenCharacter::HandlePause);
}

void AWardenCharacter::HandleMove(const FInputActionValue& Value)
{
	CachedMoveInput = Value.Get<FVector2D>();
	if (!IsValid(Controller) || IsCombatDead()) return;

	const FRotator YawRot(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
	const FVector Forward = FRotationMatrix(YawRot).GetUnitAxis(EAxis::X);
	const FVector Right = FRotationMatrix(YawRot).GetUnitAxis(EAxis::Y);

	AddMovementInput(Forward, CachedMoveInput.Y);
	AddMovementInput(Right, CachedMoveInput.X);
}

void AWardenCharacter::HandleLook(const FInputActionValue& Value)
{
	const FVector2D LookAxis = Value.Get<FVector2D>();
	if (!LookAxis.IsNearlyZero())
	{
		ManualLookCooldown = 2.0f;
	}
	AddControllerYawInput(LookAxis.X);
	AddControllerPitchInput(LookAxis.Y);
}

void AWardenCharacter::HandlePhaseStep()
{
	if (!IsValid(CombatComponent) || !IsValid(HealthComponent) || bIsDodgeOnCooldown || IsCombatDead())
	{
		return;
	}

	// Enforce strict entry gate + Dodge-Canceling out of late recovery
	if (!CombatComponent->TryCancelIntoDodge())
	{
		return;
	}

	// Snap orientation to current movement input vector prior to dodge motion
	FVector DodgeDir = GetActorForwardVector();
	if (!CachedMoveInput.IsNearlyZero() && IsValid(Controller))
	{
		const FRotator YawRot(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
		const FVector Forward = FRotationMatrix(YawRot).GetUnitAxis(EAxis::X);
		const FVector Right = FRotationMatrix(YawRot).GetUnitAxis(EAxis::Y);
		DodgeDir = (Forward * CachedMoveInput.Y + Right * CachedMoveInput.X).GetSafeNormal2D();
		SetActorRotation(DodgeDir.Rotation());
	}

	// Enable Frame-1 I-Frames
	HealthComponent->SetInvulnerable(true);
	bIsDodgeOnCooldown = true;

	if (UCharacterMovementComponent* MoveComp = GetCharacterMovement())
	{
		SavedGroundFriction = MoveComp->GroundFriction;
		MoveComp->GroundFriction = 0.4f;
	}
	LaunchCharacter(DodgeDir * DodgeLaunchSpeed, true, false);

	if (IsValid(PhaseStepMontage))
	{
		PlayAnimMontage(PhaseStepMontage);
	}

	if (UWorld* World = GetWorld())
	{
		const float Cooldown = IsValid(StatsComponent) ? StatsComponent->GetFinalStat(EStatType::DodgeCooldown) : 0.90f;
		World->GetTimerManager().SetTimer(IFrameTimerHandle, this, &AWardenCharacter::EndDodgeInvulnerability, DodgeIFrameDuration, false);
		World->GetTimerManager().SetTimer(DodgeMotionTimerHandle, this, &AWardenCharacter::EndDodgeMotion, DodgeDuration, false);
		World->GetTimerManager().SetTimer(DodgeCooldownTimerHandle, this, &AWardenCharacter::ResetDodgeCooldown, Cooldown, false);
	}
}

void AWardenCharacter::EndDodgeInvulnerability()
{
	if (IsValid(HealthComponent))
	{
		HealthComponent->SetInvulnerable(false);
	}
}

void AWardenCharacter::EndDodgeMotion()
{
	if (UCharacterMovementComponent* MoveComp = GetCharacterMovement())
	{
		MoveComp->GroundFriction = SavedGroundFriction;
	}
	if (IsValid(CombatComponent) && CombatComponent->GetCombatState() == ECombatState::Dodging)
	{
		CombatComponent->SetCombatState(ECombatState::Idle);
	}
}

void AWardenCharacter::ResetDodgeCooldown()
{
	bIsDodgeOnCooldown = false;
}

void AWardenCharacter::HandleLightAttack()
{
	if (IsValid(CombatComponent)) CombatComponent->RequestLightAttack();
}

void AWardenCharacter::HandleHeavyAttack()
{
	if (IsValid(CombatComponent)) CombatComponent->RequestHeavyAttack();
}

void AWardenCharacter::HandleRuneLance()
{
	if (IsValid(CombatComponent)) CombatComponent->RequestRuneLance();
}

void AWardenCharacter::HandleAetherSuper()
{
	if (IsValid(CombatComponent)) CombatComponent->RequestAetherSuper();
}

void AWardenCharacter::HandleCycleCamera()
{
	CycleCameraView();
}

void AWardenCharacter::HandleInteract()
{
	UWorld* World = GetWorld();
	if (!IsValid(World) || IsCombatDead()) return;

	TArray<FOverlapResult> Overlaps;
	FCollisionQueryParams Params;
	Params.AddIgnoredActor(this);
	World->OverlapMultiByChannel(Overlaps, GetActorLocation(), FQuat::Identity, ECC_WorldDynamic, FCollisionShape::MakeSphere(InteractionRadius), Params);

	AActor* ClosestInteractable = nullptr;
	float BestDistSq = FLT_MAX;
	for (const FOverlapResult& Res : Overlaps)
	{
		AActor* Candidate = Res.GetActor();
		if (IsValid(Candidate) && Candidate->Implements<UInteractionInterface>())
		{
			const float DistSq = FVector::DistSquared(GetActorLocation(), Candidate->GetActorLocation());
			if (DistSq < BestDistSq)
			{
				BestDistSq = DistSq;
				ClosestInteractable = Candidate;
			}
		}
	}

	if (IInteractionInterface* Interactable = Cast<IInteractionInterface>(ClosestInteractable))
	{
		Interactable->ExecuteInteract(this);
	}
}

void AWardenCharacter::HandlePause()
{
	if (ASunderloomPlayerController* PC = Cast<ASunderloomPlayerController>(GetController()))
	{
		PC->TogglePauseMenu();
	}
}

bool AWardenCharacter::IsCombatDead() const
{
	return IsValid(HealthComponent) ? HealthComponent->IsDead() : true;
}

void AWardenCharacter::ApplyHitReaction(const FVector& HitDirection, float PoiseDamage, bool bIsHeavyHit)
{
	if (IsValid(CombatComponent) && bIsHeavyHit)
	{
		CombatComponent->ApplyPoiseDamage(PoiseDamage, HitDirection);
	}
	if (ASunderloomPlayerController* PC = Cast<ASunderloomPlayerController>(GetController()))
	{
		PC->TriggerScaledCameraShake(bIsHeavyHit, bIsHeavyHit ? 1.3f : 0.65f);
	}
}

void AWardenCharacter::HandleWardenDeath(AActor* DeadActor)
{
	if (IsValid(CombatComponent))
	{
		CombatComponent->SetCombatState(ECombatState::Dead);
	}
	if (ASunderloomGameMode* GM = Cast<ASunderloomGameMode>(UGameplayStatics::GetGameMode(this)))
	{
		GM->NotifyPlayerDied(this);
	}
}
