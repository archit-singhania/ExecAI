#include "HalcyonPlace.h"

#include "HalcyonBridge.h"

#include "Components/AudioComponent.h"
#include "Components/PointLightComponent.h"
#include "Components/SphereComponent.h"
#include "EngineUtils.h"
#include "GameFramework/Pawn.h"
#include "Kismet/GameplayStatics.h"
#include "NiagaraComponent.h"

AHalcyonPlace::AHalcyonPlace()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = true;
    PrimaryActorTick.TickGroup = TG_PostPhysics;

    ArrivalVolume = CreateDefaultSubobject<USphereComponent>(TEXT("ArrivalVolume"));
    ArrivalVolume->SetSphereRadius(ArrivalRadius);
    ArrivalVolume->SetCollisionEnabled(ECollisionEnabled::NoCollision);
    SetRootComponent(ArrivalVolume);
}

void AHalcyonPlace::BeginPlay()
{
    Super::BeginPlay();

    ResolveBridge();
    BreathPhase = FMath::FRandRange(0.0f, BreathPeriodSeconds);

    if (ArrivalVolume)
    {
        ArrivalVolume->SetSphereRadius(ArrivalRadius);
    }

    Wakefulness = 0.0f;
    ApplyWakefulness();
}

void AHalcyonPlace::ResolveBridge()
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

bool AHalcyonPlace::IsNearestOfKind() const
{
    if (!bOnlyNearestResponds)
    {
        return true;
    }

    const APawn* Player = UGameplayStatics::GetPlayerPawn(GetWorld(), 0);
    if (!Player)
    {
        return true;
    }

    const float MyDistance = FVector::Dist(GetActorLocation(), Player->GetActorLocation());

    for (TActorIterator<AHalcyonPlace> It(GetWorld()); It; ++It)
    {
        const AHalcyonPlace* Other = *It;
        if (Other == this || !Other->PlaceKind.Equals(PlaceKind, ESearchCase::IgnoreCase))
        {
            continue;
        }

        if (FVector::Dist(Other->GetActorLocation(), Player->GetActorLocation()) < MyDistance)
        {
            return false;
        }
    }

    return true;
}

void AHalcyonPlace::ApplyWakefulness()
{
    float Modulated = Wakefulness;

    if (Wakefulness > 0.35f)
    {
        const float Wave = 0.5f - 0.5f * FMath::Cos((BreathPhase / BreathPeriodSeconds) * 2.0f * PI);
        Modulated = Wakefulness * (1.0f - BreathDepth + Wave * BreathDepth);
    }

    if (InviteLight)
    {
        InviteLight->SetIntensity(Modulated * InviteLightIntensity);
        InviteLight->SetVisibility(Modulated > 0.01f);
    }

    if (InviteEffect)
    {
        const bool bShouldRun = Modulated > 0.05f;

        if (bShouldRun && !InviteEffect->IsActive())
        {
            InviteEffect->Activate();
        }
        else if (!bShouldRun && InviteEffect->IsActive())
        {
            InviteEffect->Deactivate();
        }

        if (bShouldRun)
        {
            InviteEffect->SetFloatParameter(TEXT("Intensity"), Modulated);
        }
    }

    if (InviteAudio)
    {
        InviteAudio->SetVolumeMultiplier(Modulated * 0.5f);

        if (Modulated > 0.02f && !InviteAudio->IsPlaying())
        {
            InviteAudio->Play();
        }
        else if (Modulated <= 0.02f && InviteAudio->IsPlaying())
        {
            InviteAudio->Stop();
        }
    }
}

void AHalcyonPlace::Tick(float DeltaSeconds)
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

    const FHalcyonWorldState& State = Bridge->Current;

    const bool bKindMatches = State.Invitation.Equals(PlaceKind, ESearchCase::IgnoreCase);
    const bool bShouldInvite = bKindMatches && IsNearestOfKind();

    if (bShouldInvite != bInvited)
    {
        bInvited = bShouldInvite;

        if (bInvited)
        {
            bArrived = false;
        }

        OnInvitationChanged(bInvited);
    }

    BreathPhase = FMath::Fmod(BreathPhase + DeltaSeconds, BreathPeriodSeconds);

    const float Rate = 1.0f / FMath::Max(WakeSeconds, 0.5f);
    const float Target = bInvited ? 1.0f : 0.0f;
    Wakefulness = FMath::FInterpConstantTo(Wakefulness, Target, DeltaSeconds, Rate);

    ApplyWakefulness();

    if (!bInvited || bArrived)
    {
        return;
    }

    const APawn* Player = UGameplayStatics::GetPlayerPawn(GetWorld(), 0);
    if (!Player)
    {
        return;
    }

    if (FVector::Dist(GetActorLocation(), Player->GetActorLocation()) <= ArrivalRadius)
    {
        bArrived = true;
        OnArrived();

        UE_LOG(LogTemp, Verbose, TEXT("[Halcyon] Player accepted invitation: %s"), *PlaceKind);
    }
}
