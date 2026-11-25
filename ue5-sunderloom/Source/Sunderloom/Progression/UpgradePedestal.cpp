#include "Progression/UpgradePedestal.h"
#include "Components/SphereComponent.h"
#include "Components/StatsComponent.h"
#include "Character/WardenCharacter.h"

AUpgradePedestal::AUpgradePedestal()
{
	PrimaryActorTick.bCanEverTick = false;

	InteractionSphere = CreateDefaultSubobject<USphereComponent>(TEXT("InteractionSphere"));
	InteractionSphere->InitSphereRadius(160.0f);
	InteractionSphere->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
	RootComponent = InteractionSphere;
}

void AUpgradePedestal::AssignRelic(const FLoomRelicData& InRelic)
{
	AssignedRelic = InRelic;
	bIsConsumed = false;
}

void AUpgradePedestal::DissolveUnclaimed()
{
	bIsConsumed = true;
	Destroy();
}

void AUpgradePedestal::ShowInteractionPrompt(AActor* Interactor) {}
void AUpgradePedestal::HideInteractionPrompt(AActor* Interactor) {}

FText AUpgradePedestal::GetInteractionPromptText() const
{
	return FText::Format(
		NSLOCTEXT("Sunderloom", "RelicPrompt", "Press E — Claim {0}: {1}"),
		AssignedRelic.DisplayName,
		AssignedRelic.Description
	);
}

void AUpgradePedestal::ExecuteInteract(AActor* Interactor)
{
	if (bIsConsumed) return;

	AWardenCharacter* Warden = Cast<AWardenCharacter>(Interactor);
	if (!IsValid(Warden)) return;

	if (UStatsComponent* Stats = Warden->GetStatsComponent())
	{
		bIsConsumed = true;
		Stats->AddRelic(AssignedRelic);
		OnRelicClaimed.Broadcast(this);
		Destroy();
	}
}
