#include "UI/SunderloomHUDWidget.h"
#include "Components/HealthComponent.h"
#include "Core/SunderloomGameInstance.h"
#include "Components/ProgressBar.h"
#include "Components/TextBlock.h"

void USunderloomHUDWidget::BindToWarden(APawn* WardenPawn)
{
	if (IsValid(WardenPawn))
	{
		if (UHealthComponent* Health = WardenPawn->FindComponentByClass<UHealthComponent>())
		{
			Health->OnHealthChanged.AddDynamic(this, &USunderloomHUDWidget::HandleWardenHealthChanged);
			HandleWardenHealthChanged(Health->GetCurrentHealth(), Health->GetMaxHealth(), 0.0f);
		}
	}

	if (IsValid(TXT_FloorNumber))
	{
		int32 Floor = 1;
		if (USunderloomGameInstance* GI = Cast<USunderloomGameInstance>(GetGameInstance()))
		{
			Floor = GI->GetCurrentFloor();
		}
		TXT_FloorNumber->SetText(FText::FromString(FString::Printf(TEXT("Floor %d"), Floor)));
	}

	HideBossBar();
}

void USunderloomHUDWidget::HandleWardenHealthChanged(float CurrentHealth, float MaxHealth, float Delta)
{
	if (IsValid(PB_WardenHealth) && MaxHealth > 0.0f)
	{
		PB_WardenHealth->SetPercent(FMath::Clamp(CurrentHealth / MaxHealth, 0.0f, 1.0f));
	}
	if (IsValid(TXT_WardenHealth))
	{
		TXT_WardenHealth->SetText(FText::FromString(FString::Printf(TEXT("%d / %d"), FMath::RoundToInt(CurrentHealth), FMath::RoundToInt(MaxHealth))));
	}
}

void USunderloomHUDWidget::BindToBoss(UHealthComponent* BossHealthComp, const FText& BossDisplayName)
{
	if (!IsValid(BossHealthComp)) return;

	BossHealthComp->OnHealthChanged.AddDynamic(this, &USunderloomHUDWidget::HandleBossHealthChanged);
	if (IsValid(TXT_BossName))
	{
		TXT_BossName->SetText(BossDisplayName);
		TXT_BossName->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
	}
	if (IsValid(PB_BossHealth))
	{
		PB_BossHealth->SetVisibility(ESlateVisibility::SelfHitTestInvisible);
	}
	HandleBossHealthChanged(BossHealthComp->GetCurrentHealth(), BossHealthComp->GetMaxHealth(), 0.0f);
}

void USunderloomHUDWidget::HandleBossHealthChanged(float CurrentHealth, float MaxHealth, float Delta)
{
	if (IsValid(PB_BossHealth) && MaxHealth > 0.0f)
	{
		PB_BossHealth->SetPercent(FMath::Clamp(CurrentHealth / MaxHealth, 0.0f, 1.0f));
	}
	if (CurrentHealth <= 0.0f)
	{
		HideBossBar();
	}
}

void USunderloomHUDWidget::HideBossBar()
{
	if (IsValid(PB_BossHealth)) PB_BossHealth->SetVisibility(ESlateVisibility::Collapsed);
	if (IsValid(TXT_BossName))  TXT_BossName->SetVisibility(ESlateVisibility::Collapsed);
}
