#include "HalcyonGameMode.h"

#include "HalcyonBridge.h"
#include "HalcyonPawn.h"

#include "EngineUtils.h"
#include "Misc/CommandLine.h"
#include "Misc/Parse.h"

AHalcyonGameMode::AHalcyonGameMode()
{
    DefaultPawnClass = AHalcyonPawn::StaticClass();
    bStartPlayersAsSpectators = false;
}

void AHalcyonGameMode::BeginPlay()
{
    Super::BeginPlay();

    ResolveBridge();

    if (!Bridge)
    {
        UE_LOG(LogTemp, Error,
            TEXT("[Halcyon] No AHalcyonBridge in the level. Place one before running."));
        return;
    }

    if (!ServerUrlOverride.IsEmpty())
    {
        Bridge->ServerUrl = ServerUrlOverride;
    }

    Bridge->bAutoConnectOnBeginPlay = false;

    if (ReadLaunchArguments())
    {
        return;
    }

    if (!Bridge->SessionId.IsEmpty() && !Bridge->AuthToken.IsEmpty())
    {
        UE_LOG(LogTemp, Log, TEXT("[Halcyon] Using credentials set on the bridge actor."));
        bHasSession = true;
        Bridge->Connect();
        return;
    }

    UE_LOG(LogTemp, Log,
        TEXT("[Halcyon] No session yet. Holding at baseline until one arrives."));
}

void AHalcyonGameMode::ResolveBridge()
{
    for (TActorIterator<AHalcyonBridge> It(GetWorld()); It; ++It)
    {
        Bridge = *It;
        return;
    }
}

bool AHalcyonGameMode::ReadLaunchArguments()
{
    const TCHAR* CommandLine = FCommandLine::Get();

    FString SessionId;
    FString AuthToken;

    const bool bHasSessionArg = FParse::Value(CommandLine, TEXT("HalcyonSession="), SessionId);
    const bool bHasTokenArg = FParse::Value(CommandLine, TEXT("HalcyonToken="), AuthToken);

    FString UrlArg;
    if (FParse::Value(CommandLine, TEXT("HalcyonUrl="), UrlArg) && !UrlArg.IsEmpty() && Bridge)
    {
        Bridge->ServerUrl = UrlArg;
    }

    if (!bHasSessionArg || !bHasTokenArg || SessionId.IsEmpty() || AuthToken.IsEmpty())
    {
        return false;
    }

    UE_LOG(LogTemp, Log, TEXT("[Halcyon] Session supplied on the command line."));
    AdoptSession(SessionId, AuthToken);
    return true;
}

void AHalcyonGameMode::AdoptSession(const FString& SessionId, const FString& AuthToken)
{
    if (!Bridge)
    {
        ResolveBridge();
        if (!Bridge)
        {
            UE_LOG(LogTemp, Error, TEXT("[Halcyon] AdoptSession called with no bridge present."));
            return;
        }
    }

    if (SessionId.IsEmpty() || AuthToken.IsEmpty())
    {
        UE_LOG(LogTemp, Warning, TEXT("[Halcyon] AdoptSession called with empty credentials."));
        return;
    }

    if (Bridge->IsConnected())
    {
        Bridge->Disconnect();
    }

    Bridge->SessionId = SessionId;
    Bridge->AuthToken = AuthToken;
    bHasSession = true;

    Bridge->Connect();
}
