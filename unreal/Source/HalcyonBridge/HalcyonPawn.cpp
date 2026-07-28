#include "HalcyonPawn.h"

#include "HalcyonBridge.h"

#include "Camera/CameraComponent.h"
#include "Components/CapsuleComponent.h"
#include "EngineUtils.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "GameFramework/SpringArmComponent.h"

AHalcyonPawn::AHalcyonPawn()
{
    PrimaryActorTick.bCanEverTick = true;

    GetCapsuleComponent()->InitCapsuleSize(38.0f, 88.0f);

    CameraBoom = CreateDefaultSubobject<USpringArmComponent>(TEXT("CameraBoom"));
    CameraBoom->SetupAttachment(RootComponent);
    CameraBoom->TargetArmLength = 0.0f;         
    CameraBoom->bUsePawnControlRotation = true;
    CameraBoom->bEnableCameraLag = true;
    CameraBoom->CameraLagSpeed = 12.0f;         
    CameraBoom->bEnableCameraRotationLag = true;
    CameraBoom->CameraRotationLagSpeed = 14.0f;

    Camera = CreateDefaultSubobject<UCameraComponent>(TEXT("Camera"));
    Camera->SetupAttachment(CameraBoom);
    Camera->bUsePawnControlRotation = false;

    bUseControllerRotationPitch = false;
    bUseControllerRotationYaw = true;
    bUseControllerRotationRoll = false;

    if (UCharacterMovementComponent* Movement = GetCharacterMovement())
    {
        Movement->MaxWalkSpeed = BaseWalkSpeed;

        Movement->MaxAcceleration = 420.0f;
        Movement->BrakingDecelerationWalking = 620.0f;
        Movement->GroundFriction = 6.0f;

        Movement->bOrientRotationToMovement = false;
        Movement->JumpZVelocity = 0.0f;
        Movement->AirControl = 0.0f;
    }

    JumpMaxCount = 0;   
}

void AHalcyonPawn::BeginPlay()
{
    Super::BeginPlay();

    ResolveBridge();

    if (Camera)
    {
        Camera->SetRelativeLocation(FVector(0.0f, 0.0f, EyeHeight - 88.0f));
        Camera->SetFieldOfView(BaseFieldOfView);
    }
}

void AHalcyonPawn::ResolveBridge()
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

void AHalcyonPawn::SetupPlayerInputComponent(UInputComponent* PlayerInputComponent)
{
    Super::SetupPlayerInputComponent(PlayerInputComponent);

    if (!PlayerInputComponent)
    {
        return;
    }

    PlayerInputComponent->BindAxis("MoveForward", this, &AHalcyonPawn::MoveForward);
    PlayerInputComponent->BindAxis("MoveRight", this, &AHalcyonPawn::MoveRight);
    PlayerInputComponent->BindAxis("Turn", this, &AHalcyonPawn::Turn);
    PlayerInputComponent->BindAxis("LookUp", this, &AHalcyonPawn::LookUp);
}

void AHalcyonPawn::MoveForward(float Value)
{
    if (FMath::IsNearlyZero(Value) || !Controller)
    {
        return;
    }

    const FRotator YawOnly(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
    AddMovementInput(FRotationMatrix(YawOnly).GetUnitAxis(EAxis::X), Value);
}

void AHalcyonPawn::MoveRight(float Value)
{
    if (FMath::IsNearlyZero(Value) || !Controller)
    {
        return;
    }

    const FRotator YawOnly(0.0f, Controller->GetControlRotation().Yaw, 0.0f);
    AddMovementInput(FRotationMatrix(YawOnly).GetUnitAxis(EAxis::Y), Value);
}

void AHalcyonPawn::Turn(float Value)
{
    AddControllerYawInput(Value * LookSensitivity);
}

void AHalcyonPawn::LookUp(float Value)
{
    AddControllerPitchInput(Value * LookSensitivity);
}

float AHalcyonPawn::DesiredSpeedScale() const
{
    if (!Bridge)
    {
        return 1.0f;
    }

    const FHalcyonWorldState& S = Bridge->Current;

    const float Energy = FMath::Clamp((S.Wind + S.WaterMotion) * 0.5f, 0.0f, 1.0f);
    float Scale = FMath::Lerp(CalmSpeedFloor, 1.0f, FMath::Sqrt(Energy));

    if (S.bBreathingGuide)
    {
        Scale = FMath::Min(Scale, CalmSpeedFloor + 0.06f);
    }

    return Scale;
}

void AHalcyonPawn::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    if (!Bridge)
    {
        ResolveBridge();
    }

    CurrentSpeedScale = FMath::FInterpTo(
        CurrentSpeedScale, DesiredSpeedScale(), DeltaSeconds, SpeedEaseRate);

    if (UCharacterMovementComponent* Movement = GetCharacterMovement())
    {
        Movement->MaxWalkSpeed = BaseWalkSpeed * CurrentSpeedScale;
    }

    if (!Camera)
    {
        return;
    }

    const float PlanarSpeed = GetVelocity().Size2D();
    const float SpeedNorm = FMath::Clamp(PlanarSpeed / FMath::Max(BaseWalkSpeed, 1.0f), 0.0f, 1.0f);

    float BobOffset = 0.0f;
    if (SpeedNorm > 0.05f)
    {
        BobPhase += DeltaSeconds * HeadBobFrequency * (0.6f + SpeedNorm * 0.8f);
        BobOffset = FMath::Sin(BobPhase * 2.0f * PI) * HeadBobAmplitude * SpeedNorm;
    }
    else
    {
        BobPhase = FMath::FInterpTo(BobPhase, FMath::RoundToFloat(BobPhase), DeltaSeconds, 4.0f);
    }

    const float BaseZ = EyeHeight - 88.0f;
    const FVector Current = Camera->GetRelativeLocation();
    Camera->SetRelativeLocation(FVector(
        Current.X, Current.Y,
        FMath::FInterpTo(Current.Z, BaseZ + BobOffset, DeltaSeconds, 12.0f)));

    float TargetFov = BaseFieldOfView;

    if (Bridge && Bridge->Current.bBreathingGuide)
    {
        const float Period = FMath::Max(Bridge->Current.BreathingPaceSeconds, 1.0f) * 2.0f;
        BreathPhase = FMath::Fmod(BreathPhase + DeltaSeconds, Period);

        const float Wave = 0.5f - 0.5f * FMath::Cos((BreathPhase / Period) * 2.0f * PI);
        TargetFov = BaseFieldOfView - Wave * BreathingFovDepth;
    }
    else
    {
        BreathPhase = 0.0f;
    }

    Camera->SetFieldOfView(
        FMath::FInterpTo(Camera->FieldOfView, TargetFov, DeltaSeconds, 3.0f));
}
