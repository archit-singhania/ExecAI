"use client";

import Link from "next/link";
import { ArrowLeft, FileCode2, TerminalSquare, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { AnimatedBackground } from "@/components/ui/animated-background";

const ASCII_ART = ",,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,:lI;II;;::;ll:IIIl;II!!!illll!I;;:::::::::;;;;;;;;;;;;;;;;;;;;;;;;;;;;;IIII;\n,,,,,,,,,,,,,,,,,,,,,,,:,:::::,,:lI;III;;;lll;II;IIlIIiiillll!!l;;;;;:;;;;;;;;;;;;;;;;;;;;;;;II;;;III;IllIII\n,,,,,,::::,::;,:::::::::::::::::;I;;IIlII!IIIllII;I!I;~i;l!ll!I;;;;;;;;;;;;;;;;;;;;;;;;;;IIIIIIIIlllIIllllll\n,:,:::,,,,,,,I:,,,,,:::::::;;;;:;;;:;l!;;II;I!IllIIl!IiIll!!llI;;;;;;;;;;;;;;II;IIIIIIIIIIIIIIIll!!llIllllll\n;::::,!ll!III;lI;II:,,,,:::::;;;;;;;;;iI:;;IIi!IIllliI!l!!!!!!lI;II;;;;;;;;IIIIIIIIIIIIIIIIlIlii!llll!ii!!!!\n((())]i]}}[-+?--___!llII;;II;;;;;;;::::l,,;I;;I::;lllllIl!!!!!!lIIllII;IIIIIIIIllllllllllllll!i!!ll!iiiiiii!\njjrxut[txccftunxrjfffftt|}ttt|]{ftttt/\\/\\(}+?())[-{}[[[??]---_~__+!l!llIIIIIIIIIII;IIIIIIIIIIIIIll!i~~iiil!!\nvzcvcxfrnvzvvccunnxrrrjfffrxxxjxYYJCCJYcunx(/cccvfzzzzzXzcvvcvtXYXXtvzXcvvut){(\\[(/\\(](){}[[]]?-??-?--+__~~i\nrnuxrjrxnvrXcuuxxnnvvuuxxxxxnnJYXJL0O0YuxrrfnvvvvccvvvuvvvvvzXnXUJLcUUXXcczzvnrv\\fXccfnuxxrrjjffff)|//|(t/\\|\nffftfffffftjjtttffffjjjtttttt/vj/tfjfffjtt/trrxnxLxxnunnnnvcvcuczXYQYUUUUUUCLJUJcJLUYYUUJYXczcunxrrjtffnrttt\nxxrrjjffucftjjjjrrrrjrrrjrxxxrxxunxrxrjrjjftfffjfrfjjrrjjjrrjfrrrrxcrnuuunuccvvccUXXYCCQm0OZbwJCJYJL0wZq0LUY\nrrjjftt/f|/\\tt///tft/tffjrxnujxvXzznuvuctvunuuunxnuuuxnxxxxxnxxrxrnuxrrfxnxxxnnnnnnuuunxxuvcccXzvcXYU0JJYJJY\ncvuunxxrrtftfffffjjfffjrxxnuvjxvzccnfcXx)uuvunrrffjnxxrjt/ttjrjtftfrtt/|xrtfttt/tttjtftfrfjjjuvuxxuvuucvuuuu\nCJJJJUYYYXJYYXYXXXXXXzXUCL0OZnxOmmwJXwwQUwZLUUYUUUXzvuuunxx\\fnnuux/rrjj/uxjrjfffjffffrftjjjffxrrrjrnnxjrrrfj\nUYYYYcwo*b*oLUUXzXYzcuucXUJLLrxOqpkdt|}!~-~,\",;l+)rXL0LCLCCXzYUJUvnccvn|tjrnvvvvvvcvunrxnxrrnvcuvzzYXzzzzXcc\ncUCLCJqMaaohUzzzYUUYYXzzvj//nttft\\[;'              .;/LLUUUYYUUUJLJczvt?_(\\ncYXXXXczzYcvcuuvzXzYYJUJYUXYYYYY\nnnuvcXz0bbZcvccvcXXXvczcr(/(-i:^. `..'^^'`^,^''^``'''.IfmZOOO0CQq&MdpOv}_(tuJQCLJLwqQJJCUzXYUYJCYYXYXYXXXYXY\nvvuvvXUO#8ZUUXzcvuuxxrnx}~+:^''.'^^''^\"^```'\"^'^'``'\"\"' (LZLZmwaW8B&dwC{}/vZx|rvt\\vO0LQ0LCJLCJJCJCLCQJYUCJXz\nzXYUUL0L0OLJXYzczcvuucr_\"`...'\"`'^''\"^^'```^^\"^''^.``^^'.^/ZqboM%$Mu[{)_fQq*LYYzYY/fOQ0Q0LOZOOQLL0mZqmUJXzcu\nYYUJQa#bhZQ0YUJYUYzcccI ''^^'^,'`^'^,'^^`'^\"`.'.''`^''^`^^ fa#okhh\\}t\\]~/qhqZZqqZZQJ0Q0OZZqwZqmZqppwCYvuvvXv\nXYUJLwpZw00dhhqCJUXcXv^    ^`..`^'`\"^`'` .`...'``` `'  `.` ,oWahhm0uXu(_XwkqtxjCwwO0OOZmwqddphdqpbabZZJQQX0u\nczYcvJJUJLwB#WBkLJOJXXr()\\t'.^}[!\"\",:I~](|{_-;`''\",,_(- `+JZ&WB8**ZttY\\?mwo#bMji(uQqmwdbha**o&MM#MM*wYYJwvCU\ncYvf(frYUQq8#W8Qx(xcYvf/\\rY} lY}-(\\(}]}fXzcuf\\|/jrr/(nt:i0$$8W@%MWqrb@Xf*p#*MBpx]]tZbpkaoo%$B$$$$$%dZQXuYcnJ\nXzr(}tjvYUp%d*Wc}i?|r[fvjXXx\\]rrnf|?+{)//rt{{}}+-))rrx/fzL&&a#BB*mq0mwtfdZ8o*&bC\\t}xYJqddd0kW8WM&8&8@aXXJXnY\nnxf\\}|nXUXdBq##v)]|cnr0LvUJzJnxun||)}{(/\\cuj){{\\tftrucn|xwhM#8@Ma0Z0zu\\/CJoqdoQutxrzr\\/nX00|tcrrrxZoYxvXUOYv\ntrr\\?}\\/xrJwCdpu\\]juccunuzUOUfccccvvvuvvcvucnnuvvvvvvvu|chh#MWBbQLdOnOucwCdppkutuv||([}??[XYrvt{}tYUxXJ0Jn/|\n{{[_[}xC0xncL0XrunzjuYufruzXXuvXXXXzccznnzXzrruvczzXzcx\\zdko*&BQX/vYJYfnQuOqZwxuXr)xxt}fjru(vxjxzpqqwOmwzYun\n)[_[trvJv(\\jnnt|cahf\\rtft|f/rcfYzYYXzzuxjuuxfjvzYYXzcu/{/JWhmhMbpOOZMC\\z0YOncLpoO\\/r\\{frYJnf()nYuJXYJJ0mQXcX\n!!{upopr~~i!i~{uvUJ/_~!(j\\(])n|vXYYXcnnf\\/r/|/fjncXcux(-\\xCQmmqbkq0Ycv[{tQf?()CY){}[}[[txtUj|\\)([?}mdnXJvjzc\n!!i]CkL{+~!ii+]fqkX\\-~_)/tr?\\*XfvzXr)\\/\\\\/ft|(())nzur|++_]Y0LZZm0Ur\\-+?tZoYj{-i!i~_?+?)Xwmmr_++-_-]|(?]|{-?)\niii~+_ii~!!i!~~!{t?~i+-_??_i]zt[|ucuxunf/|)|\\fxrjxxt}]]^?\\j\\\\(t)-{[-++-|bovf[-?---[[??[jXOU|-?]?-+~~~~~i~++-\n-[_~}-+-~})+)]-/?-(-|}?/]-]__+_[-{/\\rcvur/(txvuj|){?[/z:`~_?[]]?[[)]???[{(__??]-][]}?-?--[}-][]?][?_??~_---?\n)/(]f\\]\\-(/_|\\?)[|nt(][ujt/{/n\\u[/t]_{\\|(/t/(){_li-(trp? ''\";I!+}tzX/ur\\r/x(\\\\(tff//(t}(}(|{n[((){?x}[)_?-[]\n([_-}[\\|-/([}f}(n?[t]]u{]zt]/[++^Jnr/{-_~i+~~~_-}\\ftzpa? '^`     .`I!}_?/vtvf)nYJJnYfzZ(nc}vx)cxff(xxt/|\\][}\n]]+i\\fii)(!}j)+(j?/][(/]{(II;^\"',bpzcvxjft/frjtrvxxqhkmi `^^'...        .\"'^+-i\\|nztj|cux|{|\\\\r)/j||u[[x|?t)\nt}}-)/{i)}}?\\t(_(-ll~\"``    '^,.+qcLCLJXvnnxrnzv(;^tp/jI .'''`..                  \"'i,i\\/(/[+?[-\\)??|)(|+[t}\nl-/[l?[_i_/[;i_'.         .\"\"^, jx `\"i|uUXuvLU)\" `' Cf?' .`^'`.`                      `:r\\)cY))(-[(~!}{~+{il\n;I-~I;;-!I;'              ^\"'\", ni``.  ':nbp~  ^,\"\".(O:.. `^^..`                     ...,(?_)\\ut}[|-_()__]?i\n,,;l::::I;.              `\"^^\"\" \\i \"\"\"\"^ /bbn]l`.`'`l0I`. .''..`                       . :-i+{?ll!]-!i~lIli-\n,,~];,,,;'               ^^^^^^ !v].` .,fwqbokmYf}+\"\\Z+ .  ``..`                        . \"i[)~+l;+~:;?_!~I~\n,\"\"\"l~;:,               `^^^^^'`]vZn![uQwpppwmwdbdw0mwi .  .. ..                         .`;I!]|)-l++I;l}(]-\n\"^^\"\"\"^\"`               '^^^^^`')vU00ZwOQpbpwmOO00LZZQ^       .`                         ..`;I!-]~l~-l::Illl\n'''^''^^.               ^^^^^^`^)vUJCCLQQpqcQOOmZZ0OwY       ..`                          ...,\"^^^\"^^^\"^^'''";

const LINE_COUNT = 22;

const TAGS = [
  { label: "Founder", color: "#d9b467" },
  { label: "CEOAI", color: "#8fae52" },
  { label: "Builder", color: "#c9754a" },
];

export default function AboutAuthorPage() {
  const gutter = Array.from({ length: LINE_COUNT }, (_, i) => i + 1);

  return (
    <main className="relative min-h-[100dvh] overflow-y-auto overflow-x-hidden bg-radial-ui text-ink">
      <div className="scanline pointer-events-none absolute inset-0" />
      <AnimatedBackground />
      <div className="top-beam" />

      <div className="relative mx-auto flex min-h-full max-w-[1600px] flex-col px-4 py-5 sm:px-6 lg:px-10">
        <div className="flex shrink-0 items-center justify-between pb-5 sm:pb-7">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-md border border-ink/10 bg-white/60 px-3.5 py-2 text-[0.7rem] font-black uppercase tracking-widest text-steel shadow-line backdrop-blur transition hover:border-accent/40 hover:text-accent dark:border-fog/10 dark:bg-white/5 dark:shadow-line-dark"
          >
            <ArrowLeft size={13} />
            Back
          </Link>
          <div className="flex items-center gap-2.5">
            <Logo size={32} />
            <span className="text-sm font-black tracking-tight">CEO.ai</span>
          </div>
        </div>

        <div className="animate-rise pb-5 sm:pb-7">
          <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-accent">The Author</p>
          <h1 className="mt-2 font-serif text-[2.1rem] italic leading-tight text-ink sm:text-[2.6rem] lg:text-[3rem]">
            A note from the founder&apos;s desk
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {TAGS.map((tag) => (
              <span
                key={tag.label}
                className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.65rem] font-bold uppercase tracking-widest"
                style={{
                  borderColor: `${tag.color}55`,
                  color: tag.color,
                  background: `${tag.color}14`,
                }}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} />
                {tag.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 pb-12 lg:grid-cols-[1fr_1.28fr] lg:gap-8">
          <div
            className="animate-rise flex flex-col overflow-hidden rounded-xl border shadow-glass lg:min-h-[680px]"
            style={{
              borderColor: "rgba(217,180,103,0.28)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.35), 0 0 0 1px rgba(217,180,103,0.08) inset",
            }}
          >
            <div
              className="flex items-center gap-1.5 border-b px-4 py-3"
              style={{ borderColor: "rgba(217,180,103,0.16)", background: "#15130f" }}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#d9704f" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#8fae52" }} />
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#d9b467" }} />
              <span
                className="ml-2 flex items-center gap-1.5 text-[0.68rem] font-bold"
                style={{ color: "#d9b46799" }}
              >
                <TerminalSquare size={12} />
                portrait.ascii
              </span>
              <span
                className="ml-auto flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest"
                style={{ color: "#8fae5299" }}
              >
                <Sparkles size={11} />
                rendered live
              </span>
            </div>

            <div
              className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-6 sm:px-6"
              style={{
                background:
                  "radial-gradient(circle at 50% 18%, rgba(217,180,103,0.14), transparent 55%), radial-gradient(circle at 15% 85%, rgba(143,174,82,0.10), transparent 50%), #0a0908",
              }}
            >
              <pre
                className="select-none whitespace-pre font-mono"
                style={{
                  color: "#e7c988",
                  textShadow: "0 0 18px rgba(231,201,136,0.45), 0 0 2px rgba(231,201,136,0.6)",
                  fontSize: "clamp(0.34rem, 1.02vw, 0.72rem)",
                  lineHeight: 1.08,
                  letterSpacing: "-0.01em",
                }}
              >
{ASCII_ART}
              </pre>
            </div>

            <div
              className="flex items-center justify-between border-t px-4 py-3"
              style={{ borderColor: "rgba(217,180,103,0.16)", background: "#15130f" }}
            >
              <p className="font-serif text-sm italic tracking-wide" style={{ color: "#ece7db" }}>
                Archit Singhania
              </p>
              <p
                className="text-[0.58rem] font-bold uppercase tracking-[0.2em]"
                style={{ color: "#8b8577" }}
              >
                43 &times; 108 glyphs
              </p>
            </div>
          </div>

          <div
            className="animate-rise flex flex-col overflow-hidden rounded-xl border shadow-glass lg:min-h-[680px]"
            style={{
              animationDelay: "90ms",
              borderColor: "rgba(217,180,103,0.28)",
              boxShadow: "0 30px 90px rgba(0,0,0,0.35), 0 0 0 1px rgba(217,180,103,0.08) inset",
            }}
          >
            <div className="flex items-center border-b" style={{ borderColor: "rgba(217,180,103,0.16)", background: "#15130f" }}>
              <div
                className="flex items-center gap-2 border-r px-4 py-3"
                style={{ borderColor: "rgba(217,180,103,0.16)", borderTop: "2px solid #d9b467", background: "#0a0908" }}
              >
                <FileCode2 size={13} style={{ color: "#d9b467" }} />
                <span className="text-xs font-bold" style={{ color: "#ece7dbdd" }}>
                  about-author.md
                </span>
              </div>
              <div className="hidden flex-1 px-4 py-3 text-[0.65rem] sm:block" style={{ color: "#8b857766" }}>
                CEOAI &mdash; workspace
              </div>
            </div>

            <div className="flex flex-1 overflow-auto" style={{ background: "#0a0908" }}>
              <div
                className="select-none border-r px-3 py-7 text-right font-mono text-[0.72rem] leading-7 sm:px-4"
                style={{ borderColor: "rgba(217,180,103,0.12)", color: "#5c574c" }}
              >
                {gutter.map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>

              <div className="flex-1 px-5 py-7 font-mono text-[0.8rem] leading-7 sm:px-8 sm:text-[0.87rem]">
                <p>
                  <span style={{ color: "#d9704f", fontWeight: 700 }}># About the Author</span>
                </p>
                <p className="mt-4">
                  <span style={{ color: "#8fae52", fontWeight: 700 }}>## Archit Singhania</span>
                </p>
                <p className="mt-5" style={{ color: "#c7c2b6" }}>
                  CEOAI began with a simple belief:
                </p>

                <div
                  className="my-4 rounded-md border-l-2 py-3 pl-4 pr-3"
                  style={{
                    borderColor: "#d9b467",
                    background: "rgba(217,180,103,0.07)",
                  }}
                >
                  <p className="font-serif text-[0.95rem] italic leading-relaxed" style={{ color: "#e7c988" }}>
                    &ldquo;Great decisions shouldn&apos;t be limited by access to great advisors.&rdquo;
                  </p>
                </div>

                <p className="mt-4 leading-7" style={{ color: "#c7c2b6" }}>
                  I created CEOAI to bring strategic thinking to everyone&mdash;from solo founders and students to
                  growing businesses. Rather than acting as another chatbot, CEOAI is designed to think through
                  problems, challenge assumptions, evaluate trade-offs, and help users make informed decisions
                  with confidence.
                </p>
                <p className="mt-4 leading-7" style={{ color: "#c7c2b6" }}>
                  The vision is larger than a single application. CEOAI is the foundation of an intelligent
                  executive platform where specialized AI experts collaborate to solve complex business and
                  technical challenges, making high-quality decision support accessible to anyone.
                </p>

                <p className="mt-5" style={{ color: "#8b8577" }}># Every feature is guided by three principles:</p>
                <ul className="mt-2 space-y-1.5">
                  <li style={{ color: "#c7c2b6" }}>
                    <span style={{ color: "#d9b467" }}>*</span> Think deeply.
                  </li>
                  <li style={{ color: "#c7c2b6" }}>
                    <span style={{ color: "#d9b467" }}>*</span> Explain clearly.
                  </li>
                  <li style={{ color: "#c7c2b6" }}>
                    <span style={{ color: "#d9b467" }}>*</span> Execute effectively.
                  </li>
                </ul>

                <p className="mt-5 leading-7" style={{ color: "#c7c2b6" }}>
                  Artificial intelligence is changing how we build, work, and innovate. My goal is to create
                  products that don&apos;t just generate answers&mdash;they help people think better.
                </p>
                <p className="mt-4" style={{ color: "#c7c2b6" }}>
                  Thank you for being part of the CEOAI journey.
                </p>

                <p className="mt-6" style={{ color: "#5c574c" }}>
                  &mdash;
                </p>
                <p className="mt-1">
                  <span style={{ color: "#e7c988", fontWeight: 700 }}>**Archit Singhania**</span>
                </p>
                <p style={{ color: "#8b8577" }}>
                  Founder &amp; Creator, CEOAI
                  <span
                    className="ml-1 inline-block w-[7px] translate-y-[2px]"
                    style={{
                      height: "1rem",
                      background: "#d9b467",
                      animation: "blink 1.1s steps(1) infinite",
                    }}
                  />
                </p>
              </div>
            </div>

            <div
              className="flex items-center justify-between border-t px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-widest"
              style={{ borderColor: "rgba(217,180,103,0.16)", background: "#15130f", color: "#8b857799" }}
            >
              <span>Markdown</span>
              <span>UTF-8 &middot; LF &middot; Spaces: 2</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes blink {
          0%, 45% { opacity: 1; }
          50%, 100% { opacity: 0; }
        }
      `}</style>
    </main>
  );
}
