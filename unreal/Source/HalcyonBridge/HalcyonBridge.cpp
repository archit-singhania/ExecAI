#include "HalcyonBridge.h"

#include "Dom/JsonObject.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"
#include "WebSocketsModule.h"

namespace
{
    float Approach(float CurrentValue, float TargetValue, float TransitionSeconds, float DeltaSeconds)
    {
        if (TransitionSeconds <= KINDA_SMALL_NUMBER)
        {
            return TargetValue;
        }
        const float Rate = 3.0f / TransitionSeconds;
        const float Alpha = 1.0f - FMath::Exp(-Rate * DeltaSeconds);
        return FMath::Lerp(CurrentValue, TargetValue, Alpha);
    }

    float ApproachClock(float CurrentValue, float TargetValue, float TransitionSeconds, float DeltaSeconds)
    {
        float Delta = TargetValue - CurrentValue;
        if (Delta > 12.0f)
        {
            Delta -= 24.0f;
        }
        else if (Delta < -12.0f)
        {
            Delta += 24.0f;
        }
        const float Stepped = Approach(0.0f, Delta, TransitionSeconds, DeltaSeconds);
        float Result = CurrentValue + Stepped;
        if (Result < 0.0f) { Result += 24.0f; }
        if (Result >= 24.0f) { Result -= 24.0f; }
        return Result;
    }

    float ReadNumber(const TSharedPtr<FJsonObject>& Object, const FString& Key, float Fallback)
    {
        double Value = Fallback;
        return Object->TryGetNumberField(Key, Value) ? static_cast<float>(Value) : Fallback;
    }

    FString ReadString(const TSharedPtr<FJsonObject>& Object, const FString& Key, const FString& Fallback)
    {
        FString Value;
        return Object->TryGetStringField(Key, Value) ? Value : Fallback;
    }
}

AHalcyonBridge::AHalcyonBridge()
{
    PrimaryActorTick.bCanEverTick = true;
    PrimaryActorTick.bStartWithTickEnabled = true;
}

void AHalcyonBridge::BeginPlay()
{
    Super::BeginPlay();

    if (!FModuleManager::Get().IsModuleLoaded(TEXT("WebSockets")))
    {
        FModuleManager::Get().LoadModule(TEXT("WebSockets"));
    }

    if (bAutoConnectOnBeginPlay)
    {
        Connect();
    }
}

void AHalcyonBridge::EndPlay(const EEndPlayReason::Type EndPlayReason)
{
    Disconnect();
    Super::EndPlay(EndPlayReason);
}

void AHalcyonBridge::Connect()
{
    if (SessionId.IsEmpty() || AuthToken.IsEmpty())
    {
        UE_LOG(LogTemp, Warning, TEXT("[Halcyon] SessionId and AuthToken must be set before connecting."));
        return;
    }

    bWantsConnection = true;

    if (Socket.IsValid() && Socket->IsConnected())
    {
        return;
    }

    const FString Url = FString::Printf(TEXT("%s/%s?token=%s"), *ServerUrl, *SessionId, *AuthToken);
    Socket = FWebSocketsModule::Get().CreateWebSocket(Url);

    Socket->OnConnected().AddLambda([this]()
    {
        UE_LOG(LogTemp, Log, TEXT("[Halcyon] Connected."));
        TimeSinceDisconnect = 0.0f;
        OnConnectionChanged.Broadcast(true);
    });

    Socket->OnConnectionError().AddLambda([this](const FString& Error)
    {
        UE_LOG(LogTemp, Warning, TEXT("[Halcyon] Connection error: %s"), *Error);
        OnConnectionChanged.Broadcast(false);
    });

    Socket->OnClosed().AddLambda([this](int32 StatusCode, const FString& Reason, bool /*bWasClean*/)
    {
        UE_LOG(LogTemp, Log, TEXT("[Halcyon] Closed (%d): %s"), StatusCode, *Reason);
        OnConnectionChanged.Broadcast(false);
    });

    Socket->OnMessage().AddLambda([this](const FString& Message)
    {
        HandleMessage(Message);
    });

    Socket->Connect();
}

void AHalcyonBridge::Disconnect()
{
    bWantsConnection = false;
    if (Socket.IsValid())
    {
        if (Socket->IsConnected())
        {
            Socket->Close();
        }
        Socket.Reset();
    }
}

bool AHalcyonBridge::IsConnected() const
{
    return Socket.IsValid() && Socket->IsConnected();
}

float AHalcyonBridge::GetSunPitchDegrees() const
{
    return -FMath::Cos((Current.TimeOfDay / 24.0f) * 2.0f * PI) * 90.0f;
}

void AHalcyonBridge::HandleMessage(const FString& Message)
{
    TSharedPtr<FJsonObject> Root;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Message);
    if (!FJsonSerializer::Deserialize(Reader, Root) || !Root.IsValid())
    {
        UE_LOG(LogTemp, Warning, TEXT("[Halcyon] Unparseable message."));
        return;
    }

    const FString Type = ReadString(Root, TEXT("type"), TEXT(""));
    if (Type != TEXT("environment"))
    {
        return;
    }

    const TSharedPtr<FJsonObject>* Data = nullptr;
    if (Root->TryGetObjectField(TEXT("data"), Data) && Data != nullptr)
    {
        ApplyTargetFromJson(*Data);
    }
}

