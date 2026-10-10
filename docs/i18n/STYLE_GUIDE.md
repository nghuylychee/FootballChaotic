# Street Football Chaos: Localization Style Guide

**For:** translators and native reviewers. Current languages: **Brazilian Portuguese (pt-BR)**, **European Portuguese (pt-PT)**, **Spanish (es)** and **Japanese (ja)**. Russian is planned; see its section at the end.
**Use with:** [GLOSSARY.md](GLOSSARY.md). Its terms are mandatory.

---

## 1. The game in 30 seconds

Street Football Chaos is a 3v3 arcade street-football game with pixel art and top-down 2.5D camera. You play a kid who dreams of becoming "the GOAT of street football" and climbs from a muddy village pitch to the World Stage. Mid-match you pick **Cores**: power-up cards that bend the rules (fireball shots, clones, 20-punch combos). Fighting is part of football here.

**Tone:** cheeky, loud, fast, a bit absurd. Picture a street-football YouTube channel crossed with a fighting game.
**Audience:** teens and young adults who play on PC and console, many of them football fans. Never crude, never offensive.

## 2. The golden rule: natural first, literal only where it matters

Write what a native player would say. Do not write what the English says word for word. How literal you should be depends on the type of text:

| Text type | Examples | How to translate |
|---|---|---|
| **Standard UI** | SETTINGS, RESUME, BACK, CONFIRM | Use the word that big games in your language already use. Players should not have to think. |
| **Game terms** | Core, Ultimate, Main Path, Area, Boss, archetype names, resources | **Use the glossary, always the same way.** Never paraphrase a glossary term. |
| **Rules and mechanics** | Core descriptions, set bonuses, stat descriptions, tutorial hints | Keep the meaning exactly: numbers, conditions, who is affected. Rephrase freely for clarity. |
| **Flavor** | Cut-scene lines, team names, taglines, team descriptions, area subtitles | **Transcreate.** Keep the feeling, the joke and the rhythm, not the words. If a pun doesn't work, write a new one. |
| **Callouts** | GOAL!, SAVE!, COUNTER!, PERFECT READ! | Short, shouted words, the way a commentator or a fighting game would say them. Keep pure sound effects (BOOM!, POW!, BONK!) in English. |

If a literal translation sounds like a translation, it is wrong even when it is accurate.

## 3. Technical rules (the build checks these)

`node scripts/i18n-check.js` reports any break in the first four rules below as an error.

1. **Placeholders** `{n}`, `{name}`, `{team}`, `{core}`, `{key}`... must stay exactly as written. You may move them, but never translate or drop them. Some show a button glyph (`{ok}`, `{back}`, `{key}`): treat them as a button icon.
2. **Core description numbers** look like `{m.accuracy+%}`, `{stun}`, `{gkPenalty%}`. Copy them character for character. The `%` or `s` after them is part of the sentence, for example `{stun}s` means "N seconds".
3. **HTML tags** (`<b>…</b>`, `<em>…</em>`) must stay, wrapped around the equivalent words.
4. **`*keyword*`** (asterisks) shows the word highlighted in gold. Keep the asterisks around the equivalent word.
5. **Plurals.** Some strings have a singular and a plural form, shown as `one:` and `other:` in the review sheet. Provide the forms your language needs. Portuguese and Spanish need `one` and `other`; Russian needs `one`, `few`, `many` and `other`. You can add an optional `zero` form when "0 …" reads badly ("Nenhum item" instead of "0 item"). Note that Brazilian Portuguese counts 0 as singular, while European Portuguese counts 0 as plural ("0 golos").
6. **Resource names** (Momentum, Rhythm, Rage, Guard) are replaced by an icon inside Core descriptions. Always write them **exactly as in the glossary**: singular, capitalized, the same spelling every time. Otherwise the icon will not appear.
7. **Keyboard keys** inside text (D, Z, S, X, Enter, Esc) stay as they are.
8. **Never build sentences from pieces.** Each string is a complete sentence. If something is impossible to say naturally with the placeholders given, flag it instead of forcing it.

## 4. Length and space

- The screen is small: 640×360 pixels, scaled up. **Aim for at most +30% length** compared with English for buttons, labels and HUD text. Long descriptions may grow more.
- Menu buttons fit about **20 characters**. Small sub-lines fit about **38 characters** before they wrap.
- Text in Press Start 2P (big titles, banners such as GOAL!) is very wide: about **16 characters** fit in a full-width banner.
- **Main Path team cards cut text with "…"**: team names fit about **14 characters**, team taglines about **16**. Write taglines that fit; the same tagline is shown in full on the pre-match screen.
- When space is tight, prefer a shorter natural phrase over an abbreviation.
- The check script lists strings that grew a lot (`--long`). Reviewers confirm in-game.

## 5. Capitalization and punctuation

- **ALL CAPS stays ALL CAPS.** Most buttons and titles are uppercase. Keep accents on capitals (Á, É, Ç, Ñ).
- **Names** (Cores, teams, boxes) are written in Title Case in the English source. Follow the convention of your language's games:
  - **pt-BR / pt-PT:** capitalize the main words and keep short prepositions and articles lowercase ("Bola de Fogo", "Gatos do Beco").
  - **es:** Core and box names in sentence case ("Bola de fuego", "Caja callejera"). Team names are proper names, so capitalize them like real clubs ("Gatos Callejeros").
