#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "HalcyonPawn.generated.h"

class AHalcyonBridge;
class UCameraComponent;
class USpringArmComponent;

UCLASS(Blueprintable)
class AHalcyonPawn : public ACharacter
{
    GENERATED_BODY()

public:
    AHalcyonPawn();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<AHalcyonBridge> Bridge;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Halcyon")
    TObjectPtr<USpringArmComponent> CameraBoom;

    UPROPERTY(VisibleAnywhere, BlueprintReadOnly, Category = "Halcyon")
    TObjectPtr<UCameraComponent> Camera;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Movement")
    float BaseWalkSpeed = 185.0f;
    
    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Movement")
    float CalmSpeedFloor = 0.68f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Movement")
    float SpeedEaseRate = 0.6f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Movement")
    float LookSensitivity = 0.6f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Camera")
    float EyeHeight = 165.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Camera")
    float HeadBobAmplitude = 2.4f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Camera")
    float HeadBobFrequency = 3.4f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Camera")
    float BaseFieldOfView = 88.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Camera")
    float BreathingFovDepth = 1.6f;

    UFUNCTION(BlueprintCallable, Category = "Halcyon|Movement")
    void MoveForward(float Value);

    UFUNCTION(BlueprintCallable, Category = "Halcyon|Movement")
    void MoveRight(float Value);

    UFUNCTION(BlueprintCallable, Category = "Halcyon|Movement")
    void LookUp(float Value);

    UFUNCTION(BlueprintCallable, Category = "Halcyon|Movement")
    void Turn(float Value);

    virtual void Tick(float DeltaSeconds) override;
    virtual void SetupPlayerInputComponent(UInputComponent* PlayerInputComponent) override;

protected:
    virtual void BeginPlay() override;

private:
    float BobPhase = 0.0f;
    float BreathPhase = 0.0f;
    float CurrentSpeedScale = 1.0f;

    void ResolveBridge();
    float DesiredSpeedScale() const;
};
