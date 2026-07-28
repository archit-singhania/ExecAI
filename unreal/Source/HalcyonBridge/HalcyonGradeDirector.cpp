#include "HalcyonGradeDirector.h"

#include "HalcyonBridge.h"

#include "Engine/PostProcessVolume.h"
#include "EngineUtils.h"

namespace
{
    float Approach(float Current, float Target, float Rate, float DeltaSeconds)
    {
        const float Alpha = 1.0f - FMath::Exp(-Rate * DeltaSeconds);
        return FMath::Lerp(Current, Target, Alpha);
    }

    FLinearColor ApproachColor(
        const FLinearColor& Current, const FLinearColor& Target, float Rate, float DeltaSeconds)
    {
        const float Alpha = 1.0f - FMath::Exp(-Rate * DeltaSeconds);
        return FMath::Lerp(Current, Target, Alpha);
    }
}

AHalcyonGradeDirector::AHalcyonGradeDirector()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = true;
    PrimaryActorTick.TickGroup = TG_PostPhysics;

    BuildDefaultGrades();
}

void AHalcyonGradeDirector::BuildDefaultGrades()
{
    Grades.Reset();

    auto Add = [this](const TCHAR* World, float Temp, float Tint, float Sat, float Contrast,
        FLinearColor Shadow, FLinearColor Highlight, float Grain, float Fringe,
        float Fstop, float Focus)
    {
        FHalcyonGrade Grade;
        Grade.World = World;
        Grade.WhiteTemp = Temp;
        Grade.WhiteTint = Tint;
        Grade.Saturation = Sat;
        Grade.Contrast = Contrast;
        Grade.ShadowTint = Shadow;
        Grade.HighlightTint = Highlight;
        Grade.FilmGrain = Grain;
        Grade.Fringe = Fringe;
        Grade.DepthOfFieldFstop = Fstop;
        Grade.FocalDistanceCm = Focus;
        Grades.Add(Grade);
    };

    Add(TEXT("zen_garden"), 6200.0f, -0.02f, 0.88f, 1.08f,
        FLinearColor(0.92f, 0.97f, 1.08f, 1.0f), FLinearColor(1.05f, 1.01f, 0.94f, 1.0f),
        0.24f, 0.14f, 4.0f, 700.0f);

    Add(TEXT("ocean_dusk"), 5200.0f, 0.03f, 1.04f, 1.12f,
        FLinearColor(0.88f, 0.95f, 1.14f, 1.0f), FLinearColor(1.12f, 1.02f, 0.88f, 1.0f),
        0.3f, 0.24f, 8.0f, 3000.0f);

    Add(TEXT("old_forest"), 6800.0f, 0.05f, 0.9f, 1.05f,
        FLinearColor(0.9f, 1.0f, 1.02f, 1.0f), FLinearColor(1.02f, 1.03f, 0.94f, 1.0f),
        0.34f, 0.16f, 2.8f, 550.0f);

    Add(TEXT("rain_cabin"), 4200.0f, 0.02f, 0.86f, 1.16f,
        FLinearColor(0.86f, 0.92f, 1.1f, 1.0f), FLinearColor(1.14f, 1.02f, 0.86f, 1.0f),
        0.4f, 0.2f, 2.0f, 320.0f);

    Add(TEXT("nordic_lake"), 7600.0f, -0.04f, 0.74f, 1.04f,
        FLinearColor(0.94f, 0.99f, 1.06f, 1.0f), FLinearColor(0.99f, 1.0f, 1.02f, 1.0f),
        0.22f, 0.1f, 11.0f, 6000.0f);

    Add(TEXT("blossom_park"), 6400.0f, 0.06f, 1.0f, 1.02f,
        FLinearColor(0.95f, 0.97f, 1.06f, 1.0f), FLinearColor(1.06f, 1.0f, 1.0f, 1.0f),
        0.2f, 0.18f, 3.2f, 800.0f);

    Add(TEXT("desert_oasis"), 4800.0f, 0.04f, 0.96f, 1.1f,
        FLinearColor(0.9f, 0.94f, 1.1f, 1.0f), FLinearColor(1.14f, 1.04f, 0.9f, 1.0f),
        0.26f, 0.22f, 9.0f, 4000.0f);

    Add(TEXT("observatory"), 8600.0f, -0.06f, 0.7f, 1.24f,
        FLinearColor(0.9f, 0.95f, 1.16f, 1.0f), FLinearColor(0.98f, 1.0f, 1.06f, 1.0f),
        0.46f, 0.1f, 1.8f, 400.0f);

    FallbackGrade = Grades[0];
}

void AHalcyonGradeDirector::BeginPlay()
{
    Super::BeginPlay();
    ResolveBridge();

    if (!PostProcess)
    {
        for (TActorIterator<APostProcessVolume> It(GetWorld()); It; ++It)
        {
            if (It->bUnbound)
            {
                PostProcess = *It;
                break;
            }
        }
    }

    if (!PostProcess)
    {
        UE_LOG(LogTemp, Warning,
            TEXT("[Halcyon] GradeDirector found no unbound Post Process Volume."));
        return;
    }

    const FString World = Bridge ? Bridge->Current.World : TEXT("zen_garden");
    Applied = GradeFor(World);
    bInitialised = true;
    PushToVolume();
}

