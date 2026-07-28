#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HalcyonQualityDirector.generated.h"

UENUM(BlueprintType)
enum class EHalcyonQuality : uint8
{
    Balanced   UMETA(DisplayName = "1080p Balanced"),
    High       UMETA(DisplayName = "1440p High"),
    Cinematic  UMETA(DisplayName = "4K Cinematic")
};

UCLASS(Blueprintable)
class AHalcyonQualityDirector : public AActor
{
    GENERATED_BODY()

public:
    AHalcyonQualityDirector();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Quality")
    EHalcyonQuality Preset = EHalcyonQuality::High;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Quality")
    bool bReadPresetFromCommandLine = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Adaptive")
    bool bAdaptiveResolution = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Adaptive")
    float TargetFrameMilliseconds = 16.6f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Adaptive")
    float MinScreenPercentage = 62.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Adaptive")
    float MaxScreenPercentage = 100.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Adaptive")
    float AdaptRatePerSecond = 6.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Adaptive")
    float AdaptIntervalSeconds = 0.5f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Streaming")
    bool bApplyStreamingEncoderSettings = true;

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon|Quality")
    float CurrentScreenPercentage = 100.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon|Quality")
    float SmoothedFrameMilliseconds = 16.6f;

    UFUNCTION(BlueprintCallable, Category = "Halcyon|Quality")
    void ApplyPreset(EHalcyonQuality NewPreset);

    UFUNCTION(BlueprintPure, Category = "Halcyon|Quality")
    FString DescribeCurrentQuality() const;

    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    float TimeSinceAdapt = 0.0f;

    void SetCVarInt(const TCHAR* Name, int32 Value);
    void SetCVarFloat(const TCHAR* Name, float Value);
    void ApplyScalability(EHalcyonQuality InPreset);
    void ApplyRenderFeatures(EHalcyonQuality InPreset);
    void ApplyStreamingSettings(EHalcyonQuality InPreset);
    bool ReadPresetArgument(EHalcyonQuality& OutPreset) const;
};
