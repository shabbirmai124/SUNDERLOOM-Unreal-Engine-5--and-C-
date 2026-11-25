// Copyright (c) 2026 SUNDERLOOM. Strict Unreal Engine 5.8 C++ Architecture.

#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "SettingsMenuWidget.generated.h"

class UButton;
class UCheckBox;
class USlider;
class UTextBlock;

/**
 * Pure Delegate-Driven UMG Settings Menu bound via meta=(BindWidget).
 * Zero Tick polling; directly updates USunderloomGameUserSettings.
 */
UCLASS(Abstract)
class SUNDERLOOM_API USettingsMenuWidget : public UUserWidget
{
    GENERATED_BODY()

protected:
    virtual void NativeConstruct() override;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<USlider> FOVSlider;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<UTextBlock> FOVValueText;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<USlider> MasterVolumeSlider;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<UCheckBox> LumenGICheckBox;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<UCheckBox> BloomCheckBox;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<UCheckBox> CameraShakeCheckBox;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<UButton> ApplyButton;

private:
    UFUNCTION()
    void HandleFOVChanged(float NewValue);

    UFUNCTION()
    void HandleVolumeChanged(float NewValue);

    UFUNCTION()
    void HandleApplyClicked();
};