void AHalcyonGradeDirector::ResolveBridge()
{
    if (Bridge)
    {
        return;
    }

    for (TActorIterator<AHalcyonBridge> It(GetWorld()); It; ++It)
    {
        Bridge = *It;
        break;
    }
}

const FHalcyonGrade& AHalcyonGradeDirector::GradeFor(const FString& World) const
{
    for (const FHalcyonGrade& Grade : Grades)
    {
        if (Grade.World.Equals(World, ESearchCase::IgnoreCase))
        {
            return Grade;
        }
    }
    return FallbackGrade;
}

void AHalcyonGradeDirector::BlendToward(const FHalcyonGrade& Target, float DeltaSeconds)
{
    const float R = BlendRatePerSecond;

    Applied.WhiteTemp = Approach(Applied.WhiteTemp, Target.WhiteTemp, R, DeltaSeconds);
    Applied.WhiteTint = Approach(Applied.WhiteTint, Target.WhiteTint, R, DeltaSeconds);
    Applied.Saturation = Approach(Applied.Saturation, Target.Saturation, R, DeltaSeconds);
    Applied.Contrast = Approach(Applied.Contrast, Target.Contrast, R, DeltaSeconds);
    Applied.FilmGrain = Approach(Applied.FilmGrain, Target.FilmGrain, R, DeltaSeconds);
    Applied.Fringe = Approach(Applied.Fringe, Target.Fringe, R, DeltaSeconds);
    Applied.DepthOfFieldFstop = Approach(Applied.DepthOfFieldFstop, Target.DepthOfFieldFstop, R, DeltaSeconds);
    Applied.FocalDistanceCm = Approach(Applied.FocalDistanceCm, Target.FocalDistanceCm, R, DeltaSeconds);

    Applied.ShadowTint = ApproachColor(Applied.ShadowTint, Target.ShadowTint, R, DeltaSeconds);
    Applied.HighlightTint = ApproachColor(Applied.HighlightTint, Target.HighlightTint, R, DeltaSeconds);
}

void AHalcyonGradeDirector::PushToVolume()
{
    if (!PostProcess)
    {
        return;
    }

    FPostProcessSettings& S = PostProcess->Settings;

    S.bOverride_WhiteTemp = true;
    S.WhiteTemp = Applied.WhiteTemp;

    S.bOverride_WhiteTint = true;
    S.WhiteTint = Applied.WhiteTint;

    S.bOverride_ColorSaturation = true;
    S.ColorSaturation = FVector4(Applied.Saturation, Applied.Saturation, Applied.Saturation, 1.0f);

    S.bOverride_ColorContrast = true;
    S.ColorContrast = FVector4(Applied.Contrast, Applied.Contrast, Applied.Contrast, 1.0f);

    S.bOverride_ColorGainShadows = true;
    S.ColorGainShadows = FVector4(
        Applied.ShadowTint.R, Applied.ShadowTint.G, Applied.ShadowTint.B, 1.0f);

    S.bOverride_ColorGainHighlights = true;
    S.ColorGainHighlights = FVector4(
        Applied.HighlightTint.R, Applied.HighlightTint.G, Applied.HighlightTint.B, 1.0f);

    S.bOverride_FilmGrainIntensity = true;
    S.FilmGrainIntensity = Applied.FilmGrain;

    S.bOverride_SceneFringeIntensity = true;
    S.SceneFringeIntensity = Applied.Fringe;

    S.bOverride_DepthOfFieldFstop = true;
    S.DepthOfFieldFstop = Applied.DepthOfFieldFstop;

    S.bOverride_DepthOfFieldFocalDistance = true;
    S.DepthOfFieldFocalDistance = Applied.FocalDistanceCm;

    S.bOverride_ToneCurveAmount = true;
    S.ToneCurveAmount = 1.0f;

    S.bOverride_ExpandGamut = true;
    S.ExpandGamut = 0.4f;
}

void AHalcyonGradeDirector::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!PostProcess || !bInitialised)
    {
        return;
    }

    if (!Bridge)
    {
        ResolveBridge();
        if (!Bridge)
        {
            return;
        }
    }

    const FHalcyonWorldState& State = Bridge->Current;

    FHalcyonGrade Target = GradeFor(State.World);

    const float Warmth = FMath::Clamp(State.Warmth, 0.0f, 1.0f);
    const float Fog = FMath::Clamp(State.Fog, 0.0f, 1.0f);
    const float Brightness = FMath::Clamp(State.Brightness, 0.0f, 1.0f);

    Target.WhiteTemp -= (Warmth - 0.5f) * 1600.0f;

    Target.Contrast -= Fog * 0.14f;
    Target.ShadowTint = Target.ShadowTint * (1.0f - Fog * 0.05f) + FLinearColor::White * (Fog * 0.05f);

    Target.FilmGrain += (1.0f - Brightness) * 0.16f;

    if (State.bBreathingGuide)
    {
        Target.DepthOfFieldFstop = FMath::Min(Target.DepthOfFieldFstop, 2.4f);
        Target.Saturation *= 0.94f;
    }

    BlendToward(Target, DeltaSeconds);

    if (bLockExposure)
    {
        FPostProcessSettings& S = PostProcess->Settings;
        S.bOverride_AutoExposureMethod = true;
        S.AutoExposureMethod = AEM_Manual;

        S.bOverride_AutoExposureBias = true;
        S.AutoExposureBias = FMath::Lerp(ExposureBiasDark, ExposureBiasBright, Brightness);
    }

    PushToVolume();
}
