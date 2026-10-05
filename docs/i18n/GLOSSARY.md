# Street Football Chaos: Glossary

**For:** translators and native reviewers. Read with [STYLE_GUIDE.md](STYLE_GUIDE.md).

These terms are **mandatory**. Use the same translation every time it appears. If you think a term is wrong, raise it so it gets changed here and everywhere at once. Don't fix it in only one string.

**How to read the tables**
- **`/`** separates accepted forms (singular / plural, noun / verb).
- **Lint ✓**: `node scripts/i18n-check.js` warns when an English string contains the term but the translation uses none of the accepted forms. Only unambiguous terms are linted.
- When Russian starts, add a `ru` column.

## Core system

| English | Meaning / where it appears | pt-BR | pt-PT | es | Lint | Notes |
|---|---|---|---|---|---|---|
| Core / Cores | A power-up card picked mid-match that changes how you play | Core / Cores | Core / Cores | Core / Cores | ✓ | Kept in English as a game term, always capitalized. Masculine: o Core / el Core. **Portuguese: "cores" also means "colors"**, so a masculine word must sit next to the plural (os / novos / dois Cores), and names use the singular: Core Box → "Caixa de Core". |
| Core Upgrade | The mid-match pick screen (choose 1 of 3 Cores) | UPGRADE DE CORE | UPGRADE DE CORE | MEJORA DE CORE | | Screen title. |
| Starting Core | Core picked before kickoff | CORE INICIAL | CORE INICIAL | CORE INICIAL | | |
| Ultimate | Strongest Core type: charged by a meter, fired with a button, plays a cinematic | Suprema / Supremas | Suprema / Supremas | Definitiva / Definitivas | ✓ | Feminine (a Suprema / la definitiva). pt-BR: Overwatch 2 ("Habilidade Suprema"); LoL and Valorant keep "ultimate". pt-PT: the big hero games ship only pt-BR in Portugal, so pt-PT keeps the same term. es: Valorant LATAM and LoL ("definitiva"); Overwatch es-MX says "habilidad máxima". |
| build | The set of Cores a player holds this match | build | build | build | ✓ | Gamer loanword. Feminine (a build / la build). |
| archetype | The family a Core belongs to (Speed, Tiki-Taka, Striker...) | arquétipo / arquétipos | arquétipo / arquétipos | arquetipo / arquetipos | ✓ | |
| synergy | Bonus for holding several Cores of the same archetype | sinergia / sinergias | sinergia / sinergias | sinergia / sinergias | | |
| Signature Core | The boss's special Core, won by beating the boss | Core exclusivo | Core exclusivo | Core exclusivo | | |
| reroll | Swap the 3 offered Cores for 3 new ones | trocar | trocar | cambiar | | "REROLL 3" → TROCAR AS 3 / CAMBIAR LAS 3. Kept over the gamer forms ("rolar de novo" in Vampire Survivors, "renovar" in Balatro): plain words that football fans who rarely play roguelites understand. |
| ANY BUILD | Core that fits every archetype | QUALQUER BUILD | QUALQUER BUILD | CUALQUIER BUILD | | |
| SCALES WITH (stat) | Core card line: the Core gets stronger as this stat rises | CRESCE COM | CRESCE COM | CRECE CON | | Avoid the gamer calque "escala com / escala con". In Brazilian football Portuguese "escalar" means picking the lineup (escalação), so it reads wrong. |

### Archetypes (labels on Core cards and builds)

| English | pt-BR | pt-PT | es | Lint | Notes |
|---|---|---|---|---|---|
| SPEED | VELOCISTA | VELOCISTA | VELOCISTA | | A class name, like STRIKER. Not the stat "speed". |
| TIKI-TAKA | TIKI-TAKA | TIKI-TAKA | TIKI-TAKA | | Known worldwide (and Spanish in origin). |
| STRIKER | ARTILHEIRO | GOLEADOR | GOLEADOR | | pt-PT: "artilheiro" reads Brazilian; Portuguese press says "goleador" / "melhor marcador". |
| BRAWLER | BRIGÃO | BRIGÃO | PELEADOR | | |
| KICKER | VOADORA | PONTAPÉ | VOLADORA | | Named after its signature move, the flying dropkick. pt-PT: "voadora" is Brazilian; the move is "pontapé voador", too long for a label, so the label keeps "PONTAPÉ". |
| ILLUSION | ILUSÃO | ILUSÃO | ILUSIÓN | | |
| IRON | FERRO | FERRO | HIERRO | | |
| CHAOS | CAOS | CAOS | CAOS | | |

