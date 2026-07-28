#pragma once

#include "CoreMinimal.h"
#include "Components/ActorComponent.h"
#include "HalcyonStreamLink.generated.h"

UCLASS(ClassGroup = (Halcyon), meta = (BlueprintSpawnableComponent))
class UHalcyonStreamLink : public UActorComponent
{
    GENERATED_BODY()

public:
    UHalcyonStreamLink();

    UFUNCTION(BlueprintCallable, Category = "Halcyon")
    void HandleBrowserMessage(const FString& Descriptor);

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon")
    int32 MessagesReceived = 0;

    UPROPERTY(BlueprintReadOnly, Category = "Halcyon")
    int32 MessagesRejected = 0;

private:
    bool AdoptFromPayload(const TSharedPtr<class FJsonObject>& Payload);
};
