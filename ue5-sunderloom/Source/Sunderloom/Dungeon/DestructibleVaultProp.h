#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/CombatInterface.h"
#include "DestructibleVaultProp.generated.h"

class UGeometryCollectionComponent;
class UHealthComponent;
class UNiagaraSystem;

UCLASS()
class SUNDERLOOM_API ADestructibleVaultProp : public AActor, public ICombatInterface
{
	GENERATED_BODY()

public:
	ADestructibleVaultProp();

	virtual void BeginPlay() override;

	// ICombatInterface
	virtual UHealthComponent* GetHealthComponent() const override { return HealthComponent; }
	virtual EFactionID GetFactionID() const override { return EFactionID::NeutralProp; }
	virtual bool IsCombatDead() const override;
	virtual void ApplyHitReaction(const FVector& HitDirection, float PoiseDamage, bool bIsHeavyHit) override;

protected:
	UFUNCTION()
	void HandlePropShattered(AActor* DeadActor);

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Chaos")
	TObjectPtr<UGeometryCollectionComponent> GeometryCollection;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Components")
	TObjectPtr<UHealthComponent> HealthComponent;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Chaos")
	bool bVolatileEmberBarrel = false;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Chaos")
	float ExplosionRadiusCm = 360.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Chaos")
	float ExplosionDamage = 55.0f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Chaos")
	float DebrisCleanupSeconds = 4.5f;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|VFX")
	TObjectPtr<UNiagaraSystem> ShatterExplosionVFX;
};