### Resources (replaced by an icon inside Core descriptions: exact form required)

| English | pt-BR | pt-PT | es | Lint | Notes |
|---|---|---|---|---|---|
| Momentum | Embalo | Embalo | Impulso | ✓ | Built by sprinting. "Ganhar / pegar embalo" is natural in both Portuguese variants. |
| Rhythm | Ritmo | Ritmo | Ritmo | ✓ | Built by passing (Tiki-Taka). Because of this, the stat PACE is **not** translated as "Ritmo". |
| Rage | Fúria | Fúria | Furia | ✓ | Built by landing punches. |
| Guard | Guarda | Guarda | Guardia | ✓ | Blocks one stun, like a boxer's guard. |

## Progression and modes

| English | Meaning / where it appears | pt-BR | pt-PT | es | Lint | Notes |
|---|---|---|---|---|---|---|
| Main Path | Single-player career ladder through Areas and divisions | Jornada | Caminho | El Camino / Camino | ✓ | Same idea as FIFA's "The Journey" (pt-BR: A Jornada, es: El Camino). Menu label: JORNADA / O CAMINHO / EL CAMINO. **pt-PT: not "Jornada"**: in Portugal "jornada" is the league matchday ("5.ª jornada"). |
| Area | A region of the Main Path (Village Green, Back Alley...) | Área / Áreas | Área / Áreas | Zona / Zonas | ✓ | es avoids "área" (penalty box). |
| division | Rank inside an Area (III → II → I) | divisão / divisões | divisão / divisões | división / divisiones | ✓ | |
| promotion match | Match against the Area boss to move up | jogo do acesso | jogo da subida | partido de ascenso | ✓ | Real football terms: Brazilian press writes "jogo do acesso" (not "de acesso"); Portugal says "subida de divisão"; EA es-MX uses "ascenso". PROMOTED TO → SUBIU PARA / SUBISTE PARA / ASCENDISTE A. DEMOTED TO → pt-PT DESCESTE PARA ("descer de divisão"). |
| championship final | Last promotion match of the game | final do campeonato | final do campeonato | final del campeonato | | |
| boss | The strongest team of an Area | chefão | chefe | jefe | ✓ | pt-PT: "chefão" reads Brazilian; Portuguese players say "chefe" / "boss" ("o chefe final"). |
| star ★ | Won by winning a match; fill them to move up a division | estrela | estrela | estrella | | |
| OVR | Overall rating (0–99) | GER (geral) | GER (geral) | MED (media) | ✓ | pt-BR: EA FC shows "GER" / "Geral" (players say "overall" out loud, nobody says "OVR"). es: Latin American press writes "media" ("una media de 73": TV Azteca, ESPN MX, Ámbito); EA es-MX shows "GLB", which players do not say. |
| drill / drill card | Training exercise card earned on level-up; raises stats | treino / carta de treino / treinar | treino / carta de treino / treinar | entrenamiento / carta de entrenamiento / entrenar | ✓ | The short button form is TREINAR / ENTRENAR. |
| scout / scout report | Finds new AI teammates over time | olheiro / relatório do olheiro | olheiro / relatório do olheiro | cazatalentos / informe del cazatalentos | ✓ | es: "ojeador" is Spain, "visor" is Mexico-only; "cazatalentos" is understood everywhere. |
| teammate / MATE | Your AI partner on the pitch | parceiro | colega | compañero | | pt-PT: "colega (de equipa)". |
| level / LV | Player level | nível / NV | nível / NV | nivel / NV | | "LV {n}" → NV {n} |
| XP | Experience points | XP | XP | XP | | |
| gold | Currency | ouro | ouro | oro | | |
| Prologue | The tutorial dream match | Prólogo | Prólogo | Prólogo | | |
| Training | Free practice mode, no clock | Treino | Treino | Entrenamiento | | |

## Football and match terms

