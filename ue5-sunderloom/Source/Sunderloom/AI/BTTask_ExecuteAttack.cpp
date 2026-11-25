#include "AI/BTTask_ExecuteAttack.h"
#include "AIController.h"
#include "BehaviorTree/BlackboardComponent.h"
#include "Character/LoombornEnemyBase.h"

UBTTask_ExecuteAttack::UBTTask_ExecuteAttack()
{
	NodeName = TEXT("Execute Telegraphed Attack");
}

EBTNodeResult::Type UBTTask_ExecuteAttack::ExecuteTask(UBehaviorTreeComponent& OwnerComp, uint8* NodeMemory)
{
	AAIController* AICon = OwnerComp.GetAIOwner();
	UBlackboardComponent* BB = OwnerComp.GetBlackboardComponent();
	if (!IsValid(AICon) || !IsValid(BB))
	{
		return EBTNodeResult::Failed;
	}

	ALoombornEnemyBase* Enemy = Cast<ALoombornEnemyBase>(AICon->GetPawn());
	AActor* Target = Cast<AActor>(BB->GetValueAsObject(TargetActorKey.SelectedKeyName));
	if (!IsValid(Enemy) || !IsValid(Target) || Enemy->IsCombatDead())
	{
		return EBTNodeResult::Failed;
	}

	Enemy->ExecuteTelegraphedAttack(Target);
	return EBTNodeResult::Succeeded;
}
