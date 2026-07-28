#include "HalcyonQualityDirector.h"

#include "GameFramework/GameUserSettings.h"
#include "HAL/IConsoleManager.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"

AHalcyonQualityDirector::AHalcyonQualityDirector()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = true;
}

void AHalcyonQualityDirector::BeginPlay()
{
    Super::BeginPlay();

    EHalcyonQuality Chosen = Preset;

    if (bReadPresetFromCommandLine)
    {
        EHalcyonQuality FromArgs;
        if (ReadPresetArgument(FromArgs))
        {
            Chosen = FromArgs;
        }
    }

    ApplyPreset(Chosen);
}

bool AHalcyonQualityDirector::ReadPresetArgument(EHalcyonQuality& OutPreset) const
{
    FString Value;
    if (!FParse::Value(FCommandLine::Get(), TEXT("HalcyonQuality="), Value))
    {
        return false;
    }

    Value = Value.ToLower();

    if (Value == TEXT("cinematic") || Value == TEXT("4k"))
    {
        OutPreset = EHalcyonQuality::Cinematic;
        return true;
    }
    if (Value == TEXT("high") || Value == TEXT("1440p"))
    {
        OutPreset = EHalcyonQuality::High;
        return true;
    }
    if (Value == TEXT("balanced") || Value == TEXT("1080p"))
    {
        OutPreset = EHalcyonQuality::Balanced;
        return true;
    }

    return false;
}

void AHalcyonQualityDirector::SetCVarInt(const TCHAR* Name, int32 Value)
{
    if (IConsoleVariable* Var = IConsoleManager::Get().FindConsoleVariable(Name))
    {
        Var->Set(Value, ECVF_SetByGameOverride);
    }
}

void AHalcyonQualityDirector::SetCVarFloat(const TCHAR* Name, float Value)
{
    if (IConsoleVariable* Var = IConsoleManager::Get().FindConsoleVariable(Name))
    {
        Var->Set(Value, ECVF_SetByGameOverride);
    }
}

void AHalcyonQualityDirector::ApplyPreset(EHalcyonQuality NewPreset)
{
    Preset = NewPreset;

    ApplyScalability(NewPreset);
    ApplyRenderFeatures(NewPreset);

    if (bApplyStreamingEncoderSettings)
    {
        ApplyStreamingSettings(NewPreset);
    }

    CurrentScreenPercentage = MaxScreenPercentage;
    SetCVarFloat(TEXT("r.ScreenPercentage"), CurrentScreenPercentage);

    UE_LOG(LogTemp, Log, TEXT("[Halcyon] Quality preset: %s"), *DescribeCurrentQuality());
}

void AHalcyonQualityDirector::ApplyScalability(EHalcyonQuality InPreset)
{
    UGameUserSettings* Settings = GEngine ? GEngine->GetGameUserSettings() : nullptr;
    if (!Settings)
    {
        return;
    }

    const int32 Level = (InPreset == EHalcyonQuality::Balanced) ? 2 : 4;

    Settings->SetViewDistanceQuality(Level);
    Settings->SetAntiAliasingQuality(Level);
    Settings->SetShadowQuality(Level);
    Settings->SetGlobalIlluminationQuality(Level);
    Settings->SetReflectionQuality(Level);
    Settings->SetPostProcessingQuality(Level);
    Settings->SetTextureQuality(Level);
    Settings->SetVisualEffectQuality(Level);
    Settings->SetFoliageQuality(Level);
    Settings->SetShadingQuality(Level);

    switch (InPreset)
    {
    case EHalcyonQuality::Balanced:
        Settings->SetScreenResolution(FIntPoint(1920, 1080));
        break;
    case EHalcyonQuality::High:
        Settings->SetScreenResolution(FIntPoint(2560, 1440));
        break;
    case EHalcyonQuality::Cinematic:
        Settings->SetScreenResolution(FIntPoint(3840, 2160));
        break;
    }

    Settings->SetFrameRateLimit(60.0f);
    Settings->ApplySettings(false);
}

