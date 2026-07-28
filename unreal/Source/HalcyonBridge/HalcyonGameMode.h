#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "HalcyonGameMode.generated.h"

class AHalcyonBridge;

UCLASS(Blueprintable)
class AHalcyonGameMode : public AGameModeBase
{
    GENERATED_BODY()

public:
    AHalcyonGameMode();

    UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Halcyon")
    FString ServerUrlOverride;

    UFUNCTION(BlueprintCallable, Category = "Halcyon")
    void AdoptSession(const FString& SessionId, const FString& AuthToken);

    UFUNCTION(BlueprintPure, Category = "Halcyon")
    AHalcyonBridge* GetBridge() const { return Bridge; }

    UFUNCTION(BlueprintPure, Category = "Halcyon")
    bool HasSession() const { return bHasSession; }

protected:
    virtual void BeginPlay() override;

private:
    UPROPERTY()
    TObjectPtr<AHalcyonBridge> Bridge;

    bool bHasSession = false;

    void ResolveBridge();
    bool ReadLaunchArguments();
};
