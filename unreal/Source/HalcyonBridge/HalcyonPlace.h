#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HalcyonPlace.generated.h"

class AHalcyonBridge;
class UAudioComponent;
class UNiagaraComponent;
class UPointLightComponent;
class USphereComponent;

UCLASS(Blueprintable)
class AHalcyonPlace : public AActor
{
    GENERATED_BODY()

public:
    AHalcyonPlace();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<AHalcyonBridge> Bridge;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Place")
    FString PlaceKind = TEXT("sit");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Place")
    bool bOnlyNearestResponds = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Place")
    float ArrivalRadius = 240.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<UPointLightComponent> InviteLight;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<UNiagaraComponent> InviteEffect;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<UAudioComponent> InviteAudio;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float InviteLightIntensity = 900.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float WakeSeconds = 8.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float BreathPeriodSeconds = 7.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Tuning")
    float BreathDepth = 0.18f;

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon|Place")
    bool bInvited = false;

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon|Place")
    bool bArrived = false;

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon|Place")
    float Wakefulness = 0.0f;

    UFUNCTION(BlueprintImplementableEvent, Category = "Halcyon|Place")
    void OnInvitationChanged(bool bNowInvited);

    UFUNCTION(BlueprintImplementableEvent, Category = "Halcyon|Place")
    void OnArrived();

    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<USphereComponent> ArrivalVolume;

    float BreathPhase = 0.0f;

    void ResolveBridge();
    bool IsNearestOfKind() const;
    void ApplyWakefulness();
};
