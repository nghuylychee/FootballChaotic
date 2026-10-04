# Open questions for native reviewers

**For:** native reviewers of pt-BR, pt-PT and es. Read [STYLE_GUIDE.md](STYLE_GUIDE.md) and [GLOSSARY.md](GLOSSARY.md) first.

pt-BR and es have had two passes: the first-pass translation with a self-review, then a second pass (2026-10-04). The second pass fixed lines that sounded translated, and checked the game terms against what big games and TV already use in each market: EA FC, eFootball, Overwatch 2, LoL, Valorant, Brawl Stars, Fortnite, TUDN, and the Brazilian press. pt-PT has had one pass (2026-10-04): the pt-BR text was rewritten into European Portuguese, and area and team names were made new for Portuguese players. The items below are what is **still uncertain**. Please answer these first, then review everything else in the sheet (`node scripts/i18n-check.js --sheet review.csv`) and in the game (`index.html?lang=pt-BR`, `?lang=pt-PT` or `?lang=es` in the dev build).

For each item: keep it, change it (suggest the wording), or say "not sure". Any change to a glossary term must also be made in GLOSSARY.md.

## Already checked against big games (answer only if you disagree)

- **pt-BR:**
  - EA FC: GER, FIN, PAS; GOL for the keeper; "Fintas" for skill moves, so the move is "Finta"; "A Jornada"; olheiro.
  - eFootball and the press: DRIBLE.
  - Overwatch 2: Suprema. Overwatch, LoL and Brawl Stars: recarga, atordoamento.
  - Fortnite: traje.
  - Press and commentators: jogo do acesso; BOLA ROLANDO!; NA TRAVE!; FIM DE JOGO.
- **es:**
  - Latin American press: MED ("media").
  - EA FC es-MX: TIR, PAS, REG; ascenso.
  - Valorant and LoL: definitiva, enfriamiento, aturdimiento.
  - Fortnite LatAm: atuendo.
  - PlayStation LatAm: CONFIGURACIÓN, control, Presiona.
  - TUDN: ¡ATAJADA!, FIN DEL PARTIDO, ¡AL PALO!.
  - Mexican shops, Central America and Venezuela: tacos for cleats.

## All languages

1. **Accented capitals in the title font (fixed).** Titles, banners and the coach box used to draw accented capitals like small letters ("¡MUéVETE!", "PRóLOGO", "VOCê"). They are now redrawn at full height with the accent on top. While you play, tell us if any accent looks wrong or is cut off.
2. **Signature Core names on the Main Path page (fixed).** The boss card now wraps the Core name onto two lines instead of cutting it with "…".
3. **AURA FARMING** is kept in English as the name of a viral meme. Would players in your country rather see a local version ("farmando aura" / "farmeando aura")?
4. **GOAT** is kept in English. OK?

## Brazilian Portuguese (pt-BR)