void AHalcyonBridge::ApplyTargetFromJson(const TSharedPtr<FJsonObject>& Data)
{
    Target.World = ReadString(Data, TEXT("world"), Target.World);
    Target.TimeOfDay = ReadNumber(Data, TEXT("time_of_day"), Target.TimeOfDay);
    Target.Weather = ReadString(Data, TEXT("weather"), Target.Weather);

    Target.Wind = ReadNumber(Data, TEXT("wind"), Target.Wind);
    Target.WaterMotion = ReadNumber(Data, TEXT("water_motion"), Target.WaterMotion);
    Target.Fog = ReadNumber(Data, TEXT("fog"), Target.Fog);
    Target.Brightness = ReadNumber(Data, TEXT("brightness"), Target.Brightness);
    Target.Warmth = ReadNumber(Data, TEXT("warmth"), Target.Warmth);
    Target.Bloom = ReadNumber(Data, TEXT("bloom"), Target.Bloom);

    Target.Ambience = ReadString(Data, TEXT("ambience"), Target.Ambience);
    Target.AmbienceVolume = ReadNumber(Data, TEXT("ambience_volume"), Target.AmbienceVolume);
    Target.Music = ReadString(Data, TEXT("music"), Target.Music);
    Target.MusicVolume = ReadNumber(Data, TEXT("music_volume"), Target.MusicVolume);

    Target.Companion = ReadString(Data, TEXT("companion"), Target.Companion);
    Target.CompanionAction = ReadString(Data, TEXT("companion_action"), Target.CompanionAction);

    Target.Invitation = ReadString(Data, TEXT("invitation"), TEXT("none"));
    Target.InvitationLabel = ReadString(Data, TEXT("invitation_label"), TEXT(""));
    Target.Subtitle = ReadString(Data, TEXT("subtitle"), TEXT(""));

    Data->TryGetBoolField(TEXT("breathing_guide"), Target.bBreathingGuide);
    Target.BreathingPaceSeconds = ReadNumber(Data, TEXT("breathing_pace_seconds"), Target.BreathingPaceSeconds);
    Target.TransitionSeconds = ReadNumber(Data, TEXT("transition_seconds"), Target.TransitionSeconds);

    Current.World = Target.World;
    Current.Weather = Target.Weather;
    Current.Ambience = Target.Ambience;
    Current.Music = Target.Music;
    Current.Companion = Target.Companion;
    Current.CompanionAction = Target.CompanionAction;
    Current.Invitation = Target.Invitation;
    Current.InvitationLabel = Target.InvitationLabel;

    const bool bNewLine = !Target.Subtitle.IsEmpty() && Target.Subtitle != Current.Subtitle;
    Current.Subtitle = Target.Subtitle;

    Current.bBreathingGuide = Target.bBreathingGuide;
    Current.BreathingPaceSeconds = Target.BreathingPaceSeconds;

    OnEnvironmentChanged.Broadcast(Target);

    if (bNewLine)
    {
        OnSpoke.Broadcast(Current.Subtitle);
    }
}

void AHalcyonBridge::StepTowardTarget(float DeltaSeconds)
{
    const float T = Target.TransitionSeconds;

    Current.TimeOfDay = ApproachClock(Current.TimeOfDay, Target.TimeOfDay, T, DeltaSeconds);
    Current.Wind = Approach(Current.Wind, Target.Wind, T, DeltaSeconds);
    Current.WaterMotion = Approach(Current.WaterMotion, Target.WaterMotion, T, DeltaSeconds);
    Current.Fog = Approach(Current.Fog, Target.Fog, T, DeltaSeconds);
    Current.Brightness = Approach(Current.Brightness, Target.Brightness, T, DeltaSeconds);
    Current.Warmth = Approach(Current.Warmth, Target.Warmth, T, DeltaSeconds);
    Current.Bloom = Approach(Current.Bloom, Target.Bloom, T, DeltaSeconds);
    Current.AmbienceVolume = Approach(Current.AmbienceVolume, Target.AmbienceVolume, T, DeltaSeconds);
    Current.MusicVolume = Approach(Current.MusicVolume, Target.MusicVolume, T, DeltaSeconds);
}

void AHalcyonBridge::Tick(float DeltaSeconds)
{
    Super::Tick(DeltaSeconds);

    StepTowardTarget(DeltaSeconds);

    if (IsConnected())
    {
        TimeSinceHeartbeat += DeltaSeconds;
        if (TimeSinceHeartbeat >= 15.0f)
        {
            TimeSinceHeartbeat = 0.0f;
            Socket->Send(TEXT("ping"));
        }
        return;
    }

    if (bWantsConnection)
    {
        TimeSinceDisconnect += DeltaSeconds;
        if (TimeSinceDisconnect >= ReconnectDelaySeconds)
        {
            TimeSinceDisconnect = 0.0f;
            Connect();
        }
    }
}