- Ordinary sentences are sentence case in every language. Do not copy English Title Case into sentences.
- **Spanish:** opening ¡ and ¿ are required, including in ALL CAPS (¡GOL!). **Portuguese:** no inverted marks.
- Keep the source's separators (`·`, `—`, `→`) and ellipses (`...`).
- Use decimal and thousands formats that look natural; the game formats coin amounts automatically.
- **Button hints** use the infinitive, the same way everywhere: "↑↓ escolher · Enter confirmar" / "↑↓ elegir · Enter confirmar". Not "Enter confirma" (or "Enter confirmas").
- **Placeholders that hold a place or team name** (`{area}`, `{div}`, `{team}`) come with no article, so a preposition in front of them can break: Portuguese needs "no Beco / na Laje / ao Campinho", and the code cannot know which. Use a verb with no preposition ("Alcançou {div}") or a separator ("Nova estrela · {area}").

## 6. Language notes

### Brazilian Portuguese (pt-BR)

- **Address:** *você*, informal and friendly. Imperatives in the *você* form: "Escolha", "Chute", "Passe".
- **Brazilian football vocabulary only:** gol, chute, zagueiro, atacante, goleiro, time, partida/jogo, acesso, artilheiro, bola enfiada, lançamento, voleio, bicicleta, trave, espalmar.
- **Avoid European Portuguese:** equipa, golo, guarda-redes, ecrã, rato, telemóvel, "estás".
- **Gamer loanwords** are fine when Brazilian players really use them: build, combo, lobby, host, co-op. Do not invent new ones.
- **Gender:** a Suprema, a build, o Core, a Jornada, a Área.
- **"Cores" is also the Portuguese word for "colors"** (as cores). The game has costumes, hair color and skin color, so "Caixa de Cores" or "trajes e Cores" reads as "box of colors" / "costumes and colors". Always give the term a masculine word that shows it is *o Core*: "os Cores", "novos Cores", "dois Cores". In names use the singular: "Caixa de Core" (like "caixa de skin").
- **Tone:** street and playful. Light slang is welcome in flavor text (parça, rolê) but never in rules text. Avoid slang tied to one city ("quebrada" is São Paulo); "bairro", "moleque", "campinho", "várzea" work everywhere.
- **Spoken lines** (Vovô, coach shouts) use the spoken imperative: "Vem cá", "Leva com você", "Usa ele", "Solta!", "Chuta!". Rules text uses the written form: "Segure D", "arremesse-o".

### European Portuguese (pt-PT)

- The **Português** row in the language picker (the Brazilian one reads **Brasil**). Also the right pick for Angola, Mozambique and the other countries that follow the European spelling.
- **Address:** *tu*, informal. Imperatives in the *tu* form: "Escolhe", "Remata", "Prime Enter". Possessives take the article: "o teu nome", "a tua equipa".
- **Grammar:** "a + infinitive", never the gerund for actions in progress ("A carregar...", "À espera de jogadores...", "Bola a rolar!"). Pronouns after the verb ("Mexe-te!", "Leva-o contigo", "dá-te"). "Tem de", not "tem que". "Até ao / até à".
- **Spelling:** Portuguese AO1990 forms: ação, ótimo, receção, intercetar, aspeto, facto, contacto, carácter, prémio, bónus, sónico, néon, ecrã, controlos.
- **Portuguese football vocabulary:** golo, autogolo, remate / rematar, baliza (the goal frame), guarda-redes, defesa, avançado, equipa, jogo, subida de divisão, passe em profundidade, nos ferros, pontapé de saída, penálti, amigável, dérbi, adepto.
- **Avoid Brazilian forms:** time, gol, goleiro, zagueiro, chute, tela, controle, celular, você, "a gente" (for "we"), pular (use "saltar"), liberar (use "desbloquear" / "libertar"), "na Steam" (use "no Steam").
- **"Jornada" means the league matchday in Portugal**, so the Main Path is **O Caminho**.
- **Gamer loanwords** are fine where Portuguese players use them: build, combo, lobby, host, co-op, bug.
- **Gender:** a Suprema, a build, o Core, o Caminho, a Área.
- **"Cores" also means "colors"**: same rule as pt-BR (os Cores, novos Cores, Caixa de Core).
- **Tone:** street and playful, never crude. Kids are "miúdos" (not "putos", which is rude in Brazil and too rough for the audience). Light Portuguese flavor is welcome in names and flavor text (pelado, bifana, balda, socas).
- **Spoken lines:** Avô uses the warm spoken *tu*: "Anda cá, miúdo", "Leva-o contigo", "Solta-o!". Coach shouts: "Mexe-te!", "Passa!", "Remata!", "Vai à baliza!".

### Spanish (es): neutral Latin American, Mexico-based

