#include "Components/RuneProjectile.h"
#include "Components/SphereComponent.h"
#include "Components/HealthComponent.h"
#include "Core/CombatInterface.h"
#include "GameFramework/ProjectileMovementComponent.h"
#include "NiagaraFunctionLibrary.h"

ARuneProjectile::ARuneProjectile()
{
	PrimaryActorTick.bCanEverTick = false;

	CollisionSphere = CreateDefaultSubobject<USphereComponent>(TEXT("CollisionSphere"));
	CollisionSphere->InitSphereRadius(18.0f);
	CollisionSphere->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = CollisionSphere;

	ProjectileMovement = CreateDefaultSubobject<UProjectileMovementComponent>(TEXT("ProjectileMovement"));
	ProjectileMovement->InitialSpeed = 1650.0f;
	ProjectileMovement->MaxSpeed = 1650.0f;
	ProjectileMovement->ProjectileGravityScale = 0.0f;
	ProjectileMovement->bRotationFollowsVelocity = true;
}

void ARuneProjectile::InitializeProjectile(EFactionID InFaction, float InDamage)
{
	OwnerFaction = InFaction;
	ProjectileDamage = InDamage;
}

void ARuneProjectile::BeginPlay()
{
	Super::BeginPlay();
	SetLifeSpan(MaxLifespanSeconds);

	if (IsValid(CollisionSphere))
	{
		CollisionSphere->OnComponentBeginOverlap.AddDynamic(this, &ARuneProjectile::HandleProjectileOverlap);
	}
}

void ARuneProjectile::HandleProjectileOverlap(UPrimitiveComponent* OverlappedComp, AActor* OtherActor, UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (!IsValid(OtherActor) || OtherActor == GetOwner())
	{
		return;
	}

	if (ICombatInterface* TargetCombat = Cast<ICombatInterface>(OtherActor))
	{
		if (TargetCombat->IsCombatDead())
		{
			return;
		}
		if (TargetCombat->GetFactionID() == OwnerFaction && OwnerFaction != EFactionID::NeutralProp)
		{
			return;
		}
		if (UHealthComponent* Health = TargetCombat->GetHealthComponent())
		{
			Health->ApplyUnifiedDamage(ProjectileDamage, GetActorLocation(), GetOwner(), false, false);
		}
		TargetCombat->ApplyHitReaction(GetActorForwardVector(), 12.0f, false);
	}

	if (IsValid(ImpactVFX))
	{
		UNiagaraFunctionLibrary::SpawnSystemAtLocation(this, ImpactVFX, GetActorLocation(), GetActorRotation());
	}

	Destroy();
}
