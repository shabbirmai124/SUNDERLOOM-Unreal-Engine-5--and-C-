using UnrealBuildTool;
using System.Collections.Generic;

public class SunderloomEditorTarget : TargetRules
{
	public SunderloomEditorTarget(TargetInfo Target) : base(Target)
	{
		Type = TargetType.Editor;
		DefaultBuildSettings = BuildSettingsVersion.V5;
		IncludeOrderVersion = EngineIncludeOrderVersion.Unreal5_4;
		ExtraModuleNames.Add("Sunderloom");
	}
}
