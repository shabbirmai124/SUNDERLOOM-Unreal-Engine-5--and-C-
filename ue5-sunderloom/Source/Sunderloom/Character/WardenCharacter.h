#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "Core/CombatInterface.h"
#include "Core/SunderloomTypes.h"
#include "InputActionValue.h"
#include "WardenCharacter.generated.h"

class USpringArmComponent;
class UCameraComponent;
class UHealthComponent;
class UCombatComponent;
class UStatsComponent;
class UInputAction;
class UAnimMontage;

UCLASS()
class SUNDERLOOM_API AWardenCharacter : public ACharacter, public ICombatInterface
{
	GENERATED_BODY()

public:
	AWardenCharacter();

	virtual void BeginPlay() override;
	virtual void Tick(float DeltaSeconds) override;
	virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

	// ICombatInterface
	virtual UHealthComponent* GetHealthComponent() const override { return HealthComponent; }
	virtual EFactionID GetFactionID() const override { return EFactionID::Player; }
	virtual bool IsCombatDead() const override;
	virtual void ApplyHitReaction(const FVector& HitDirection, float PoiseDamage, bool bIsHeavyHit) override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Camera")
	void ApplyCameraPreset(ECameraViewPreset NewPreset);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Camera")
	void CycleCameraView();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Camera")
	void SetInActiveBattleRoom(bool bInBattle);

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Camera")
	ECameraViewPreset GetCameraPreset() const { return ActiveCameraPreset; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Warden")
	UStatsComponent* GetStatsComponent() const { return StatsComponent; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Warden")
	UCombatComponent* GetCombatComponent() const { return CombatComponent; }

protected:
	void HandleMove(const FInputActionValue& Value);
	void HandleLook(const FInputActionValue& Value);
	void HandlePhaseStep();
	void HandleLightAttack();
	void HandleHeavyAttack();
	void HandleRuneLance();
	void HandleAetherSuper();
	void HandleCycleCamera();
	void HandleInteract();
	void HandlePause();

	void EndDodgeInvulnerability();
	void EndDodgeMotion();
	void ResetDodgeCooldown();

	UFUNCTION()
	void HandleWardenDeath(AActor* DeadActor);

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Camera")
	TObjectPtr<USpringArmComponent> CameraBoom;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Camera")
	TObjectPtr<UCameraComponent> FollowCamera;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Camera")
	TObjectPtr<UCameraComponent> FirstPersonCamera;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Components")
	TObjectPtr<UHealthComponent> HealthComponent;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Components")
	TObjectPtr<UCombatComponent> CombatComponent;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Components")
	TObjectPtr<UStatsComponent> StatsComponent;

	// Enhanced Input Actions (Movement, Look, Combat, Super, Camera View, Interact, Pause)
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_Move;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_Look;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_PhaseStep;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_LightAttack;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_HeavyAttack;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_RuneLance;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_AetherSuper;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_CycleCamera;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_Interact;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputAction> IA_Pause;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|PhaseStep")
	TObjectPtr<UAnimMontage> PhaseStepMontage;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|PhaseStep")
	float DodgeLaunchSpeed = 1050.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|PhaseStep")
	float DodgeDuration = 0.34f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|PhaseStep")
	float DodgeIFrameDuration = 0.24f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Interact")
	float InteractionRadius = 240.0f;

private:
	ECameraViewPreset ActiveCameraPreset = ECameraViewPreset::ThirdPerson;
	bool bInActiveBattleRoom = false;
	float TargetArmLengthCm = 620.0f;
	float ManualLookCooldown = 0.0f;
	FVector2D CachedMoveInput = FVector2D::ZeroVector;
	bool bIsDodgeOnCooldown = false;
	float SavedGroundFriction = 8.0f;

	FTimerHandle IFrameTimerHandle;
	FTimerHandle DodgeMotionTimerHandle;
	FTimerHandle DodgeCooldownTimerHandle;
};
