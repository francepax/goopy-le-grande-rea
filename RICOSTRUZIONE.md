# Goopy Le Grande — ricostruzione via reverse engineering

Il primo boss di Cuphead ("Ruse of an Ooze", `SlimeLevel`) è stato ricostruito come gioco HTML5 eseguibile nel browser.
Logica e numeri vengono dal codice del gioco (`Assembly-CSharp.dll`); grafica, animazioni, suoni e disposizione della scena vengono dai file dati della copia installata (versione macOS, Unity 2017.4.9f1, Mono).

**Solo per uso personale**: gli asset in `assets/` sono estratti dalla tua copia del gioco (© Studio MDHR). Non pubblicarli e non condividerli.

## Avvio

```sh
./estrai_asset.sh "/percorso/Cuphead_Data"   # solo la prima volta: crea assets/
./avvia.sh                                   # apre http://localhost:8000
```

Comandi: frecce/WASD per muoversi e mirare, Z/Spazio per saltare (in aria fa il parry), X per sparare, Shift/C per il dash, H per mostrare le hitbox, Esc per la pausa, R per ricominciare. Funziona anche il gamepad.

## Come è stato ricostruito

1. **REA** (`inspect_managed_artifact`, `inspect_managed_members`) ha identificato l'assembly come Unity/Mono, non offuscato, con 5.643 tipi. Per i 6 tipi del livello ha restituito metodi, campi, chiamate, accessi ai campi e stringhe.
2. **`tools/ildump.py`** è un piccolo disassemblatore CIL scritto per l'occasione. Serviva perché REA riporta l'opcode e gli hash delle istruzioni, ma non i valori immediati (`ldc.r4 2350.0`) né il corpo delle coroutine. Output in `tools/il/`.
3. **UnityPy** ha letto la scena `level20`, `sharedassets20/8` e gli AssetBundle `atlas_slimelevel`, `atlas_player`, `atlas_playerfx` e `music_mus_slime`. I parametri serializzati degli script (`maxX`, `punchMinX`…) sono stati letti generando i typetree dalla DLL.
4. **`tools/export_assets.py`** ricompone gli sprite. Quelli nei `sharedassets` sono segnaposto vuoti; quelli veri stanno nei bundle con lo stesso nome. Lo script li impacchetta in 6 atlanti, con il punto di ancoraggio originale, e decodifica le curve degli AnimationClip (tempi esatti dei fotogrammi ed eventi come `TurnBig`, `OnSmash`, `PunchTurn`).
5. **`game.js`** riproduce le coroutine Unity con i generatori JavaScript, quasi riga per riga rispetto all'IL.

## Da dove viene ogni valore

