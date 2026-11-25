#include "AI/EnemyAIController.h"
#include "Character/LoombornEnemyBase.h"
#include "Core/CombatInterface.h"
#include "Perception/AIPerceptionComponent.h"
#include "Perception/AISenseConfig_Sight.h"
#include "Perception/AISenseConfig_Damage.h"
#include "BehaviorTree/BehaviorTree.h"
#include "BehaviorTree/BlackboardComponent.h"

const FName AEnemyAIController::Key_TargetActor(TEXT("TargetActor"));
const FName AEnemyAIController::Key_LastKnownLocation(TEXT("LastKnownLocation"));
const FName AEnemyAIController::Key_CanSeeTarget(TEXT("CanSeeTarget"));

AEnemyAIController::AEnemyAIController()
{
	PrimaryActorTick.bCanEverTick = false;

	SunderloomPerception = CreateDefaultSubobject<UAIPerceptionComponent>(TEXT("SunderloomPerception"));
	SetPerceptionComponent(*SunderloomPerception);

	// Dual Sense 1: Sight (LoseSightRadius > SightRadius prevents awareness flicker)
	SightConfig = CreateDefaultSubobject<UAISenseConfig_Sight>(TEXT("SightConfig"));
	SightConfig->SightRadius = 1500.0f;
	SightConfig->LoseSightRadius = 1950.0f;
	SightConfig->PeripheralVisionAngleDegrees = 85.0f;
	SightConfig->SetMaxAge(6.0f);
	SightConfig->DetectionByAffiliation.bDetectEnemies = true;
	SightConfig->DetectionByAffiliation.bDetectNeutrals = true;
	SightConfig->DetectionByAffiliation.bDetectFriendlies = false;

	// Dual Sense 2: Damage (immediately turns and engages when ambushed from behind)
	DamageConfig = CreateDefaultSubobject<UAISenseConfig_Damage>(TEXT("DamageConfig"));
	DamageConfig->SetMaxAge(8.0f);

	SunderloomPerception->ConfigureSense(*SightConfig);
	SunderloomPerception->ConfigureSense(*DamageConfig);
	SunderloomPerception->SetDominantSense(SightConfig->GetSenseImplementation());
	SunderloomPerception->OnTargetPerceptionUpdated.AddDynamic(this, &AEnemyAIController::HandleTargetPerceptionUpdated);
}

void AEnemyAIController::OnPossess(APawn* InPawn)
{
	Super::OnPossess(InPawn);

	if (ALoombornEnemyBase* Enemy = Cast<ALoombornEnemyBase>(InPawn))
	{
		if (UBehaviorTree* BT = Enemy->GetBehaviorTree())
		{
			RunBehaviorTree(BT);
		}
	}
}

void AEnemyAIController::HandleTargetPerceptionUpdated(AActor* Actor, FAIStimulus Stimulus)
{
	if (!IsValid(Actor) || !IsValid(Blackboard)) return;

	const ICombatInterface* CombatTarget = Cast<ICombatInterface>(Actor);
	if (!CombatTarget || CombatTarget->GetFactionID() != EFactionID::Player || CombatTarget->IsCombatDead())
	{
		return;
	}

	if (Stimulus.WasSuccessfullySensed())
	{
		Blackboard->SetValueAsObject(Key_TargetActor, Actor);
		Blackboard->SetValueAsVector(Key_LastKnownLocation, Stimulus.StimulusLocation);
		Blackboard->SetValueAsBool(Key_CanSeeTarget, true);
	}
	else
	{
		Blackboard->SetValueAsVector(Key_LastKnownLocation, Stimulus.StimulusLocation);
		Blackboard->SetValueAsBool(Key_CanSeeTarget, false);
	}
}
