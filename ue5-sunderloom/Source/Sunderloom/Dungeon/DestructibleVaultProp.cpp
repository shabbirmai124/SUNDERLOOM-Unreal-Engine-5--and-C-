#include "Dungeon/DestructibleVaultProp.h"
#include "Components/HealthComponent.h"
#include "GeometryCollection/GeometryCollectionComponent.h"
#include "Kismet/GameplayStatics.h"
#include "NiagaraFunctionLibrary.h"

ADestructibleVaultProp::ADestructibleVaultProp()
{
	PrimaryActorTick.bCanEverTick = false;

	GeometryCollection = CreateDefaultSubobject<UGeometryCollectionComponent>(TEXT("GeometryCollection"));
	GeometryCollection->SetSimulatePhysics(false);
	GeometryCollection->SetCollisionProfileName(TEXT("Destructible"));
	RootComponent = GeometryCollection;

	HealthComponent = CreateDefaultSubobject<UHealthComponent>(TEXT("HealthComponent"));
}

void ADestructibleVaultProp::BeginPlay()
{
	Super::BeginPlay();

	if (IsValid(HealthComponent))
	{
		HealthComponent->OnDeath.AddDynamic(this, &ADestructibleVaultProp::HandlePropShattered);
	}
}

bool ADestructibleVaultProp::IsCombatDead() const
{
	return IsValid(HealthComponent) ? HealthComponent->IsDead() : true;
}

void ADestructibleVaultProp::ApplyHitReaction(const FVector& HitDirection, float PoiseDamage, bool bIsHeavyHit)
{
	// Chaos strain is applied upon shatter in HandlePropShattered
}

void ADestructibleVaultProp::HandlePropShattered(AActor* DeadActor)
{
	if (IsValid(GeometryCollection))
	{
		GeometryCollection->SetSimulatePhysics(true);
		GeometryCollection->ApplyExternalStrain(0, GetActorLocation(), 120.0f, 1, 1.0f, 500000.0f);
		GeometryCollection->AddRadialImpulse(GetActorLocation(), 220.0f, 650.0f, ERadialImpulseFalloff::RIF_Linear, true);
	}

	if (bVolatileEmberBarrel)
	{
		UGameplayStatics::ApplyRadialDamage(
			this,
			ExplosionDamage,
			GetActorLocation(),
			ExplosionRadiusCm,
			UDamageType::StaticClass(),
			TArray<AActor*>(),
			this,
			nullptr,
			true);
	}

	if (IsValid(ShatterExplosionVFX))
	{
		UNiagaraFunctionLibrary::SpawnSystemAtLocation(this, ShatterExplosionVFX, GetActorLocation(), FRotator::ZeroRotator);
	}

	// Automatic debris cleanup timer protects 60+ FPS performance budget
	SetLifeSpan(DebrisCleanupSeconds);
}