| English | pt-BR | pt-PT | es | Lint | Notes |
|---|---|---|---|---|---|
| goal / GOAL! | gol / GOL! | golo / GOLO! | gol / ¡GOL! | | pt-PT: the goal frame is "baliza" ("canto da baliza", "remate à baliza"); own goal is "autogolo". |
| keeper | goleiro | guarda-redes | portero | ✓ | |
| save / SAVE! | defesa / DEFENDEU! | defesa / DEFENDEU! | atajada / ¡ATAJADA! | | Portuguese callouts use the verb, like a commentator: DEFENDEU!, ESPALMOU!, CORTOU!, ESCAPOU!. es: TUDN says "¡atajada!" / "¡atajadón!"; "parada" is Spain. |
| shot / shoot | chute / chutar | remate / rematar | tiro, disparo / disparar | | pt-PT: "remate" is the press and commentary word; "chutar" stays only in casual narration (the kid kicking a ball against a wall). |
| charged shot | chute carregado | remate carregado | tiro cargado | | |
| ground pass | passe rasteiro | passe rasteiro | pase raso | | |
| through ball | bola enfiada | passe em profundidade | pase filtrado | | |
| lob pass | lançamento | passe alto | pase bombeado | | |
| volley | voleio | remate de primeira | volea | | VOLLEY! → VOLEIO! / DE PRIMEIRA! / ¡VOLEA! |
| bicycle / scissor kick | bicicleta | bicicleta | chilena | | |
| woodwork (hit the post) | trave | ferros | palo | | WOODWORK → NA TRAVE! / NOS FERROS! / ¡AL PALO! "Palo" covers the whole frame (los tres palos), is what South America says, and Mexican TV (TUDN) uses it too. "Poste" is only the upright. pt-PT: "bola nos ferros" is the Portuguese idiom for hitting the frame. |
| kickoff / KICK OFF | saída de bola / BOLA ROLANDO! | pontapé de saída / BOLA A ROLAR! | saque inicial / ¡RUEDA EL BALÓN! | | Banner is a commentator line, not the rule term. |
| full time | FIM DE JOGO | FIM DO JOGO | FIN DEL PARTIDO | | es: the TUDN on-screen wording. |
| FINAL PUSH | RETA FINAL | RETA FINAL | RECTA FINAL | | Last 30 s, goals count double. |
| GOLDEN GOAL | GOL DE OURO | GOLO DE OURO | GOL DE ORO | | |
| forward / defender | atacante / zagueiro | avançado / defesa | delantero / defensa | | |
| opponent | adversário / rival | adversário | rival | | |
| steal (win the ball) | roubar a bola / roubada | roubar a bola / roubo | robar el balón / robo | | |
| intercept | interceptar / cortar | intercetar / cortar | interceptar / cortar | | Callout: CORTOU! / ¡INTERCEPTADO! ("¡CORTE!" reads like a film director) |
| RIVAL MATCH | CLÁSSICO | DÉRBI | CLÁSICO | | pt-PT: "clássico" means Benfica vs Porto specifically; a local rivalry is a "dérbi". |

## Combat

| English | pt-BR | pt-PT | es | Lint | Notes |
|---|---|---|---|---|---|
| punch | soco | soco | golpe / puñetazo | | |
| dropkick | voadora | pontapé voador | patada voladora / voladora | | |
| light attack | ataque leve | ataque leve | ataque ligero | | |
| hard attack | ataque forte | ataque forte | ataque fuerte | | |
| dash (defensive lunge, Z) | arrancada | arrancada | embestida | | Not "impulso" in es: that is the Momentum resource. |
| skill move (dodge, Z) | finta | finta | finta | | EA FC pt-BR calls skill moves "Fintas". Not "drible" in Portuguese: that is the DRIBBLE stat. |
| dodge | esquiva / esquivar | esquiva / esquivar | esquiva / esquivar | | |
| stun | atordoamento / atordoar / atordoa | atordoamento / atordoar / atordoa | aturdimiento / aturdir / aturde / aturdido | ✓ | |
| knockback | empurrão | empurrão | empuje | | |
| launch (send airborne) | arremesso / arremessar | arremesso / arremessar | lanzamiento / lanzar | | Not "lançamento" in Portuguese (that word means a long pass). |
| cooldown | recarga | recarga | enfriamiento | ✓ | |
| combo / {n} HIT! | combo / {n} HIT! | combo / {n} HIT! | combo / {n} HIT! | | Fighting-game convention, kept in English. |

## Menus and system