- One Spanish text for all of Latin America (es-419), using **Mexican neutral Spanish as the base**, the usual industry choice for this market. It should still be understandable in Spain. The store lists it as Spanish – Latin America.
- When regions disagree, take the Mexican word if it is also widely understood elsewhere: portería (not arco), tenis, calcetas, audífonos, curita, lentes. If the Mexican word is local slang, use the most neutral option instead: cazatalentos (not visor), "muchacho" (not chavo). Where another word reaches more countries, use it: **palo** for the woodwork (covers the whole frame, and Mexican TV says it too), **tacos** for cleats ("tachones" is Mexico-only; Mexican shops, Central America and Venezuela say "tacos").
- **Address:** *tú*. For plurals use *ustedes*, **never** *vosotros*. **No voseo.**
- **Neutral football vocabulary:** partido, gol, disparo/tiro, delantero, defensa, portero, equipo, ascenso, pase filtrado, volea, chilena, palo, atajada, jornada (matchday).
- **Avoid regionalisms:** coger, chavo, pibe, guay, mola, padre (for "cool"), ordenador, móvil.
- **Gamer loanwords** that are common across Latin America are fine: build, combo, lobby, host, co-op.
- **Gender:** la definitiva, la build, el Core, el Camino, la Zona.
- **False friends to avoid:** "buey" (in Mexico it reads as the slang *güey*: say "fuerte como un toro"); "muy pronto" (means "very soon": say "muy temprano" for *too early*); "golpes libres" (sounds like *tiros libres*, free kicks: say "golpes sin enfriamiento"); "gol en contra" (often means *own goal*: say "gol recibido" for *conceding*).
- **Spoken lines:** the grandfather calls the kid "mijo", the warm form used all over Latin America. Coach shouts are short and direct: "¡Pásala!", "¡Dispara!", "¡Ve por el gol!".

### Japanese (ja)

- **Voice:** casual and loud, like an arcade football game (think イナズマイレブン). No 敬語. Hints and coach shouts use the plain imperative: 「パスだ！」「シュート！」「Dを長押し」. System UI uses short noun phrases: 「設定」「データを削除」.
- **The kid** says 「オレ」, and the game calls the player 「きみ」. **Grandpa** (じいちゃん) talks like an old man: わし, 〜じゃ, ほれ, and calls the kid 「坊主」.
- **Width:** a Japanese character is about twice as wide as a Latin letter in these fonts. Aim for about 55% of the English character count on buttons, labels, banners and HUD text. `node scripts/i18n-check.js` counts width, not characters, for both the `--long` list and the `@N` limits.
- **Punctuation:** use full-width 、。！？「」 after Japanese text. Keep the source's separators (`·`, `→`, `★`). Keys (D, Z, Enter, Esc) stay Latin.
- **No plurals:** strings that have `one` / `other` forms take one plain string.
- **Names:** Core names are short and punchy, mixing kanji and katakana (ファイアボール, 韋駄天, 返し技). Areas and teams are transcreated with Japanese neighborhood flavor (路地裏, 屋上, 屋台横丁, 田んぼFC).
- **Kana and kanji are small on screen.** The UI is 640×360, so the smallest labels draw kanji at 5 px before scaling. Prefer kana or simple kanji for tiny labels, and confirm in game at 1280×720.
- **Font:** Japanese is drawn with DotGothic16, cut down to the characters in `src/i18n/ja.js`. After you edit Japanese strings, run `python scripts/build-ja-font.py`, or new kanji will fall back to a system font.

### Russian (ru): planned

- Address with *ты*, informal.
- Plurals need 3 forms (*одно очко / два очка / пять очков*).
- **Resource icons:** Russian declines nouns, so a resource name can change form inside a sentence. Before translating Core descriptions, the code should switch to explicit tokens instead of word matching. Ask the developers.
- **Font:** the current pixel fonts do not cover Cyrillic. A font with Cyrillic must be added before any Russian text can ship.

## 7. Recurring decisions (so nobody re-debates them)

- **GOAT** stays in English (football slang everywhere). So does **AURA FARMING**, the name of a viral meme.
- **Character names** (ACE, SHADOW, ECHO, ROOKIE...) and **3-letter team codes** (PDY, CAT...) stay in English.
- **Area names and team names are transcreated**: a kid in each market should smile at them, so pt-BR and pt-PT have different names ("LAJE" / "TERRAÇO", "Pastel FC" / "Bifana FC"). Keep "FC", "United" and similar club words when they sound like a real club name.
- **Sound effects** (BOOM!, POW!, BONK!, KRAKOOM!!, POOF) stay in English. Callouts that are real words are translated.
- **Combo counter** "{n} HIT!" stays in English, a fighting-game convention.
- **Stars** ★ and other symbols stay as symbols.

## 8. Native review checklist (step 4)

Play in your language, or use the screenshots from the review sheet, and check:

1. **Meaning:** does each line say what the game does? Watch Core descriptions closely.
2. **Naturalness:** would a player in your country say it this way? Fix anything that "sounds translated".
3. **Consistency:** are glossary terms used every time?
4. **Space:** is any text cut, overlapping or wrapping badly?
5. **Tone:** is it fun and street without being rude?

Write fixes directly in the review sheet. If a source string is ambiguous, ask instead of guessing.
