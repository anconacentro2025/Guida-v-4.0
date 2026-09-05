# CHANGELOG — V7.1 Build 727

**Data rilascio**: 05/09/26 08:30  
**Versione precedente**: V6.22 (build 622)  
**Stato**: STABILE — risolto bug ricerca multilingua, pronto per testing su device reale

---

## Modifiche Critiche

### BUG FIX: Ricerca globale ora filtra per lingua attiva e cerca in gastronomia

**Problema**: Ricerca ignorava la lingua selezionata, cercava in tutte le lingue contemporaneamente, e non cercava affatto nei piatti tipici (es. "sardoncini" non trovava).

**Soluzione architetturale** (engine.js `globalSearch()` riga 860+):

1. **Filtro lingua applicato OVUNQUE**
   - Variabili `prefix` e `longPrefix` ora usate correttamente
   - Ricerca solo nel campo della lingua attiva (`obj[prefix]`, `obj[longPrefix]`)
   - Tutti i campi multilingua iterati con controllo di tipo

2. **Ricerca estesa a gastronomy**
   - RICERCA 4: `appData.gastronomy.intro` (multilingua)
   - RICERCA 5: `appData.gastronomy.hostTip` (multilingua)
   - RICERCA 6: `appData.gastronomy.dishes[]` (array di piatti, cercati come POI)

3. **Navigazione corretta campi multilingua**
   - apartment/contact: ogni campo è `{it:'...', en:'...', de:'...', pl:'...'}`
   - POI e dishes: hanno `it`, `en`, `de`, `pl` e `itLong`, `enLong`, `deLong`, `plLong`
   - Iterazione con controllo `typeof fieldObj==='object'&&fieldObj!==null&&!Array.isArray(fieldObj)`

**Risultato verificato**:
- ✅ "sardoncini" (IT) → trova in `appData.gastronomy.dishes[].it`
- ✅ Nessun cross-lingua (solo la lingua selezionata cercata)
- ✅ Excerpt centrato sulla parola con highlighting in oro

### Versioning — Aggiornamento timestamp e BUILD_NUMBER

| Elemento | Build 726 | Build 727 | Status |
|---|---|---|---|
| **Timestamp** | 05/09/26 07:50 | 05/09/26 08:30 | ✅ Aggiornato |
| **BUILD_NUMBER** | 726 | 727 | ✅ Incrementato |
| **APP_CACHE_NAME** | `ancona-guida-v7.1-05090750` | `ancona-guida-v7.1-05090830` | ✅ Nuovo hash |
| **CACHE_NAME** | `ancona-guida-v7.1-05090750` | `ancona-guida-v7.1-05090830` | ✅ Sincronizzato |

### Verifiche

- ✅ `node --check` engine.js, data.js, sw.js
- ✅ Linguaggio attivo (`currentLang`) usato come filtro in TUTTE le ricerche
- ✅ APP_CACHE_NAME = CACHE_NAME (coordinazione cache)
- ✅ BUILD_NUMBER = build.txt (controllo versione)

---

## Specifiche Tecniche

### Struttura ricerca (6 ambiti)
1. **POI**: mustsee, passetto, cardeto, porto, beaches, portonovo, conero, borghi
2. **Apartment**: wifi, access, keys, checkin, checkout, quietHours, recycling, water, reach.auto/train/ferry/airport
3. **Contact**: indirizzo, email, phone
4. **Gastronomy intro**: descrizione della cucina anconetana
5. **Gastronomy hostTip**: consigli dell'host
6. **Gastronomy dishes**: Brodetto, Sardoncini Scottadito, Raguse, Moscioli, Stoccafisso, Vincisgrassi, Rosso Conero

### Filtro lingua
```javascript
const prefix = {it:'it', en:'en', de:'de', pl:'pl'}[currentLang] || 'it';
const longPrefix = prefix + 'Long';  // itLong, enLong, deLong, plLong
```

Cerca **SOLO** in `obj[prefix]` e `obj[longPrefix]` — nessun accesso a campi di altre lingue.

---

## File modificati

- `engine.js` — Funzione `globalSearch()` completamente riscritta (riga 860+)
- `index.html` — Timestamp aggiornato a 08:30 in 4 punti + meta version
- `engine.js` — BUILD_NUMBER 727, APP_CACHE_NAME aggiornato
- `sw.js` — CACHE_NAME aggiornato, commento data aggiornato
- `build.txt` — 727

**File NON modificati**:
- `data.js` — nessun cambio contenuto, solo timestamp header

