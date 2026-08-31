# RELEASE-V6.26-5

## Build 626 · 31/08/26 08:07

---

## Fix applicati

### ✅ 1. noexpand funzionante
- Parametro `noexpand=true` disabilita auto-expansion foto varianti
- Link 1 (colonna-traiano.webp): NO swipe, NO foto aggiuntive

### ✅ 2. Didascalia visibile su scena 58
- Corretto bug: openLightbox salvava `captions` (array) ma openDetailGalleryFullscreen cercava `caption` (singolo)
- Link 2 (colonna-traiano-2.webp): mostra didascalia "Scena 58..."

### ✅ 3. Backdrop opaco (NO trasparenza)
- Aumentato opacità backdrop: 0.98 → 0.99
- Aggiunto `overflow:hidden!important` al CSS
- Sfondo pagina NON visibile dietro il lightbox

---

## Come testare

1. Sezione "Centro Storico" → "Arco di Traiano"
2. **Link 1** "Colonna Traiana...": apre foto sola, NO swipe
3. **Link 2** "scena 58": mostra foto 2 CON didascalia "Scena 58..."
4. Didascalia ha barra "≡ Dettagli" (draggable)
5. Lightbox ha sfondo scuro, pagina dietro NON visibile

---

## Verificazione timestamp

Footer PWA deve mostrare: **"V6.26 · 31/08/26 08:07"**

Se vedi **31/08/26 08:07** = V6.26-5 ✅

