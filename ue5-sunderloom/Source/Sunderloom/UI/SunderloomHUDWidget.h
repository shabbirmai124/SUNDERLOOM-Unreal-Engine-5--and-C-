#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "SunderloomHUDWidget.generated.h"

class UProgressBar;
class UTextBlock;
class UHealthComponent;

UCLASS()
class SUNDERLOOM_API USunderloomHUDWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	UFUNCTION(BlueprintCallable, Category = "Sunderloom|UI")
	void BindToWarden(APawn* WardenPawn);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|UI")
	void BindToBoss(UHealthComponent* BossHealthComp, const FText& BossDisplayName);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|UI")
	void HideBossBar();

protected:
	UFUNCTION()
	void HandleWardenHealthChanged(float CurrentHealth, float MaxHealth, float Delta);

	UFUNCTION()
	void HandleBossHealthChanged(float CurrentHealth, float MaxHealth, float Delta);

	// Pure BindWidget metadata — zero Tick polling allowed
	UPROPERTY(meta = (BindWidget))
	TObjectPtr<UProgressBar> PB_WardenHealth;

	UPROPERTY(meta = (BindWidget))
	TObjectPtr<UTextBlock> TXT_WardenHealth;

	UPROPERTY(meta = (BindWidget))
	TObjectPtr<UTextBlock> TXT_FloorNumber;

	UPROPERTY(meta = (BindWidgetOptional))
	TObjectPtr<UProgressBar> PB_BossHealth;

	UPROPERTY(meta = (BindWidgetOptional))
	TObjectPtr<UTextBlock> TXT_BossName;
};
