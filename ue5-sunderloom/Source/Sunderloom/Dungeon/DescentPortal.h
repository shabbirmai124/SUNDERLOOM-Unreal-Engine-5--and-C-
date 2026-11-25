#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Core/InteractionInterface.h"
#include "DescentPortal.generated.h"

class USphereComponent;

UCLASS()
class SUNDERLOOM_API ADescentPortal : public AActor, public IInteractionInterface
{
	GENERATED_BODY()

public:
	ADescentPortal();

	virtual void ShowInteractionPrompt(AActor* Interactor) override;
	virtual void HideInteractionPrompt(AActor* Interactor) override;
	virtual void ExecuteInteract(AActor* Interactor) override;
	virtual FText GetInteractionPromptText() const override;

protected:
	UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Sunderloom|Portal")
	TObjectPtr<USphereComponent> InteractionSphere;
};