void AHalcyonQualityDirector::ApplyRenderFeatures(EHalcyonQuality InPreset)
{
    const bool bCinematic = (InPreset == EHalcyonQuality::Cinematic);
    const bool bHighOrBetter = (InPreset != EHalcyonQuality::Balanced);

    SetCVarInt(TEXT("r.AntiAliasingMethod"), 4);
    SetCVarFloat(TEXT("r.TSR.History.ScreenPercentage"), bHighOrBetter ? 200.0f : 100.0f);
    SetCVarInt(TEXT("r.TSR.ShadingRejection.Flickering"), 1);

    SetCVarInt(TEXT("r.Lumen.HardwareRayTracing"), bHighOrBetter ? 1 : 0);
    SetCVarInt(TEXT("r.Lumen.Reflections.HardwareRayTracing"), bHighOrBetter ? 1 : 0);
    SetCVarFloat(TEXT("r.Lumen.DiffuseIndirect.MinTraceDistance"), 1.0f);
    SetCVarFloat(TEXT("r.LumenScene.Radiosity.ProbeSpacing"), bCinematic ? 4.0f : 8.0f);
    SetCVarFloat(TEXT("r.Lumen.Reflections.MaxRoughnessToTrace"), bCinematic ? 0.6f : 0.4f);
    SetCVarInt(TEXT("r.Lumen.ScreenProbeGather.RadianceCache.ProbeResolution"), bCinematic ? 32 : 16);

    SetCVarFloat(TEXT("r.Shadow.Virtual.ResolutionLodBiasDirectional"), bCinematic ? -1.5f : -0.5f);
    SetCVarFloat(TEXT("r.Shadow.Virtual.ResolutionLodBiasLocal"), bCinematic ? -1.0f : 0.0f);
    SetCVarInt(TEXT("r.ContactShadows"), 1);

    SetCVarInt(TEXT("r.VolumetricFog.GridPixelSize"), bCinematic ? 4 : 8);
    SetCVarInt(TEXT("r.VolumetricFog.GridSizeZ"), bCinematic ? 160 : 96);
    SetCVarInt(TEXT("r.VolumetricRenderTarget.Mode"), 0);
    SetCVarFloat(TEXT("r.VolumetricCloud.ViewRaySampleMaxCount"), bCinematic ? 768.0f : 512.0f);

    SetCVarInt(TEXT("r.SSR.Quality"), bHighOrBetter ? 4 : 3);
    SetCVarInt(TEXT("r.Water.SingleLayer.Reflection"), 1);

    SetCVarInt(TEXT("r.MotionBlurQuality"), 0);
    SetCVarInt(TEXT("r.DepthOfFieldQuality"), bHighOrBetter ? 4 : 2);
    SetCVarInt(TEXT("r.Bloom.Quality"), 5);
    SetCVarInt(TEXT("r.Tonemapper.Quality"), 5);
    SetCVarInt(TEXT("r.Tonemapper.GrainQuantization"), 1);

    SetCVarFloat(TEXT("foliage.LODDistanceScale"), bCinematic ? 2.0f : 1.0f);
    SetCVarFloat(TEXT("r.SkeletalMeshLODBias"), 0.0f);
}

void AHalcyonQualityDirector::ApplyStreamingSettings(EHalcyonQuality InPreset)
{
    int32 MaxBitrate = 12000000;   
    int32 MinQP = 20;

    switch (InPreset)
    {
    case EHalcyonQuality::Balanced:
        MaxBitrate = 8000000;
        MinQP = 24;
        break;
    case EHalcyonQuality::High:
        MaxBitrate = 20000000;
        MinQP = 18;
        break;
    case EHalcyonQuality::Cinematic:
        MaxBitrate = 40000000;
        MinQP = 14;
        break;
    }

    SetCVarInt(TEXT("PixelStreaming.Encoder.MaxBitrate"), MaxBitrate);
    SetCVarInt(TEXT("PixelStreaming.Encoder.MinQP"), MinQP);
    SetCVarInt(TEXT("PixelStreaming.WebRTC.MaxFps"), 60);
    SetCVarInt(TEXT("PixelStreaming.WebRTC.DisableFrameDropper"), 1);

    SetCVarInt(TEXT("PixelStreaming.Encoder.KeyframeInterval"), 120);
}

void AHalcyonQualityDirector::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    const float FrameMs = DeltaSeconds * 1000.0f;
    SmoothedFrameMilliseconds = FMath::Lerp(SmoothedFrameMilliseconds, FrameMs, 0.06f);

    if (!bAdaptiveResolution)
    {
        return;
    }

    TimeSinceAdapt += DeltaSeconds;
    if (TimeSinceAdapt < AdaptIntervalSeconds)
    {
        return;
    }
    TimeSinceAdapt = 0.0f;

    const float Over = SmoothedFrameMilliseconds - TargetFrameMilliseconds;
    float Delta = 0.0f;

    if (Over > 1.5f)
    {
        Delta = -AdaptRatePerSecond;
    }
    else if (Over < -2.5f)
    {
        Delta = AdaptRatePerSecond * 0.5f;   
    }

    if (FMath::IsNearlyZero(Delta))
    {
        return;
    }

    const float Next = FMath::Clamp(
        CurrentScreenPercentage + Delta, MinScreenPercentage, MaxScreenPercentage);

    if (!FMath::IsNearlyEqual(Next, CurrentScreenPercentage, 0.4f))
    {
        CurrentScreenPercentage = Next;
        SetCVarFloat(TEXT("r.ScreenPercentage"), CurrentScreenPercentage);
    }
}

FString AHalcyonQualityDirector::DescribeCurrentQuality() const
{
    const TCHAR* Name =
        (Preset == EHalcyonQuality::Cinematic) ? TEXT("4K Cinematic")
        : (Preset == EHalcyonQuality::High) ? TEXT("1440p High")
        : TEXT("1080p Balanced");

    return FString::Printf(TEXT("%s @ %.0f%% (%.1f ms)"),
        Name, CurrentScreenPercentage, SmoothedFrameMilliseconds);
}
