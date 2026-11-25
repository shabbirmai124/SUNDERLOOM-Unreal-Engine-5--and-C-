#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "Chaos/ChaosEngineInterface.h"
#include "SurfaceAudioComponent.generated.h"

class USoundBase;
class USoundAttenuation;
class USoundConcurrency;
class UNiagaraSystem;

UCLASS(ClassGroup=(Sunderloom), meta=(BlueprintSpawnableComponent))
class SUNDERLOOM_API USurfaceAudioComponent : public UActorComponent
{
	GENERATED_BODY()

public:
	USurfaceAudioComponent();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Audio")
	void PlayFootstepAtSocket(FName FootSocketName);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Audio")
	void PlayWeaponImpactForSurface(TEnumAsByte<EPhysicalSurface> SurfaceType, const FVector& ImpactLocation, const FVector& ImpactNormal, bool bIsHeavyHit);

protected:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Audio")
	TMap<TEnumAsByte<EPhysicalSurface>, TObjectPtr<USoundBase>> FootstepMetaSounds;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Audio")
	TMap<TEnumAsByte<EPhysicalSurface>, TObjectPtr<USoundBase>> ImpactMetaSounds;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Audio")
	TObjectPtr<USoundAttenuation> CavernAttenuation;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Audio")
	TObjectPtr<USoundConcurrency> CombatSoundConcurrency;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|VFX")
	TObjectPtr<UNiagaraSystem> MetallicSparkVFX;
};
