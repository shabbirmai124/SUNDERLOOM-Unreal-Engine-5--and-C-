// Copyright (c) 2026 SUNDERLOOM. Strict Unreal Engine 5.8 C++ Architecture.

#include "UI/SettingsMenuWidget.h"
#include "Character/WardenCharacter.h"
#include "Components/Button.h"
#include "Components/CheckBox.h"
#include "Components/Slider.h"
#include "Components/TextBlock.h"
#include "Core/SunderloomGameUserSettings.h"

void USettingsMenuWidget::NativeConstruct()
{
    Super::NativeConstruct();

    if (USunderloomGameUserSettings* Settings = USunderloomGameUserSettings::GetSunderloomUserSettings())
    {
        RefreshCameraPresetLabel(Settings->CameraViewPreset);

        if (CameraPresetButton)
        {
            CameraPresetButton->OnClicked.AddDynamic(this, &USettingsMenuWidget::HandleCameraPresetClicked);
        }
        if (AutoFollowCheckBox)
        {
            AutoFollowCheckBox->SetIsChecked(Settings->bAutoFollowCamera);
        }
        if (BattlefieldClearCheckBox)
        {
            BattlefieldClearCheckBox->SetIsChecked(Settings->bBattlefieldClearView);
        }
        if (FOVSlider)
        {
            FOVSlider->SetMinValue(40.0f);
            FOVSlider->SetMaxValue(90.0f);
            FOVSlider->SetValue(Settings->CameraFieldOfView);
            FOVSlider->OnValueChanged.AddDynamic(this, &USettingsMenuWidget::HandleFOVChanged);
        }
        if (FOVValueText)
        {
            FOVValueText->SetText(FText::FromString(FString::Printf(TEXT("%.0f°"), Settings->CameraFieldOfView)));
        }
        if (MasterVolumeSlider)
        {
            MasterVolumeSlider->SetValue(Settings->MasterAudioVolume);
            MasterVolumeSlider->OnValueChanged.AddDynamic(this, &USettingsMenuWidget::HandleVolumeChanged);
        }
        if (LumenGICheckBox)
        {
            LumenGICheckBox->SetIsChecked(Settings->bEnableLumenGI);
        }
        if (BloomCheckBox)
        {
            BloomCheckBox->SetIsChecked(Settings->bEnableVolumetricBloom);
        }
        if (CameraShakeCheckBox)
        {
            CameraShakeCheckBox->SetIsChecked(Settings->bCameraShakeEnabled);
        }
    }

    if (ApplyButton)
    {
        ApplyButton->OnClicked.AddDynamic(this, &USettingsMenuWidget::HandleApplyClicked);
    }
}

void USettingsMenuWidget::RefreshCameraPresetLabel(ECameraViewPreset Preset)
{
    if (!CameraPresetText) return;
    switch (Preset)
    {
    case ECameraViewPreset::ThirdPerson:
        CameraPresetText->SetText(FText::FromString(TEXT("3rd Person (Running)")));
        break;
    case ECameraViewPreset::FirstPerson:
        CameraPresetText->SetText(FText::FromString(TEXT("First Person (FPS)")));
        break;
    case ECameraViewPreset::TopDown:
        CameraPresetText->SetText(FText::FromString(TEXT("Top-Down Tactical")));
        break;
    case ECameraViewPreset::Cinematic:
        CameraPresetText->SetText(FText::FromString(TEXT("Cinematic")));
        break;
    }
}

void USettingsMenuWidget::SetCameraPreset(ECameraViewPreset NewPreset)
{
    if (USunderloomGameUserSettings* Settings = USunderloomGameUserSettings::GetSunderloomUserSettings())
    {
        Settings->CameraViewPreset = NewPreset;
        RefreshCameraPresetLabel(NewPreset);
        if (AWardenCharacter* Warden = Cast<AWardenCharacter>(GetOwningPlayerPawn()))
        {
            Warden->ApplyCameraPreset(NewPreset);
        }
    }
}

void USettingsMenuWidget::CycleCameraPreset()
{
    if (USunderloomGameUserSettings* Settings = USunderloomGameUserSettings::GetSunderloomUserSettings())
    {
        const uint8 NextIdx = (static_cast<uint8>(Settings->CameraViewPreset) + 1) % 4;
        SetCameraPreset(static_cast<ECameraViewPreset>(NextIdx));
    }
}

void USettingsMenuWidget::HandleCameraPresetClicked()
{
    CycleCameraPreset();
}

void USettingsMenuWidget::HandleFOVChanged(float NewValue)
{
    if (FOVValueText)
    {
        FOVValueText->SetText(FText::FromString(FString::Printf(TEXT("%.0f°"), NewValue)));
    }
}

void USettingsMenuWidget::HandleVolumeChanged(float NewValue)
{
    if (USunderloomGameUserSettings* Settings = USunderloomGameUserSettings::GetSunderloomUserSettings())
    {
        Settings->MasterAudioVolume = FMath::Clamp(NewValue, 0.0f, 1.0f);
    }
}

void USettingsMenuWidget::HandleApplyClicked()
{
    if (USunderloomGameUserSettings* Settings = USunderloomGameUserSettings::GetSunderloomUserSettings())
    {
        if (AutoFollowCheckBox) Settings->bAutoFollowCamera = AutoFollowCheckBox->IsChecked();
        if (BattlefieldClearCheckBox) Settings->bBattlefieldClearView = BattlefieldClearCheckBox->IsChecked();
        if (FOVSlider) Settings->CameraFieldOfView = FOVSlider->GetValue();
        if (MasterVolumeSlider) Settings->MasterAudioVolume = MasterVolumeSlider->GetValue();
        if (LumenGICheckBox) Settings->bEnableLumenGI = LumenGICheckBox->IsChecked();
        if (BloomCheckBox) Settings->bEnableVolumetricBloom = BloomCheckBox->IsChecked();
        if (CameraShakeCheckBox) Settings->bCameraShakeEnabled = CameraShakeCheckBox->IsChecked();
        Settings->ApplySunderloomSettings(false);

        if (AWardenCharacter* Warden = Cast<AWardenCharacter>(GetOwningPlayerPawn()))
        {
            Warden->ApplyCameraPreset(Settings->CameraViewPreset);
        }
    }
}
