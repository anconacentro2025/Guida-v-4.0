/* ============================================================
   V4.0 · COMPILAZIONE: 18/06/2026 14:45
   APP.JS – Logica completa della guida
   ============================================================ */

var currentLang = 'it';
var currentSection = -1;
var currentPlaceDetail = -1;
var currentSectionPlaces = [];
var leafletMap = null;
var currentSubItinerary = null;
var HOST_PHONE = '3356750269';
var HOST_EMAIL = 'anconacentro@yahoo.com';
var PHOTO_BASE = 'https://raw.githubusercontent.com/anconacentro2025/Guida-1.7/main/img/';
var HOME_COORDS = { lat: 43.6181895, lng: 13.5129489 };
var placeDataMap = {};
var _mapRetryCount = 0;
var headerSubTr = { it: 'Guida Ospiti · Piazza Roma 3', en: 'Guest Guide · Piazza Roma 3', de: 'Gästeführer · Piazza Roma 3', pl: 'Przewodnik dla gości · Piazza Roma 3' };

var isGpsTracking = false;
var userLocationMarker = null;
var userLocationCircle = null;

function tr(it, en, de, pl) {
    if (currentLang === 'en') return en || it;
    if (currentLang === 'de') return de || en || it;
    if (currentLang === 'pl') return pl || en || it;
    return it;
}

function setLang(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    ['it', 'en', 'de', 'pl'].forEach(function(l) {
        var el = document.getElementById('btn-' + l);
        if (el) {
            el.classList.toggle('active', l === lang);
            el.setAttribute('aria-checked', l === lang ? 'true' : 'false');
        }
    });
    renderAll();
}

function getMapLink(query, noSuffix) {
    var q = noSuffix ? query : query + ', Ancona Italia';
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(q);
}

function getImgSearchUrl(p) {
    var q = p.imgQuery || (p.name + ' Ancona');
    return 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(q);
}

function photoFallback(wrapId) {
    var el = document.getElementById(wrapId);
    var p = placeDataMap[wrapId];
    if (el && p) {
        el.innerHTML = '<a href="' + getImgSearchUrl(p) + '" target="_blank" rel="noopener" class="detail-photo-link" aria-label="Cerca foto di ' + p.name + ' su Google Immagini"><span class="placeholder-emoji" aria-hidden="true">🖼️</span><span class="placeholder-text">' + tr('Clicca per vedere le foto', 'Click to see photos', 'Klicken, um Fotos zu sehen', 'Kliknij, aby zobaczyć zdjęcia') + '</span></a>';
    }
}

function calcDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function openSubItinerary(subId) {
    currentSubItinerary = subId;
    currentPlaceDetail = -1;
    placeDataMap = {};
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    renderAll();
    setTimeout(function() { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 0);
}

function closeSubItinerary() {
    currentSubItinerary = null;
    currentPlaceDetail = -1;
    placeDataMap = {};
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    renderAll();
    setTimeout(function() { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 0);
}

function goTo(i) {
    if (leafletMap && isGpsTracking) {
        leafletMap.stopLocate();
        if (userLocationMarker) leafletMap.removeLayer(userLocationMarker);
        if (userLocationCircle) leafletMap.removeLayer(userLocationCircle);
        userLocationMarker = null;
        userLocationCircle = null;
        isGpsTracking = false;
    }
    currentSection = i;
    currentPlaceDetail = -1;
    currentSubItinerary = null;
    placeDataMap = {};
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    renderAll();
    setTimeout(function() { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 0);
}

function selectPlaceDetail(i) {
    var items = currentSubItinerary ? (appData.subItineraries[currentSubItinerary] || []) : currentSectionPlaces;
    var p = items[i];
    if (p && p.isSubItinerary && p.subId) { openSubItinerary(p.subId); return; }
    currentPlaceDetail = i;
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    renderAll();
    setTimeout(function() { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 0);
}

function backToMap() {
    currentPlaceDetail = -1;
    renderAll();
    setTimeout(function() { window.scrollTo({ top: 0, behavior: 'smooth' }); }, 0);
}

function panToHome() {
    if (leafletMap) { leafletMap.setView([HOME_COORDS.lat, HOME_COORDS.lng], 15); }
}

function getDisplayNumber(p, index) {
    if (currentSubItinerary) return String.fromCharCode(65 + index);
    if (typeof p.order === 'string' && p.order.indexOf('bis') > -1) return p.order.replace('-bis', 'b');
    if (typeof p.order === 'number') return p.order;
    return index + 1;
}

function getTotalDisplay(items, total) {
    if (!total || !items || !items.length) return 0;
    if (currentSubItinerary) return String.fromCharCode(64 + total);
    var last = items[total - 1];
    if (last && typeof last.order === 'string' && last.order.indexOf('bis') > -1) return last.order.replace('-bis', 'b');
    if (last && typeof last.order === 'number') return last.order;
    return total;
}

function sortMustSee(a, b) {
    function toNum(val) { if (typeof val === 'string' && val.indexOf('bis') > -1) return parseFloat(val.split('-')[0]) + 0.5; return Number(val); }
    return toNum(a.order) - toNum(b.order);
}

function updateGpsUI() {
    var container = document.getElementById('gps-ui-container');
    if (!container) return;

    if (currentPlaceDetail >= 0) {
        container.classList.remove('visible');
        return;
    }

    var textEl = document.getElementById('gps-text');
    if (textEl) {
        textEl.innerHTML = tr(
            '🧭 <strong>Navigazione in tempo reale</strong><br>Attiva la geolocalizzazione per vedere la tua posizione sulla mappa e seguire l\'itinerario passo dopo passo. La mappa si centrerà automaticamente su di te mentre ti sposti.',
            '🧭 <strong>Real-time navigation</strong><br>Enable geolocation to see your position on the map and follow the route step by step. The map will automatically center on you as you move.',
            '🧭 <strong>Echtzeit-Navigation</strong><br>Aktivieren Sie die Standortermittlung, um Ihre Position auf der Karte zu sehen und der Route Schritt für Schritt zu folgen. Die Karte zentriert sich automatisch auf Sie, während Sie sich bewegen.',
            '🧭 <strong>Nawigacja w czasie rzeczywistym</strong><br>Włącz geolokalizację, aby zobaczyć swoją pozycję na mapie i podążać trasą krok po kroku. Mapa będzie automatycznie centrować się na Tobie podczas poruszania się.'
        );
    }

    var btn = document.getElementById('btn-gps');
    if (btn) {
        btn.textContent = isGpsTracking ?
            '🎯 ' + tr('Spegni GPS', 'Disable GPS', 'GPS deaktivieren', 'Wyłącz GPS') :
            '📍 ' + tr('Mostrami sulla mappa', 'Show me on map', 'Auf Karte zeigen', 'Pokaż na mapie');
        btn.classList.toggle('active', isGpsTracking);
    }

    var visible = false;
    var mapSections = ['mustsee', 'restaurants', 'barpub', 'supermarkets', 'parking', 'around', 'marche'];
    if (currentSection !== -1) {
        var sec = sections[currentSection];
        if (sec && mapSections.indexOf(sec.id) !== -1) {
            visible = true;
            if (currentSubItinerary) visible = true;
        }
    }
    container.classList.toggle('visible', visible);
}

function toggleGpsTracking() {
    if (!leafletMap) {
        alert(tr('Mappa non ancora caricata.', 'Map not loaded yet.', 'Karte noch nicht geladen.', 'Mapa nie została jeszcze załadowana.'));
        return;
    }

    if (isGpsTracking) {
        leafletMap.stopLocate();
        if (userLocationMarker) leafletMap.removeLayer(userLocationMarker);
        if (userLocationCircle) leafletMap.removeLayer(userLocationCircle);
        userLocationMarker = null;
        userLocationCircle = null;
        isGpsTracking = false;
        updateGpsUI();
    } else {
        isGpsTracking = true;
        updateGpsUI();

        leafletMap.off('locationfound').on('locationfound', function(e) {
            var accuracyRadius = e.accuracy / 2;
            if (userLocationMarker) {
                userLocationMarker.setLatLng(e.latlng);
                userLocationCircle.setLatLng(e.latlng).setRadius(accuracyRadius);
            } else {
                userLocationCircle = L.circle(e.latlng, accuracyRadius, {
                    color: '#0B1F33',
                    fillColor: '#C8A45A',
                    fillOpacity: 0.12,
                    weight: 1
                }).addTo(leafletMap);

                var blueDotIcon = L.divIcon({
                    className: 'gps-blue-dot-wrap',
                    html: '<div class="gps-blue-dot"></div><div class="gps-blue-dot-pulse"></div>',
                    iconSize: [20, 20],
                    iconAnchor: [10, 10]
                });

                userLocationMarker = L.marker(e.latlng, { icon: blueDotIcon }).addTo(leafletMap);
                leafletMap.setView(e.latlng, 16);
            }
        });

        leafletMap.off('locationerror').on('locationerror', function(e) {
            alert(tr(
                "Impossibile accedere alla tua posizione. Controlla i permessi GPS del tuo browser.",
                "Unable to access your location. Please check your browser's GPS permissions.",
                "Standortzugriff nicht möglich. Bitte überprüfen Sie die GPS-Berechtigungen Ihres Browsers.",
                "Nie można uzyskać dostępu do lokalizacji. Sprawdź uprawnienia GPS w przeglądarce."
            ));
            isGpsTracking = false;
            updateGpsUI();
        });

        leafletMap.locate({ watch: true, enableHighAccuracy: true });
    }
}

function renderAll() {
    document.getElementById('header-sub').textContent = tr(headerSubTr.it, headerSubTr.en, headerSubTr.de, headerSubTr.pl);
    document.documentElement.lang = currentLang;
    var hero = document.getElementById('hero');
    var nav = document.getElementById('nav');
    var cont = document.getElementById('content');

    if (currentSection === -1 && leafletMap) {
        if (isGpsTracking) {
            leafletMap.stopLocate();
            if (userLocationMarker) leafletMap.removeLayer(userLocationMarker);
            if (userLocationCircle) leafletMap.removeLayer(userLocationCircle);
            userLocationMarker = null;
            userLocationCircle = null;
            isGpsTracking = false;
        }
        leafletMap.remove();
        leafletMap = null;
    }

    hero.classList.toggle('section-mode', currentSection !== -1);

    if (currentSection === -1) {
        nav.style.display = 'none';
        cont.innerHTML = renderHome();
        updateGpsUI();
        return;
    }

    nav.style.display = 'flex';
    nav.innerHTML = sections.map(function(s, i) {
        return '<button class="nav-pill' + (i === currentSection ? ' active' : '') + '" onclick="goTo(' + i + ')" role="tab" aria-selected="' + (i === currentSection ? 'true' : 'false') + '">' + s.icon + ' ' + tr(s.it, s.en, s.de, s.pl) + '</button>';
    }).join('');

    var s = sections[currentSection];
    var body = renderSection(s.id);
    cont.innerHTML = '<section class="section active"><div class="section-header"><div class="section-header-inner"><div class="section-icon" aria-hidden="true">' + s.icon + '</div><div><div class="section-title">' + tr(s.it, s.en, s.de, s.pl) + '</div></div></div></div><div class="cards">' + body + '<div class="goto-home"><button class="home-btn" onclick="goTo(-1)" aria-label="Torna alla Home">🏠 Home</button></div></div></section>';

    if (currentPlaceDetail < 0) {
        var cardsEl = cont.querySelector('.cards');
        var gpsContainer = document.getElementById('gps-ui-container');
        if (cardsEl && gpsContainer) {
            cardsEl.insertBefore(gpsContainer, cardsEl.firstChild);
        }
        setTimeout(initSectionMap, 0);
        setTimeout(updateGpsUI, 200);
    } else {
        updateGpsUI();
    }
}

function renderHome() {
    var socialHtml = '<div class="home-social"><div><div class="home-social-label">Social</div><div class="home-social-links"><a href="' + appData.social.instagram + '" target="_blank" rel="noopener" class="social-link" aria-label="Profilo Instagram @anconacentro">📷 Instagram</a><a href="' + appData.social.facebook + '" target="_blank" rel="noopener" class="social-link" aria-label="Pagina Facebook">📘 Facebook</a></div></div></div>';
    var tiles = sections.map(function(s, i) {
        return '<button class="nav-tile" onclick="goTo(' + i + ')" aria-label="' + tr(s.it, s.en, s.de, s.pl) + '"><div class="nav-tile-icon" aria-hidden="true">' + s.icon + '</div><div class="nav-tile-label">' + tr(s.it, s.en, s.de, s.pl) + '</div></button>';
    }).join('');
    return '<section class="section active"><div class="home-welcome"><div style="font-family:\'Cormorant Garamond\',serif;font-size:1.1rem;font-weight:600;color:var(--navy);margin-bottom:10px;">' + tr('Benvenuti!', 'Welcome!', 'Willkommen!', 'Witamy!') + '</div>' + socialHtml + '</div><div class="nav-grid">' + tiles + '</div></section>';
}

function renderSection(id) {
    if (id === 'contact') return renderContact();
    if (id === 'rules') return renderRules();
    if (id === 'transport') return renderTransport();
    if (id === 'apartment') return renderApartment();
    var map = {
        mustsee: function() { if (currentSubItinerary) return appData.subItineraries[currentSubItinerary] || []; return appData.mustsee.slice().sort(sortMustSee); },
        restaurants: function() { return appData.restaurants; },
        barpub: function() { return appData.barpub; },
        supermarkets: function() { return appData.supermarkets; },
        parking: function() { return appData.parking; },
        around: function() { return appData.around; },
        marche: function() { return appData.marche; }
    };
    if (map[id]) return renderPlaceSection(map[id]());
    return '';
}

function starBtnHtml() {
    if (currentSectionPlaces && currentSectionPlaces.length > 0) {
        var minDist = Infinity;
        for (var i = 0; i < currentSectionPlaces.length; i++) {
            var p = currentSectionPlaces[i];
            if (p._dist !== undefined && p._dist < minDist) {
                minDist = p._dist;
            }
        }
        if (minDist > 30) return '';
    }
    return '<button class="star-list-btn" onclick="panToHome()" aria-label="Centra la mappa su Ancona Centro">★ Ancona Centro</button>';
}

function renderPlaceSection(items) {
    currentSectionPlaces = items;

    for (var i = 0; i < items.length; i++) {
        var p = items[i];
        if (p.lat && p.lng) {
            p._dist = calcDistance(HOME_COORDS.lat, HOME_COORDS.lng, p.lat, p.lng);
        } else {
            p._dist = Infinity;
        }
    }

    if (currentSubItinerary) {
        var parent = null;
        for (var k = 0; k < appData.mustsee.length; k++) {
            if (appData.mustsee[k].subId === currentSubItinerary) { parent = appData.mustsee[k]; break; }
        }
        var descHtml = parent ? '<div class="card"><div class="place-body"><div class="place-emoji-sm" aria-hidden="true">' + parent.emoji + '</div><div><div class="place-name">' + parent.name + '</div><div class="place-desc" style="margin-top:5px;">' + tr(parent.it, parent.en, parent.de, parent.pl) + '</div></div></div></div>' : '';
        if (currentPlaceDetail >= 0 && currentPlaceDetail < items.length) {
            return renderAnyPlaceDetail(items[currentPlaceDetail], currentPlaceDetail, items.length, true);
        }
        var subBtns = items.map(function(p, i) {
            var dn = getDisplayNumber(p, i);
            var sel = (i === currentPlaceDetail) ? ' selected' : '';
            return '<button class="place-btn-mini' + sel + '" onclick="selectPlaceDetail(' + i + ')" aria-label="' + p.name + '">' + dn + '. ' + p.name + '</button>';
        }).join('');
        return '<button class="back-btn" onclick="closeSubItinerary()">← ' + tr('Torna al tour principale', 'Back to main tour', 'Zurück zur Haupttour', 'Powrót do głównej trasy') + '</button>' +
            descHtml +
            '<div class="map-list-wrap"><div id="sectionMap" class="section-map-el" role="application" aria-label="Mappa dei luoghi"></div><div class="place-btn-col">' + starBtnHtml() + subBtns + '</div></div>';
    }

    if (currentPlaceDetail >= 0 && currentPlaceDetail < items.length) {
        return renderAnyPlaceDetail(items[currentPlaceDetail], currentPlaceDetail, items.length, false);
    }

    var btns = items.map(function(p, i) {
        var dn = getDisplayNumber(p, i);
        var sel = (i === currentPlaceDetail) ? ' selected' : '';
        var subBadge = p.isSubItinerary ? ' 🔀' : '';
        var subHint = p.isSubItinerary ? ' – ' + tr('mini-percorso', 'mini-tour', 'Mini-Tour', 'mini-trasa') : '';
        return '<button class="place-btn-mini' + sel + '" onclick="selectPlaceDetail(' + i + ')" aria-label="' + p.name + subHint + '">' + dn + '. ' + p.name + subBadge + '</button>';
    }).join('');

    return '<div class="map-list-wrap"><div id="sectionMap" class="section-map-el" role="application" aria-label="Mappa dei luoghi"></div><div class="place-btn-col">' + starBtnHtml() + btns + '</div></div>';
}

function renderAnyPlaceDetail(p, index, total, isSubMode) {
    var wrapId = 'photowrap_' + index;
    placeDataMap[wrapId] = p;
    var desc = tr(p.it, p.en, p.de, p.pl);
    var photoHtml;
    if (p.photo) {
        var src = PHOTO_BASE + p.photo;
        photoHtml = '<div class="detail-photo-wrap" id="' + wrapId + '"><div class="detail-photo-placeholder" id="ph_' + index + '" aria-hidden="true">' + p.emoji + '</div>' +
            '<img class="detail-photo" src="' + src + '" alt="Foto di ' + p.name + '" ' +
            'onload="this.classList.add(\'loaded\');var e=document.getElementById(\'ph_' + index + '\');if(e)e.classList.add(\'hidden\');" ' +
            'onerror="photoFallback(\'' + wrapId + '\')" loading="lazy"></div>';
    } else {
        photoHtml = '<div class="detail-photo-wrap"><a href="' + getImgSearchUrl(p) + '" target="_blank" rel="noopener" class="detail-photo-link" aria-label="Cerca foto di ' + p.name + ' su Google Immagini"><span class="placeholder-emoji" aria-hidden="true">🖼️</span><span class="placeholder-text">' + tr('Clicca per vedere le foto', 'Click to see photos', 'Klicken, um Fotos zu sehen', 'Kliknij, aby zobaczyć zdjęcia') + '</span></a></div>';
    }
    var btns = '<a href="' + getMapLink(p.mapQuery || p.name, !!p.mapQuery) + '" target="_blank" rel="noopener" class="map-button" aria-label="Apri mappa per ' + p.name + '">🗺️ ' + tr('Apri mappa', 'Open map', 'Karte öffnen', 'Otwórz mapę') + '</a>';
    if (!isSubMode && p.extraMap) { btns += ' <a href="' + getMapLink(p.extraMap.query, true) + '" target="_blank" rel="noopener" class="map-button" aria-label="' + p.extraMap.label + '">' + p.extraMap.label + '</a>'; }
    var displayNum = getDisplayNumber(p, index);
    var totalDisplay = getTotalDisplay(currentSectionPlaces, total);
    var backFn = isSubMode ? 'backToMap()' : 'backToMap()';
    var backLabel = tr('Tutti i luoghi', 'All places', 'Alle Orte', 'Wszystkie miejsca');
    var prev = index > 0 ? '<button class="nav-detail-btn" onclick="selectPlaceDetail(' + (index - 1) + ')" aria-label="Luogo precedente">◀ ' + tr('Prec.', 'Prev', 'Vor.', 'Poprz.') + '</button>' : '<span></span>';
    var next = index < total - 1 ? '<button class="nav-detail-btn" onclick="selectPlaceDetail(' + (index + 1) + ')" aria-label="Luogo successivo">' + tr('Succ.', 'Next', 'Näch.', 'Nast.') + ' ▶</button>' : '<span></span>';
    return '<button class="back-btn" onclick="' + backFn + '" aria-label="Torna alla lista dei luoghi">← ' + backLabel + '</button>' +
        '<div class="place-card">' + photoHtml +
        '<div class="place-body"><div class="place-emoji-sm" aria-hidden="true">' + p.emoji + '</div><div><div class="place-name">' + p.name + '</div><div class="place-dist">' + p.dist + '</div><div class="place-desc" style="margin-top:5px;">' + desc + '</div></div></div>' +
        '<div class="place-actions">' + btns + '</div></div>' +
        '<div class="detail-nav">' + prev + '<span class="detail-counter">' + displayNum + ' / ' + totalDisplay + '</span>' + next + '</div>';
}

function renderTransport() {
    var td = appData.transport;
    var items = [
        { icon: '🚌', label: tr('Bus', 'Bus', 'Bus', 'Autobus'), text: tr(td.bus.it, td.bus.en, td.bus.de, td.bus.pl) },
        { icon: '🚂', label: tr('Treno', 'Train', 'Zug', 'Pociąg'), text: tr(td.train.it, td.train.en, td.train.de, td.train.pl) },
        { icon: '🚕', label: tr('Taxi', 'Taxi', 'Taxi', 'Taxi'), text: tr(td.taxi.it, td.taxi.en, td.taxi.de, td.taxi.pl) },
        { icon: '⛴️', label: tr('Traghetti', 'Ferries', 'Fähren', 'Promy'), text: tr(td.ferry.it, td.ferry.en, td.ferry.de, td.ferry.pl) },
        { icon: '✈️', label: tr('Aeroporto', 'Airport', 'Flughafen', 'Lotnisko'), text: tr(td.airport.it, td.airport.en, td.airport.de, td.airport.pl) }
    ];
    var cardsHtml = items.map(function(item) {
        return '<div class="card"><div class="card-header"><span class="card-header-icon" aria-hidden="true">' + item.icon + '</span><span class="card-title">' + item.label + '</span></div><div class="card-body"><p>' + item.text + '</p></div></div>';
    }).join('');
    var portalLabel = tr('Portale turistico ufficiale', 'Official tourism portal', 'Offizielles Tourismusportal', 'Oficjalny portal turystyczny');
    cardsHtml += '<div class="card"><div class="card-header"><span class="card-header-icon" aria-hidden="true">🌐</span><span class="card-title">' + portalLabel + '</span></div><div class="card-body"><a href="https://anconatourism.it" target="_blank" rel="noopener" style="display:inline-block;background:var(--navy);color:white;padding:8px 16px;border-radius:20px;font-size:.8rem;font-weight:500;margin-top:4px;" aria-label="Apri portale turistico">anconatourism.it ↗</a></div></div>';
    return cardsHtml;
}

function renderRules() {
    var rulesHtml = appData.rules.map(function(r) { return '<div class="rule-row"><span class="rule-icon" aria-hidden="true">' + r.icon + '</span><span class="rule-text">' + tr(r.it, r.en, r.de, r.pl) + '</span></div>'; }).join('');
    return '<div class="card"><div class="card-header"><span class="card-header-icon" aria-hidden="true">📋</span><span class="card-title">' + tr('Regole della casa', 'House rules', 'Hausregeln', 'Zasady domu') + '</span></div><div class="card-body">' + rulesHtml + '</div></div>';
}

function renderApartment() {
    var a = appData.apartment;
    var cards = [
        { icon: '📶', title: tr('Wi‑Fi', 'Wi‑Fi', 'WLAN', 'Wi‑Fi'), body: tr(a.wifi.it, a.wifi.en, a.wifi.de, a.wifi.pl) },
        { icon: '🚪', title: tr('Citofono', 'Intercom', 'Gegensprechanlage', 'Domofon'), body: tr(a.access.it, a.access.en, a.access.de, a.access.pl) },
        { icon: '🔑', title: tr('Chiavi', 'Keys', 'Schlüssel', 'Klucze'), body: tr(a.keys.it, a.keys.en, a.keys.de, a.keys.pl) },
        { icon: '🏨', title: tr('Check‑in flessibile', 'Flexible check‑in', 'Flexibler Check‑in', 'Elastyczne zameldowanie'), body: tr(a.checkin.it, a.checkin.en, a.checkin.de, a.checkin.pl) },
        { icon: '♻️', title: tr('Raccolta differenziata', 'Recycling', 'Mülltrennung', 'Segregacja'), body: tr(a.recycling.it, a.recycling.en, a.recycling.de, a.recycling.pl) },
        { icon: '🔕', title: tr('Silenzio notturno', 'Quiet hours', 'Nachtruhe', 'Godziny ciszy'), body: tr(a.quietHours.it, a.quietHours.en, a.quietHours.de, a.quietHours.pl) },
        { icon: '🧳', title: tr('Check‑out flessibile', 'Flexible check‑out', 'Flexibler Check‑out', 'Elastyczne wymeldowanie'), body: tr(a.checkout.it, a.checkout.en, a.checkout.de, a.checkout.pl) }
    ];
    var html = '';
    for (var i = 0; i < cards.length; i++) {
        html += '<div class="card"><div class="card-header"><span class="card-header-icon" aria-hidden="true">' + cards[i].icon + '</span><span class="card-title">' + cards[i].title + '</span></div><div class="card-body">' + cards[i].body + '</div></div>';
    }
    return html;
}

function renderContact() {
    var fp = HOST_PHONE.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
    var waLabel = tr('Host disponibile su WhatsApp', 'Host available on WhatsApp', 'Gastgeber auf WhatsApp erreichbar', 'Gospodarz dostępny na WhatsAppie');
    var emergTitle = tr('Numeri di emergenza', 'Emergency numbers', 'Notrufnummern', 'Numery alarmowe');
    var usefulTitle = tr('Link utili', 'Useful links', 'Nützliche Links', 'Przydatne linky');
    var socialLinks = '<div style="margin-top:14px;display:flex;justify-content:center;gap:20px;"><a href="' + appData.social.instagram + '" target="_blank" rel="noopener" class="social-link" aria-label="Profilo Instagram @anconacentro">📷 Instagram</a><a href="' + appData.social.facebook + '" target="_blank" rel="noopener" class="social-link" aria-label="Pagina Facebook">📘 Facebook</a></div>';
    return '<div class="contact-card"><div class="contact-label">📞 ' + waLabel + '</div><div class="contact-number">' + fp + '</div><div class="contact-btns"><a href="https://wa.me/39' + HOST_PHONE + '" target="_blank" rel="noopener" class="btn-wa" aria-label="Contatta su WhatsApp">💬 WhatsApp</a><a href="tel:+39' + HOST_PHONE + '" class="btn-call" aria-label="Chiama il numero di telefono">📞 ' + tr('Chiama', 'Call', 'Anrufen', 'Zadzwoń') + '</a></div><div class="contact-email">✉️ <a href="mailto:' + HOST_EMAIL + '">' + HOST_EMAIL + '</a></div>' + socialLinks + '</div>' +
        '<div class="emerg-card"><div class="card-header"><span class="card-header-icon" aria-hidden="true">🚨</span><span class="card-title">' + emergTitle + '</span></div>' +
        '<div class="emerg-row"><span class="emerg-num">🚨 112</span><span class="emerg-desc">' + tr('Emergenza generale', 'General emergency', 'Allgemeiner Notruf', 'Ogólne zagrożenie') + '</span></div>' +
        '<div class="emerg-row"><span class="emerg-num">🚓 113</span><span class="emerg-desc">' + tr('Polizia', 'Police', 'Polizei', 'Policja') + '</span></div>' +
        '<div class="emerg-row"><span class="emerg-num">🚑 118</span><span class="emerg-desc">' + tr('Emergenza sanitaria', 'Medical emergency', 'Medizinischer Notfall', 'Nagły wypadek medyczny') + '</span></div>' +
        '<div class="emerg-row"><span class="emerg-num">🏥 071 5961</span><span class="emerg-desc">' + tr('Ospedale Riuniti – Pronto Soccorso', 'Ospedale Riuniti – A&E', 'Ospedale Riuniti – Notaufnahme', 'Szpital Riuniti – Izba przyjęć') + '</span></div>' +
        '<div class="emerg-row"><span class="emerg-num">🚕 071 43321</span><span class="emerg-desc">Radiotaxi Ancona (24h)</span></div></div>' +
        '<div class="card" style="margin-top:10px;"><div class="card-header"><span class="card-header-icon" aria-hidden="true">🔗</span><span class="card-title">' + usefulTitle + '</span></div><div class="card-body" style="padding:0;">' +
        '<div class="link-row"><span class="link-icon" aria-hidden="true">📰</span><div class="link-info"><div class="link-name">Edicola di Piazza Roma</div><div class="link-desc">' + tr('Proprio davanti al portone', 'Right in front of the entrance', 'Direkt vor dem Eingang', 'Tuż przed wejściem') + '</div></div><a href="' + getMapLink('Edicola Piazza Roma Ancona', true) + '" target="_blank" rel="noopener" class="link-action" aria-label="Mappa Edicola">🗺️ ' + tr('Mappa', 'Map', 'Karte', 'Mapa') + '</a></div>' +
        '<div class="link-row"><span class="link-icon" aria-hidden="true">🌐</span><div class="link-info"><div class="link-name">anconatourism.it</div><div class="link-desc">' + tr('Portale turistico ufficiale di Ancona', 'Official Ancona tourism portal', 'Offizielles Tourismusportal von Ancona', 'Oficjalny portal turystyczny Ankony') + '</div></div><a href="https://anconatourism.it" target="_blank" rel="noopener" class="link-action" aria-label="Apri portale turistico">↗</a></div>' +
        '<div class="link-row"><span class="link-icon" aria-hidden="true">👕</span><div class="link-info"><div class="link-name">Lavanderia self service</div><div class="link-desc">Via Matteotti 137</div></div><a href="https://www.google.com/maps/search/?api=1&query=43.6182699,13.5171214" target="_blank" rel="noopener" class="link-action" aria-label="Mappa Lavanderia">🗺️ ' + tr('Mappa', 'Map', 'Karte', 'Mapa') + '</a></div>' +
        '</div></div>';
}

function initSectionMap() {
    if (typeof L === 'undefined') {
        if (_mapRetryCount < 30) {
            _mapRetryCount++;
            setTimeout(initSectionMap, 300);
        } else {
            console.error('Leaflet non disponibile dopo 30 tentativi.');
        }
        return;
    }
    _mapRetryCount = 0;
    var el = document.getElementById('sectionMap');
    if (!el || !currentSectionPlaces.length) return;
    if (leafletMap) { leafletMap.remove(); leafletMap = null; }
    var valid = currentSectionPlaces.filter(function(p) { return p.lat && p.lng; });
    if (!valid.length) return;
    leafletMap = L.map('sectionMap', { zoomControl: true, attributionControl: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(leafletMap);
    L.control.attribution({ prefix: '© <a href="https://openstreetmap.org">OSM</a>' }).addTo(leafletMap);

    var bounds = [];
    valid.forEach(function(p, idx) {
        var displayNum = getDisplayNumber(p, idx);
        var markerClass = 'map-marker-num';
        if (currentSubItinerary === 'cardeto' || currentSubItinerary === 'cittadella') markerClass += ' ' + currentSubItinerary;
        if (p.isSubItinerary) markerClass += ' has-sub';
        var icon = L.divIcon({ html: '<div class="' + markerClass + '" aria-label="' + p.name + '">' + displayNum + '</div>', className: '', iconSize: [24, 24], iconAnchor: [12, 12], popupAnchor: [0, -14] });
        var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(leafletMap);
        m.bindPopup('<b style="font-size:.78rem;">' + p.emoji + ' ' + p.name + '</b><br><span style="font-size:.68rem;color:#888;">' + p.dist + '</span>');
        m.on('click', function() { selectPlaceDetail(idx); });
        bounds.push([p.lat, p.lng]);
    });
    leafletMap.fitBounds(bounds, { padding: [22, 22] });

    var starIcon = L.divIcon({ html: '<div class="map-marker-star">★</div>', className: '', iconSize: [28, 28], iconAnchor: [14, 14], popupAnchor: [0, -16] });
    L.marker([HOME_COORDS.lat, HOME_COORDS.lng], { icon: starIcon, zIndexOffset: 1000 })
        .addTo(leafletMap)
        .bindPopup('<b style="font-size:.78rem;">★ Ancona Centro</b><br><span style="font-size:.68rem;color:#888;">📍 Piazza Roma 3</span>');

    if (isGpsTracking) {
        toggleGpsTracking();
    }
}

// PWA – Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('./sw.js').then(function(reg) {
            console.log('✅ Service Worker registrato');
        }).catch(function(err) {
            console.error('❌ Errore SW:', err);
        });
    });
}

// Supporto hash per shortcut PWA
window.addEventListener('load', function() {
    var hash = window.location.hash.replace('#', '');
    if (hash && sectionHashMap[hash] !== undefined) {
        goTo(sectionHashMap[hash]);
    }
});

renderAll();
setTimeout(updateGpsUI, 300);
