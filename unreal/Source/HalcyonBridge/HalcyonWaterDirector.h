#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HalcyonWaterDirector.generated.h"

class AHalcyonBridge;
class UMaterialInstanceDynamic;
class UStaticMeshComponent;
class UNiagaraComponent;
class UAudioComponent;

UCLASS(Blueprintable)
class AHalcyonWaterDirector : public AActor
{
    GENERATED_BODY()

public:
    AHalcyonWaterDirector();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<AHalcyonBridge> Bridge;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TArray<TObjectPtr<UStaticMeshComponent>> WaterMeshes;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<UNiagaraComponent> SurfaceEffect;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<UAudioComponent> WaterAudio;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Material")
    FName WaveAmplitudeParam = TEXT("WaveAmplitude");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Material")
    FName WaveSpeedParam = TEXT("WaveSpeed");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Material")
    FName RoughnessParam = TEXT("SurfaceRoughness");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Material")
    FName WarmthParam = TEXT("Warmth");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float AmplitudeMin = 0.01f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float AmplitudeMax = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float SpeedMin = 0.05f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float SpeedMax = 1.4f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float RoughnessStill = 0.02f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float RoughnessAgitated = 0.35f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float WaterAudioCeiling = 0.8f;

    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TArray<TObjectPtr<UMaterialInstanceDynamic>> DynamicMaterials;

    void ResolveBridge();
    void BuildDynamicMaterials();
};
