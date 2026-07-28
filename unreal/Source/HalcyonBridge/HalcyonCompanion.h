#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HalcyonCompanion.generated.h"

class AHalcyonBridge;

UENUM(BlueprintType)
enum class EHalcyonCompanionState : uint8
{
    Absent      UMETA(DisplayName = "Absent"),
    Distant     UMETA(DisplayName = "Distant"),
    Approaching UMETA(DisplayName = "Approaching"),
    Settled     UMETA(DisplayName = "Settled"),
    Leading     UMETA(DisplayName = "Leading")
};

UCLASS(Blueprintable)
class AHalcyonCompanion : public AActor
{
    GENERATED_BODY()

public:
    AHalcyonCompanion();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<AHalcyonBridge> Bridge;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Companion")
    FString CompanionId = TEXT("dog");

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon|Companion")
    EHalcyonCompanionState State = EHalcyonCompanionState::Absent;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Companion")
    float ApproachDistance = 260.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Companion")
    float DistantDistance = 1400.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Companion")
    float LeadDistance = 700.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Companion")
    float WalkSpeed = 130.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Companion")
    float TurnSpeedDegrees = 90.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Companion")
    float IdleDriftRadius = 45.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Companion")
    float IdleDriftPeriodSeconds = 11.0f;

    UFUNCTION(BlueprintImplementableEvent, Category = "Halcyon|Companion")
    void OnCompanionStateChanged(EHalcyonCompanionState NewState);

    UFUNCTION(BlueprintPure, Category = "Halcyon|Companion")
    float GetCurrentSpeed() const { return CurrentSpeed; }

    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    FVector HomeLocation = FVector::ZeroVector;
    float CurrentSpeed = 0.0f;
    float IdlePhase = 0.0f;

    void ResolveBridge();
    EHalcyonCompanionState ParseState(const FString& Action, const FString& Companion) const;
    FVector ResolveTargetLocation(const APawn* Player) const;
    void FaceLocation(const FVector& Location, float DeltaSeconds);
};
