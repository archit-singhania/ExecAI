import { FormEvent } from "react";
import { Brain, Loader2, Send } from "lucide-react";
import { ChatMessage, Session } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function CommandPanel({
  session,
  messages,
  input,
  loading,
  error,
  setInput,
  sendMessage,
}: {
  session: Session | null;
  messages: ChatMessage[];
  input: string;
  loading: boolean;
  error: string;
  setInput: (value: string) => void;
  sendMessage: (event: FormEvent) => void;
}) {
  return (
    <section className="glass-strong flex min-h-[560px] flex-col rounded-lg p-4 sm:min-h-[620px] sm:p-5 3xl:min-h-[680px] 3xl:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-steel">Command Center</p>
          <h2 className="text-2xl font-black">Executive chat</h2>
        </div>
        <div className="rounded-md bg-basil/10 px-3 py-2 text-sm font-black text-basil">
          {session ? "Session active" : "Ready"}
        </div>
      </div>

      <div className="command-scroll flex-1 space-y-3 overflow-y-auto rounded-lg border border-ink/10 bg-white/48 p-3 dark:bg-white/5">
        {!messages.length && (
          <div className="grid h-full place-items-center py-10 text-center">
            <div className="max-w-sm">
              <Brain className="mx-auto mb-3 text-steel" size={38} />
              <p className="text-lg font-black">Start with a business goal.</p>
              <p className="mt-2 text-sm leading-6 text-steel">
                The CEO will route it through the agent floor and return a board-style brief.
              </p>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "animate-rise rounded-lg px-4 py-3",
              message.role === "user"
                ? "ms-auto max-w-[88%] bg-ink text-fog"
                : "me-auto max-w-[94%] border border-ink/10 bg-white text-ink shadow-line dark:bg-[#171b20] dark:shadow-line-dark",
            )}
          >
            <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
          </div>
        ))}

        {loading && (
          <div className="me-auto inline-flex items-center gap-2 rounded-lg bg-white px-4 py-3 text-sm font-black text-ink shadow-line dark:bg-[#171b20] dark:shadow-line-dark">
            <Loader2 className="animate-spin" size={16} />
            Agents are debating the plan
          </div>
        )}
      </div>

      <form onSubmit={sendMessage} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the CEO to challenge, plan, analyze, or create tasks..."
          className="h-12 min-w-0 rounded-md border border-ink/10 bg-white/70 px-4 text-sm font-semibold text-ink outline-none ring-ink/10 transition focus:ring-4 dark:bg-white/5 sm:text-base"
        />
        <Button disabled={loading} className="h-12">
          <Send size={17} />
          Send
        </Button>
      </form>
      {error ? (
        <p className="mt-3 rounded-md bg-ember/10 px-3 py-2 text-sm font-bold text-ember">{error}</p>
      ) : null}
    </section>
  );
}
