#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HealthComponent.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_ThreeParams(FOnHealthChangedSignature, float, CurrentHealth, float, MaxHealth, float, Delta);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_FourParams(FOnDamageTakenSignature, float, DamageAmount, FVector, HitLocation, AActor*, DamageCauser, bool, bWasCritical);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnDeathSignature, AActor*, DeadActor);

UCLASS(ClassGroup=(Sunderloom), meta=(BlueprintSpawnableComponent))
class SUNDERLOOM_API UHealthComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	UHealthComponent();

	virtual void BeginPlay() override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Health")
	void SetMaxHealth(float NewMaxHealth, bool bHealDifference = true);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Health")
	void SetCurrentHealthExact(float NewHealth);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Health")
	void SetInvulnerable(bool bNewInvulnerable);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Health")
	void ApplyUnifiedDamage(float RawDamage, const FVector& HitLocation, AActor* DamageCauser, bool bIsHeavyHit = false, bool bIsCritical = false);

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Health")
	float GetCurrentHealth() const { return CurrentHealth; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Health")
	float GetMaxHealth() const { return MaxHealth; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Health")
	float GetHealthPercent() const { return (MaxHealth > 0.0f) ? (CurrentHealth / MaxHealth) : 0.0f; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Health")
	bool IsDead() const { return bIsDead; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Health")
	bool IsInvulnerable() const { return bIsInvulnerable; }

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Health")
	FOnHealthChangedSignature OnHealthChanged;

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Health")
	FOnDamageTakenSignature OnDamageTaken;

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Health")
	FOnDeathSignature OnDeath;

protected:
	UFUNCTION()
	void HandleOwnerTakeAnyDamage(AActor* DamagedActor, float Damage, const UDamageType* DamageType, AController* InstigatedBy, AActor* DamageCauser);

	void TriggerHitFlash();
	void UpdateHitFlashDecay();
	void TriggerHitStop(float DurationSeconds);
	void RestoreTimeDilation();

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Health")
	float MaxHealth = 100.0f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Health")
	float CurrentHealth = 100.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadWrite, Category = "Sunderloom|Health")
	float CurrentShield = 0.0f;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Health")
	bool bIsInvulnerable = false;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Health")
	bool bIsDead = false;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Juice")
	FName HitFlashParamName = FName(TEXT("HitFlash"));

private:
	UPROPERTY()
	TArray<TObjectPtr<UMaterialInstanceDynamic>> DynamicMaterials;

	FTimerHandle HitFlashTimerHandle;
	FTimerHandle HitStopTimerHandle;
	float CurrentHitFlashAlpha = 0.0f;
};