| Cosa | Valore | Fonte |
|---|---|---|
| Vita del boss | 1000 / 1200 / 1400 | `LevelProperties.Slime.GetMode` (IL) |
| Cambi di fase (Normale) | BigSlime al 76%, Tombstone al 31% | `CreateTimeline` + `GetMode` |
| Salto alto/basso (Normale, fase 1) | vy 2350/2000, vx 840/780, gravità 6500 | `GetMode` → `Jump` |
| Sequenza dei salti | `"HJ,LJ,HJ,LJ,D.5, LJ,RJ,…"` (H = alto, L = basso, R = casuale, D = pausa) | `GetMode`, parsing in `jump_cr` |
| Salti prima del pugno | `Random.Range(5,8)` → da 5 a 7 (il massimo è escluso) | `MinMax.RandomInt` |
| Primo pugno di Goopy grande | dopo 3 salti (il valore "2" della fase BigSlime non viene mai usato) | `SlimeLevelSlime.LevelInit` + `jump_cr` |
| Tenuta del pugno | 0,65 s prima, 0,4 s colpo | `Punch.preHold/mainHold` |
| Limiti dell'arena | piccolo ±560, grande ±500 | scena `level20`, campi `maxX` |
| Zona in cui il pugno parte | piccolo (-1000, 200), grande (-425, 200) | `punchMinX/MaxX` + `inPunchPosition` |
| Trasformazione | solo atterrando con \|x\| < 350; `TurnBig` a 6,5 s della clip | `jump_cr`, eventi della clip |
| Lapide | cade da 550 a -80 in 0,2 s; scivola tra ±500 a 950 px/s; schiaccia dopo 2–4 s con uno scarto dalla lista | `intro_cr`, `move_cr`, `waitForSmash_cr` |
| Danno della lapide | solo tra 0,167 e 0,458 s dello schiacciamento, cerchio di raggio 250 | eventi + curve di `anim_level_slime_tombstone_smash` |
| Hitbox di Goopy | corpo r80 (piccolo), r160 (grande); pugno animato dalle curve delle clip | collider della scena + curve delle clip |
| Cuphead | corsa 490, velocità di caduta massima 1620, salto -0,755, tenuta 0,01–0,16 s, dash 1100×0,3 s | `LevelPlayerMotor.Properties` |
| Fisica del salto | `vy = -1620 · y`, `y += 1620/(7,3·60) · dt` | `VelocityManager.get_Total`, `HandleFalling` |
| Peashooter | 4 danni, 2250 px/s, un colpo ogni 0,11 s | `WeaponProperties.LevelWeaponPeashot.Basic` |
| Vita del giocatore | 3, poi circa 2 s di invulnerabilità | `PlayerStatsManager.CalculateHealthMax`, `PlayerDamageReceiver` |
| Mini-slime | presenti nel codice ma disattivati (`TINIES = false`) | `SlimeLevelSlime.Awake` |

## Cosa è approssimato

- **Animator di Unity:** il grafo delle transizioni non è stato letto; le sequenze di clip sono ricostruite dalla logica delle coroutine.
- **Punto di uscita dei colpi:** stimato a occhio, non letto dai dati.
- **Camera:** la telecamera che segue il percorso è approssimata.
- **Annunciatore:** l'ordine delle battute ("Ready"/"Wallop") è un'ipotesi.
- **Scritte e voto:** le scritte READY/KNOCKOUT sono testo con il font originale, non le animazioni del gioco; il voto finale è semplificato.
- **Non implementati:** parry su oggetti rosa (in questo livello non ce ne sono), "hit pause", super, EX e charm.

## Valutazione di REA in questo test

- **Cosa ha fatto bene:** ha classificato subito l'assembly (Unity/Mono, metadati completi). Ha inventariato membri, chiamate, accessi ai campi e stringhe dei tipi scelti, con evidenze verificabili (SHA-256 e MVID). Le stringhe hanno dato i nomi di animazioni e suoni; le chiamate hanno mostrato la struttura delle coroutine.
- **Limiti incontrati:**
  - l'inventario dei membri dell'intera DLL supera il budget di 64 MB, quindi va fatto pochi tipi alla volta;
  - non decompila C# e non mostra gli operandi numerici dell'IL;
  - non legge gli asset Unity (scene, sprite, clip, audio).
- **Strumenti aggiunti:** queste parti sono state coperte con `ildump.py` e UnityPy. Nel ciclo REA non c'è ancora un decompilatore per il codice gestito.

Evidenze REA principali (sessione del 19/10/2026):

- `ev_9b03816b…` — `inspect_managed_artifact` (assembly, unity-mono, 5643 TypeDef)
- `ev_e471ba3e…` — `inspect_managed_members` su `SlimeLevel*` (100 metodi, 330 chiamate, 27 stringhe)
- `ev_487020d2…` — inventario dell'intera DLL rifiutato per limite di risorse

## File

- `index.html`, `game.js`: il gioco.
- `assets/`: atlanti, `assets.json` (sprite, 123 clip, layout), audio WAV, font.
- `test.html`: banco di prova; simula con un bot e salva fotogrammi (vedi `tools/shotserver.py`).
- `tools/`: script di estrazione, simulatore Node (`sim.js`) e IL del livello.
