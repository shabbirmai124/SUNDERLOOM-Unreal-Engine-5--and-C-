#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Core/SunderloomTypes.h"
#include "CombatComponent.generated.h"

class UAnimMontage;
class USkeletalMeshComponent;
class ARuneProjectile;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnCombatStateChangedSignature, ECombatState, NewState);

UCLASS(ClassGroup=(Sunderloom), meta=(BlueprintSpawnableComponent))
class SUNDERLOOM_API UCombatComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UCombatComponent();

	virtual void BeginPlay() override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	void RequestLightAttack();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	void RequestHeavyAttack();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	void RequestRuneLance();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	bool TryCancelIntoDodge();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	void NotifyComboWindowOpened();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	void BeginWeaponSweep(USkeletalMeshComponent* WeaponMesh);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	void TickWeaponSweep(USkeletalMeshComponent* WeaponMesh);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	void EndWeaponSweep();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	void ApplyPoiseDamage(float PoiseAmount, const FVector& HitDirection);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Combat")
	void SetCombatState(ECombatState NewState);

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Combat")
	ECombatState GetCombatState() const { return CombatState; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Combat")
	int32 GetComboIndex() const { return ComboIndex; }

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Combat")
	FOnCombatStateChangedSignature OnCombatStateChanged;

protected:
	void ExecuteComboStep(int32 StepIndex, bool bHeavy);
	void FinishAttackRecovery();
	void RecoverFromStagger();
	void SpawnRuneProjectileFromAim();

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	TArray<TObjectPtr<UAnimMontage>> LightComboMontages;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	TObjectPtr<UAnimMontage> HeavyAttackMontage;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	TObjectPtr<UAnimMontage> StaggerMontage;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	TSubclassOf<ARuneProjectile> RuneProjectileClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	FName BladeBaseSocket = FName(TEXT("BladeBase"));

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	FName BladeTipSocket = FName(TEXT("BladeTip"));

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	FName RangedMuzzleSocket = FName(TEXT("hand_r"));

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	float SweepSphereRadius = 24.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	float MaxPoise = 50.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	float StaggerDuration = 0.65f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	float RuneLanceCooldown = 0.55f;

private:
	ECombatState CombatState = ECombatState::Idle;
	int32 ComboIndex = 0;
	bool bBufferNextAttack = false;
	bool bCurrentAttackIsHeavy = false;
	float CurrentPoise = 50.0f;
	float LastRuneLanceTime = -10.0f;

	FVector PrevBladeBase = FVector::ZeroVector;
	FVector PrevBladeTip = FVector::ZeroVector;
	bool bHasPrevSweepSample = false;

	UPROPERTY()
	TArray<TObjectPtr<AActor>> HitActorsThisSwing;

	FTimerHandle AttackRecoveryTimerHandle;
	FTimerHandle StaggerTimerHandle;
};
