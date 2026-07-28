#include "HalcyonStreamLink.h"

#include "HalcyonGameMode.h"

#include "Dom/JsonObject.h"
#include "Kismet/GameplayStatics.h"
#include "Serialization/JsonReader.h"
#include "Serialization/JsonSerializer.h"

UHalcyonStreamLink::UHalcyonStreamLink()
{
    PrimaryComponentTick.bCanEverTick = false;
}

void UHalcyonStreamLink::HandleBrowserMessage(const FString& Descriptor)
{
    MessagesReceived++;

    if (Descriptor.IsEmpty())
    {
        MessagesRejected++;
        return;
    }

    TSharedPtr<FJsonObject> Payload;
    const TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Descriptor);

    if (!FJsonSerializer::Deserialize(Reader, Payload) || !Payload.IsValid())
    {
        MessagesRejected++;
        UE_LOG(LogTemp, Warning, TEXT("[Halcyon] StreamLink got unparseable descriptor."));
        return;
    }

    FString Type;
    if (!Payload->TryGetStringField(TEXT("type"), Type) || Type != TEXT("halcyon.session"))
    {
        return;
    }

    if (!AdoptFromPayload(Payload))
    {
        MessagesRejected++;
    }
}

bool UHalcyonStreamLink::AdoptFromPayload(const TSharedPtr<FJsonObject>& Payload)
{
    FString SessionId;
    FString Token;

    if (!Payload->TryGetStringField(TEXT("session_id"), SessionId) || SessionId.IsEmpty())
    {
        UE_LOG(LogTemp, Warning, TEXT("[Halcyon] Session handover missing session_id."));
        return false;
    }

    if (!Payload->TryGetStringField(TEXT("token"), Token) || Token.IsEmpty())
    {
        UE_LOG(LogTemp, Warning, TEXT("[Halcyon] Session handover missing token."));
        return false;
    }

    AHalcyonGameMode* GameMode =
        Cast<AHalcyonGameMode>(UGameplayStatics::GetGameMode(GetWorld()));

    if (!GameMode)
    {
        UE_LOG(LogTemp, Error,
            TEXT("[Halcyon] StreamLink needs AHalcyonGameMode to be the active game mode."));
        return false;
    }

    UE_LOG(LogTemp, Log, TEXT("[Halcyon] Adopting session %s from the browser."), *SessionId);

    GameMode->AdoptSession(SessionId, Token);
    return true;
}
