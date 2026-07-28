#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "HalcyonAudioDirector.generated.h"

class AHalcyonBridge;
class UAudioComponent;
class USoundBase;

USTRUCT(BlueprintType)
struct FHalcyonSoundEntry
{
    GENERATED_BODY()

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon")
    FString Key;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon")
    TObjectPtr<USoundBase> Sound = nullptr;
};

UCLASS(Blueprintable)
class AHalcyonAudioDirector : public AActor
{
    GENERATED_BODY()

public:
    AHalcyonAudioDirector();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Wiring")
    TObjectPtr<AHalcyonBridge> Bridge;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Audio")
    TArray<FHalcyonSoundEntry> AmbienceLibrary;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Audio")
    TArray<FHalcyonSoundEntry> MusicLibrary;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Audio")
    float AmbienceCeiling = 1.0f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Audio")
    float MusicCeiling = 0.7f;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Audio")
    float MinimumCrossfadeSeconds = 2.5f;

    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY() TObjectPtr<UAudioComponent> AmbienceA;
    UPROPERTY() TObjectPtr<UAudioComponent> AmbienceB;
    UPROPERTY() TObjectPtr<UAudioComponent> MusicA;
    UPROPERTY() TObjectPtr<UAudioComponent> MusicB;

    bool bAmbienceUsingA = true;
    bool bMusicUsingA = true;

    FString CurrentAmbienceKey;
    FString CurrentMusicKey;

    void ResolveBridge();
    USoundBase* FindSound(const TArray<FHalcyonSoundEntry>& Library, const FString& Key) const;

    void DriveChannel(
        const FString& DesiredKey,
        const TArray<FHalcyonSoundEntry>& Library,
        UAudioComponent* ComponentA,
        UAudioComponent* ComponentB,
        bool& bUsingA,
        FString& CurrentKey,
        float TargetVolume,
        float Ceiling,
        float CrossfadeSeconds,
        float DeltaSeconds);
};
