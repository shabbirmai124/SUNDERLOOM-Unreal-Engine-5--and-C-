#include "Components/SurfaceAudioComponent.h"
#include "GameFramework/Character.h"
#include "Components/SkeletalMeshComponent.h"
#include "PhysicalMaterials/PhysicalMaterial.h"
#include "Kismet/GameplayStatics.h"
#include "NiagaraFunctionLibrary.h"
#include "Sunderloom.h"

USurfaceAudioComponent::USurfaceAudioComponent()
{
	PrimaryComponentTick.bCanEverTick = false;
}

void USurfaceAudioComponent::PlayFootstepAtSocket(FName FootSocketName)
{
	UWorld* World = GetWorld();
	ACharacter* OwnerChar = Cast<ACharacter>(GetOwner());
	if (!IsValid(World) || !IsValid(OwnerChar) || !IsValid(OwnerChar->GetMesh()))
	{
		return;
	}

	const FVector FootLoc = OwnerChar->GetMesh()->GetSocketLocation(FootSocketName);
	FHitResult Hit;
	FCollisionQueryParams Params;
	Params.AddIgnoredActor(OwnerChar);
	Params.bReturnPhysicalMaterial = true;

	if (World->LineTraceSingleByChannel(Hit, FootLoc + FVector(0, 0, 20.0f), FootLoc - FVector(0, 0, 45.0f), ECC_Visibility, Params))
	{
		const EPhysicalSurface Surface = UPhysicalMaterial::DetermineSurfaceType(Hit.PhysMaterial.Get());
		if (const TObjectPtr<USoundBase>* SoundPtr = FootstepMetaSounds.Find(Surface))
		{
			if (IsValid(*SoundPtr))
			{
				const float PitchMult = FMath::FRandRange(0.92f, 1.08f);
				UGameplayStatics::PlaySoundAtLocation(
					World,
					SoundPtr->Get(),
					Hit.ImpactPoint,
					1.0f,
					PitchMult,
					0.0f,
					CavernAttenuation.Get(),
					CombatSoundConcurrency.Get());
			}
		}
	}
}

void USurfaceAudioComponent::PlayWeaponImpactForSurface(TEnumAsByte<EPhysicalSurface> SurfaceType, const FVector& ImpactLocation, const FVector& ImpactNormal, bool bIsHeavyHit)
{
	UWorld* World = GetWorld();
	if (!IsValid(World)) return;

	if (const TObjectPtr<USoundBase>* SoundPtr = ImpactMetaSounds.Find(SurfaceType))
	{
		if (IsValid(*SoundPtr))
		{
			const float Volume = bIsHeavyHit ? 1.2f : 0.95f;
			const float Pitch = FMath::FRandRange(0.92f, 1.08f);
			UGameplayStatics::PlaySoundAtLocation(
				World,
				SoundPtr->Get(),
				ImpactLocation,
				Volume,
				Pitch,
				0.0f,
				CavernAttenuation.Get(),
				CombatSoundConcurrency.Get());
		}
	}

	// Emit metallic spark showers along exact impact normal on stone or forged iron
	if ((SurfaceType == SURFACE_ObsidianStone || SurfaceType == SURFACE_ForgedIron || SurfaceType == SURFACE_WetStone) && IsValid(MetallicSparkVFX))
	{
		UNiagaraFunctionLibrary::SpawnSystemAtLocation(World, MetallicSparkVFX, ImpactLocation, ImpactNormal.Rotation());
	}
}
