"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, FileCode2, TerminalSquare, Sparkles } from "lucide-react";
import { Logo } from "@/components/logo";
import { AnimatedBackground } from "@/components/ui/animated-background";

const ASCII_ART = "QQQQQQQQQQQQQQQQQQQQQQQQQQQQQ00QQQQQQQQQQQQQQQQQQQ0QQQQQQQQQQQQQQQQQQQQQQOZwwOOQOOwmZZOOmwmZ0dwmmqqqwZOmZQQQQQQQQQOQOQQQQQQOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO\nQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQOQOwmOQQOZZpmZOOmwqqOdwwmpqwwmZZQQQOOQOOOQOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOZOOZZZZOOZZOOZZOOZZZ\nQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQOQQQQQQQQQQQQQOOZOZZmZOOOOZwOZZmqqqwpZwmqwwwwwmOOOOOOOOOQOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOZZOZZZZZZZZZZZZZZZZZZZZ\nQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQOOOOOOOOQQQQOOOOOOQOOZZZOOZZZwZZZqppwqmwmwwqwmZZOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOZZZOZZZZZZZZZZZZZZZZZZZZZZZZ\nQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQQOOOOZZmZOOQQQOOZZmmOOOmZZZmZZmqpmwwpwwwmwwwqqmZOZZOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOZOOZZZZZZZZZZZZZZZZZZZZZZZZZZZZZ\nOOQQQQOQQQOOQQQQQQQOQQOQQQQQQQQQQQQQQQQQQQQQQQOOQQQQQOOZmmZZZZZZOOOOOZmwwZOmmmmmwwZZwZppqqwpwwqmqqqwqmOZZOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOZOZZZZZZZZZZZZZZZZZmmZZZZZZZZmmZmw\nOOOOOOOOOOOOOOOOOOOOOOOOOOQQOOOOOQQOQQOQQOOQQQOQQQQQQZpwmZZwqwZZZOOOZmmwqOOmwwmqqmZmwmOkqwpkqpwwqwwqpwZOOOOOOOOOOOOOOOOOOZOZZZOOOOOOOOZZZZZZZZZZZZZZZZZZmmmmmmmmmmmmmmwqqq\nOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOQOOOOOQOOOOOOOOQQOOOwqZOmZmZZZOOZOmwZpqZmZwwOZqwZmwmOwkOkkmqmqqqqqwwqwZOOOOOOOOOOOOOOOZZZZZZZOZZZZZZZZZZZZZZZZZZZZZmmmmmmmmmmwwwwmmmwqqw\nOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOZmmOmmOwmmZZZmpwwqZOwwmmmZmwwwwmZwhwkwmmqqwwqqppwwZOOZOOZZOOOZZOOZZZZZZZZZZZZZZZZZZZZZZZZZZmmmmmmmmmmmmmmwwwwwwqpppp\nOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOZqOOZOqQppmwmZwwOmZmwwwwmmwmZmppZZmphqZwwqqmwpqpmOOOZZZOZZZOZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZmmmmmmmmmmmmmmmwqqwwwwppppq\nOOOOOOOOOOOOOZOOOOOOOmdQOOOOOOOOOOOOOOOOOOOOOOOOOOOOOmqOZZQwZwwmmwwdwmmOmqwwwqwwmZmwpmZwdhOmwwqqqpwqpZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZZmZmmmmmmmmmmmmmmmwwmmwppppqqqwqwqqq\nOOOOOOOOOOQ0QQQQQQOOQZpQZOQOOOOOOOOOOOOOOOOOOZZOOOOOOOZZZOOOwwdZZOmmmmZZmpwmwqqmmwwmqqwmbqZwwwpppqwwpmZZZZZZZZZZZZZZZZZZZZZZZmZmZZmmmmmmmmmmmmmmmmwwwmmwwwwqppqpppqwwwwqqp\nOOOOOOOOOOOZQOOQQQQ0QQMOmQM0000QOOOOOOOOOOOOOOOOZZOOOOZZZOOOZmdwOOOOZZZZwppmmmwmqwwmwdqQbwmqqqqqqqwqwmZZZZZZZZZZZZZZZZZZZZZZmmmmmmmmmmmmmmmwmmwwwwwwwwwwwwpppqqpqwwwqpddpp\nmmZZZZZZZOqCbkaoakppppkbbdppqppwOOOOOOOOOOOOOOOZZOOOZZZZZZOOOOpbQZZOOZZmmmkqmmmmmmwwqdqOdqwwqppqqqqqqwmmZZZmZZZZZZZZZZmZZZmmmmmmmmmmmmmmmmmwwwwwwwwwwwwwpbbpqqqqwwwwpdbdpp\noakkkhpddqwmqqwqwwwwwmwmwwqqqbkwQ0QQQQQQOOOOOZZZZZZZZZZmmmZZZZObwOZZmmmmmmddwZmwmqqwwppwqwpqqppppdqpdqwwmZmwwwmmmmmZmmmZmmmmmmmmmwwmwwwwwwwwwwwwwwwwwwwqdddpqqqqqqpdbpdpbb\nftttttfjjupaLzzzzcLUbX**UUaahkbbqqwwmmmZOOZOOOOOOZZOOOOQQQQQQOQ0dO0QOmmwmZZwqmmZmqppddpdkwpppdddppdpppqpqwwqqqwwmmmmmmmmmmmmmwwwwwwwwwwwwwwwwwwwwwwwwwqqqqqqqqqqqpddddpddd\njffftt//\\jhJvt|(((|uY|\\|//ttttjjjjxxvuuvJkYzzzzYXok*cJJLCCCX**Ua**kkdpwmddpqpqwmwqqppmpwqZmZmbwmqwqqpqwwqqpqmqwwmmmmmmmmwwmmwwwwwwwwwwwwwwwqwwwwqwqqqqqqqqqqqqpppbkkbddbbd\nfffft/\\\\(tXYvx/)11)vx(||//tftfjjjjjjxvvxuCxjfttfzYCY|)((()1))(()(((\\fxckc(|||ttvUtfjjvvuuYcccYLCLCXCkbUoooakpwpqqqqwmmmZZZmmmmmZZZmmZZmZmmwwmwwwwwwqqqqqqqqpqpppbbkkkbbbdd\n|\\||////|jJuzzx/||(vf|\\\\\\\\//ttfjjjjjxxxxvzjjjfttjtzf(())111111)||\\/ttxu*Y|(((|||Y1)11{11{}}}}{1111){\\J[]][{1}J/1)1{11()((/YJCXCcLLkULCXX*adahkkbbddppppqqpqqbkbkkddpdbbddp\n{}-<?][}}(/){{]1)}1_[|[}(||/\\\\\\/ttttfjvxxjjjfttft/t(1}]?_++++_?})/fjfjuLx//|||||v||())((|(((|||||())1z(1}]?-+t|?]???][[[}[|vvvujf|uL){)))(Lt)|||\\/tffjjxvuuzzYJoLJLCXXkaL*\ntff/|(//ft\\f|||}{(j<[/?[{{))))11{{{1))()\\\\||||()1{>{]-_~<>!!i<-(ttfjfjjut|\\/\\\\/|/(||||||\\\\||||((())(1j1}]?--+||?][}1)|(|))1|\\\\tft|vU|)))()vv|\\\\///ttftffffjjjjjcCxvvxjuLxx\nvvvuuzYYYcYYcYzxxuC1tJxcJccuuvvx//tf/jxjjfffjjftt\\!j\\\\\\(11{{}1(((|\\/ttj\\1{{1{{}{<}1))))((|))(()||){{{/1}{{1{{)}1()\\(1|)()|1[)1|\\\\1vL)))(((tftttfffjxxjxxxvjxxxxvLuuuuuuYvv\nffffffftftt/ttfjjjjjjxvxxvxxvvvuuuuuuuzzzzYYYYcYcv]LzYczuuuuuuvxxuzYuuYxjxt//\\t/\"f|//))))|(||(1{[}{{1|{{{[]?]<>}_<-?_-?-??-~-???[?}(~+?}{1(])1)(1)||\\////ttxxvvzjuYzuuzj/v\nffffffffffvxtt\\|jttt///////\\/\\\\\\\\\\\\\\//tfft///t//ttftttttfffffjxxvvvuuuzYzuzzzzYu1YuzYuuuuuuuuuvxjxuujtfft/\\|(>(f)}11{}}}}]--?]?--_}+l<__i_+:!;' \",\"I;`^,<<-+_??}+}}]]?]i_{\nttffjjjxxxvxxu/>utYYvvuuuvxxxxjjxxxjfjjjfftttt\\fj|t/||\\//t/t/ttttttfttftttt////tf/////////ttttffjfffjjjjjxxxj|xxxjjjjjjjjjffffjfttj(|(|/{|-[1{-~[_+_<:\";}{]_[-1]>_il:;l.>;\n\\\\\\tttffjjjjvjvtYjuzjxxvuuuuvxjxuuuvvxxvxjjfff/jx\\f({11)(/t(]fj|)fj|\\fvj/tt/ttfftttt/tt/t/\\///||||\\///\\\\|||(\\\\(|(|||\\||\\\\((((|||\\\\||||\\\\|\\(\\/tfft//|(((()[1\\/|\\){{{]:-1<|]\nfftfjffjjxxvuxjXXjuzxxxxxxxvjjfjjxjjfffft\\\\\\||)/x|f1{1111\\ft/1t)1zz1||||||\\|t/ftt/\\|/\\tjffjjfjjjjjtftfjxjfjx|}fjfjjjc/|\\tttt//\\|||\\|||()))(1)())1{{{{{{{{11{{{}}}}}}}}[}}1\nfjjxxvjuuuuuYuxuuzcYzzzzzzYzvuvvzuuuvvxjfftt/|1tx|f1}{{}}t[u\\?}]|Lu{11111)(|\\|///\\\\((|(|\\/fjfjjtxx/f/fxxjfvu)jvxvuuuc\\\\fuvuzuuuuuuuuuzx/uuuzzvjtfjjtjt\\(111\\|||))111}}[[}}\n_-??][}[}111)1(f//vt/////ttttttfjjjjfttttt//\\\\|jj|t((||||t(c/(\\|tXz(tftffjjxxfvvvvxttffffjjxvuuxvxfffjjjjfjzujjjjxxuY\\\\fxjt/xxxvvvxxxuxjuxfjxvujxuzjuzxt//tjjxjjfttft//fjj\n?][[}}[[[}}[{{1\\)][}}{{{}{{{{{{{}}}}}]-_+~<>i!:]j//!!!!!;}j1\";l;<t[+~+++_?[}{1(\\//t//tttttffjjxxccxjfjfttttzxjxjxuvzY|\\fxxxjuuvvuuvvvuxjvvfxvxufxfxfxxftffftffft\\|/t/fxtff\n-?]][[[[[]}{?-___+_][}{}}111{{{{{{1(|){[??-+~<;{ft(;lI;:,^l\\]_~+<?I^,!+}1}[]?+<ii<_???]][[}}}{{{jz()1{{}1{|z\\\\/|//|vz(/tt\\\\ttftttttttf/tjtf/xjt/f/tfjf/\\\\\\tt/\\ttt||1//////\n]][}[[[[?11,^' ,!  :_[???[{{[[}}}}1(()1}}}]?--</ff(i>i!il'!xc\\fOmwZdqM#@@@%#BWZkY|?~>~??--????][}{1{{}[[{[|j((((|||zJjjjjj|)(((((((|((1|/(t/ff\\/ttfjft\\\\(||||(111[}){}11{1\n){{{)11)1(<     '   <1{{1))(1)}1||\\/t/|(11{11}]xfft?]~~;I]vkZ&#B#@@@%###B####%@@@@WpL|+_-___--??}}}}[[]][?1){))1)tfJXXJutu/))))))111))1)|1((t\\|\\\\/tt/\\))}{))1}}[}]}1}{1}}{\n})-~<>l~<<?\" \"^^`, I}?111}}?[}]{{{{))(|(/vvuLu}ujzffjtzXZBBBB8&8B##88B#########BBB#@@#k}+[[]]][[}{{[}}]??_[_}1{{1jv*kboYCv\\t1{1{{{{{{1}{)1{]||))(|\\()11}1)}}1?[}}?1][{1{{}\n/tt\\))1{{][1I;;:;:~((()}1({?-_-++~~+++??|zYLL*z*C*kkZ&8#8WW&&88B#################B88WWB0u-?[]]]]]?-_+_}[]I^:>-{??}/*okkxLv1([-?][]]}[11?}?]{{{}})))1{{{}1{-]{}}}}]1}}}1[}[\n(|||\\\\|||)){?!;;;>11((((||\\///|/tjzttt/jYJLuvzkbkOW&WMMM&&88&8B#%%%###%%#######BB8&&&WM&#Z/:!llll!i<i[_i!    .I.>_]LCobjjf1]+><+l+?<~!\":<<?[--?]{{{{}[[}]_-[{}{}{[{[[{1}1{\n|\\\\\\||(((1]_<,   <]?}}}{{111)1))||t/|\\ffCaf|/uCpMM00M&&&88888B#%%%%%%%%%%%%%%###B8888&&&&B%/;~><_-<<?~;^'.     `>+[CY*kzjj1|1/zt)tx|t>.:>+-?_~+_][[[--][[?+-]][[[][]{{}}1}\n((|(|||()}}}<l   !-]]{11(|)|//|/t//t//tvUt~+-tJ&0Q0MW&&&8888BB#%%%%%%%%%%%%%%%%##BB888&&&W&B-<-_[+l!::\"'      ;!IIiXLCY(f<._J*Yt}(uXXUz}~+-+__~_-__?+-]-???]?-_~+_~<?}][]>\n111{1]?}[_-?_-_<+[}]{}})1(11(|||\\\\||1|zaacuz{(k%Q00W&&88888888&&88BB########%%%%###BB8888&WBo;+~+ill,`       +v*C\\/hLJ)]]^.ij/}(ft)1\\uLf_++>+-++_+~<>~<<--?]??<l>l!\"i?}l[}\n111{}}][__>!~->>-~_])1[{}(1}11))((|{joppaCCXuuw&WW&&&8888BB##%%#B8MQQ0W&8B#BBBB#####B8888&&W%]\"!<i:,^`.     }LXUhdpkoJ!ii l!!<__++<<<+zx>_+_++<~++~!l~l><>++~<~><<~>~_111(\n{[}}???-i` `l,,l~~li]?[}}[}}}1))(((1UkJcxxtYC*QM&&&&&8B#%%#80wbULcYYJL*ohdwQM&8888&888&8B&&W#d.:!:,` ^`\",. 1*LuJcCadho+!\".^ `;Ili+~++<[-~+_+~<<>~>!l!+<i!>>!l\";;Il<<?{(\\{(\n}{{}[[?->.  , .!+?_+][?i?[][[{11)1)1CJ|1|[{(1XB&&&8#%%#WZbLvt(111111)(|/tjvc*kqZM8BB&&&&MWWWO8| :^^  \",,,:!cCYt/)/zhUL<!l -\\t{<i\"ii>i~++~++~<<i!>lIl;>l:Ili!l!;:;:?|)(/)1)\n{{{[]][?_>;i+<>~++~I\"\",I?]?[]]}1111{|\\1)|?_i(88&W#@80qUYj/(111{{{{}{{{11)(\\tfjuYLUhpOM8#&ZZOmOb '..  ^^^\"\"_\"I/)>{(CoXt'+l.</ocfz-:;i!<+~~<<<>>!llII,:l,^\";I;;;^^^I]~!-]?~?\n111{[}[??_<_-__~<>      `l_?][{{1{1{}111(__<k%@#@&aLv/|/tt/|)1}}}}}{11)(()/tjxxxjvx\\txzXZ#MZZQC         '`:\"]t(uYYU*h( ?!  ,_!}*ov?+!><>>>>>l!I;;,,^,l^.'\",,^^'..'..,<>+,^\n1)11[{)1/?_]???-_+  ^\"'   l??[:_|[1}{}{)1-->w%&@&v\\|tChdbhaULLut/1}1)/zYjXwQMWWW0mZwC/))fB%OmO;            I{ucx1[XC*? }` \";;  zkbUc(-lIi!il,\",^\"`'  '           .I?1}[}+;\n))1](|jcf{)([[[-~_      `+]}{)+i_}{{{|fuxft<C#Z%b)|CM&MQQMWWWMQkcj||(/uJLUdwphaooo*hqhf\\tq@MQ]            .;<Jf~. fvvl 1` `   .)u*hULu+lI:,,^'`  .               ,+1f//|\\~\n(()}/txCcczt{][_I~    .  ~\\vUaYt\\[1tucccLzx\\/mM%k{fpacx/|\\txuzYYt\\(((1)|fftt|({{}{(\\tYu/YkMbY!             .1u`'  jjt: ?  '.   `+jJo*L/>;;;;``..                .!i;i})|/{\n|?-}|tuCcujj){}]_i  ,\". ^]vJopfCL1tLkcvuz|}\\/|hWp(\\j\\\\(|juYXLcYvx))/tvvvzcLJoaaXYujttvfxj*v[f|    ``     `^ '][  Iu|(  [  `'. .ii|uYjCz1!~-+I,il!-i                  ,<+-{\n|{(tfYXoCfff(){[]<  ,;' l1C*bpkcjxJUx~]|)-]_tf(|*f/t/tch*mM&a*aJYCJtxzabXok*hOMaXdoztj/\\\\*(]f+ .  ;      ;?}!'}!<|cjz;:)   .. `,<(Uttouvj)]+I,+, I\\}i,^. .^\"        I|j/?+\n\\///xJucLz/|)?}}}>  ,;. l1x*bXof1)Yv],~||]]-}t{?xxt//fL*zJXCXXLcxku{||/*CCCXcuvxjjvf|)))(Yc({.'        ''i}-}1}f|/JYC111 :iI^ \"?11zYLL\\(tvzYt~+~I'.jXv(_\\xj)tt{l` `1xtft/)\n\\///fxx*XCx|)?}}}!  ;I. ~1jCUzj(11(}}))|\\}{[{-}|v1(()|\\ttjxvzYujtt{1|\\(1uYYcuffft///t\\(((jCY{<~`       `.^>\"'<+([/u/t^+{,:I!+^<_1Yf}?|}-[tzJoUCxvt?>c*uYtjzjYvj[l:tu}?<~~<\n///t\\\\uak*xxttt))- I~>, ]}\\zLY\\|((())1{|/)1??:+tj1))(()||\\/\\\\\\|(\\()|||||\\t//\\|\\\\\\\\|||||||fcu].: '      ;>_+;.l?/,[t|1'~-..`,. -\\fx/((uXXXa*JLU*aoC/I-((-]jJcLcj-[{jx1)}?!~\nuCutzJ*UC*cCCx\\Yvjt)}}?'\\t\\YhCuxt(1|/tjj|({-{+1\\j)(1111))))(())1(||((((|tt)))))1111111(((xc[: : `     `<{1)|+~zj<]\\|(+][]<!_>`_tJ|||u*oLuLUXJLYCLz|tjttvc*XLCt})-+-???+?_(\nJXU*XohCf*/t}i_1x{1[_I>+\\YjxC/[|u/1)1tuj(|1{1~\\[v)1{}}}}{11))){)t/(()1)|jx/\\(((111111))|(cf/i.l`\" `   ;)]\\zu][{+[/\\z|_|/+,;!<I[))/1}1Lj}}(\\JhUtc*t]u*t?]||]v}!;\"l,;;<l:l>f\n\\zcX*ohhUof`,.>}t|({?]}\\|}?l\"._ftt1]1j\\fYztf/tz,ut{1{}}}{{)())|||/\\{[{})tjfj\\(){{{{{11(//UzzJ-^','.`  l+:(t1--+`+YuY}.1|->i]i`(|[__juCjxYuzzft{_[1)tjfjYJ/?/? <\"II~+_il:;>XYYhkkCjj(j\\x}jCXYvj|\\\\tu*L].  <uzjfjfu/uJuvxYL>tY}111}}{{11)(|fjjv\\(t/xvvj(11{}}}111(|tjoLtu?\"` ?~\". ^`:Il!<+` !/jt+;|<!_juj}<;, ;tLLj/zLUX(ff]~-xcYUhoX\\<tt_1)[([]?+~ll-\nbbdkCY(<l,<)|LaahkhkoUX*Xvxcx?_vkookhb*\\zzuJvzo\\t*(){}}}}}{1111(/juzjxzYzj|)11{{{{{{(||jjoLvt+' :>:~l\",;\"^;>!><:ifucxtfi{x*v-u-  l{ftvLcxzLJcCz(C)-+)vt(j\\|uL*XXv[!<|]??[1\nkpqbC})! '; }ohkbpqwwpmUt}{?:_}|cahpqdctLcLUkUC1t*/\\1{{}}{{1\\tfxYLCcffxJL*CcYvt\\){{(||txzdUJzctj(~lliII,;:i-+}*j-ooa*z(!jL*oooCx1*kaaUXoo**oCv|}cj_jjzcY*XU*C*XL{  <t}-?](\nbdppbaY_   ,tookdbkbkkk*L}?\"i}[~xakkbUzt\\|t(Ywp>I1c\\\\){}{|xYLuujj//||/(/fjxucCoYt1{((fvuXpkkkUf_!??i><iI>!]j{jzChkUcv):,jvJLU*UbqbkkbbhokkhX*u_<(]+tvokhkkoohaoXY}1/LLx\\+v\nppppddo|!;+YakbdpqpdddoahL\\^'^)aoakbkaUCccuvxCX.'</ut\\)1{\\zXYxuYJLLXXYL*LLCLzYcu/1)/txYLpdaah*1>~+<+><>i_-_vtchkkaUz(+ '~+/xJohakbkkhaoXohoJx)?,I.,,taahkaUaaaaaapdbhakkkh\nhkkkbbkoohkpdkkddddppbbbdkhj|vCokdbkko***okkpqb<I|(Uvf\\\\1(fj\\|\\fuzzuzYYzYYuf/fvv||tvxYoao%qCov|jjxfY\\ttzo*xLkkkbbbo*(\"  _~tJoahakhhhhUcoaaoUCj-l? ]}xUUU*U**oaahhaaaahhhaa\nkhahhkaahooohhhkkkkkhkkhkkhUaaUokdhaaUoUX*ookbdkXdaokc\\|||\\|(|||\\fxucYzvxt\\\\tftjjjvuYokc1O@wLLCXUU*oh*obkkkU*ohhhha*c) i*cXoaaaoakoaaaUoooaaoULxc?|Loaao*ooahhkkhaahhhhaha\nCkkokhkaUahhaahkoUhakaoao*oaakdha**hhahbkhkdkaakbahkhbCjjxv/(||\\/txcL*cj/(((fjvzYczCdhuj(v@%qoCXUXCUU*UUhooULL*UohUUaocoo*UUa*XX*LC*CCJYLXUU**UX*XYU*LcY*JX*LCc***UL*ahoao\nYY)\\CUo/{*o*YUoC!}oox<LUX<{XU)~Co|+C*Y!|UhJuUhovLUu)**aXCL*zf\\(\\\\fjtjxvjjjfjju*aookb*vtz]}@#8WMpoUU*X*UUfXcfoo*o*co*jJajuk*UCha*kkUcUa*Uoa*UUoo*UXo**UUC*XXCC*LC*aUcLaUUXX\nhv|)+cJ({~Loc|oUvXJCzvhLoC*UJ(?()Uo*UY/?t<u(/C/\\~LffxXu]LUhh*zvYccJuvYuucXcJLoqqqpoCv\\u\\:<8#8M&%&QOOmdhoxzt`-<]CCifat}XYxuhh/(Uc)uL}(v1x*cYLUcjo*|[*L])ooujkUtCau}uo*jL*oU\nvfYoaCLf*XJ/?Cocv(Xakc_JbhXu*kpUvoah*uoaXcYhaUvvooxtoB}|(tLobdhXXX*CJJL*UUhkmZmboCut/Y/;,>&B8&0WBBBB@@@%@Ommh}jz[1xYJ{j1+1?]Lzx/(?!/j\\v1\\}_?ttY|vL*Yz+|c|[\\{\\tCL|:1cu]t*vu\n\\1{uaYXotLf-uzX\\<v*cY[-LjY?-CCzY-coJx<zUCY>|oXXuYkdmO#<_c})jvLkddpqmwwZZZZZphXccuf/vL{`:,-MBB8MM&&BB8B@@@@@@@@%MokmoCX1(JL()*aL)tYf[/fu+[Uj\">Xc)i]Lf+)oc{]\\?}])Y})[_-t1t1)\nbCvLfXXf,1Uo*JLjhUJ+tkkUvj~j*Jiz*U*t~v*o\\`fChvtOMM0QBQ,\")L(1)|jvzJCX**Lcuxxfxxt\\/fYt; \";\"?&#B8&MWW8##BB@@%%%%@@@@@@@#&Uaqhda/fCLi^]: ,}]uxJ!`-ft<jLc}~tcu<(h*v>(*c?~CJt{+f\nJCLvUUULx?vU*af-UoXoY:|*ooutoULoaCXUY*LYabM&B@@#M0QO@o`;^]xf|11)(\\\\\\\\/\\||\\tjf/xj/j~.:I,\"lj8BBBWMW&W8#B8%@@@@@@@%%%%%@@@@@@%8dhQmqkUUC\\fJf1Lcz{]jcazzoXf}\\\\uY+\\j(|l{)YCx[<1\n{ ~JXUL[:?LU*X<(*ooL}~zo*oc}C*aUox*pm0&#@@@@@@WQMM0Q@C.^.  l?)|/|((\\/ttttfjzu\\})UMZ|^<-/tu#B#B&MW&&&BB8B@@@@@@@@@@@@@@%%%@@@@@@@@@@%@aa0cjkkJC)<fYx}uX*XxtLjI+YoJL?I)Y>>uC\nc|u\\,?z/Y(+\\C*uJJ[|cvU/?fCLx*pqZMQ#@@@@@@@@@@WQMMMQM@f *Uxt[il<?1\\tt/\\\\tjx/?>1oB@B#@{`Yhvx@8#B8WM&&&BB88@@@@@@@@@@@@@@@@@@@%%%%%%%%%%@@@@@##XtYoz[thoU*oUUo*XXuY**LzvYj/vJ\noo|/|tLoX(~uX*UC\\l|L*Xf]LM#@@@@@@@@@@@@@@@@@&Q0MM0QW@;!@W88&Z*\\+<~]}|jf|?I,?h@@8MWW8O taJk%8BB8WMW&&8B8&%@@@@@@@@@@@@@@@@@@@@@@@@@@%@%%%##B&B8L_}Ux:,I[\\Y1{CXL<:(JLL<,(C*L\nUoLxiitLUo*avj*oJvCjZ%@@@@@@@@@@@@@@@@@@@@@8Q00W00QB%.v@&&&&8B&qL|?[[]??!)b%@8WMWWMM@+;oCM#BBBB&0MW&BB8&#@@@@@@@@@@@@@@@@@@@@@@@@@@@@%@%%##B&WZ{!vYt{`,)x)/\\1JoaX****CvuYc\noaaot{*oahhafuahdkm@@@@%%@@@@@@@@@@@@@@@@@%000MMQ00B&.q@8BB#BB8#@8Q/ll,]0B#WMMWWWWMM@u Lb888BBB&MMW&BB8&#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%##BB&8#Luoaax|u[ :?(t+]YCC1Ii]Yf|\nahohCYaahkUoYchbhp@@@@@@@@@@@@@@@@@@@@@@@@MQ0MW000Q%Z;&0MMMMMMWMM0%u ,.i%&0OOQQ00MM0&Q'f0W&8B#B&WWW8BB8&#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%###B8WBm[t*Xo*?l|xYUXj^:/cx}-{zCX\ndbdkqqppdddpwqbkp@@@@@@@@@@@@@@@@@@@@@@@@#Q0MMM0000%Q;WWO00QQ0000O8p,::^/UO8B80OOQ0MMB;[mW&8BBB8&W&8BB88#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%####B&8BwzCXC*JxY*o**UCvuL*aa*CCL\nohhUYi+LookkhkJc&@@@@@@@@@@@@@%%@@@@@@@@@MQ0MM0000M%&z}&#MWWWW&M0@o_>I;\".`;{X0%@@&MO&q^vkB&8B##8&&8BBB8&#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%####888BmoaJ>}LohaUUoLLhhaoJfJ*o\nahhoti{JkppbbkpZ@@@@@@@@@@@@@%#%@@@@@@@@#Q00M000MMW@Oh?<a#M0MW888Ul:\"^^`'::^`:_\\CpQ&%/i}X%&B####8&8B#B8&#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%###BBBBW0CCz?<{jfvLX*1>|LXU\\`!|x\nppdbdpqdbcXkkhoB@@@@@@@@@@@@@%#%@@@@@@@@WQ000000MMW#pJ}~`xBW&8mY?,\"\"^``'\"::ll;,,`\";](l>:d#&B####B88B##B8#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#####B#B&&wodpbhL]{JXahooUaaa*Lc[\nY*hbkoCz~+u*UUh@@@@@@@@@@@@@@%#%@@@%@@@@00000000MM&#Ux-_I']pJ{I`;>;,:;;:!>!llIll><i!;!<>0BBB####BBB##B88#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%#######B&W&kU*J}{~<lI/cz)1YU*XL| \nCapqppdkapqpqpQ@@@@@@@@@@@@@@%#%@@@%@@@#Q00000000M8BXf_<Il\":\"\"::!iI\"`^\";I;I!l!ii!_<<<ii?B8B######B##BB88#@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%####B8&&OJ**Y\\i',-|vv>.:\\JCJuf\nqqqqpqpqZpqpqp&@@@@@@@@@@@@@@@%@@@@@@@@8O0000000MM8&C/_~!!i!!!I:;!l^.`,;I;!>i><~i++!i~l(@8#########BB88&%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%####B8&W80kbddbaU****ao*UUaakb\nppqqqqqpqqwpqwB@@@@@@@@@@@@@@@@@@@@@@@@WO0Q00000MM8WL/_<!lIl!!!!l!!`.^,I;>>i!!I<!>+<!>Ix@8#########BB888%@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%#%##B88&&8wohkddddbkbbkbbbbbdb\nqqwqqwpqwwwwww8%@@@@%@@@@@@@@@@@@@@@@@@0Q0Q00000MM8MC\\_iIlllIlI;!<;:,ipZ_;<!ll;i!!>>>iIL@B##########B888@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%###B88&&8&pddkkbdppppdpbdbpdb\npppqwwwwwwqwpM##%@@@@@@@@@@@@@@@@@@@@@#Q000000000M#QC|_>;III;I;;I>;l>;xJ~!illIl!I>>!>>Ik#B#########B8&&8@@@@@@@@@@@@@@@@@@@@@@@@@@%%@@@%%%%######B888BB&mwwppbbbdpqqqpppqp\npqqpwqwwwwwwmB%##@@@@@@@@@@@@@@@@@@@@@BQ00000Q000W%ZX|+!II;I;I,:;<\",II^`,:;:I;I!l!!!ii!wBB#########8&&&B@@@@@@@@@@@@@@@@@%%@@@@@@@@%@@@%%%%###%##BBBBBB#Wwmmwwqpdkbdpppqqq\nqwmmwwwqqmmqO#%%%@@@@@@@@@@@@@@@@@@@@@&Q0000QQQ00W#mo1+!I;::,:,\"\"<, `^' '^:,I::IIiI!>!>0&B########B8&&W#@@@@@@@@@@@@@@@@@@@@@@@@@@%%@@@%%%###%###B#######QdqqqmZZwpddddppp\nXXj+1YUkhpqqB##@@@@@@@@@@%%@@@@@@@@@@@MQ000000QQ0W#Qa}+I;II;;:,:Il;:';\\{, ,,I\",;;ll!>I-W&B########B8&&W#@@@@@@@@@@@@@@@@@@@@@@@@@%%%@@@@%%%#%%##########BBZkwZmZOZOZwqmpbk\ndbXzUhdwwwq&%B#@@@@@@@@@@@@@@@@@@@@@@@MQ000000QQ0M8MU[~l;::;\",^,I::_I{&m-:I:!,:;IIl!<:}8WB########B&&&W%@@@@@@@@@@@@@@@@@@@@@@@@@@@%@@@@%%%%%%###########BBZu(uCoppkYi?zLo\n\\CbqqpbpwwqM&##%@@@@@@@@@@@@@@@@@@@@@@00000Q0QQQQM80*?~;,,,,,,'^::\",>:::,:;;l,lI;Il!>\"|#M8##B#B##B8&&W&%@@@@@@@@@@@@@@@@@@@@@@@@@@@%@@@@@%%%%%#%##########B#oj*aJ{tY*JjCkp\nl/LabhbpdqkO&&8#@@@@@@@@@@@@@@@@@@@@@@00000000QQ0M8M*_~;:;::,,^,;:\".`\". '\":Il,;;;;!!!`x#MB#######B8&&W&@@@@@@@@@@@@@@@@@@@@@@@@@@@@%@@@@@%%%%%%%%%########BBBkbwL<~|*bbbbb\nppbdbbXXpqqwW888#@@@@@@@@@@@@@@@@@@@@@000000000Q0MB0J_<;::;;:,^,;;:. I\\]`^,I;\",,::I;I.z#WB#BBB###B8&&W8@@@@@@@@@@@@@@@@@@@@@@@@@@@%%@@@@@@@@@%%%%#%########BBZocckbppdddbk\nbaUUctl[*hod%%%#B%@@@@%@@@@@@@@@@@@@@@0Q00Q00MMQQM#Ou_!,,,,,,,^,;:\"\" 1#w:.,:,\"\"\":;;:;.UBMB#BBB##BB8&&W8@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%##########&Wk|}jUoaohaXL\ndwwwwwwmwmq#@@@@#%@@@@@%@@@@@@@@@@@@@@0QQQ000M0QQQ#wu~!\"^`^^^^`^::`,:'lI,`,I,`\"^,,;,,.k80BBBB##BBB&&WMB@@@@@@@@@@@@@@@@@@@@@@%@@%@@@@@@@@@@@%%%%%%%%#%#%%##B8WQwOZwmZmOZqq\nmwmwwmmmwpZ8%%@%%@@@@@@#%@@@@@@@@@@@@@MQ0000MMM00QBwc_!:`^^````'\",,^``  `',::`^^,,,,\"`m&M8BBBB#BB8&&WW%@@@@@@@@@@@@@@@@@@@@@@@@@%@@@@@@@@@@@%%%%%%%%%%%#####BB&wkwppaL1x*o\nhkpppddkoJmB&#%%%@@@@@@%#%@@@@@@@@@@@@WQ000MMMM00Q&OL[!;`^^^^```^:,..'..`.^^^`^^,,,,^\"QWWBB8BB#BB8&&W8@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%%%#######B8&woUCc|ii(c\ndpwwqqwwwpW#8B#%%%@@@@@@##%@@@@@@@@@@@8O000MWWWMQ0WW*(!l`^`^^``'`:,...  ..`^`'`^\"\"\"\"`I&M&B888BBBB8&&WB@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%%%%%%%########BBB8WdbqwOOwmm\nmZOZOOOmZMBB##%%%%@@@@@@@#%%@@@@@@@@@@#Q00MMWW&M0008kji!`^^`^``'`:,'''  . `````\"\"^^\" +#M8B88B#BBB8&WW%@@@@@@@@@@@@@@@@@%%@@@@@%%@@@@@@@@@@@@@@@%%%%%%#%######BBB&Mqmdppqwq\nwZOmOZOOm&###%%%@@@@@@@@@%B#%@@@@@@@@@@MQ00MW&&W00Q&mu~l\"`^^``'``,\"''.  . .`.``\"\"``, (#08B88BB#B8&&WW@@@@@@@@@@@@@@@%@%%%%%%%%@@@@@@@@@@@@@@@@%%%%%%%%%%########B80ppppwqp\nqwwqOOZZO####%%@@@@@@@@@@@%B#%@@@@@@@@@&OQ0MW&&&M00W0c]l:`^``````,^.... ...'.``\"^``^ u#0BB&88BBB8&WM&@@@@@@@%@%%%%%%%%%%%%%%%%%@@@@@@@@@@@@@@@%%%%%%%%#######%##BB&Omqwwqp\nnpqwwZmQmQ##%%%%@@@@@@@@@@@@%B#%%@@@@@@@%QQ0MW&&&W00MWC\\lI``````''^^.... . ...'`\"`''^ k#M88&8BBB8&WMM#@@@@@@@@@%%%%%%%%%%%%%%%%%@@@@@@@@@@@@@%%%@%%%%%%%%##%#%##BBB8Mpwmqww\nYUopppqw&B#%%@@@@@@@@@@@@@@@%###%%@@@@@@&Q0MW&88&00Q8aY~l````^''`\"` ...   ..''`,`'``.O&&8&&8BB88&MMM#@@@@@@@@@@%%%%%%%%%%%%%%%%%@@@@@@@@@@@@@@@%%%%%%%%%%%#######%##BB&Omqwwqp";

