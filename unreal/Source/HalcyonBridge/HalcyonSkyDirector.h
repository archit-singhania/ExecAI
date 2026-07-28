#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HalcyonSkyDirector.generated.h"

class AHalcyonBridge;
class ADirectionalLight;
class ASkyLight;
class AExponentialHeightFog;
class AWindDirectionalSource;
class APostProcessVolume;
class UNiagaraComponent;

UCLASS(Blueprintable)
class AHalcyonSkyDirector : public AActor
{
    GENERATED_BODY()

public:
    AHalcyonSkyDirector();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<AHalcyonBridge> Bridge;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<ADirectionalLight> Sun;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<ASkyLight> SkyLight;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<AExponentialHeightFog> HeightFog;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<AWindDirectionalSource> Wind;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<APostProcessVolume> PostProcess;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<UNiagaraComponent> RainSystem;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<UNiagaraComponent> SnowSystem;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Sun")
    float SunYawDegrees = 135.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Sun")
    float SunIntensityMin = 0.4f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Sun")
    float SunIntensityMax = 8.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Sun")
    float TemperatureCoolK = 8500.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Sun")
    float TemperatureWarmK = 2400.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Sky")
    float SkyLightIntensityMin = 0.15f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Sky")
    float SkyLightIntensityMax = 2.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Fog")
    float FogDensityMin = 0.002f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Fog")
    float FogDensityMax = 0.35f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Wind")
    float WindStrengthMax = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Wind")
    float WindSpeedMax = 2.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Post")
    float BloomIntensityMax = 2.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Post")
    float BreathingVignetteDepth = 0.35f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning|Sky")
    float SkyRecaptureIntervalSeconds = 2.0f;

    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    float TimeSinceRecapture = 0.0f;
    float BreathingPhase = 0.0f;

    void ResolveBridge();
    void ApplySun();
    void ApplySkyLight(float DeltaSeconds);
    void ApplyFog();
    void ApplyWind();
    void ApplyPostProcess(float DeltaSeconds);
    void ApplyPrecipitation();
};
