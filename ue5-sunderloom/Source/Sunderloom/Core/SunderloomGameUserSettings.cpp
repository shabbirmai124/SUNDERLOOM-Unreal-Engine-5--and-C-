// Copyright (c) 2026 SUNDERLOOM. Strict Unreal Engine 5.8 C++ Architecture.

#include "Core/SunderloomGameUserSettings.h"
#include "HAL/IConsoleManager.h"

USunderloomGameUserSettings::USunderloomGameUserSettings(const FObjectInitializer& ObjectInitializer)
    : Super(ObjectInitializer)
{
}

USunderloomGameUserSettings* USunderloomGameUserSettings::GetSunderloomUserSettings()
{
    return Cast<USunderloomGameUserSettings>(UGameUserSettings::GetGameUserSettings());
}

void USunderloomGameUserSettings::ApplySunderloomSettings(bool bCheckForCommandLineOverrides)
{
    ApplySettings(bCheckForCommandLineOverrides);

    // Apply Unreal Engine 5.8 Lumen Dynamic Global Illumination toggle via CVar
    if (IConsoleVariable* LumenCVar = IConsoleManager::Get().FindConsoleVariable(TEXT("r.DynamicGlobalIlluminationMethod")))
    {
        LumenCVar->Set(bEnableLumenGI ? 1 : 0, ECVF_SetByGameSetting);
    }

    if (IConsoleVariable* BloomCVar = IConsoleManager::Get().FindConsoleVariable(TEXT("r.BloomQuality")))
    {
        BloomCVar->Set(bEnableVolumetricBloom ? 5 : 0, ECVF_SetByGameSetting);
    }

    SaveSettings();
}
