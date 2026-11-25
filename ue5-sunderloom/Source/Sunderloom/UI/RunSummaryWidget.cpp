#include "UI/RunSummaryWidget.h"
#include "Core/SunderloomGameInstance.h"
#include "Components/TextBlock.h"
#include "Components/Button.h"
#include "Kismet/GameplayStatics.h"

void URunSummaryWidget::NativeConstruct()
{
	Super::NativeConstruct();
	if (IsValid(BTN_StartNewRun))
	{
		BTN_StartNewRun->OnClicked.AddDynamic(this, &URunSummaryWidget::HandleRestartClicked);
	}
}

void URunSummaryWidget::PopulateRunSummary(const FActiveRunState& FinalRunState, bool bVictory)
{
	if (IsValid(TXT_OutcomeTitle))
	{
		TXT_OutcomeTitle->SetText(bVictory
			? FText::FromString(TEXT("VAULT CONQUERED"))
			: FText::FromString(TEXT("WARDEN FALLEN")));
	}
	if (IsValid(TXT_FloorReached))
	{
		TXT_FloorReached->SetText(FText::FromString(FString::Printf(TEXT("Floor %d"), FinalRunState.CurrentFloor)));
	}
	if (IsValid(TXT_EnemiesSlain))
	{
		TXT_EnemiesSlain->SetText(FText::AsNumber(FinalRunState.RunKills));
	}
	if (IsValid(TXT_AetherBanked))
	{
		TXT_AetherBanked->SetText(FText::FromString(FString::Printf(TEXT("+%d Aether Threads"), FinalRunState.PendingAetherThreads)));
	}
}

void URunSummaryWidget::HandleRestartClicked()
{
	UGameplayStatics::SetGamePaused(this, false);
	if (USunderloomGameInstance* GI = Cast<USunderloomGameInstance>(GetGameInstance()))
	{
		GI->StartFreshRun(0);
	}
}