| # | Where | Current | Question |
|---|---|---|---|
| 1 | Everywhere (Core) | "Core / Cores", always with a masculine word next to the plural ("os Cores", "novos Cores"); box name "Caixa de Core" | "cores" also means "colors", and the game sells costumes and hair colors. Does any line still read as "colors"? Or should pt-BR give the term a Portuguese name (for example "Poder / Poderes")? |
| 2 | Everywhere (Ultimate) | **Suprema** (Overwatch 2) | Or "ultimate", as in LoL and Valorant? |
| 3 | Opening cut scene, line 1 | "Todo **moleque do bairro** chuta bola no muro..." (was "quebrada", which is São Paulo slang) | Natural? |
| 4 | Main menu tagline | "Futebol com pancadaria de **fliperama**" | Does "fliperama" feel retro-cool or just dated? |
| 5 | Everywhere (Area) | **ÁREA** ("ÁREA 3", "NOVA ÁREA DESBLOQUEADA") | "área" is also the penalty box. Fine in context, or would "FASE" read better? |
| 6 | Team names | "Os Gambás" (Trash Pandas), "Os Lampiões" (Lantern Crew; "lanterna" would read as "last place"), "Os Inspetores", "Os do Fundão", "Terceirão FC", "Pastel FC", "Soco-Inglês", "Pula-Lajes" | Do the jokes land? Any that feel forced or too regional? |
| 7 | Area names | "CAMPINHO DA VILA", "BECO", "LAJE", "CAIS DO PORTO" | Good? |
| 8 | Archetype label | KICKER → **VOADORA** (named after the flying kick) | Fine next to ARTILHEIRO / BRIGÃO / VELOCISTA? |
| 9 | Resource name | Momentum → **Embalo** ("+2 Embalo", "5 de Embalo") | Natural as a game resource? |
| 10 | Callouts | DEFENDEU!, ESPALMOU!, CORTOU!, ESCAPOU!, AGUENTOU! | Do they sound like a commentator? |
| 11 | Golden goal sub-line | "Quem fizer o gol, ganha" | Natural? |
| 12 | Tone | Vovô speaks like a grandpa ("Vem cá, moleque", "Leva com você", "usa ele"); "VALEU POR JOGAR!", "BORA!" | Right level of informality? |
| 13 | Language picker | The row reads **Brasil** (Portugal's translation reads "Português") | Does "Brasil" alone read well as a language choice, or would you expect "Português (Brasil)"? |

## European Portuguese (pt-PT)

Not checked against big games yet: most big games in Portugal ship only Brazilian Portuguese. The terms follow Portuguese press and TV football language. Tell us where a game Portuguese players know uses something else.

| # | Where | Current | Question |
|---|---|---|---|
| 1 | Language picker | The row reads **Português**; the Brazilian one reads "Brasil" | Clear enough? |
| 2 | Everywhere (Main Path) | **O CAMINHO** (not "Jornada", which reads as the league matchday in Portugal) | Good? Or "Carreira" / "Percurso"? |
| 3 | Everywhere (Ultimate) | **Suprema** (no pt-PT precedent found) | Would Portuguese players rather keep "Ultimate"? |
| 4 | Everywhere (boss) | **CHEFE** ("CHEFE · FORTE COMO UM TOURO", "o chefe final") | Or "BOSS", as players say out loud? |
| 5 | Stats | SHOOTING → **REMATE / REM**, KEEPER → **GUARDA-REDES / GR**, OVR → **GER** | What does EA FC show in Portugal? |
| 6 | Football terms | golo, autogolo, baliza, remate, passe em profundidade, passe alto, "remate de primeira" (volley), jogo da subida, DÉRBI (rival match) | Natural? Is "VOLLEY!" → "DE PRIMEIRA!" right, or would "VÓLEI!" be better? |
| 7 | Callouts | NOS FERROS! (woodwork), BOLA A ROLAR! (kickoff), FIM DO JOGO, DEMASIADO CEDO / DEMASIADO TARDE | Do they sound like a commentator? |
| 8 | Archetype labels | STRIKER → **GOLEADOR**, KICKER → **PONTAPÉ** (the flying kick is "Pontapé Voador") | Do they work next to VELOCISTA / BRIGÃO? |
| 9 | Area names | PELADO DA ALDEIA, PÁTIO DA ESCOLA, TERRAÇO, TAÇA DA PRAÇA | Good? |
| 10 | Team names | Bifana FC, Os do Castigo ("SEMPRE NA BALDA"), Os Finalistas, Os Delegados, Salta-Telhados, Os Guaxinins, As Soqueiras, Os Candeeiros | Do the jokes land? "Os Candeeiros" avoids "Lampiões" (a Benfica nickname) and "lanternas" (reads as last place). |
| 11 | Big-club nicknames | Night Dragons → **Os Dragões**, Golden Eagles → **Águias de Ouro**, Royal Lions → **Leões Reais** | These read as nods to Porto, Benfica and Sporting. A fun touch, or should we avoid them? |
| 12 | Tone | Avô says "Anda cá, miúdo", "ensinou-mo", "Leva-o contigo"; "MEXE-TE!", "VAI À BALIZA!", "OBRIGADO POR JOGAR!" | Right level of informality for teens? |
| 13 | Steam | "no Steam", "o Steam avisa-te" (masculine) | Is that how Portuguese players say it? |

## Spanish (es, Mexico-based neutral)

| # | Where | Current | Question |
|---|---|---|---|
| 1 | Vocabulary base | portería, tenis, calcetas, audífonos, curita, lentes, cazatalentos, cancha, palo, tacos | Anything that reads as "too Mexican" (or too South American) for your country? |
| 2 | Kickoff banner | "¡RUEDA EL BALÓN!" | OK? (The banner fits about 16 characters, so "¡ARRANCA EL PARTIDO!" does not fit.) |
| 3 | Pre-match screen | MATCHDAY → **JORNADA** | Good? |
| 4 | Core + drill name | One-Two → **Pared** | Clear as the football move? |
| 5 | Team names | "Los Michis", "Los Mandamás", "Último Año FC", "Basureros Pro", "Los Fideos", "Saltatechos", "Los Castigados", "Puños de Acero" | Do they land? Is "michis" understood everywhere? |
| 6 | Grandpa | Calls the kid "**mijo**" | Warm and natural everywhere, or too Mexican? |
| 7 | Street phrases | Golden goal sub-line "**Gol gana**"; "¡SE VIENE LA FINAL DEL CAMPEONATO!" | Natural across the region? |
| 8 | Core names | Fake Run → "Señuelo", Wind Blade → "Cuchilla de viento", Counter Strike → "Contragolpe" | OK? |
| 9 | Archetype label | KICKER → **VOLADORA** | Fine next to GOLEADOR / PELEADOR / VELOCISTA? |
| 10 | Resource name | Momentum → **Impulso** | Natural as a game resource? |
| 11 | Core card line | SCALES WITH → **CRECE CON** | Natural? |
| 12 | Name casing | Core names in sentence case ("Bola de fuego"), team names in title case | Matches what players see in other games? |
| 13 | Drill cards | "carta de entrenamiento" (long) | Would "carta de entreno" sound natural in Latin America? |
