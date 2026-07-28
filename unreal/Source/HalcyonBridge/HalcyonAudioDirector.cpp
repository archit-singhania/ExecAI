#include "HalcyonAudioDirector.h"

#include "HalcyonBridge.h"

#include "Components/AudioComponent.h"
#include "EngineUtils.h"
#include "Sound/SoundBase.h"

AHalcyonAudioDirector::AHalcyonAudioDirector()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = true;
    PrimaryActorTick.TickGroup = TG_PostPhysics;

    USceneComponent* Root = CreateDefaultSubobject<USceneComponent>(TEXT("Root"));
    SetRootComponent(Root);

    auto MakeChannel = [this, Root](const TCHAR* Name) -> UAudioComponent*
    {
        UAudioComponent* Component = CreateDefaultSubobject<UAudioComponent>(Name);
        Component->SetupAttachment(Root);
        Component->bAutoActivate = false;
        Component->bAllowSpatialization = false;
        Component->bIsUISound = false;
        Component->SetVolumeMultiplier(0.0f);
        return Component;
    };

    AmbienceA = MakeChannel(TEXT("AmbienceA"));
    AmbienceB = MakeChannel(TEXT("AmbienceB"));
    MusicA = MakeChannel(TEXT("MusicA"));
    MusicB = MakeChannel(TEXT("MusicB"));
}

void AHalcyonAudioDirector::BeginPlay()
{
    Super::BeginPlay();
    ResolveBridge();

    if (!Bridge)
    {
        UE_LOG(LogTemp, Warning, TEXT("[Halcyon] AudioDirector found no bridge in the level."));
    }
}

void AHalcyonAudioDirector::ResolveBridge()
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

USoundBase* AHalcyonAudioDirector::FindSound(
    const TArray<FHalcyonSoundEntry>& Library, const FString& Key) const
{
    if (Key.IsEmpty() || Key == TEXT("none") || Key == TEXT("silence"))
    {
        return nullptr;
    }

    for (const FHalcyonSoundEntry& Entry : Library)
    {
        if (Entry.Key.Equals(Key, ESearchCase::IgnoreCase))
        {
            return Entry.Sound;
        }
    }
    return nullptr;
}

void AHalcyonAudioDirector::DriveChannel(
    const FString& DesiredKey,
    const TArray<FHalcyonSoundEntry>& Library,
    UAudioComponent* ComponentA,
    UAudioComponent* ComponentB,
    bool& bUsingA,
    FString& CurrentKey,
    float TargetVolume,
    float Ceiling,
    float CrossfadeSeconds,
    float DeltaSeconds)
{
    if (!ComponentA || !ComponentB)
    {
        return;
    }

    UAudioComponent* Active = bUsingA ? ComponentA : ComponentB;
    UAudioComponent* Retiring = bUsingA ? ComponentB : ComponentA;

    if (!DesiredKey.Equals(CurrentKey, ESearchCase::IgnoreCase))
    {
        CurrentKey = DesiredKey;

        UAudioComponent* Incoming = Retiring;
        UAudioComponent* Outgoing = Active;

        USoundBase* Sound = FindSound(Library, DesiredKey);
        if (Sound)
        {
            Incoming->SetSound(Sound);
            Incoming->SetVolumeMultiplier(0.0f);
            Incoming->Play();
        }
        else
        {
            Incoming->Stop();
        }

        (void)Outgoing;

        bUsingA = !bUsingA;
        Active = bUsingA ? ComponentA : ComponentB;
        Retiring = bUsingA ? ComponentB : ComponentA;
    }

    const float Rate = 1.0f / FMath::Max(CrossfadeSeconds, 0.25f);
    const float Step = Rate * DeltaSeconds;

    const float DesiredActive = FMath::Clamp(TargetVolume, 0.0f, 1.0f) * Ceiling;
    const float NewActive = FMath::FInterpConstantTo(
        Active->VolumeMultiplier, DesiredActive, DeltaSeconds, Rate);
    Active->SetVolumeMultiplier(NewActive);

    if (Active->Sound && !Active->IsPlaying() && DesiredActive > 0.001f)
    {
        Active->Play();
    }

    const float NewRetiring = FMath::Max(0.0f, Retiring->VolumeMultiplier - Step);
    Retiring->SetVolumeMultiplier(NewRetiring);

    if (NewRetiring <= 0.001f && Retiring->IsPlaying())
    {
        Retiring->Stop();
    }
}

void AHalcyonAudioDirector::Tick(float DeltaSeconds)
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
    const float Crossfade = FMath::Max(S.TransitionSeconds, MinimumCrossfadeSeconds);

    DriveChannel(S.Ambience, AmbienceLibrary, AmbienceA, AmbienceB,
        bAmbienceUsingA, CurrentAmbienceKey,
        S.AmbienceVolume, AmbienceCeiling, Crossfade, DeltaSeconds);

    DriveChannel(S.Music, MusicLibrary, MusicA, MusicB,
        bMusicUsingA, CurrentMusicKey,
        S.MusicVolume, MusicCeiling, Crossfade, DeltaSeconds);
}
