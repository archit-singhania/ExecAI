using UnrealBuildTool;

public class HalcyonBridge : ModuleRules
{
    public HalcyonBridge(ReadOnlyTargetRules Target) : base(Target)
    {
        PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;

        PublicDependencyModuleNames.AddRange(new string[]
        {
            "Core",
            "CoreUObject",
            "Engine",
            "InputCore",

            "WebSockets",
            "Json",
            "JsonUtilities",

            "Niagara",
        });

        PrivateDependencyModuleNames.AddRange(new string[]
        {
            "RenderCore",
        });
    }
}
