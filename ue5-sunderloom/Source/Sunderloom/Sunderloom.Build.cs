using UnrealBuildTool;

public class Sunderloom : ModuleRules
{
	public Sunderloom(ReadOnlyTargetRules Target) : base(Target)
	{
		PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

		PublicDependencyModuleNames.AddRange(new string[]
		{
			"Core",
			"CoreUObject",
			"Engine",
			"InputCore",
			"EnhancedInput",
			"AIModule",
			"NavigationSystem",
			"GameplayTasks",
			"UMG",
			"Slate",
			"SlateCore",
			"Niagara",
			"PhysicsCore",
			"GeometryCollectionEngine",
			"MotionWarping",
			"MetasoundEngine"
		});

		PrivateDependencyModuleNames.AddRange(new string[] { });

		PublicIncludePaths.AddRange(new string[]
		{
			ModuleDirectory
		});
	}
}
