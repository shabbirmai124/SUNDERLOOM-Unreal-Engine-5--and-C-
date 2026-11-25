#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/SunderloomTypes.h"
#include "RuneProjectile.generated.h"

class USphereComponent;
class UProjectileMovementComponent;
class UNiagaraSystem;

UCLASS()
class SUNDERLOOM_API ARuneProjectile : public AActor
{
	GENERATED_BODY()

public:
	ARuneProjectile();

	void InitializeProjectile(EFactionID InFaction, float InDamage);

protected:
	virtual void BeginPlay() override;

	UFUNCTION()
	void HandleProjectileOverlap(UPrimitiveComponent* OverlappedComp, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult);

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Projectile")
	TObjectPtr<USphereComponent> CollisionSphere;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Projectile")
	TObjectPtr<UProjectileMovementComponent> ProjectileMovement;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|VFX")
	TObjectPtr<UNiagaraSystem> ImpactVFX;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Projectile")
	float MaxLifespanSeconds = 3.5f;

private:
	EFactionID OwnerFaction = EFactionID::Player;
	float ProjectileDamage = 18.0f;
};
