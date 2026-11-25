#include "Components/WeaponSweepNotifyState.h"
#include "Components/CombatComponent.h"
#include "Components/SkeletalMeshComponent.h"

void UAnimNotifyState_WeaponSweep::NotifyBegin(USkeletalMeshComponent* MeshComp, UAnimSequenceBase* Animation, float TotalDuration, const FAnimNotifyEventReference& EventReference)
{
	if (!IsValid(MeshComp) || !IsValid(MeshComp->GetOwner())) return;
	if (UCombatComponent* Combat = MeshComp->GetOwner()->FindComponentByClass<UCombatComponent>())
	{
		Combat->BeginWeaponSweep(MeshComp);
	}
}

void UAnimNotifyState_WeaponSweep::NotifyTick(USkeletalMeshComponent* MeshComp, UAnimSequenceBase* Animation, float FrameDeltaTime, const FAnimNotifyEventReference& EventReference)
{
	if (!IsValid(MeshComp) || !IsValid(MeshComp->GetOwner())) return;
	if (UCombatComponent* Combat = MeshComp->GetOwner()->FindComponentByClass<UCombatComponent>())
	{
		Combat->TickWeaponSweep(MeshComp);
	}
}

void UAnimNotifyState_WeaponSweep::NotifyEnd(USkeletalMeshComponent* MeshComp, UAnimSequenceBase* Animation, const FAnimNotifyEventReference& EventReference)
{
	if (!IsValid(MeshComp) || !IsValid(MeshComp->GetOwner())) return;
	if (UCombatComponent* Combat = MeshComp->GetOwner()->FindComponentByClass<UCombatComponent>())
	{
		Combat->EndWeaponSweep();
	}
}

void UAnimNotify_ComboWindow::Notify(USkeletalMeshComponent* MeshComp, UAnimSequenceBase* Animation, const FAnimNotifyEventReference& EventReference)
{
	if (!IsValid(MeshComp) || !IsValid(MeshComp->GetOwner())) return;
	if (UCombatComponent* Combat = MeshComp->GetOwner()->FindComponentByClass<UCombatComponent>())
	{
		Combat->NotifyComboWindowOpened();
	}
}
