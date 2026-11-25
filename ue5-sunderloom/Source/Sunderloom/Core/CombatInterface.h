#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "Core/SunderloomTypes.h"
#include "CombatInterface.generated.h"

class UHealthComponent;

UINTERFACE(MinimalAPI, Blueprintable)
class UCombatInterface : public UInterface
{
	GENERATED_BODY()
};

class SUNDERLOOM_API ICombatInterface
{
	GENERATED_BODY()

public:
	virtual UHealthComponent* GetHealthComponent() const = 0;
	virtual EFactionID GetFactionID() const = 0;
	virtual bool IsCombatDead() const = 0;
	virtual void ApplyHitReaction(const FVector& HitDirection, float PoiseDamage, bool bIsHeavyHit) = 0;
};
