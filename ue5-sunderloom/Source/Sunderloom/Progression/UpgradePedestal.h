#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/InteractionInterface.h"
#include "Core/SunderloomTypes.h"
#include "UpgradePedestal.generated.h"

class USphereComponent;
class AUpgradePedestal;

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnRelicClaimedSignature, AUpgradePedestal*, ClaimedPedestal);

UCLASS()
class SUNDERLOOM_API AUpgradePedestal : public AActor, public IInteractionInterface
{
	GENERATED_BODY()

public:
	AUpgradePedestal();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Relic")
	void AssignRelic(const FLoomRelicData& InRelic);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Relic")
	void DissolveUnclaimed();

	// IInteractionInterface
	virtual void ShowInteractionPrompt(AActor* Interactor) override;
	virtual void HideInteractionPrompt(AActor* Interactor) override;
	virtual void ExecuteInteract(AActor* Interactor) override;
	virtual FText GetInteractionPromptText() const override;

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Relic")
	FOnRelicClaimedSignature OnRelicClaimed;

protected:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Relic")
	TObjectPtr<USphereComponent> InteractionSphere;

	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Relic")
	FLoomRelicData AssignedRelic;

	bool bIsConsumed = false;
};
