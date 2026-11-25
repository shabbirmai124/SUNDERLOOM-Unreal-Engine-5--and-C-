#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "InteractionInterface.generated.h"

UINTERFACE(MinimalAPI, Blueprintable)
class UInteractionInterface : public UInterface
{
	GENERATED_BODY()
};

class SUNDERLOOM_API IInteractionInterface
{
	GENERATED_BODY()

public:
	virtual void ShowInteractionPrompt(AActor* Interactor) = 0;
	virtual void HideInteractionPrompt(AActor* Interactor) = 0;
	virtual void ExecuteInteract(AActor* Interactor) = 0;
	virtual FText GetInteractionPromptText() const = 0;
};
