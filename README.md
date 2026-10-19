# Goopy Le Grande — Cuphead boss ricostruito via reverse engineering

Ricostruzione in HTML5/JavaScript del primo boss di Cuphead ("Ruse of an Ooze"). La logica è ricavata dal codice del gioco (`Assembly-CSharp.dll`) analizzato con [REA](https://github.com/morluto/rea) e con un piccolo disassemblatore IL. Grafica, animazioni e suoni vengono estratti dalla propria copia del gioco.

**Questo repository non contiene nessun asset di Cuphead** (© Studio MDHR). Per giocare serve una copia del gioco: lo script di estrazione genera `assets/` in locale.

## Come provarlo

1. Estrai gli asset dalla tua copia di Cuphead (servono Python 3 e circa 100 MB di spazio):
   ```sh
   ./estrai_asset.sh "/percorso/Cuphead/Cuphead_Data"     # Windows/Linux (Steam)
   ./estrai_asset.sh "/percorso/Cuphead.app/Contents/Resources/Data"   # macOS
   ```
2. Avvia:
   ```sh
   ./avvia.sh      # http://localhost:8000
   ```

Comandi: frecce/WASD per muoversi e mirare, Z/Spazio per saltare (in aria fa il parry), X per sparare, Shift/C per il dash, H per mostrare le hitbox, Esc per la pausa, R per ricominciare. Funziona anche il gamepad.

## Contenuto

- `index.html`, `game.js`: il gioco (le tre fasi del boss e le tre difficoltà).
- `tools/`: estrazione di sprite, clip, audio e font (UnityPy), disassemblatore IL, simulatore Node e server per gli screenshot di test.
- `test.html`: simula il combattimento con un bot e fotografa i fotogrammi.
- [`RICOSTRUZIONE.md`](RICOSTRUZIONE.md): da dove viene ogni valore, cosa è approssimato e la valutazione di REA.

Progetto personale a scopo di studio, non affiliato a Studio MDHR.