| English | pt-BR | pt-PT | es | Notes |
|---|---|---|---|---|
| SETTINGS | CONFIGURAÇÕES | DEFINIÇÕES | CONFIGURACIÓN | pt-PT: Windows and Android in Portugal say "Definições". |
| SOUND & DISPLAY | SOM E TELA | SOM E ECRÃ | SONIDO Y PANTALLA | |
| CONTROLS | CONTROLES | CONTROLOS | CONTROLES | pt-PT spelling. The gamepad is "comando" (pt-BR "controle"). |
| LANGUAGE | IDIOMA | IDIOMA | IDIOMA | |
| RESUME / RESTART | CONTINUAR / REINICIAR | CONTINUAR / REINICIAR | CONTINUAR / REINICIAR | |
| skip | pular | saltar | saltar | |
| MAIN MENU | MENU PRINCIPAL | MENU PRINCIPAL | MENÚ PRINCIPAL | |
| SHOP | LOJA | LOJA | TIENDA | |
| CHARACTER | PERSONAGEM | PERSONAGEM | PERSONAJE | |
| INVENTORY | INVENTÁRIO | INVENTÁRIO | INVENTARIO | |
| APPEARANCE | APARÊNCIA | ASPETO | APARIENCIA | |
| STATS | ATRIBUTOS | ATRIBUTOS | ATRIBUTOS | |
| TEAM | TIME | EQUIPA | EQUIPO | |
| costume | traje | traje | atuendo | Fortnite precedent in pt-BR and es. |
| gacha box | caixa surpresa | caixa surpresa | caja sorpresa | Clearer than "gacha" for casual players. |
| dismantle | desmontar | desmontar | desarmar | |
| room / room code | sala / código da sala | sala / código da sala | sala / código de sala | |
| host / lobby / co-op / versus | host / lobby / co-op / versus | host / lobby / co-op / versus | host / lobby / co-op / versus | Common gamer loanwords in all markets. |
| GUEST (bench seat in a room) | BANCO | BANCO | BANCA | Football bench: "sitting out". |
| Steam (gender) | a Steam (na Steam) | o Steam (no Steam) | Steam | Each market's usual gender. |
| Wishlist on Steam | lista de desejos | lista de desejos | lista de deseados | Steam's own wording in each market. |
| COMING SOON | EM BREVE | EM BREVE | PRÓXIMAMENTE / PRONTO | |
| full game / demo | jogo completo / demo | jogo completo / demo | juego completo / demo | |

## Stats

| English | Short | pt-BR | Short | pt-PT | Short | es | Short | Notes |
|---|---|---|---|---|---|---|---|---|
| PACE | PAC | VELOCIDADE | VEL | VELOCIDADE | VEL | VELOCIDAD | VEL | Not "ritmo": that word is the Rhythm resource (EA FC prints RIT, eFootball says "velocidade" / "velocidad"). |
| SHOOTING | SHO | FINALIZAÇÃO | FIN | REMATE | REM | TIRO | TIR | pt-PT: "remate" is the Portuguese football word for a shot. |
| PASSING | PAS | PASSE | PAS | PASSE | PAS | PASE | PAS | |
| DRIBBLE | DRI | DRIBLE | DRI | DRIBLE | DRI | REGATE | REG | pt-BR: eFootball and the press say "drible" (EA FC says "Condução / CON"). es: EA FC es-MX prints REG / Regate. |
| FIGHT | FIG | LUTA | LUT | LUTA | LUT | PELEA | PEL | |
| KEEPER | GK | GOLEIRO | GOL | GUARDA-REDES | GR | PORTERO | POR | pt-BR: EA FC position code for the keeper is GOL. pt-PT: "GR" is the usual Portuguese abbreviation. |

Team-card stats (training and lobby): SPEED / POWER / PASSING / PHYSICAL / DRIBBLE / ACCURACY become VELOCIDADE / FORÇA / PASSE / FÍSICO / DRIBLE / PRECISÃO in both Portuguese variants and VELOCIDAD / POTENCIA / PASE / FÍSICO / REGATE / PRECISIÓN in es.

## Japanese (ja)

Japanese has its own table so the tables above stay readable. The `ja` column is linted the same way as the other languages (rows with Lint ✓).

