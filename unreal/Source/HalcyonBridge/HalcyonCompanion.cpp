#include "HalcyonCompanion.h"

#include "HalcyonBridge.h"

#include "EngineUtils.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"

AHalcyonCompanion::AHalcyonCompanion()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = true;
    PrimaryActorTick.TickGroup = TG_PostPhysics;

    USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(Root);
}

void AHalcyonCompanion::BeginPlay()
{
    Super::BeginPlay();

    HomeLocation = GetActorLocation();
    IdlePhase = FMath::FRandRange(0.0f, IdleDriftPeriodSeconds);

    ResolveBridge();
    SetActorHiddenInGame(true);
}

void AHalcyonCompanion::ResolveBridge()
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

EHalcyonCompanionState AHalcyonCompanion::ParseState(
    const FString& Action, const FString& Companion) const
{
    if (!Companion.Equals(CompanionId, ESearchCase::IgnoreCase))
    {
        return EHalcyonCompanionState::Absent;
    }

    if (Action == TEXT("distant"))  { return EHalcyonCompanionState::Distant; }
    if (Action == TEXT("approach")) { return EHalcyonCompanionState::Approaching; }
    if (Action == TEXT("settle"))   { return EHalcyonCompanionState::Settled; }
    if (Action == TEXT("lead"))     { return EHalcyonCompanionState::Leading; }

    return EHalcyonCompanionState::Absent;
}

FVector AHalcyonCompanion::ResolveTargetLocation(const APawn* Player) const
{
    if (!Player)
    {
        return HomeLocation;
    }

    const FVector PlayerLocation = Player->GetActorLocation();

    switch (State)
    {
    case EHalcyonCompanionState::Distant:
    {
        const FVector Away = (HomeLocation - PlayerLocation).GetSafeNormal2D();
        return PlayerLocation + Away * DistantDistance;
    }

    case EHalcyonCompanionState::Approaching:
    case EHalcyonCompanionState::Settled:
    {
        const FVector Toward = (GetActorLocation() - PlayerLocation).GetSafeNormal2D();
        return PlayerLocation + Toward * ApproachDistance;
    }

    case EHalcyonCompanionState::Leading:
    {
        const FVector Forward = Player->GetActorForwardVector().GetSafeNormal2D();
        return PlayerLocation + Forward * LeadDistance;
    }

    default:
        return HomeLocation;
    }
}

void AHalcyonCompanion::FaceLocation(const FVector& Location, float DeltaSeconds)
{
    FVector Direction = Location - GetActorLocation();
    Direction.Z = 0.0f;

    if (Direction.IsNearlyZero())
    {
        return;
    }

    const FRotator Desired = Direction.Rotation();
    const FRotator Current = GetActorRotation();
    const FRotator Stepped = FMath::RInterpConstantTo(
        Current, FRotator(0.0f, Desired.Yaw, 0.0f), DeltaSeconds, TurnSpeedDegrees);

    SetActorRotation(Stepped);
}

void AHalcyonCompanion::Tick(float DeltaSeconds)
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
    const EHalcyonCompanionState Desired = ParseState(S.CompanionAction, S.Companion);

    if (Desired != State)
    {
        State = Desired;
        SetActorHiddenInGame(State == EHalcyonCompanionState::Absent);
        OnCompanionStateChanged(State);
    }

    if (State == EHalcyonCompanionState::Absent)
    {
        CurrentSpeed = 0.0f;
        return;
    }

    APawn* Player = UGameplayStatics::GetPlayerPawn(GetWorld(), 0);
    FVector Target = ResolveTargetLocation(Player);

    if (State == EHalcyonCompanionState::Settled || State == EHalcyonCompanionState::Distant)
    {
        IdlePhase = FMath::Fmod(IdlePhase + DeltaSeconds, IdleDriftPeriodSeconds);
        const float Angle = (IdlePhase / IdleDriftPeriodSeconds) * 2.0f * PI;
        Target += FVector(FMath::Cos(Angle), FMath::Sin(Angle), 0.0f) * IdleDriftRadius;
    }

    const FVector Location = GetActorLocation();
    FVector ToTarget = Target - Location;
    ToTarget.Z = 0.0f;

    const float Distance = ToTarget.Size();
    const float StopThreshold = 25.0f;

    if (Distance > StopThreshold)
    {
        const float SpeedScale = FMath::Clamp(Distance / 250.0f, 0.15f, 1.0f);
        const float Speed = WalkSpeed * SpeedScale
            * (State == EHalcyonCompanionState::Settled ? 0.35f : 1.0f);

        const FVector Step = ToTarget.GetSafeNormal() * Speed * DeltaSeconds;
        SetActorLocation(Location + Step, true);

        CurrentSpeed = Speed;
        FaceLocation(Target, DeltaSeconds);
    }
    else
    {
        CurrentSpeed = FMath::FInterpTo(CurrentSpeed, 0.0f, DeltaSeconds, 3.0f);

        if (Player && State != EHalcyonCompanionState::Leading)
        {
            FaceLocation(Player->GetActorLocation(), DeltaSeconds);
        }
    }
}
