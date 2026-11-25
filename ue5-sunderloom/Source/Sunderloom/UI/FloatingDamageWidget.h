#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "FloatingDamageWidget.generated.h"

class UTextBlock;

UCLASS()
class SUNDERLOOM_API UFloatingDamageWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Juice")
	void InitializeDamageNumber(float DamageAmount, bool bWasCritical);

protected:
	UPROPERTY(meta = (BindWidget))
	TObjectPtr<UTextBlock> TXT_DamageValue;
};
