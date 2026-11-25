// Copyright (c) 2026 SUNDERLOOM. Strict Unreal Engine 5.8 C++ Architecture.

#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "Core/SunderloomTypes.h"
#include "SettingsMenuWidget.generated.h"

class UButton;
class UCheckBox;
class USlider;
class UTextBlock;

/**
 * Pure Delegate-Driven UMG Settings Menu bound via meta=(BindWidget).
 * Zero Tick polling; directly updates USunderloomGameUserSettings and active AWardenCharacter camera.
 */
UCLASS(Abstract)
class SUNDERLOOM_API USettingsMenuWidget : public UUserWidget
{
    GENERATED_BODY()

public:
    UFUNCTION(BlueprintCallable, Category = "Sunderloom|Settings")
    void SetCameraPreset(ECameraViewPreset NewPreset);

    UFUNCTION(BlueprintCallable, Category = "Sunderloom|Settings")
    void CycleCameraPreset();

protected:
    virtual void NativeConstruct() override;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<UButton> CameraPresetButton;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<UTextBlock> CameraPresetText;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<UCheckBox> AutoFollowCheckBox;

    UPROPERTY(meta = (BindWidgetOptional))
    TObjectPtr<UCheckBox> BattlefieldClearCheckBox;

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
    void RefreshCameraPresetLabel(ECameraViewPreset Preset);

    UFUNCTION()
    void HandleFOVChanged(float NewValue);

    UFUNCTION()
    void HandleVolumeChanged(float NewValue);

    UFUNCTION()
    void HandleCameraPresetClicked();

    UFUNCTION()
    void HandleApplyClicked();
};
