#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "SaveSystem/SunderloomSaveGame.h"
#include "SaveManagerSubsystem.generated.h"

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnProfileLoadedSignature, bool, bSuccess);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FOnProfileSavedSignature, bool, bSuccess);

UCLASS()
class SUNDERLOOM_API USaveManagerSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Save")
	void LoadProfileAsync();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Save")
	void SaveProfileAsync();

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Save")
	void AddAetherThreads(int32 Amount);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Save")
	void RecordFloorReached(int32 FloorNumber);

	UFUNCTION(BlueprintCallable, Category = "Sunderloom|Save")
	void IncrementBossesSlain();

	UFUNCTION(BlueprintPure, Category = "Sunderloom|Save")
	USunderloomSaveGame* GetActiveProfile() const { return ActiveSaveProfile; }

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Save")
	FOnProfileLoadedSignature OnProfileLoaded;

	UPROPERTY(BlueprintAssignable, Category = "Sunderloom|Save")
	FOnProfileSavedSignature OnProfileSaved;

private:
	void HandleAsyncLoadComplete(const FString& SlotName, int32 UserIndex, USaveGame* LoadedSave);
	void HandleAsyncSaveComplete(const FString& SlotName, int32 UserIndex, bool bSuccess);

	UPROPERTY()
	TObjectPtr<USunderloomSaveGame> ActiveSaveProfile;

	static const FString ProfileSlotName;
	static constexpr int32 ProfileUserIndex = 0;
};
