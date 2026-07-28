#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "IWebSocket.h"
#include "HalcyonBridge.generated.h"

USTRUCT(BlueprintType)
struct FHalcyonWorldState
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    FString World = TEXT("zen_garden");

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float TimeOfDay = 17.5f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    FString Weather = TEXT("clear");

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float Wind = 0.3f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float WaterMotion = 0.3f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float Fog = 0.2f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float Brightness = 0.6f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float Warmth = 0.5f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float Bloom = 0.3f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    FString Ambience = TEXT("birdsong");

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float AmbienceVolume = 0.5f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    FString Music = TEXT("none");

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float MusicVolume = 0.3f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    FString Companion = TEXT("none");

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    FString CompanionAction = TEXT("absent");

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    FString Invitation = TEXT("none");

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    FString InvitationLabel;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    bool bBreathingGuide = false;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float BreathingPaceSeconds = 5.5f;

    UPROPERTY(BlueprintReadOnly, EditAnywhere, Category = "Halcyon")
    float TransitionSeconds = 6.0f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FHalcyonEnvironmentChanged, const FHalcyonWorldState&, NewTarget);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FHalcyonConnectionChanged, bool, bIsConnected);

UCLASS(Blueprintable)
class AHalcyonBridge : public AActor
{
    GENERATED_BODY()

public:
    AHalcyonBridge();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Connection")
    FString ServerUrl = TEXT("ws://127.0.0.1:8000/api/halcyon/ws");

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Connection")
    FString SessionId;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Connection")
    FString AuthToken;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Connection")
    bool bAutoConnectOnBeginPlay = true;

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon|Connection")
    float ReconnectDelaySeconds = 3.0f;

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon")
    FHalcyonWorldState Current;

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon")
    FHalcyonWorldState Target;

    UPROPERTY(BlueprintAssignable, Category = "Halcyon")
    FHalcyonEnvironmentChanged OnEnvironmentChanged;

    UPROPERTY(BlueprintAssignable, Category = "Halcyon")
    FHalcyonConnectionChanged OnConnectionChanged;

    UFUNCTION(BlueprintCallable, Category = "Halcyon")
    void Connect();

    UFUNCTION(BlueprintCallable, Category = "Halcyon")
    void Disconnect();

    UFUNCTION(BlueprintPure, Category = "Halcyon")
    bool IsConnected() const;

    UFUNCTION(BlueprintPure, Category = "Halcyon")
    float GetSunPitchDegrees() const;

    virtual void Tick(float DeltaSeconds) override;

protected:
    virtual void BeginPlay() override;
    virtual void EndPlay(const EEndPlayReason::Type EndPlayReason) override;

private:
    TSharedPtr<IWebSocket> Socket;
    float TimeSinceHeartbeat = 0.0f;
    float TimeSinceDisconnect = 0.0f;
    bool bWantsConnection = false;

    void HandleMessage(const FString& Message);
    void ApplyTargetFromJson(const TSharedPtr<class FJsonObject>& Data);
    void StepTowardTarget(float DeltaSeconds);
};
