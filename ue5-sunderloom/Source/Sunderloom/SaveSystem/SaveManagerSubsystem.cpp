#include "SaveSystem/SaveManagerSubsystem.h"
#include "Kismet/GameplayStatics.h"
#include "Sunderloom.h"

const FString USaveManagerSubsystem::ProfileSlotName(TEXT("Sunderloom_WardenProfile"));

void USaveManagerSubsystem::Initialize(FSubsystemCollectionBase& Collection)
{
	Super::Initialize(Collection);
	ActiveSaveProfile = Cast<USunderloomSaveGame>(UGameplayStatics::CreateSaveGameObject(USunderloomSaveGame::StaticClass()));
}

void USaveManagerSubsystem::LoadProfileAsync()
{
	if (!UGameplayStatics::DoesSaveGameExist(ProfileSlotName, ProfileUserIndex))
	{
		ActiveSaveProfile = Cast<USunderloomSaveGame>(UGameplayStatics::CreateSaveGameObject(USunderloomSaveGame::StaticClass()));
		OnProfileLoaded.Broadcast(true);
		return;
	}

	FAsyncLoadGameFromSlotDelegate LoadDelegate;
	LoadDelegate.BindUObject(this, &USaveManagerSubsystem::HandleAsyncLoadComplete);
	UGameplayStatics::AsyncLoadGameFromSlot(ProfileSlotName, ProfileUserIndex, LoadDelegate);
}

void USaveManagerSubsystem::SaveProfileAsync()
{
	if (!IsValid(ActiveSaveProfile))
	{
		ActiveSaveProfile = Cast<USunderloomSaveGame>(UGameplayStatics::CreateSaveGameObject(USunderloomSaveGame::StaticClass()));
	}

	FAsyncSaveGameToSlotDelegate SaveDelegate;
	SaveDelegate.BindUObject(this, &USaveManagerSubsystem::HandleAsyncSaveComplete);
	UGameplayStatics::AsyncSaveGameToSlot(ActiveSaveProfile, ProfileSlotName, ProfileUserIndex, SaveDelegate);
}

void USaveManagerSubsystem::AddAetherThreads(int32 Amount)
{
	if (IsValid(ActiveSaveProfile) && Amount > 0)
	{
		ActiveSaveProfile->TotalAetherThreads += Amount;
	}
}

void USaveManagerSubsystem::RecordFloorReached(int32 FloorNumber)
{
	if (IsValid(ActiveSaveProfile) && FloorNumber > ActiveSaveProfile->HighestFloorReached)
	{
		ActiveSaveProfile->HighestFloorReached = FloorNumber;
	}
}

void USaveManagerSubsystem::IncrementBossesSlain()
{
	if (IsValid(ActiveSaveProfile))
	{
		ActiveSaveProfile->TotalBossesSlain += 1;
	}
}

void USaveManagerSubsystem::HandleAsyncLoadComplete(const FString& SlotName, int32 UserIndex, USaveGame* LoadedSave)
{
	if (USunderloomSaveGame* CastSave = Cast<USunderloomSaveGame>(LoadedSave))
	{
		ActiveSaveProfile = CastSave;
		OnProfileLoaded.Broadcast(true);
	}
	else
	{
		ActiveSaveProfile = Cast<USunderloomSaveGame>(UGameplayStatics::CreateSaveGameObject(USunderloomSaveGame::StaticClass()));
		OnProfileLoaded.Broadcast(false);
	}
}

void USaveManagerSubsystem::HandleAsyncSaveComplete(const FString& SlotName, int32 UserIndex, bool bSuccess)
{
	if (!bSuccess)
	{
		UE_LOG(LogSunderloom, Warning, TEXT("[SaveManager] Async save failed for slot %s"), *SlotName);
	}
	OnProfileSaved.Broadcast(bSuccess);
}
