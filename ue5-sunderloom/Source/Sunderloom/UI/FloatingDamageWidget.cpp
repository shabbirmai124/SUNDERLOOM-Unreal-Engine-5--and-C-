#include "UI/FloatingDamageWidget.h"
#include "Components/TextBlock.h"

void UFloatingDamageWidget::InitializeDamageNumber(float DamageAmount, bool bWasCritical)
{
	if (!IsValid(TXT_DamageValue)) return;

	const FString DisplayStr = bWasCritical
		? FString::Printf(TEXT("%d!"), FMath::RoundToInt(DamageAmount))
		: FString::Printf(TEXT("%d"), FMath::RoundToInt(DamageAmount));

	TXT_DamageValue->SetText(FText::FromString(DisplayStr));
	TXT_DamageValue->SetColorAndOpacity(bWasCritical
		? FSlateColor(FLinearColor(0.96f, 0.72f, 0.14f, 1.0f))  // Gold Critical
		: FSlateColor(FLinearColor(0.94f, 0.96f, 0.99f, 1.0f)));

	SetRenderScale(bWasCritical ? FVector2D(1.35f, 1.35f) : FVector2D(1.0f, 1.0f));
}
