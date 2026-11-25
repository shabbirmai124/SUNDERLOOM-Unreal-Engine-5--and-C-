#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "Core/CombatInterface.h"
#include "Core/SunderloomTypes.h"
#include "LoombornEnemyBase.generated.h"

class UHealthComponent;
class UCombatComponent;
class UBehaviorTree;
class UAnimMontage;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnBossPhaseChangedSignature, int32, NewPhase);

UCLASS()
class SUNDERLOOM_API ALoombornEnemyBase : public ACharacter, public ICombatInterface
{
	GENERATED_BODY()

public:
	ALoombornEnemyBase();

	virtual void BeginPlay() override;

	// ICombatInterface
	virtual UHealthComponent* GetHealthComponent() const override { return HealthComponent; }
	virtual EFactionID GetFactionID() const override { return EFactionID::Loomborn; }
	virtual bool IsCombatDead() const override;
	virtual void ApplyHitReaction(const FVector& HitDirection, float PoiseDamage, bool bIsHeavyHit) override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Enemy")
	void ApplyFloorDifficultyScaling(float HealthMultiplier, float DamageMultiplier);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Enemy")
	void ExecuteTelegraphedAttack(AActor* TargetActor);

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Enemy")
	UBehaviorTree* GetBehaviorTree() const { return BehaviorTreeAsset; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Enemy")
	EEnemyArchetype GetArchetype() const { return Archetype; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Enemy")
	float GetPreferredAttackRange() const { return PreferredAttackRange; }

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Enemy")
	bool IsBoss() const { return Archetype == EEnemyArchetype::WeaverWardenBoss; }

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Boss")
	FOnBossPhaseChangedSignature OnBossPhaseChanged;

protected:
	UFUNCTION()
	void HandleHealthChanged(float CurrentHealth, float MaxHealth, float Delta);

	UFUNCTION()
	void HandleEnemyDeath(AActor* DeadActor);

	void CompleteBossPhaseTwoRoar();
	void FinishTelegraphAndStrike();

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Components")
	TObjectPtr<UHealthComponent> HealthComponent;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Components")
	TObjectPtr<UCombatComponent> CombatComponent;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|AI")
	EEnemyArchetype Archetype = EEnemyArchetype::ThreadlingRusher;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|AI")
	TObjectPtr<UBehaviorTree> BehaviorTreeAsset;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	float PreferredAttackRange = 210.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	float TelegraphWindupSeconds = 0.55f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Combat")
	int32 AetherThreadReward = 15;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Boss")
	TObjectPtr<UAnimMontage> BossPhaseTwoRoarMontage;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Boss")
	int32 BossPhase = 1;

private:
	TWeakObjectPtr<AActor> PendingAttackTarget;
	float ScaledDamageMultiplier = 1.0f;
	FTimerHandle TelegraphTimerHandle;
	FTimerHandle BossRoarTimerHandle;
};
