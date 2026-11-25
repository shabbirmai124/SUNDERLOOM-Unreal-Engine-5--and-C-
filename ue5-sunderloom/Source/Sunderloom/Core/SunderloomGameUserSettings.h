// Copyright (c) 2026 SUNDERLOOM. Strict Unreal Engine 5.8 C++ Architecture.

#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameUserSettings.h"
#include "Core/SunderloomTypes.h"
#include "SunderloomGameUserSettings.generated.h"

/**
 * Persistent Unreal Engine 5.8 GameUserSettings driving Lumen GI/Reflections,
 * Virtual Shadow Maps, Camera View Modes (3rd Person, FPS, Top-Down, Cinematic),
 * Auto-Follow Travel View, Battlefield Clear Room View, Audio Volume, and Screen Shake.
 */
UCLASS(Config = GameUserSettings)
class SUNDERLOOM_API USunderloomGameUserSettings : public UGameUserSettings
{
    GENERATED_BODY()

public:
    USunderloomGameUserSettings(const FObjectInitializer& ObjectInitializer);

    UFUNCTION(BlueprintCallable, Category = "Sunderloom|Settings")
    static USunderloomGameUserSettings* GetSunderloomUserSettings();

    UFUNCTION(BlueprintCallable, Category = "Sunderloom|Settings")
    void ApplySunderloomSettings(bool bCheckForCommandLineOverrides = false);

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Camera")
    ECameraViewPreset CameraViewPreset = ECameraViewPreset::ThirdPerson;

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Camera")
    bool bAutoFollowCamera = true;

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Camera")
    bool bBattlefieldClearView = true;

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Video", meta = (ClampMin = "40.0", ClampMax = "90.0"))
    float CameraFieldOfView = 54.0f;

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Video")
    bool bEnableLumenGI = true;

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Video")
    bool bEnableVolumetricBloom = true;

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Audio", meta = (ClampMin = "0.0", ClampMax = "1.0"))
    float MasterAudioVolume = 0.8f;

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Audio")
    bool bAudioMuted = false;

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Gameplay")
    bool bCameraShakeEnabled = true;

    UPROPERTY(Config, BlueprintReadWrite, Category = "Sunderloom|Settings|Gameplay")
    bool bShowMinimap = true;
};
