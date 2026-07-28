#include "HalcyonWaterDirector.h"

#include "HalcyonBridge.h"

#include "Components/AudioComponent.h"
#include "Components/StaticMeshComponent.h"
#include "EngineUtils.h"
#include "Materials/MaterialInstanceDynamic.h"
#include "NiagaraComponent.h"

AHalcyonWaterDirector::AHalcyonWaterDirector()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = true;
    PrimaryActorTick.TickGroup = TG_PostPhysics;

    USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(Root);
}

void AHalcyonWaterDirector::BeginPlay()
{
    Super::BeginPlay();
    ResolveBridge();
    BuildDynamicMaterials();

    if (!Bridge)
    {
        UE_LOG(LogTemp, Warning, TEXT("[Halcyon] WaterDirector found no bridge in the level."));
    }
}

void AHalcyonWaterDirector::ResolveBridge()
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

void AHalcyonWaterDirector::BuildDynamicMaterials()
{
    DynamicMaterials.Reset();

    for (UStaticMeshComponent* Mesh : WaterMeshes)
    {
        if (!Mesh)
        {
            continue;
        }

        const int32 SlotCount = Mesh->GetNumMaterials();
        for (int32 Slot = 0; Slot < SlotCount; ++Slot)
        {
            if (UMaterialInstanceDynamic* Dynamic = Mesh->CreateAndSetMaterialInstanceDynamic(Slot))
            {
                DynamicMaterials.Add(Dynamic);
            }
        }
    }

    if (DynamicMaterials.Num() == 0 && WaterMeshes.Num() > 0)
    {
        UE_LOG(LogTemp, Warning,
            TEXT("[Halcyon] WaterDirector created no dynamic materials. Check the mesh material slots."));
    }
}

void AHalcyonWaterDirector::Tick(float DeltaSeconds)
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

    const FHalcyonWorldState& S = Bridge->Current;
    const float Motion = FMath::Clamp(S.WaterMotion, 0.0f, 1.0f);
    const float Warmth = FMath::Clamp(S.Warmth, 0.0f, 1.0f);

    const float Amplitude = FMath::Lerp(AmplitudeMin, AmplitudeMax, Motion);
    const float Speed = FMath::Lerp(SpeedMin, SpeedMax, Motion);

    const float Roughness =
        FMath::Lerp(RoughnessStill, RoughnessAgitated, FMath::Sqrt(Motion));

    for (UMaterialInstanceDynamic* Dynamic : DynamicMaterials)
    {
        if (!Dynamic)
        {
            continue;
        }

        Dynamic->SetScalarParameterValue(WaveAmplitudeParam, Amplitude);
        Dynamic->SetScalarParameterValue(WaveSpeedParam, Speed);
        Dynamic->SetScalarParameterValue(RoughnessParam, Roughness);
        Dynamic->SetScalarParameterValue(WarmthParam, Warmth);
    }

    if (SurfaceEffect)
    {
        const bool bShouldRun = Motion > 0.12f;

        if (bShouldRun && !SurfaceEffect->IsActive())
        {
            SurfaceEffect->Activate();
        }
        else if (!bShouldRun && SurfaceEffect->IsActive())
        {
            SurfaceEffect->Deactivate();
        }

        if (bShouldRun)
        {
            SurfaceEffect->SetFloatParameter(TEXT("Intensity"), Motion);
        }
    }

    if (WaterAudio)
    {
        const float Target = Motion * WaterAudioCeiling;
        const float Volume = FMath::FInterpTo(
            WaterAudio->VolumeMultiplier, Target, DeltaSeconds,
            2.0f / FMath::Max(S.TransitionSeconds, 1.0f));

        WaterAudio->SetVolumeMultiplier(Volume);

        if (Volume > 0.01f && !WaterAudio->IsPlaying())
        {
            WaterAudio->Play();
        }
        else if (Volume <= 0.01f && WaterAudio->IsPlaying())
        {
            WaterAudio->Stop();
        }
    }
}