| English | ja | Lint | Notes |
|---|---|---|---|
| Core / Cores | コア | ✓ | No plural. Core Upgrade screen: コア強化. Starting Core: 初期コア. Signature Core: 固有コア. Core Box: コアBOX. |
| Ultimate | 必殺技 | ✓ | The classic Japanese word for a super move (イナズマイレブン, fighting games). |
| build | ビルド | ✓ | |
| archetype | タイプ | ✓ | |
| synergy | シナジー | | |
| reroll | 引き直し / 引き直す | | REROLL 3 → 3枚引き直す |
| SCALES WITH | 強化元 | | Card label followed by the stat name. |
| Archetypes: SPEED / TIKI-TAKA / STRIKER / BRAWLER / KICKER / ILLUSION / IRON / CHAOS | スピード / ティキタカ / ストライカー / ケンカ屋 / 飛び蹴り / 幻影 / 鉄壁 / カオス | | KICKER is named after the flying kick. "キッカー" means a set-piece taker in Japanese football. |
| Momentum | 勢い | ✓ | Replaced by an icon: exact form. Don't use 勢い for anything else. |
| Rhythm | リズム | ✓ | Icon, exact form. |
| Rage | 怒り | ✓ | Icon, exact form. The RAGE! callout is 怒り！ (callouts are never swapped for icons). |
| Guard | ガード | ✓ | Icon, exact form. |
| Main Path | キャリア | ✓ | Japanese football games call the single-player ladder キャリア. |
| Area | エリア | ✓ | |
| division | ディビジョン | | Roman numerals (III / II / I) stay. |
| promotion match | 昇格戦 | ✓ | PROMOTED → 昇格！ · DEMOTED → 降格… |
| championship final | 決勝戦 | | |
| boss | ボス | ✓ | |
| OVR | 総合 | ✓ | |
| drill / drill card | 特訓 / 特訓カード | ✓ | |
| scout / scout report | スカウト / スカウトレポート | ✓ | |
| teammate / MATE | 相棒 | | |
| level / LV | レベル / Lv | | |
| XP | EXP | | |
| gold | ゴールド | | |
| keeper | キーパー | ✓ | |
| goal / save / shot | ゴール / セーブ / シュート | | Callouts: ゴール！ / セーブ！ |
| charged shot | 溜めシュート | | |
| ground pass / through ball / lob pass | グラウンダーパス / スルーパス / ロブパス | | |
| volley / bicycle kick | ボレー / オーバーヘッド | | |
| woodwork | ポスト | | Callout: ポスト直撃！ |
| FULL TIME / FINAL PUSH / GOLDEN GOAL | 試合終了 / ラストスパート / ゴールデンゴール | | |
| intercept | カット / インターセプト | | Callout: カット！ |
| RIVAL MATCH | ダービー | | |
| punch / dropkick | パンチ / ドロップキック | | |
| light / hard attack | 弱攻撃 / 強攻撃 | | |
| dash / skill move / dodge | 突進 / フェイント / 回避 | | Sprint is ダッシュ, so the defensive dash is 突進. |
| stun | スタン | ✓ | |
| knockback / launch | ノックバック / 打ち上げ | | |
| cooldown | クールダウン | ✓ | |
| SETTINGS / CONTROLS / LANGUAGE | 設定 / 操作 / 言語 | | |
| RESUME / RESTART / skip | 再開 / やり直す / スキップ | | |
| SHOP / CHARACTER / INVENTORY / APPEARANCE / STATS / TEAM | ショップ / キャラクター / 持ち物 / 見た目 / ステータス / チーム | | |
| costume / gacha box / dismantle | 衣装 / ガチャボックス / 分解 | | Box names use "BOX" to save width: ストリートBOX. |
| room / host / lobby / co-op / versus | ルーム / ホスト / ロビー / 協力 / 対戦 | | |
| GUEST (bench seat) | ベンチ | | |
| full game / demo / COMING SOON | 製品版 / 体験版 / 近日公開 | | |
| Stats PACE / SHOOTING / PASSING / DRIBBLE / FIGHT / KEEPER | 走力 / 決定力 / パス / ドリブル / 格闘 / キーパー | | |
| Stat codes (PAC SHO PAS DRI FIG GK, SPD PWR PHY) | kept in English | | The slots fit 3 Latin letters, not 1.5 kanji. FIFA's Japanese version prints PAC / SHO / PAS on cards too. |

## Kept in English

GOAT · AURA FARMING · character names (ACE, SHADOW, ECHO, ROOKIE, MAESTRO...) · 3-letter team codes · sound effects (BOOM!, POW!, BONK!, BAM!, KRAKOOM!!, POOF, ZAP!, CLANG!) · "{n} HIT!" · TIKI-TAKA · XP · key names (D, Z, S, X, Enter, Esc).
