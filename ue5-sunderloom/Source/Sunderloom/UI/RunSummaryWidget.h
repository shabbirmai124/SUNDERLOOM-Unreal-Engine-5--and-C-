#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "Core/SunderloomTypes.h"
#include "RunSummaryWidget.generated.h"

class UTextBlock;
class UButton;

UCLASS()
class SUNDERLOOM_API URunSummaryWidget : public UUserWidget
{
	GENERATED_BODY()

public:
	virtual void NativeConstruct() override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|UI")
	void PopulateRunSummary(const FActiveRunState& FinalRunState, bool bVictory);

protected:
	UFUNCTION()
	void HandleRestartClicked();

	UPROPERTY(meta = (BindWidget))
	TObjectPtr<UTextBlock> TXT_OutcomeTitle;

	UPROPERTY(meta = (BindWidget))
	TObjectPtr<UTextBlock> TXT_FloorReached;

	UPROPERTY(meta = (BindWidget))
	TObjectPtr<UTextBlock> TXT_EnemiesSlain;

	UPROPERTY(meta = (BindWidget))
	TObjectPtr<UTextBlock> TXT_AetherBanked;

	UPROPERTY(meta = (BindWidget))
	TObjectPtr<UButton> BTN_StartNewRun;
};
