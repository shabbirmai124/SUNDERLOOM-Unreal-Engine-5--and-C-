#include "AI/BTService_UpdateCombatState.h"
#include "AIController.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "Character/LoombornEnemyBase.h"
#include "Components/HealthComponent.h"
#include "Components/CombatComponent.h"

UBTService_UpdateCombatState::UBTService_UpdateCombatState()
{
	NodeName = TEXT("Update Combat State (0.25s)");
	Interval = 0.25f;
	RandomDeviation = 0.05f;
}

void UBTService_UpdateCombatState::TickNode(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory, float DeltaSeconds)
{
	Super::TickNode(OwnerComp, NodeMemory, DeltaSeconds);

	AAIController* AICon = OwnerComp.GetAIOwner();
	UBlackboardComponent* BB = OwnerComp.GetBlackboardComponent();
	if (!IsValid(AICon) || !IsValid(BB)) return;

	ALoombornEnemyBase* Enemy = Cast<ALoombornEnemyBase>(AICon->GetPawn());
	if (!IsValid(Enemy)) return;

	if (UHealthComponent* Health = Enemy->GetHealthComponent())
	{
		BB->SetValueAsFloat(HealthPercentKey.SelectedKeyName, Health->GetHealthPercent());
	}

	if (UCombatComponent* Combat = Enemy->FindComponentByClass<UCombatComponent>())
	{
		const ECombatState State = Combat->GetCombatState();
		BB->SetValueAsBool(IsStaggeredKey.SelectedKeyName, State == ECombatState::Staggered || State == ECombatState::Dead);
	}

	if (AActor* Target = Cast<AActor>(BB->GetValueAsObject(TargetActorKey.SelectedKeyName)))
	{
		const float Dist = FVector::Dist(Enemy->GetActorLocation(), Target->GetActorLocation());
		BB->SetValueAsFloat(DistanceKey.SelectedKeyName, Dist);
	}
}
