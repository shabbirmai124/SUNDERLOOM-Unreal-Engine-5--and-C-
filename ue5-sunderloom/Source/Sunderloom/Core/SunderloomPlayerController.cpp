#include "Core/SunderloomPlayerController.h"
#include "EnhancedInputSubsystems.h"
#include "UI/SunderloomHUDWidget.h"
#include "UI/RunSummaryWidget.h"
#include "Kismet/GameplayStatics.h"
#include "Sunderloom.h"

ASunderloomPlayerController::ASunderloomPlayerController()
{
	PrimaryActorTick.bCanEverTick = false;
}

void ASunderloomPlayerController::BeginPlay()
{
	Super::BeginPlay();

	// Register Master Input Mapping Context via Enhanced Input Local Player Subsystem
	if (ULocalPlayer* LocalPlayer = GetLocalPlayer())
	{
		if (UEnhancedInputLocalPlayerSubsystem* InputSub = LocalPlayer->GetSubsystem<UEnhancedInputLocalPlayerSubsystem>())
		{
			if (IsValid(MasterInputMappingContext))
			{
				InputSub->AddMappingContext(MasterInputMappingContext, 0);
			}
		}
	}

	// Create delegate-driven HUD widget
	if (IsValid(HUDWidgetClass))
	{
		HUDWidget = CreateWidget<USunderloomHUDWidget>(this, HUDWidgetClass);
		if (IsValid(HUDWidget))
		{
			HUDWidget->AddToViewport(0);
			HUDWidget->BindToWarden(GetPawn());
		}
	}

	ApplyGameOnlyInputMode();
}

void ASunderloomPlayerController::ApplyGameOnlyInputMode()
{
	bShowMouseCursor = false;
	FInputModeGameOnly Mode;
	SetInputMode(Mode);
}

void ASunderloomPlayerController::ApplyUIOnlyInputMode(UUserWidget* FocusWidget)
{
	bShowMouseCursor = true;
	FInputModeGameAndUI Mode;
	Mode.SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock);
	if (IsValid(FocusWidget))
	{
		Mode.SetWidgetToFocus(FocusWidget->TakeWidget());
	}
	SetInputMode(Mode);
}

void ASunderloomPlayerController::TogglePauseMenu()
{
	bIsPausedByMenu = !bIsPausedByMenu;
	UGameplayStatics::SetGamePaused(this, bIsPausedByMenu);

	if (bIsPausedByMenu)
	{
		if (!IsValid(PauseMenuWidget) && IsValid(PauseMenuWidgetClass))
		{
			PauseMenuWidget = CreateWidget<UUserWidget>(this, PauseMenuWidgetClass);
		}
		if (IsValid(PauseMenuWidget))
		{
			PauseMenuWidget->AddToViewport(10);
			ApplyUIOnlyInputMode(PauseMenuWidget);
		}
	}
	else
	{
		if (IsValid(PauseMenuWidget))
		{
			PauseMenuWidget->RemoveFromParent();
		}
		ApplyGameOnlyInputMode();
	}
}

void ASunderloomPlayerController::ShowRunSummary(const FActiveRunState& FinalRunState, bool bVictory)
{
	UGameplayStatics::SetGamePaused(this, true);
	if (!IsValid(RunSummaryWidget) && IsValid(RunSummaryWidgetClass))
	{
		RunSummaryWidget = CreateWidget<URunSummaryWidget>(this, RunSummaryWidgetClass);
	}
	if (IsValid(RunSummaryWidget))
	{
		RunSummaryWidget->PopulateRunSummary(FinalRunState, bVictory);
		RunSummaryWidget->AddToViewport(20);
		ApplyUIOnlyInputMode(RunSummaryWidget);
	}
}

void ASunderloomPlayerController::TriggerScaledCameraShake(bool bHeavyImpact, float Scale)
{
	TSubclassOf<UCameraShakeBase> ShakeClass = bHeavyImpact ? HeavyCameraShakeClass : LightCameraShakeClass;
	if (IsValid(ShakeClass))
	{
		ClientStartCameraShake(ShakeClass, FMath::Clamp(Scale, 0.1f, 2.5f));
	}
}
