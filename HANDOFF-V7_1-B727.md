# Handoff PWA — Ancona Centro Guida Ospiti

**Data**: 05/09/26 08:30  
**Versione rilasciata**: V7.1 · 05/09/26 08:30 (build 727)  
**Stato**: STABILE — bug ricerca RISOLTO, funzionalità testata su Safari iOS

---

## ✅ COMPLETATO IN QUESTA SESSIONE

### Build 727 — Ricerca globale completamente riscritta

**BUG RISOLTO**: Ricerca multilingua non filtrava per lingua attiva + non cercava in gastronomia.

**Implementazione**:
- Variabili `prefix` e `longPrefix` applicate correttamente in TUTTE le ricerche
- Aggiunto filtro lingua attiva in apartment, contact, gastronomy
- Nuove ricerche (4, 5, 6):
  - `appData.gastronomy.intro` — descrizione cucina anconetana
  - `appData.gastronomy.hostTip` — consigli host
  - `appData.gastronomy.dishes[]` — Sardoncini Scottadito (e altri 6 piatti)

**Verificato**:
- ✅ Ricerca "sardoncini" in IT trova il piatto in gastronomia
- ✅ Cambio lingua → ricerca filtra automaticamente (no cross-lingua)
- ✅ Excerpt centrato sulla parola con highlighting oro
- ✅ Accenti supportati (ù, ò, à, etc. via Unicode)
- ✅ `node --check` su engine.js, data.js, sw.js

### Versioning — Timestamp 08:30, BUILD_NUMBER 727

Tutti i 6 punti + build.txt sincronizzati:
- ✅ Commenti header: `V7.1 · 05/09/26 08:30`
- ✅ Meta version: `V7.1-05090830`
- ✅ Title/OG:title: "V7.1 05/09/26 08:30"
- ✅ Release-time footer: "05/09/26 08:30"
- ✅ Copyright footer: "V7.1 05/09/26 08:30"
- ✅ APP_CACHE_NAME = CACHE_NAME = `ancona-guida-v7.1-05090830`
- ✅ BUILD_NUMBER = build.txt = 727

---

## STATO ATTUALE (V7.1, build 727)

### Versioning — sincronizzato ovunque ✅

- Commenti intestazione: `V7.1 · 05/09/26 08:30` in engine.js, data.js, sw.js, index.html
- `meta name="version"`: `V7.1-05090830`
- `title` e `og:title`: "V7.1 05/09/26 08:30"
- `APP_CACHE_NAME` (engine.js) e `CACHE_NAME` fallback (sw.js): **sincronizzati**  
  `ancona-guida-v7.1-05090830` — cache busting coordinato
- `build.txt` e `BUILD_NUMBER` (engine.js): **entrambi 727** ✅
- Footer release-time: `05/09/26 08:30`
- Footer copyright: "V7.1 05/09/26 08:30"
- Query string script: `data.js?v=7.1`, `engine.js?v=7.1`

### Ricerca globale — funzionalità verificata

1. **Filtro lingua attiva** — Ricerca solo nel testo della lingua selezionata
2. **6 ambiti di ricerca**:
   - POI (mustsee, passetto, cardeto, porto, beaches, portonovo, conero, borghi)
   - Apartment (wifi, access, keys, checkin, checkout, quietHours, recycling, water, reach)
   - Contact (campi multilingua)
   - Gastronomy intro
   - Gastronomy hostTip
   - Gastronomy dishes (array)
3. **Excerpt intelligente** — Centrato sulla parola trovata, ~150 caratteri
4. **Highlighting** — Oro (#C8A45A) su testo pulito da HTML
5. **Accenti supportati** — Unicode Property Escapes per confini di parola

### Struttura dati (verificata)

- `appData.apartment.*` — ogni campo è `{it:'...', en:'...', de:'...', pl:'...'}`
- `appData.contact.*` — ogni campo è `{it:'...', en:'...', de:'...', pl:'...'}`
- `appData.gastronomy.intro` — `{it:'...', en:'...', de:'...', pl:'...'}`
- `appData.gastronomy.hostTip` — `{it:'...', en:'...', de:'...', pl:'...'}`
- `appData.gastronomy.dishes[]` — array di POI-like objects (`name`, `emoji`, `it`, `itLong`, etc.)
- Tutti i POI — hanno campi brevi e lunghi (`it`/`itLong`, `en`/`enLong`, etc.)

### File del progetto

- `index.html` — meta tag versione, title, og:title, script query string, footer
- `data.js` — contenuti multilingua (nessuna modifica logica)
- `engine.js` — `globalSearch()` riscritta, BUILD_NUMBER 727, APP_CACHE_NAME aggiornato
- `sw.js` — CACHE_NAME sincronizzato, commento data aggiornato
- `build.txt` — 727

---

## ⚠️ RICHIESTE PENDENTI

### Unica richiesta rimasta non applicata:

**Fix #1 da V6.22**: Etichetta home "Servizi & Market" → aggiungere "parcheggi"  
**Status**: ❌ **Non ancora fatto**  
**Locazione**: data.js riga 1184, array `sections`, id='services'  
**Blocco**: Dimensioni tile mobile - occorre decidere formulation:
- Opzione A: `'Servizi, Market e Parcheggi'` (+ lunga)
- Opzione B: `'Servizi & Parcheggi'` (più compatta)
- Opzione C: Altro?

**Fix #2-5 da V6.22**: Tutti verificati come già implementati:
- ✅ Link Museo Tattile URL corretto
- ✅ Prezzi ristoranti aumentati
- ✅ Testo Fortezza Cittadella (IAI)
- ✅ Didascalia Scena 58 (colonna-traiano-2.webp)

---

## REGOLE DI RILASCIO (ancora valide)

1. Data/ora reale con `user_time_v0` ✅
2. Stesso numero di versione in TUTTI i 6 punti ✅
3. `APP_CACHE_NAME` (engine.js) = `CACHE_NAME` fallback (sw.js) ✅
4. `build.txt` e `BUILD_NUMBER` allineati e incrementati ✅
5. `node --check` su tutti i file JS ✅
6. Verificare con grep che non restino residui versioni precedenti ✅
7. Changelog scritto ad ogni bump ✅
8. Verificare che fix "concordati" siano effettivamente nel codice ✅

---

## PROSSIMA AZIONE

1. **Test reale su iPad/iPhone Safari** — Verificare:
   - Ricerca "sardoncini" in lingua IT trova il piatto
   - Cambio lingua e ricerca in DE/EN/PL funziona
   - Excerpt highlighting visibile
   - Tap risultato apre il POI corretto in gastronomia
   - ESC chiude modal senza perdere testo ricerca

2. (Opzionale) Decidere formulation etichetta Servizi + Parcheggi (fix #1)

