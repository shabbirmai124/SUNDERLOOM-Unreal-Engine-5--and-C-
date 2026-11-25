#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "Core/SunderloomTypes.h"
#include "SunderloomPlayerController.generated.h"

class UInputMappingContext;
class USunderloomHUDWidget;
class URunSummaryWidget;
class UUserWidget;
class UCameraShakeBase;

UCLASS()
class SUNDERLOOM_API ASunderloomPlayerController : public APlayerController
{
	GENERATED_BODY()

public:
	ASunderloomPlayerController();

	virtual void BeginPlay() override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Input")
	void ApplyGameOnlyInputMode();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Input")
	void ApplyUIOnlyInputMode(UUserWidget* FocusWidget);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|UI")
	void TogglePauseMenu();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|UI")
	void ShowRunSummary(const FActiveRunState& FinalRunState, bool bVictory);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Juice")
	void TriggerScaledCameraShake(bool bHeavyImpact, float Scale = 1.0f);

	UFUNCTION(BlueprintPure, Category = "Sunderloom|UI")
	USunderloomHUDWidget* GetHUDWidget() const { return HUDWidget; }

protected:
	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Input")
	TObjectPtr<UInputMappingContext> MasterInputMappingContext;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|UI")
	TSubclassOf<USunderloomHUDWidget> HUDWidgetClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|UI")
	TSubclassOf<UUserWidget> PauseMenuWidgetClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|UI")
	TSubclassOf<URunSummaryWidget> RunSummaryWidgetClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Juice")
	TSubclassOf<UCameraShakeBase> LightCameraShakeClass;

	UPROPERTY(EditDefaultsOnly, BlueprintReadOnly, Category = "Sunderloom|Juice")
	TSubclassOf<UCameraShakeBase> HeavyCameraShakeClass;

private:
	UPROPERTY()
	TObjectPtr<USunderloomHUDWidget> HUDWidget;

	UPROPERTY()
	TObjectPtr<UUserWidget> PauseMenuWidget;

	UPROPERTY()
	TObjectPtr<URunSummaryWidget> RunSummaryWidget;

	bool bIsPausedByMenu = false;
};
