#include "Dungeon/DescentPortal.h"
#include "Components/SphereComponent.h"
#include "Components/HealthComponent.h"
#include "Components/StatsComponent.h"
#include "Character/WardenCharacter.h"
#include "Core/SunderloomGameInstance.h"

ADescentPortal::ADescentPortal()
{
	PrimaryActorTick.bCanEverTick = false;

	InteractionSphere = CreateDefaultSubobject<USphereComponent>(TEXT("InteractionSphere"));
	InteractionSphere->InitSphereRadius(180.0f);
	InteractionSphere->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = InteractionSphere;
}

void ADescentPortal::ShowInteractionPrompt(AActor* Interactor) {}
void ADescentPortal::HideInteractionPrompt(AActor* Interactor) {}

FText ADescentPortal::GetInteractionPromptText() const
{
	return FText::FromString(TEXT("Press E — Descend to Next Floor"));
}

void ADescentPortal::ExecuteInteract(AActor* Interactor)
{
	AWardenCharacter* Warden = Cast<AWardenCharacter>(Interactor);
	USunderloomGameInstance* GI = Cast<USunderloomGameInstance>(GetGameInstance());
	if (!IsValid(Warden) || !IsValid(GI))
	{
		return;
	}

	const float RemainingHP = IsValid(Warden->GetHealthComponent()) ? Warden->GetHealthComponent()->GetCurrentHealth() : 100.0f;
	const TArray<FLoomRelicData> ActiveRelics = IsValid(Warden->GetStatsComponent()) ? Warden->GetStatsComponent()->GetAcquiredRelics() : TArray<FLoomRelicData>();

	GI->AdvanceToNextFloor(RemainingHP, ActiveRelics);
}