const LINE_COUNT = 22;

const TAGS = [
  { label: "Founder", color: "#d9b467" },
  { label: "Product Builder", color: "#8fae52" },
  { label: "Strategic AI", color: "#c9754a" },
];

const ASCII_ROWS = ASCII_ART.split("\n");
const ASCII_WIDTH = Math.min(...ASCII_ROWS.map((row) => row.length));
const ASCII_NORMALIZED = ASCII_ROWS.map((row) => row.slice(0, ASCII_WIDTH)).join("\n");

function FullPortraitGlyph({ panelRef }: { panelRef?: React.RefObject<HTMLDivElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const image = new Image();
    image.src = "/images/author-source.jpg";

    const render = () => {
      const bounds = canvas.getBoundingClientRect();
      if (!bounds.width || !bounds.height || !image.naturalWidth) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(bounds.width * pixelRatio);
      canvas.height = Math.round(bounds.height * pixelRatio);

      const context = canvas.getContext("2d");
      const sample = document.createElement("canvas");
      if (!context) return;

      const cropWidth = image.naturalWidth * 0.4;
      const cropHeight = image.naturalHeight * 0.71;
      const cropAspect = cropWidth / cropHeight;
      const boundsAspect = bounds.width / bounds.height;

      let renderWidth: number;
      let renderHeight: number;
      if (boundsAspect > cropAspect) {
        renderHeight = bounds.height;
        renderWidth = renderHeight * cropAspect;
      } else {
        renderWidth = bounds.width;
        renderHeight = renderWidth / cropAspect;
      }
      const offsetX = (bounds.width - renderWidth) / 2;
      const offsetY = (bounds.height - renderHeight) / 2;

      const panel = panelRef?.current;
      if (panel && window.innerWidth >= 1024) {
        const chrome = panel.offsetWidth - bounds.width;
        const nextWidth = Math.ceil(renderWidth + chrome);
        if (Math.abs(panel.offsetWidth - nextWidth) > 1) {
          panel.style.width = `${nextWidth}px`;
        }
      }

      const columns = Math.max(160, Math.floor(renderWidth / 2.6));
      const rows = Math.max(110, Math.floor(renderHeight / 3.4));
      sample.width = columns;
      sample.height = rows;
      const sampleContext = sample.getContext("2d", { willReadFrequently: true });
      if (!sampleContext) return;

      sampleContext.drawImage(
        image,
        image.naturalWidth * 0.34,
        image.naturalHeight * 0.29,
        cropWidth,
        cropHeight,
        0,
        0,
        columns,
        rows,
      );

      const pixels = sampleContext.getImageData(0, 0, columns, rows).data;
      const glyphs = " `.'-:^,;!~+_?)(|/tfjcrLxvunzYCJUXo*OZm0QNdkbpqPKAHRGSDBME8W#@";
      const cellWidth = renderWidth / columns;
      const cellHeight = renderHeight / rows;

      const lum = new Float32Array(columns * rows);
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const pixel = (row * columns + column) * 4;
          lum[row * columns + column] =
            pixels[pixel] * 0.2126 + pixels[pixel + 1] * 0.7152 + pixels[pixel + 2] * 0.0722;
        }
      }
      const sampleLum = (r: number, c: number) => {
        const rr = r < 0 ? 0 : r >= rows ? rows - 1 : r;
        const cc = c < 0 ? 0 : c >= columns ? columns - 1 : c;
        return lum[rr * columns + cc];
      };

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.fillStyle = "#070706";
      context.fillRect(0, 0, bounds.width, bounds.height);
      context.font = `${Math.ceil(cellHeight * 1.1)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
      context.textBaseline = "top";

      for (let row = 0; row < rows; row += 1) {
        const rowFrac = row / rows;
        const inFaceCap = rowFrac <= 0.3;
        const inHandGlass = rowFrac >= 0.55 && rowFrac <= 0.85;
        const inDetailZone = inFaceCap || inHandGlass;

        for (let column = 0; column < columns; column += 1) {
          const idx = row * columns + column;
          let luminance = lum[idx];

          if (inDetailZone) {
            const gx = sampleLum(row, column + 1) - sampleLum(row, column - 1);
            const gy = sampleLum(row + 1, column) - sampleLum(row - 1, column);
            const gradient = Math.sqrt(gx * gx + gy * gy);

            if (gradient > 26) {
              luminance = Math.max(0, luminance - gradient * 0.4);
            } else {
              const localMean =
                (sampleLum(row - 1, column) +
                  sampleLum(row + 1, column) +
                  sampleLum(row, column - 1) +
                  sampleLum(row, column + 1) +
                  luminance) /
                5;
              luminance = localMean + (luminance - localMean) * 1.6;
            }
            luminance = Math.min(255, Math.max(0, luminance));
          }

          const normalized = luminance / 255;
          const contrasted = Math.pow(normalized, 0.72);
          const glyph = glyphs[Math.min(glyphs.length - 1, Math.floor(contrasted * glyphs.length))];

          if (glyph === " ") continue;
          const warmth = Math.min(255, luminance * 1.14 + 20);
          context.fillStyle = `rgb(${Math.round(warmth)}, ${Math.round(warmth * 0.89)}, ${Math.round(warmth * 0.56)})`;
          context.fillText(glyph, offsetX + column * cellWidth, offsetY + row * cellHeight);
        }
      }
    };

    image.addEventListener("load", render);
    const resizeObserver = new ResizeObserver(render);
    resizeObserver.observe(canvas);

    return () => {
      image.removeEventListener("load", render);
      resizeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="h-full w-full" aria-label="Detailed full-body glyph portrait of AS in a tuxedo, holding a glass" />;
}

function RealisticGlyph({ panelRef }: { panelRef?: React.RefObject<HTMLDivElement | null> }) {
  return (
    <div className="glyph-portrait relative h-full w-full overflow-hidden">
      <div className="glyph-portrait-halo pointer-events-none absolute inset-0" />
      <div className="relative z-10 h-full w-full">
        <FullPortraitGlyph panelRef={panelRef} />
      </div>
    </div>
  );
}

export default function AboutAuthorPage() {
  const gutter = Array.from({ length: LINE_COUNT }, (_, i) => i + 1);
  const glyphPanelRef = useRef<HTMLDivElement>(null);

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-radial-ui text-ink">
      <div className="scanline pointer-events-none absolute inset-0" />
      <AnimatedBackground />
      <div className="top-beam" />

      <div className="relative mx-auto flex h-full max-w-[1600px] flex-col px-4 py-5 sm:px-6 lg:px-10">
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
          <p className="text-[0.65rem] font-black uppercase tracking-[0.3em] text-accent">Founder&apos;s Note</p>
          <h1 className="mt-2 font-serif text-[2.1rem] italic leading-tight text-ink sm:text-[2.6rem] lg:text-[3rem]">
            Building a sharper way to think.
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

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 pb-4 lg:grid-cols-[auto_1fr] lg:gap-8">
          <div
            ref={glyphPanelRef}
            className="animate-rise flex min-h-0 w-full flex-col overflow-hidden rounded-xl border shadow-glass lg:w-[420px]"
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
                author.glyph
              </span>
              <span
                className="ml-auto flex items-center gap-1 text-[0.6rem] font-bold uppercase tracking-widest"
                style={{ color: "#8fae5299" }}
              >
                <Sparkles size={11} />
                high-fidelity glyph
              </span>
            </div>

            <div
              className="relative flex min-h-0 flex-1 overflow-hidden"
              style={{
                background:
                  "radial-gradient(circle at 50% 22%, rgba(217,180,103,0.19), transparent 48%), radial-gradient(circle at 15% 85%, rgba(143,174,82,0.12), transparent 52%), #070706",
              }}
            >
              <RealisticGlyph panelRef={glyphPanelRef} />
            </div>
          </div>

          <div
            className="animate-rise flex min-h-0 flex-col overflow-hidden rounded-xl border shadow-glass"
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

            <div className="flex min-h-0 flex-1 overflow-auto" style={{ background: "#0a0908" }}>
              <div
                className="select-none border-r px-3 py-7 text-right font-mono text-[0.72rem] leading-7 sm:px-4"
                style={{ borderColor: "rgba(217,180,103,0.12)", color: "#5c574c" }}
              >
                {gutter.map((n) => (
                  <div key={n}>{n}</div>
                ))}
              </div>

              <div className="flex-1 px-5 py-7 font-mono text-[0.85rem] leading-8 tracking-[0.01em] sm:px-8 sm:text-[0.95rem]">
                <p>
                  <span style={{ color: "#e07850", fontWeight: 800, fontSize: "1.08em" }}># About the Author</span>
                </p>
                <p className="mt-4">
                  <span style={{ color: "#9dc262", fontWeight: 800, fontSize: "1.02em" }}>## AS</span>
                </p>
                <p className="mt-5" style={{ color: "#e2ddd0" }}>
                  CEOAI began with a simple conviction:
                </p>

                <div
                  className="my-4 rounded-md border-l-2 py-3 pl-4 pr-3"
                  style={{
                    borderColor: "#e7c988",
                    background: "rgba(217,180,103,0.09)",
                  }}
                >
                  <p className="font-serif text-[1.02rem] italic leading-relaxed" style={{ color: "#f2d99e" }}>
                    &ldquo;Clarity, perspective, and excellent judgment should not be a luxury.&rdquo;
                  </p>
                </div>

                <p className="mt-4 leading-8" style={{ color: "#e2ddd0" }}>
                  I created CEOAI to make disciplined strategic thinking available to more people&mdash;from ambitious
                  students and solo founders to teams building the next great company. It is not designed to be
                  another chatbot; it is designed to examine problems, test assumptions, weigh trade-offs, and
                  make the path forward easier to see.
                </p>
                <p className="mt-4 leading-8" style={{ color: "#e2ddd0" }}>
                  The ambition extends beyond a single product. CEOAI is the beginning of an intelligent executive
                  platform: a place where specialised AI experts work together on complex business and technical
                  questions, bringing high-quality decision support within reach.
                </p>

                <p className="mt-5" style={{ color: "#a39d8c" }}># The work is guided by three principles:</p>
                <ul className="mt-2 space-y-1.5">
                  <li style={{ color: "#e2ddd0" }}>
                    <span style={{ color: "#e7c988" }}>*</span> Think with rigour.
                  </li>
                  <li style={{ color: "#e2ddd0" }}>
                    <span style={{ color: "#e7c988" }}>*</span> Communicate with clarity.
                  </li>
                  <li style={{ color: "#e2ddd0" }}>
                    <span style={{ color: "#e7c988" }}>*</span> Turn insight into action.
                  </li>
                </ul>

                <p className="mt-5 leading-8" style={{ color: "#e2ddd0" }}>
                  Artificial intelligence is reshaping how we build, work, and create. My focus is on products
                  that do more than generate answers&mdash;they help people ask better questions and make better calls.
                </p>
                <p className="mt-4" style={{ color: "#e2ddd0" }}>
                  Thank you for being part of the journey.
                </p>

                <p className="mt-6" style={{ color: "#75705f" }}>
                  &mdash;
                </p>
                <p className="mt-1">
                  <span style={{ color: "#f2d99e", fontWeight: 800, fontSize: "1.02em" }}>**AS**</span>
                </p>
                <p style={{ color: "#a39d8c" }}>
                  Founder &amp; Creator, CEOAI
                  <span
                    className="ml-1 inline-block w-[7px] translate-y-[2px]"
                    style={{
                      height: "1rem",
                      background: "#e7c988",
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
