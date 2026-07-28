#include "HalcyonSkyDirector.h"

#include "HalcyonBridge.h"

#include "Components/DirectionalLightComponent.h"
#include "Components/ExponentialHeightFogComponent.h"
#include "Components/SkyLightComponent.h"
#include "Components/WindDirectionalSourceComponent.h"
#include "Engine/DirectionalLight.h"
#include "Engine/ExponentialHeightFog.h"
#include "Engine/PostProcessVolume.h"
#include "Engine/SkyLight.h"
#include "Engine/WindDirectionalSource.h"
#include "EngineUtils.h"
#include "NiagaraComponent.h"

AHalcyonSkyDirector::AHalcyonSkyDirector()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = true;
    PrimaryActorTick.TickGroup = TG_PostPhysics;
}

void AHalcyonSkyDirector::BeginPlay()
{
    Super::BeginPlay();
    ResolveBridge();

    if (!Bridge)
    {
        UE_LOG(LogTemp, Warning,
            TEXT("[Halcyon] SkyDirector found no bridge in the level. The world will not respond."));
    }
}

void AHalcyonSkyDirector::ResolveBridge()
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

void AHalcyonSkyDirector::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!Bridge)
    {
        ResolveBridge();
        if (!Bridge)
        {
            return;
        }
    }

    ApplySun();
    ApplySkyLight(DeltaSeconds);
    ApplyFog();
    ApplyWind();
    ApplyPostProcess(DeltaSeconds);
    ApplyPrecipitation();
}

void AHalcyonSkyDirector::ApplySun()
{
    if (!Sun)
    {
        return;
    }

    const FHalcyonWorldState& S = Bridge->Current;
    const float Pitch = Bridge->GetSunPitchDegrees();

    Sun->SetActorRotation(FRotator(Pitch, SunYawDegrees, 0.0f));

    UDirectionalLightComponent* Light =
        Cast<UDirectionalLightComponent>(Sun->GetLightComponent());
    if (!Light)
    {
        return;
    }

    const float HorizonFade = FMath::Clamp((Pitch + 6.0f) / 12.0f, 0.0f, 1.0f);

    const float Intensity =
        FMath::Lerp(SunIntensityMin, SunIntensityMax, FMath::Clamp(S.Brightness, 0.0f, 1.0f))
        * HorizonFade;

    Light->SetIntensity(Intensity);
    Light->SetUseTemperature(true);
    Light->SetTemperature(
        FMath::Lerp(TemperatureCoolK, TemperatureWarmK, FMath::Clamp(S.Warmth, 0.0f, 1.0f)));
}

void AHalcyonSkyDirector::ApplySkyLight(float DeltaSeconds)
{
    if (!SkyLight)
    {
        return;
    }

    USkyLightComponent* Component = SkyLight->GetLightComponent();
    if (!Component)
    {
        return;
    }

    const FHalcyonWorldState& S = Bridge->Current;

    const float FogLift = 1.0f + FMath::Clamp(S.Fog, 0.0f, 1.0f) * 0.35f;

    Component->SetIntensity(
        FMath::Lerp(SkyLightIntensityMin, SkyLightIntensityMax,
            FMath::Clamp(S.Brightness, 0.0f, 1.0f)) * FogLift);

    TimeSinceRecapture += DeltaSeconds;
    if (TimeSinceRecapture >= SkyRecaptureIntervalSeconds)
    {
        TimeSinceRecapture = 0.0f;
        if (!Component->IsRealTimeCaptureEnabled())
        {
            Component->RecaptureSky();
        }
    }
}

void AHalcyonSkyDirector::ApplyFog()
{
    if (!HeightFog)
    {
        return;
    }

    UExponentialHeightFogComponent* Component = HeightFog->GetComponent();
    if (!Component)
    {
        return;
    }

    const FHalcyonWorldState& S = Bridge->Current;
    const float Fog = FMath::Clamp(S.Fog, 0.0f, 1.0f);

    Component->SetFogDensity(FMath::Lerp(FogDensityMin, FogDensityMax, Fog));

    Component->SetVolumetricFogExtinctionScale(FMath::Lerp(0.5f, 3.0f, Fog));

    const FLinearColor Cool(0.42f, 0.52f, 0.68f);
    const FLinearColor Warm(0.85f, 0.62f, 0.44f);
    Component->SetFogInscatteringColor(
        FLinearColor::LerpUsingHSV(Cool, Warm, FMath::Clamp(S.Warmth, 0.0f, 1.0f)));
}

void AHalcyonSkyDirector::ApplyWind()
{
    if (!Wind)
    {
        return;
    }

    UWindDirectionalSourceComponent* Component = Wind->GetComponent();
    if (!Component)
    {
        return;
    }

    const float W = FMath::Clamp(Bridge->Current.Wind, 0.0f, 1.0f);
    Component->SetStrength(W * WindStrengthMax);
    Component->SetSpeed(W * WindSpeedMax);
}

void AHalcyonSkyDirector::ApplyPostProcess(float DeltaSeconds)
{
    if (!PostProcess)
    {
        return;
    }

    const FHalcyonWorldState& S = Bridge->Current;
    FPostProcessSettings& Settings = PostProcess->Settings;

    Settings.bOverride_BloomIntensity = true;
    Settings.BloomIntensity = FMath::Clamp(S.Bloom, 0.0f, 1.0f) * BloomIntensityMax;

    Settings.bOverride_VignetteIntensity = true;

    if (S.bBreathingGuide)
    {
        const float Period = FMath::Max(S.BreathingPaceSeconds, 1.0f) * 2.0f;
        BreathingPhase = FMath::Fmod(BreathingPhase + DeltaSeconds, Period);

        const float Wave = 0.5f - 0.5f * FMath::Cos((BreathingPhase / Period) * 2.0f * PI);
        Settings.VignetteIntensity = 0.25f + Wave * BreathingVignetteDepth;
    }
    else
    {
        BreathingPhase = 0.0f;
        Settings.VignetteIntensity =
            FMath::FInterpTo(Settings.VignetteIntensity, 0.3f, DeltaSeconds, 1.5f);
    }
}

void AHalcyonSkyDirector::ApplyPrecipitation()
{
    const FHalcyonWorldState& S = Bridge->Current;

    const bool bRaining = (S.Weather == TEXT("rain") || S.Weather == TEXT("light_rain"));
    const bool bSnowing = (S.Weather == TEXT("snow"));
    const float RainRate = (S.Weather == TEXT("rain")) ? 1.0f : 0.4f;
    const float WindNorm = FMath::Clamp(S.Wind, 0.0f, 1.0f);

    if (RainSystem)
    {
        if (bRaining && !RainSystem->IsActive())
        {
            RainSystem->Activate();
        }
        else if (!bRaining && RainSystem->IsActive())
        {
            RainSystem->Deactivate();
        }

        if (bRaining)
        {
            RainSystem->SetFloatParameter(TEXT("Intensity"), RainRate);
            RainSystem->SetFloatParameter(TEXT("Wind"), WindNorm);
        }
    }

    if (SnowSystem)
    {
        if (bSnowing && !SnowSystem->IsActive())
        {
            SnowSystem->Activate();
        }
        else if (!bSnowing && SnowSystem->IsActive())
        {
            SnowSystem->Deactivate();
        }

        if (bSnowing)
        {
            SnowSystem->SetFloatParameter(TEXT("Wind"), WindNorm);
        }
    }
}
