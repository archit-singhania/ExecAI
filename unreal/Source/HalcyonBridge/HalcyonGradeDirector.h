#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HalcyonGradeDirector.generated.h"

class AHalcyonBridge;
class APostProcessVolume;

USTRUCT(BlueprintType)
struct FHalcyonGrade
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    FString World = TEXT("zen_garden");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    float WhiteTemp = 6500.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    float WhiteTint = 0.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    float Saturation = 0.94f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    float Contrast = 1.06f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    FLinearColor ShadowTint = FLinearColor(0.94f, 0.98f, 1.06f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    FLinearColor HighlightTint = FLinearColor(1.04f, 1.0f, 0.95f, 1.0f);

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    float FilmGrain = 0.28f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    float Fringe = 0.18f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    float DepthOfFieldFstop = 5.6f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Grade")
    float FocalDistanceCm = 900.0f;
};

UCLASS(Blueprintable)
class AHalcyonGradeDirector : public AActor
{
    GENERATED_BODY()

public:
    AHalcyonGradeDirector();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<AHalcyonBridge> Bridge;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<APostProcessVolume> PostProcess;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Grades")
    TArray<FHalcyonGrade> Grades;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Grades")
    FHalcyonGrade FallbackGrade;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Exposure")
    bool bLockExposure = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Exposure")
    float ExposureBiasDark = -0.6f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Exposure")
    float ExposureBiasBright = 0.9f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Grades")
    float BlendRatePerSecond = 0.35f;

    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    FHalcyonGrade Applied;
    bool bInitialised = false;

    void ResolveBridge();
    void BuildDefaultGrades();
    const FHalcyonGrade& GradeFor(const FString& World) const;
    void BlendToward(const FHalcyonGrade& Target, float DeltaSeconds);
    void PushToVolume();
};
