/* Valheim Welt-Viewer – Sprache (Deutsch / English)
 * Die Seite ist auf Deutsch geschrieben. Dieses Skript übersetzt angezeigte Texte live ins Englische
 * (Textknoten + title/placeholder/aria-label), ohne die Daten zu verändern.
 * Sprache: ?lang=en|de → gespeicherte Wahl → Browsersprache (de* = Deutsch, sonst Englisch).
 */
(function (g) {
  'use strict';
  if (g.VW_I18N) return;

  // ---------- Oberfläche ----------
  const UI = {
    // Startseite
    'Valheim Welt-Viewer': 'Valheim World Viewer',
    'Live-Welt': 'Live world', 'Live-Karte öffnen →': 'Open live map →',
    'Welt hierher ziehen': 'Drop your world here',
    'Zip des Weltordners, einzelne Dateien oder den ganzen Ordner': 'A zip of the world folder, single files or the whole folder',
    'Dateien / Zip wählen': 'Choose files / zip', 'Ordner wählen': 'Choose folder', 'Ordner live beobachten': 'Watch folder live',
    'Chrome/Edge: Ordner beobachten und bei jedem Speichern neu laden': 'Chrome/Edge: watch the folder and reload on every save',
    'Steam-IDs nicht in die Datei schreiben (empfohlen beim öffentlichen Teilen)': 'Leave Steam IDs out of the file (recommended when sharing publicly)',
    'Live mit dem Mod „Valheim Welt Live“ verbinden': 'Connect live to the “Valheim Welt Live” mod',
    'Adresse des Mods': 'Mod address', 'Verbinden': 'Connect',
    'Wo finde ich meine Welt?': 'Where is my world?', 'Teilen': 'Sharing', 'Datenschutz': 'Privacy',
    'Windows:': 'Windows:', 'Server (z. B. Nitrado):': 'Server (e.g. Nitrado):',
    'Eine Datei, öffnet sich in jedem Browser – zum Verschicken': 'One file that opens in any browser – for sending',
    'Kompakte Datendatei (für diese Seite, Live-Karten, Server)': 'Compact data file (for this page, live maps, servers)',
    'Inoffizielles Fan-Tool, nicht mit Iron Gate verbunden. Valheim ist eine Marke von Iron Gate AB.': 'Unofficial fan tool, not affiliated with Iron Gate. Valheim is a trademark of Iron Gate AB.',
    'Inoffizieller Fan-Viewer, nicht mit Iron Gate verbunden.': 'Unofficial fan viewer, not affiliated with Iron Gate.',
    // Ablauf / Meldungen
    'Lese Dateien …': 'Reading files …', 'Lese Ordner …': 'Reading folder …', 'Entpacke …': 'Unpacking …', 'Packe Datei …': 'Packing file …',
    'Werte aus …': 'Analysing …', 'Ganze Welt in 3D …': 'Whole world in 3D …', 'Übersichtskarte …': 'Overview map …', 'Fertig': 'Done',
    'Live-Dump gelesen': 'Live dump read', 'Erzeuge Teilen-Datei …': 'Creating share file …', 'Teilen-Datei gespeichert': 'Share file saved', '⬇ Teilen-Datei (.html)': '⬇ Share file (.html)', 'Teilen-Datei (.html)': 'Share file (.html)',
    'Lade Welt …': 'Loading world …',
    'Unbekanntes Dateiformat – erwartet wird eine .vwelt- oder Teilen-HTML-Datei.': 'Unknown file format – expected a .vwelt or share HTML file.',
    'Das ist keine gültige .vwelt-Datei.': 'This is not a valid .vwelt file.',
    'Neuere Formatversion': 'Newer format version',
    'Keine passenden Dateien gefunden. Erwartet: Zip des Weltordners oder .fwl2/.db2/.chunk-Dateien.': 'No matching files found. Expected: a zip of the world folder or .fwl2/.db2/.chunk files.',
    'Dein Browser unterstützt das Beobachten von Ordnern nicht. Bitte Chrome oder Edge am PC verwenden.': 'Your browser cannot watch folders. Please use Chrome or Edge on a PC.',
    'Im gewählten Ordner sind keine Welt-Dateien.': 'The chosen folder contains no world files.',
    'Mod verbunden – Welt wird gerade gelesen. Ist eine Welt geladen?': 'Mod connected – the world is being read. Is a world loaded?',
    'Live (Mod) · Verbindung unterbrochen …': 'Live (mod) · connection lost …',
    'Live · Verbindung fehlgeschlagen, neuer Versuch …': 'Live · connection failed, retrying …',
    '⟳ Aktualisieren': '⟳ Refresh', 'Live-Welt jetzt neu laden': 'Reload the live world now', '▶ Server abfragen': '▶ Fetch from server',
    'Öffnet GitHub Actions: dort „Run workflow“ klicken (nur für Repo-Besitzer), holt sofort den neuesten Server-Stand': 'Opens GitHub Actions: click “Run workflow” there (repo owner only) to fetch the latest server state right away',
    'Prüfe auf neue Daten …': 'Checking for new data …',
    'Startet den Abgleich mit dem Server sofort (nur für den Repo-Besitzer, braucht einmalig einen GitHub-Token)': 'Starts the server sync right away (repo owner only, needs a GitHub token once)',
    'Server jetzt abfragen': 'Fetch from server now', 'Token erstellen': 'Create a token', 'Token hier einfügen:': 'Paste the token here:',
    'Speichern & starten': 'Save & start', 'Abbrechen': 'Cancel', 'Server-Abfrage abgebrochen': 'Server fetch cancelled', 'oder auf GitHub starten': 'or start it on GitHub',
    'Starte Server-Abfrage …': 'Starting server fetch …', 'Server-Abfrage gestartet – die Karte lädt in ca. 2–4 Min. neu': 'Server fetch started – the map reloads in about 2–4 min',
    'Server-Abfrage: GitHub nicht erreichbar': 'Server fetch: GitHub not reachable', 'Token ungültig oder abgelaufen.': 'Token invalid or expired.',
    'Token hat keine Berechtigung für dieses Repo (Actions: Read and write).': 'Token has no permission for this repo (Actions: Read and write).', 'neu geladen': 'reloaded',
    'Keine .chunk-Dateien gefunden. Bitte den kompletten Weltordner (Valheim 1.0) bzw. die Zip davon auswählen.': 'No .chunk files found. Please choose the complete world folder (Valheim 1.0) or a zip of it.',
    'Keine .db2 gefunden – Bosse/Orte fehlen.': 'No .db2 found – bosses/locations are missing.',
    'Keine .fwl2 gefunden – Weltname/Spieler fehlen.': 'No .fwl2 found – world name/players are missing.',
    'Kein VWD1-Dump': 'Not a VWD1 dump',
    'Unbekannte Welt': 'Unknown world', 'Neue Welt': 'New world',
    'Bleibt diese Meldung stehen? Dann wurde die Datei in einer Vorschau geöffnet, die keine Programme ausführt (z. B. Datei-Vorschau in Apps, Mail, WhatsApp). Bitte die Datei herunterladen und in einem Browser öffnen – Chrome, Edge, Firefox oder Safari.': 'Still seeing this? The file was opened in a preview that does not run scripts (e.g. file previews in apps, mail, WhatsApp). Please download it and open it in a browser – Chrome, Edge, Firefox or Safari.',
    'Bleibt diese Meldung stehen? Dann wurde die Datei in einer Vorschau ohne Skripte geöffnet. Bitte herunterladen und in Chrome, Edge, Firefox oder Safari öffnen.': 'Still seeing this? The file was opened in a preview without scripts. Please download it and open it in Chrome, Edge, Firefox or Safari.',
    // Viewer – Kopf & Tabs
    'Karte': 'Map', '3D': '3D', 'Kisten': 'Chests', 'Welt & Spieler': 'World & players', 'Menü': 'Menu',
    '🌍 Ganze Welt in 3D ansehen': '🌍 View the whole world in 3D', 'Basen': 'Bases', 'Legende': 'Legend',
    '● Basis (anklicken = 3D) · ◆ Portal · ▲ Boss/Ort (grau = noch nicht erkundet)': '● Base (click = 3D) · ◆ Portal · ▲ Boss/location (grey = not explored yet)',
    'Ziehen = verschieben · Mausrad/Pinch = Zoom': 'Drag = pan · Mouse wheel/pinch = zoom',
    'Keine Basen gefunden.': 'No bases found.',
    // 3D-Seitenleiste
    'Gebiet': 'Area', 'Ansicht': 'View', 'Von oben': 'Top', 'Schräg': 'Angled', 'Nah': 'Close', '✈ Flugmodus (F)': '✈ Fly mode (F)', 'Flugmodus': 'Fly mode',
    'Grafik': 'Graphics', 'Realistisch': 'Realistic', 'Realistisch (gemalte Texturen)': 'Realistic (painted textures)', 'Gemalte Texturen (textures/*.jpg)': 'Painted textures (textures/*.jpg)', 'Natur': 'Nature', 'Einfach': 'Simple', 'Blöcke': 'Blocks',
    'Leistung & Grafik': 'Performance & graphics', 'Schatten': 'Shadows', 'Aus (schnell)': 'Off (fast)', 'An – berechnet im Stillstand': 'On – computed when idle',
    'Natur-Texturen (Holz, Stein, Stroh)': 'Natural textures (wood, stone, thatch)', 'Einfach texturiert (einfärbbar)': 'Simple textures (colourable)', 'Blöcke (am schnellsten)': 'Blocks (fastest)',
    'Wenig': 'Little', 'Mittel': 'Medium', 'Alles': 'All', 'Auflösung': 'Resolution', 'Sichtweite': 'View distance', 'Weit': 'Far',
    'Gezeichnet wird nur, wenn sich etwas bewegt. Schatten werden erst berechnet, wenn die Kamera kurz stillsteht, und sind im Flugmodus immer aus.': 'The scene is only redrawn when something moves. Shadows are computed once the camera rests briefly and are always off in fly mode.',
    'Bauteile': 'Building pieces', 'Dächer': 'Roofs', 'Vegetation': 'Vegetation', 'Wasser': 'Water', 'Namen': 'Names',
    'Spieler online': 'Players online', '🎯 Im Spiel suchen': '🎯 Search in game', '✔ Im Spiel geöffnet': '✔ Opened in game', 'Spiel nicht erreichbar': 'Game not reachable', 'Öffnet die Kisten-Suche im laufenden Spiel und setzt Pins auf der Karte': 'Opens the chest search in the running game and sets map pins', 'Herstellen': 'Crafting', 'Herstellen – nichts davon in den Kisten': 'Crafting – none of it in the chests', 'Zutaten fehlen': 'Ingredients missing', '(herstellbar)': '(craftable)', 'Materialliste': 'Material list', '⛩ Portal-Netz': '⛩ Portal network', '✝ Tode': '✝ Deaths', '👣 Laufwege': '👣 Walking paths', 'Alle Tage': 'All days', 'Heute': 'Today', '7 Tage': '7 days', '30 Tage': '30 days', 'Alle Spieler': 'All players', 'Bestenliste': 'Leaderboard', 'Spieler': 'Player', 'Gebaute Teile': 'Pieces built', 'Tode': 'Deaths', 'Spielzeit': 'Playtime', 'Strecke': 'Distance', 'Letzte Tode': 'Recent deaths', 'Hergestellt': 'Crafted', '🗺 Ganze Welt (Seed)': '🗺 Whole world (seed)', 'Unerkundete Gebiete aus dem Seed berechnet (wie der Weltgenerator des Spiels)': 'Unexplored areas computed from the seed (like the game’s world generator)', '🚶 Laufen (G)': '🚶 Walk (G)', 'Laufen': 'Walking', '3rd Person': '3rd person', 'Ich-Perspektive': 'First person', 'Tür geöffnet': 'Door opened', 'Tür geschlossen': 'Door closed', 'Hier ist keine Tür, Kiste oder Portal.': 'No door, chest or portal here.', 'Kiste öffnen': 'Open chest', 'Tür öffnen': 'Open door', 'Tür schließen': 'Close door', 'Portal (ohne Namen)': 'Portal (no name)', 'Kiste ist leer': 'Chest is empty', 'Portal ohne Namen': 'Portal without a name', 'Ziel liegt außerhalb der geladenen Karte': 'Destination is outside the loaded map', 'Joystick = laufen · ziehen = umsehen · ✋ = Tür/Portal': 'Joystick = walk · drag = look · ✋ = door/portal', 'WASD laufen · Shift rennen · Leertaste springen · Shift+Leertaste hoch springen · E Tür/Kiste/Portal · Mausrad Abstand · Klick = Maus fangen · G/Esc beenden': 'WASD walk · Shift run · Space jump · Shift+Space high jump · E door/chest/portal · wheel = distance · click = capture mouse · G/Esc exit', 'Hergestellte Gegenstände': 'Crafted items', 'Nur Gegenstände, die noch in Kisten, Ständern oder am Boden liegen – was Spieler gerade bei sich tragen, steht nicht in der Welt-Datei.': 'Only items still lying in chests, on stands or on the ground – what players carry is not in the world file.', 'Noch keine Laufwege aufgezeichnet.': 'No walking paths recorded yet.', 'Tode werden über Grabsteine erfasst, die beim Speichern des Servers noch liegen.': 'Deaths are taken from tombstones that are still lying there when the server saves.', 'rot = Grabstein liegt noch': 'red = tombstone still there', '(gefunden)': '(found)', 'Tode werden über Grabsteine erfasst: mit Server-Mod jeder, sonst nur die, die beim Speichern noch liegen. Spielzeit und Strecke kommen mit dem Server-Mod (Laufwege). Kills lassen sich aus den Server-Daten nicht ablesen.': 'Deaths are taken from tombstones: with the server mod every one, otherwise only those still lying there when the server saves. Playtime and distance come with the server mod (walking paths). Kills cannot be read from the server data.', 'Tode werden über Grabsteine erfasst: mit Server-Mod jeder, sonst nur die, die beim Speichern noch liegen. Kills lassen sich aus den Server-Daten nicht ablesen.': 'Deaths are taken from tombstones: with the server mod every one, otherwise only those still lying there when the server saves. Kills cannot be read from the server data.', 'Gebäude exportieren': 'Export buildings', '☝ Auswählen': '☝ Select', 'Zusammenhängendes Gebäude': 'Connected building', 'Einzelnes Teil': 'Single piece', 'Alles im Gebiet': 'Everything in this area', 'Leeren': 'Clear', 'Klick = hinzufügen, Shift+Klick = entfernen.': 'Click = add, Shift+click = remove.', 'Name des Bauplans': 'Blueprint name', '⬇ PlanBuild (.blueprint)': '⬇ PlanBuild (.blueprint)', 'Zeitraffer': 'Time-lapse', 'Beginn der Aufzeichnung': 'Start of recording', 'aktueller Stand': 'current state', 'Abspielen': 'Play',
    'Bauplan einblenden': 'Show a building plan', 'Plan wählen …': 'Choose plan …', 'Datei …': 'File …',
    'Höher': 'Up', 'Tiefer': 'Down', 'Entfernen': 'Remove', 'N': 'N', 'S': 'S', 'W': 'W', 'O': 'E',
    'Keine gültige Bauplan-Datei (.vwplan).': 'Not a valid building plan file (.vwplan).',
    'Kisten durchsuchen': 'Search chests', 'Item suchen, z. B. Eisen, Münzen …': 'Search items, e.g. iron, coins …',
    'Item suchen, z. B. Eisen, Met, Kernholz …': 'Search items, e.g. iron, mead, core wood …',
    'Färbung': 'Colouring', 'Material': 'Material', 'Erbauer': 'Builder', 'Gebaut von': 'Built by', 'Häufigste Bauteile': 'Most common pieces',
    'Ziehen = drehen · Rechtsklick/2 Finger = verschieben · Mausrad = Zoom · Doppelklick = hinzoomen · Kiste anklicken = Inhalt.': 'Drag = rotate · Right-click/2 fingers = pan · Mouse wheel = zoom · Double-click = zoom in · Click a chest = contents.',
    'Gelände ist aus Bäumen/Steinen geschätzt, Bauteile sind vereinfachte Blöcke in echter Lage und Drehung.': 'Terrain is estimated from trees/rocks; building pieces are simplified blocks in their real position and rotation.',
    'Nichts gefunden.': 'Nothing found.', 'Nichts gefunden': 'Nothing found', 'Keine Kiste passt zur Suche.': 'No chest matches the search.',
    'Hinfliegen': 'Fly there', 'Hoch': 'Up', 'Runter': 'Down', 'Schnell': 'Fast',
    'WASD/Pfeile · Maus ziehen = umsehen · Leertaste/E hoch · C/Q runter · Shift schnell · Mausrad Tempo · Gamepad · F/Esc beenden': 'WASD/arrows · drag mouse = look · Space/E up · C/Q down · Shift fast · mouse wheel speed · gamepad · F/Esc exit',
    'Joystick = fliegen · ziehen = umsehen · ▲▼ Höhe · » schnell': 'Joystick = fly · drag = look · ▲▼ height · » fast',
    '🌍 Ganze Welt (alle erkundeten Gebiete)': '🌍 Whole world (all explored areas)', 'Ganze Welt': 'Whole world',
    'Außenposten, Karren, Schiffe': 'Outposts, carts, ships', 'Hauptbasis': 'Main base', 'Boden': 'ground',
    'Alle Orte': 'All locations', 'ohne Schild': 'no sign', 'ohne Erbauer': 'no builder', 'leer': 'empty',
    // Materialien / Kategorien
    'Holz': 'Wood', 'Kernholz/Rundholz': 'Core wood/logs', 'Holzboden': 'Wood floor', 'Holzdach': 'Wood roof', 'Teer-/Dunkelholzdach': 'Tar/darkwood roof',
    'Dunkelholz': 'Darkwood', 'Stein': 'Stone', 'Schwarzer Marmor': 'Black marble', 'Eisen': 'Iron', 'Kristall': 'Crystal',
    'Werkbänke/Stationen': 'Workbenches/stations', 'Portale': 'Portals', 'Feuer': 'Fire', 'Betten': 'Beds', 'Schiffe/Karren': 'Ships/carts', 'Sonstiges': 'Other',
    // Kistenansicht
    'Nur beschriftete': 'Labelled only', 'Summe': 'Total', 'Items': 'Items', 'leere Kisten': 'empty chests', 'Stück': 'items',
    'Klick auf ein Item filtert die Kisten. „★2“ = Ausrüstungsstufe.': 'Click an item to filter the chests. “★2” = item quality level.',
    // Welt & Spieler
    'Seed': 'Seed', 'Bauteile von Spielern': 'Player-built pieces', 'Objekte gelesen': 'objects read', 'Bosse': 'Bosses',
    'Welt-Einstellungen': 'World settings', 'Charaktere (wer hat gebaut)': 'Characters (who built)', 'Spieler auf dem Server': 'Players on the server',
    // Biome
    'Wiesen': 'Meadows', 'Sumpf': 'Swamp', 'Berge': 'Mountains', 'Gebirge': 'Mountains', 'Schwarzwald': 'Black Forest', 'Ebenen': 'Plains',
    'Aschelande': 'Ashlands', 'Tiefer Norden': 'Deep North', 'Nebellande': 'Mistlands', 'Meer': 'Ocean', 'geschätzt': 'estimated', 'exakt': 'exact',
    'Biome (geschätzt):': 'Biomes (estimated):', 'Biome (exakt):': 'Biomes (exact):', 'Biome:': 'Biomes:',
    // Bosse / Orte
    'Der Älteste': 'The Elder', 'Knochenmasse': 'Bonemass', 'Die Königin': 'The Queen', 'Seeschlange': 'Sea Serpent',
    'Moorhexe': 'Bog Witch', 'Haldor (Händler)': 'Haldor (trader)', 'Spawn': 'Spawn',
    'Grabkammer': 'Burial chamber', 'Trollhöhle': 'Troll cave', 'Versunkene Krypta': 'Sunken crypt', 'Frosthöhle': 'Frost cave', 'Befallene Mine': 'Infested mine',
    'Festung (Aschelande)': 'Fortress (Ashlands)', 'Morgen-Höhle': 'Morgen hole', 'Hildir: Rauchige Gruft': 'Hildir: Smouldering tomb', 'Hildir: Heulende Höhle': 'Hildir: Howling cavern',
    'Hildir: Festung': 'Hildir: Sealed tower', 'Fulingdorf': 'Fuling village', 'Draugr-Dorf': 'Draugr village',
    '⛏ Dungeons': '⛏ Dungeons', 'Dungeons': 'Dungeons', 'Dungeons und Dörfer aus dem Spielstand': 'Dungeons and villages from the save', 'hell = schon erkundet': 'bright = already explored',
    'Ganze Welt mit Höhen, Flüssen und Wäldern': 'Whole world with heights, rivers and forests', 'Quelle': 'Source', 'Feindl. Dörfer': 'Hostile villages', 'Nester': 'Nests', 'Spiel verbunden': 'Game connected', 'Spiel nicht erreichbar – läuft Valheim mit dem Mod?': 'Game not reachable – is Valheim running with the mod?', 'Mein Spiel live zeigen (Mod)': 'Show my game live (mod)', '🎮 Mein Spiel live zeigen (Mod)': '🎮 Show my game live (mod)', 'Braucht den Mod „Valheim Welt Live“ auf diesem PC (http://localhost:8686). Deine Position wird live auf der Karte gezeigt und an andere Besucher der Karte geschickt.': 'Needs the mod “Valheim Welt Live” on this PC (http://localhost:8686). Your position is shown live on the map and sent to other visitors of the map.', 'Laufwege': 'Trails', 'Händler': 'Traders', 'Feindliche Siedlungen': 'Hostile settlements', 'Spawner & Nester': 'Spawners & nests', 'Dvergr-Lager': 'Dvergr camps', 'Grauzwerg-Nest': 'Greydwarf nest', 'Drachennest': 'Drake nest', 'Teergrube': 'Tar pit', 'Riesenskelett': 'Giant skeleton', 'Dvergr-Turm': 'Dvergr tower', 'Dvergr-Hafen': 'Dvergr harbour', 'Dvergr-Grabung': 'Dvergr excavation', 'Ganze Welt mit unerkundeten Gebieten (Seed)': 'Whole world incl. unexplored areas (seed)', 'Lade Gelände der ganzen Welt …': 'Loading terrain of the whole world …', '🗺 Ganze Welt (Seed)': '🗺 Whole world (seed)', 'Unerkundete Gebiete aus dem Seed berechnet (wie der Weltgenerator des Spiels)': 'Unexplored areas computed from the seed (like the game\'s world generator)',
    // Behälter
    'Karren': 'Cart', 'Floß': 'Raft', 'Langschiff': 'Longship', 'Holzkiste': 'Wood chest', 'Private Kiste': 'Personal chest', 'Schublade': 'Drawer',
    'Schwarzmetallkiste': 'Blackmetal chest', 'Verstärkte Kiste': 'Reinforced chest', 'Fass': 'Barrel', 'Karve': 'Karve',
    // Bauteile
    'Steinwand 2×1': 'Stone wall 2×1', 'Steinboden 2×2': 'Stone floor 2×2', 'Holzboden 2×2': 'Wood floor 2×2', 'Steinwand 1×1': 'Stone wall 1×1',
    'Holzwand 2×2': 'Wood wall 2×2', 'Holzwand halb': 'Wood wall half', 'Rundholz 4×0,5': 'Core wood log 4×0.5', 'Steinbogen': 'Stone arch',
    'Steinwand 4×2': 'Stone wall 4×2', 'Holzboden 1×1': 'Wood floor 1×1', 'Holzbalken 2 m': 'Wood beam 2 m', 'Holzwand Viertel': 'Wood wall quarter',
    'Holzdach 26°': 'Wood roof 26°', 'Rundholzwand': 'Log wall', 'Kernholzpfosten 4 m': 'Core wood pole 4 m', 'Steinsäule': 'Stone pillar',
    'Teerdach 26°': 'Tar roof 26°', 'Holzdach 45°': 'Wood roof 45°', 'Holzbalken 1 m': 'Wood beam 1 m', 'Holzpfosten 2 m': 'Wood pole 2 m',
    'Holzbalken 45°': 'Wood beam 45°', 'Steintreppe': 'Stone stair', 'Teerdach 45°': 'Tar roof 45°', 'Holzpfosten 1 m': 'Wood pole 1 m', 'Schild': 'Sign',
    'Holztreppe': 'Wood stair', 'Eisenholzpfosten': 'Iron-wood pole', 'Eisenholzbalken': 'Iron-wood beam', 'Portal': 'Portal', 'Bett': 'Bed',
    'Werkbank': 'Workbench', 'Schmiede': 'Forge', 'Holztor': 'Wood gate', 'Holztür': 'Wood door', 'Dunkelholztor': 'Darkwood gate', 'Feuerstelle': 'Campfire',
    'Herd': 'Hearth', 'Leiter': 'Ladder', 'Holzzaun': 'Wood fence', 'Steinzaun': 'Stone fence', 'Kristallwand': 'Crystal wall', 'Eisenwand': 'Iron wall',
    'Marmorblock 2×2×2': 'Marble block 2×2×2', 'Rundholz 45°': 'Core wood log 45°', 'Rundholz 26°': 'Core wood log 26°', 'Giebelwand 45°': 'Gable wall 45°', 'Giebelspitze': 'Gable top',
    'Holzwand 1×1': 'Wood wall 1×1'
  };

  // ---------- Items (Kisteninhalte) ----------
  const ITEMS = {
    'Eisenbolzen': 'Iron bolt', 'Loxpastete': 'Lox meat pie', 'Wisplicht': 'Wisplight', 'Flammmetall': 'Flametal', 'Tetra': 'Tetra', 'Blaue Jute': 'Blue jute',
    'Lederhelm': 'Leather helmet', 'Meeresgewürz': 'Ocean seasoning', 'Barsch': 'Perch', 'Hecht': 'Pike', 'Thunfisch': 'Tuna', 'Trollfisch': 'Trollfish',
    'Riesenhering': 'Giant herring', 'Grouper': 'Grouper', 'Coral Cod': 'Coral cod', 'Pufferfisch': 'Pufferfish', 'Gerstenwein-Basis': 'Barley wine base',
    'Rübeneintopf': 'Turnip stew', 'Ektoplasma': 'Ectoplasm', 'Wolfsfell': 'Wolf pelt', 'Wolfsfleisch': 'Wolf meat', 'Ymirs Überreste': 'Ymir flesh',
    'Glibber': 'Ooze', 'Mariniertes Grün': 'Marinated greens', 'Tannenzapfen': 'Fir cone', 'Salat': 'Salad', 'Metbasis Giftresistenz': 'Mead base: Poison resistance',
    'Hammer': 'Hammer', 'Kohle': 'Coal', 'Feinholz': 'Fine wood', 'Königin-Trophäe': 'Queen trophy', 'Draugr-Elite-Trophäe': 'Draugr elite trophy',
    'Wolfszahnspeer': 'Fang spear', 'Nebelhase Supreme roh': 'Uncooked misthare supreme', 'Panzerhelm': 'Carapace helmet', 'Karottensuppe': 'Carrot soup',
    'Blutbeutel': 'Bloodbag', 'Metbasis Gr. Heiltrank': 'Mead base: Major healing', 'Draugr-Trophäe': 'Draugr trophy', 'Gegarter Hase': 'Cooked hare meat',
    'Schwarzmetall-Atgeir': 'Blackmetal atgeir', 'Metbasis Mittl. Ausdauer': 'Mead base: Medium stamina', 'Gerste': 'Barley', 'Wurzelstab': 'Staff of the wild',
    'Giftskelett-Trophäe': 'Rancid remains trophy', 'Hildir-Skelett-Trophäe': 'Brenna trophy', 'Zinn': 'Tin', 'Obsidianpfeil': 'Obsidian arrow',
    'Fenring-Hemd': 'Fenris coat', 'Geier-Trophäe': 'Volture trophy', 'Knochen-Turmschild': 'Bone tower shield', 'Dvergr-Trophäe': 'Dvergr trophy',
    'Schwarze Suppe': 'Black soup', 'Steingolem-Trophäe': 'Stone golem trophy', 'Eisenerz': 'Iron ore', 'Zerstörer': 'Demolisher',
    'Wildschwein-Trophäe': 'Boar trophy', 'Skelett-Trophäe': 'Skeleton trophy', 'Pikante Pastete': 'Meat platter', 'Sucher-Aspik': 'Seeker aspic',
    'Rote Jute': 'Red jute', 'Gefüllter Pilz roh': 'Uncooked stuffed mushroom', 'Grauzwergschläger-Trophäe': 'Greydwarf brute trophy',
    'Käferfleisch': 'Bug meat', 'Hildirs Schlüssel': 'Hildir’s key', 'Blaubeeren': 'Blueberries', 'Eisennägel': 'Iron nails', 'Bandschild': 'Banded shield',
    'Fleischplatte roh': 'Uncooked meat platter', 'Frostresistenz-Met': 'Frost resistance mead', 'Schwarzmetallschwert': 'Blackmetal sword',
    'Blauer Pilz': 'Blue mushroom', 'Panzerplatte': 'Carapace', 'Dvergr-Nadel': 'Dvergr needle', 'Abyssal-Harpune': 'Abyssal harpoon',
    'Berserkeraxt': 'Berserkir axe', 'Gekochtes Ei': 'Cooked egg', 'Teer': 'Tar', 'Saft': 'Sap', 'Fleischplatte': 'Meat platter', 'Loxfell': 'Lox pelt',
    'Dvergr-Reif': 'Dvergr circlet', 'Hirschhaut': 'Deer hide', 'Hasen-Trophäe': 'Hare trophy', 'Blob-Trophäe': 'Blob trophy', 'Wolfsklaue': 'Wolf claw',
    'Fackel': 'Torch', 'Silberpfeil': 'Silver arrow', 'Mandibel': 'Mandible', 'Metbasis Trollpheromone': 'Mead base: Troll pheromones', 'Keule': 'Club',
    'Bronze-Buckler': 'Bronze buckler', 'Eisenbeinschienen': 'Iron greaves', 'Gegarte Seeschlange': 'Cooked serpent meat', 'Silberschwert': 'Silver sword',
    'Fisch und Brot roh': 'Uncooked fish ’n’ bread', 'Holzschild': 'Wood shield', 'Kristall': 'Crystal', 'Kl. Eitrtrank': 'Minor eitr potion',
    'Eisenspitzhacke': 'Iron pickaxe', 'Eitr-Robe': 'Eitr-weave robe', 'Kl. Heiltrank': 'Minor healing mead', 'Honigglasiertes Huhn': 'Honey glazed chicken',
    'Uralte Rinde': 'Ancient bark', 'Verkohlter Pfeil': 'Charred arrow', 'Monstrosität-Trophäe': 'Abomination trophy', 'Frostzapfenstab': 'Staff of frost',
    'Wurzelharnisch': 'Root harnesk', 'Bronzeschwert': 'Bronze sword', 'Metbasis Frostresistenz': 'Mead base: Frost resistance', 'Yggdrasilholz': 'Yggdrasil wood',
    'Krypta-Schlüssel': 'Swamp key', 'Ei': 'Egg', 'Metbasis Bändiger': 'Mead base: Animal whispers', 'Bronzestreitkolben': 'Bronze mace', 'Kohleharz': 'Grausten resin',
    'Fenring-Hose': 'Fenris leggings', 'Asksvin-Trophäe': 'Asksvin trophy', 'Nebelhase Supreme': 'Misthare supreme', 'Fuling-Brüder-Trophäe': 'Fuling brothers trophy',
    'Jubiläumskrug': 'Anniversary tankard', 'Metbasis Anhaltende Ausdauer': 'Mead base: Lingering stamina', 'Schwarzer Marmor': 'Black marble',
    'Zwiebelsamen': 'Onion seeds', 'Brot': 'Bread', 'Knochenfragmente': 'Bone fragments', 'Verkohlter Bolzen': 'Charred bolt', 'Karotte': 'Carrot',
    'Jul-Mütze': 'Yule hat', 'Farnwedel': 'Fern', 'Wunschknochen': 'Wishbone', 'Flammenrüstung': 'Flametal armor', 'Ebenengewürz': 'Plains seasoning',
    'Metbasis Kl. Eitr': 'Mead base: Minor eitr', 'Surtling-Trophäe': 'Surtling trophy', 'Lachs': 'Salmon', 'Loxfleisch': 'Lox meat', 'Hirsch-Trophäe': 'Deer trophy',
    'Löwenzahn': 'Dandelion', 'Schwefelstein': 'Sulfur stone', 'Feinholzbogen': 'Fine wood bow', 'Augeneis': 'Frozen eye', 'Käse': 'Cheese',
    'Frosttroll-Trophäe': 'Frost troll trophy', 'Eisen': 'Iron', 'Asksvinfleisch': 'Asksvin meat', 'Drakehelm': 'Drake helmet', 'Kleid': 'Dress',
    'Kupfermesser': 'Copper knife', 'Jägerbogen': 'Huntsman bow', 'Schleim': 'Slime', 'Lox-Trophäe': 'Lox trophy', 'Kupfer': 'Copper',
    'Grauzwerg-Trophäe': 'Greydwarf trophy', 'Himbeeren': 'Raspberries', 'Drakling-Trophäe': 'Drake trophy', 'Lederreste': 'Leather scraps',
    'Krummbogen': 'Crude bow', 'Hacke': 'Hoe', 'Trollleder-Kapuze': 'Troll leather helmet', 'Alteisen': 'Scrap iron', 'Nadel': 'Needle',
    'Geschmolzener Kern': 'Molten core', 'Metbasis Stärke': 'Mead base: Strength', 'Troll-Trophäe': 'Troll trophy', 'Kette': 'Chain', 'Münzen': 'Coins',
    'Morgen-Trophäe': 'Morgen trophy', 'Würste': 'Sausages', 'Jotunfluch': 'Jotun bane', 'Zwiebelsuppe': 'Onion soup', 'Honig': 'Honey',
    'Eisen-Turmschild': 'Iron tower shield', 'Hirschhautumhang': 'Deer hide cape', 'Metbasis Anhaltendes Eitr': 'Mead base: Lingering eitr', 'Flachs': 'Flax',
    'Stachelkeule': 'Spiked club', 'Laterne': 'Lantern', 'Schwertfisch': 'Swordfish', 'Knochenmaulfleisch': 'Bonemaw meat', 'Pollen': 'Pollen',
    'Wolf-Trophäe': 'Wolf trophy', 'Schwarzmetallaxt': 'Blackmetal axe', 'Panzerbolzen': 'Carapace bolt', 'Hartes Geweih': 'Hard antler',
    'Loxumhang': 'Lox cape', 'Holz-Turmschild': 'Wood tower shield', 'Gefüllter Pilz': 'Stuffed mushroom', 'Zinnerz': 'Tin ore',
    'Pikante Pastete roh': 'Uncooked meat platter', 'Schwarzmetallschrott': 'Black metal scrap', 'Moder-Trophäe': 'Moder trophy', 'Krustenpastete': 'Fish pie',
    'Kiefernzapfen': 'Pine cone', 'Eisenaxt': 'Iron axe', 'Hasenfleisch': 'Hare meat', 'Bronzehelm': 'Bronze helmet', 'Geist-Trophäe': 'Ghost trophy',
    'Hühnerfleisch': 'Chicken meat', 'Wurzel-Beinschutz': 'Root leggings', 'Schwarzmetallspitzhacke': 'Blackmetal pickaxe', 'Lederhemd': 'Leather tunic',
    'Kupfererz': 'Copper ore', 'Rübensamen': 'Turnip seeds', 'Polsterhelm': 'Padded helmet', 'Krom': 'Krom', 'Metbasis Leckermet': 'Mead base: Tasty',
    'Metbasis Eile': 'Mead base: Tailwind', 'Dvergr-Schlüssel': 'Dvergr key', 'Verdorrter Knochen': 'Withered bone', 'Buchensamen': 'Beech seeds',
    'Kriegsaxt': 'Battleaxe', 'Gjall-Trophäe': 'Gjall trophy', 'Schwarzmetallmesser': 'Blackmetal knife', 'Nadelpfeil': 'Needle arrow', 'Eitr': 'Eitr',
    'Blutegel-Trophäe': 'Leech trophy', 'Metbasis Schwimmer': 'Mead base: Swimmer', 'Loxpastete roh': 'Uncooked lox meat pie', 'Anhaltender Eitrtrank': 'Lingering eitr mead',
    'Metbasis Berserker': 'Mead base: Berserkir', 'Rubin': 'Ruby', 'Grausten': 'Grausten', 'Metbasis Kl. Heiltrank': 'Mead base: Minor healing', 'Angel': 'Fishing rod',
    'Silbererz': 'Silver ore', 'Eisenhelm': 'Iron helmet', 'Köder': 'Fishing bait', 'Federumhang': 'Feather cape', 'Bronzepfeil': 'Bronzehead arrow',
    'Holz': 'Wood', 'Kernholz': 'Core wood', 'Schwarzholz': 'Ashwood', 'Stein': 'Stone', 'Feuerstein': 'Flint', 'Harz': 'Resin', 'Trollhaut': 'Troll hide',
    'Schuppenhaut': 'Scale hide', 'Bärenfell': 'Bear hide', 'Federn': 'Feathers', 'Bronze': 'Bronze', 'Bronzenägel': 'Bronze nails', 'Silber': 'Silver',
    'Schwarzmetall': 'Black metal', 'Obsidian': 'Obsidian', 'Drachenträne': 'Dragon tear', 'Drachenei': 'Dragon egg', 'Chitin': 'Chitin', 'Wurzel': 'Root',
    'Distel': 'Thistle', 'Pilz': 'Mushroom', 'Gelber Pilz': 'Yellow mushroom', 'Jotunbovist': 'Jotun puffs', 'Magierkappe': 'Magecap', 'Moltebeeren': 'Cloudberries',
    'Karottensamen': 'Carrot seeds', 'Rübe': 'Turnip', 'Zwiebel': 'Onion', 'Gerstenmehl': 'Barley flour', 'Leinenfaden': 'Linen thread', 'Bienenkönigin': 'Queen bee',
    'Eichel': 'Acorn', 'Birkensamen': 'Birch seeds', 'Uralter Samen': 'Ancient seed', 'Weiches Gewebe': 'Soft tissue', 'Gelée Royale': 'Royal jelly',
    'Schwarzer Kern': 'Black core', 'Gallenblase': 'Bilebag', 'Surtlingkern': 'Surtling core', 'Grauzwergenauge': 'Greydwarf eye', 'Eingeweide': 'Entrails',
    'Frostdrüse': 'Freeze gland', 'Wolfszahn': 'Wolf fang', 'Bernstein': 'Amber', 'Bernsteinperle': 'Amber pearl', 'Silberkette': 'Silver necklace',
    'Kotzbeeren': 'Vineberry', 'Fulingtotem': 'Fuling totem', 'Neck-Trophäe': 'Neck trophy', 'Grauzwergschamane-Trophäe': 'Greydwarf shaman trophy',
    'Eikthyr-Trophäe': 'Eikthyr trophy', 'Der-Älteste-Trophäe': 'The Elder trophy', 'Knochenmasse-Trophäe': 'Bonemass trophy', 'Yagluth-Trophäe': 'Yagluth trophy',
    'Fenring-Trophäe': 'Fenring trophy', 'Kultist-Trophäe': 'Cultist trophy', 'Ulv-Trophäe': 'Ulv trophy', 'Todesmücke-Trophäe': 'Deathsquito trophy',
    'Fuling-Trophäe': 'Fuling trophy', 'Fuling-Berserker-Trophäe': 'Fuling berserker trophy', 'Fuling-Schamane-Trophäe': 'Fuling shaman trophy',
    'Wucherung-Trophäe': 'Growth trophy', 'Seeschlangen-Trophäe': 'Serpent trophy', 'Sucher-Trophäe': 'Seeker trophy', 'Sucher-Soldat-Trophäe': 'Seeker soldier trophy',
    'Zecke-Trophäe': 'Tick trophy', 'Gespenst-Trophäe': 'Wraith trophy', 'Bär-Trophäe': 'Bear trophy', 'Kvastur-Trophäe': 'Kvastur trophy',
    'Kultist-Hildir-Trophäe': 'Geirrhafa trophy', 'Verkohlter-Trophäe': 'Charred trophy', 'Fader-Trophäe': 'Fader trophy', 'Valkyrie-Trophäe': 'Fallen Valkyrie trophy',
    'Knochenmaul-Trophäe': 'Bonemaw trophy', 'Rohes Fleisch': 'Boar meat', 'Hirschfleisch': 'Deer meat', 'Neck-Schwanz': 'Neck tail', 'Seeschlangenfleisch': 'Serpent meat',
    'Geierfleisch': 'Volture meat', 'Nordlicht-Fisch': 'Northern salmon', 'Magmafisch': 'Magmafish', 'Roher Fisch': 'Raw fish', 'Gegarter Fisch': 'Cooked fish',
    'Gegartes Fleisch': 'Cooked boar meat', 'Gegartes Hirschfleisch': 'Cooked deer meat', 'Gegrillter Neck-Schwanz': 'Grilled neck tail', 'Gegartes Wolfsfleisch': 'Cooked wolf meat',
    'Gegartes Loxfleisch': 'Cooked lox meat', 'Gegartes Huhn': 'Cooked chicken meat', 'Gegartes Käferfleisch': 'Cooked bug meat', 'Gegartes Asksvin': 'Cooked asksvin tail',
    'Gegarter Geier': 'Cooked volture meat', 'Gegartes Knochenmaul': 'Cooked bonemaw meat', 'Königinnenmarmelade': 'Queens jam', 'Schokolade-Smoothie': 'Muckshake',
    'Seeschlangeneintopf': 'Serpent stew', 'Hackfleischsoße': 'Minced meat sauce', 'Wolfs-Jerky': 'Wolf jerky', 'Wolfsspieß': 'Wolf skewer', 'Blutpudding': 'Blood pudding',
    'Brotteig': 'Bread dough', 'Fischwraps': 'Fish wraps', 'Fisch und Brot': 'Fish ’n’ bread', 'Honigglasiertes Huhn roh': 'Uncooked honey glazed chicken',
    'Pilzomelett': 'Mushroom omelette', 'Yggdrasil-Brei': 'Yggdrasil porridge', 'Krustenpastete roh': 'Uncooked fish pie', 'Brutzelnde Beerenbrühe': 'Sizzling berry broth',
    'Pilzshake': 'Mashed meat', 'Scharfes Allerlei': 'Spicy marmalade', 'Fleischbrei': 'Mashed meat', 'Würzige Marmelade': 'Spicy marmalade',
    'Feuriger Svineintopf': 'Fiery svinstew', 'Metbasis Mittl. Heiltrank': 'Mead base: Medium healing', 'Metbasis Kl. Ausdauer': 'Mead base: Minor stamina',
    'Metbasis Leichtfuß': 'Mead base: Light-foot', 'Metbasis Anhaltende Heilung': 'Mead base: Lingering healing', 'Metbasis Insektenschutz': 'Mead base: Insect repellent',
    'Metbasis Feuerresistenz': 'Mead base: Fire resistance', 'Mittl. Heiltrank': 'Medium healing mead', 'Gr. Heiltrank': 'Major healing mead',
    'Anhaltender Heiltrank': 'Lingering healing mead', 'Kl. Ausdauertrank': 'Minor stamina mead', 'Mittl. Ausdauertrank': 'Medium stamina mead',
    'Anhaltender Ausdauertrank': 'Lingering stamina mead', 'Giftresistenz-Met': 'Poison resistance mead', 'Leckermet': 'Tasty mead',
    'Feuerresistenz-Gerstenwein': 'Fire resistance barley wine', 'Berserker-Met': 'Berserkir mead', 'Eile-Met': 'Tailwind mead', 'Leichtfuß-Met': 'Light-foot mead',
    'Stärke-Met': 'Mead of troll endurance', 'Schwimmer-Met': 'Swimmer mead', 'Bändiger-Met': 'Animal whispers mead', 'Trollpheromone': 'Troll pheromones',
    'Insektenschutz-Met': 'Insect repellent mead', 'Holzpfeil': 'Wood arrow', 'Feuerpfeil': 'Fire arrow', 'Feuersteinpfeil': 'Flinthead arrow', 'Eisenpfeil': 'Ironhead arrow',
    'Giftpfeil': 'Poison arrow', 'Frostpfeil': 'Frost arrow', 'Panzerpfeil': 'Carapace arrow', 'Knochenbolzen': 'Bone bolt', 'Schwarzmetallbolzen': 'Blackmetal bolt',
    'Steinaxt': 'Stone axe', 'Feuersteinaxt': 'Flint axe', 'Bronzeaxt': 'Bronze axe', 'Geweihspitzhacke': 'Antler pickaxe', 'Bronzespitzhacke': 'Bronze pickaxe',
    'Kultivator': 'Cultivator', 'Feuersteinmesser': 'Flint knife', 'Abyssal-Klinge': 'Abyssal razor', 'Silberdolch': 'Silver knife', 'Skoll und Hati': 'Skoll and Hati',
    'Feuersteinspeer': 'Flint spear', 'Bronzespeer': 'Bronze spear', 'Uraltrindenspeer': 'Ancient bark spear', 'Panzerspeer': 'Carapace spear', 'Eisenschwert': 'Iron sword',
    'Nebelwandler': 'Mistwalker', 'Dyrnwyn': 'Dyrnwyn', 'Eisenstreitkolben': 'Iron mace', 'Frostner': 'Frostner', 'Eldner-Kolben': 'Porcupine', 'Hirschbrecher': 'Stagbreaker',
    'Eisenvorschlaghammer': 'Iron sledge', 'Bronze-Atgeir': 'Bronze atgeir', 'Eisen-Atgeir': 'Iron atgeir', 'Himmin Afl': 'Himmin Afl', 'Kristall-Kriegsaxt': 'Crystal battleaxe',
    'Draugrfang': 'Draugr fang', 'Rückgratbrecher': 'Spinesnap', 'Armbrust': 'Arbalest', 'Glutstab': 'Staff of embers', 'Schutzstab': 'Staff of protection',
    'Totenstab': 'Dead raiser', 'Stab': 'Staff', 'Blitzstab': 'Staff of storms', 'Eisenschild': 'Iron shield', 'Eisenbuckler': 'Iron buckler', 'Silberschild': 'Silver shield',
    'Seeschlangenschild': 'Serpent scale shield', 'Schwarzmetallschild': 'Blackmetal shield', 'Schwarzmetall-Turmschild': 'Blackmetal tower shield',
    'Panzerschild': 'Carapace shield', 'Panzerbuckler': 'Carapace buckler', 'Ritterschild': 'Knight shield', 'Lumpenhemd': 'Rag tunic', 'Lumpenhose': 'Rag pants',
    'Lederhose': 'Leather pants', 'Trollleder-Hemd': 'Troll leather tunic', 'Trollleder-Hose': 'Troll leather pants', 'Trollhautumhang': 'Troll hide cape',
    'Bronzebrustplatte': 'Bronze plate cuirass', 'Bronzebeinschienen': 'Bronze plate leggings', 'Eisenrüstung': 'Iron scale mail', 'Wolfsrüstung': 'Wolf armor chest',
    'Wolfsbeinschienen': 'Wolf armor legs', 'Wolfsumhang': 'Wolf fur cape', 'Polsterkürass': 'Padded cuirass', 'Polsterbeinschienen': 'Padded greaves',
    'Leinenumhang': 'Linen cape', 'Fenring-Kapuze': 'Fenris hood', 'Wurzelmaske': 'Root mask', 'Panzer-Brustplatte': 'Carapace breastplate',
    'Panzer-Beinschienen': 'Carapace greaves', 'Eitr-Hose': 'Eitr-weave trousers', 'Eitr-Kapuze': 'Eitr-weave hood', 'Megingjord': 'Megingjord',
    'Mittsommerkrone': 'Midsummer crown', 'Odins Hut': 'Hat of Odin', 'Odins Umhang': 'Cape of Odin', 'Asksvinumhang': 'Asksvin cloak', 'Irrlicht': 'Wisp',
    'Blutsack': 'Bloodbag', 'Larve': 'Larva', 'Weinbeerensamen': 'Vineberry seeds', 'Weinbeeren': 'Vineberry cluster', 'Himmelsfeder': 'Ashen feather',
    'Glocke': 'Bell', 'Morgensehne': 'Morgen sinew', 'Morgenherz': 'Morgen heart', 'Flammmetallerz': 'Flametal ore', 'Schlüsselfragment': 'Bell fragment',
    'Krug': 'Tankard', 'Odins Krug': 'Tankard of Odin', 'Waldgewürz': 'Woodland herb mix', 'Berggewürz': 'Mountain herb mix', 'Nebelgewürz': 'Misty herb mix',
    'Aschegewürz': 'Ashen herb mix', 'Donnerstein': 'Thunder stone', 'Tunika': 'Tunic', 'Hildirs Truhe': 'Hildir’s chest', 'Barbierset': 'Barber kit',
    'Feuerwerk': 'Fireworks', 'Eisengrube': 'Iron pit', 'Wolfshaarbündel': 'Wolf hair bundle', 'Köder (Wald)': 'Fishing bait (forest)', 'Seeschlangenschuppe': 'Serpent scale',
    'Edelholz': 'Fine wood', 'Augen': 'Eyes', 'Blutklumpen': 'Blood clot', 'Königliches Gelee': 'Royal jelly', 'Magierhut': 'Mage hat', 'Wolfspelz': 'Wolf pelt',
    'Uralterinde': 'Ancient bark', 'Hirschfelle': 'Deer hides', 'Met': 'Mead', 'Pilze': 'Mushrooms', 'Samen': 'Seeds', 'Beeren': 'Berries', 'Fisch': 'Fish',
    'Fleisch': 'Meat', 'Gemüse': 'Vegetables', 'Nadeln': 'Needles', 'Götze': 'Idol', 'Köpfe': 'Heads', 'Reserve': 'Spare'
  };

  // Bausteine mit Zahlen / Namen
  const nf = (s) => s.replace(/\d{1,3}(?:\.\d{3})+(?!\d)/g, (m) => m.replace(/\./g, ','));
  const RULES = [
    [/^\+([\d.,]+) Teile(?:, −([\d.,]+) abgerissen)?$/, (m) => '+' + nf(m[1]) + ' pieces' + (m[2] ? ', −' + nf(m[2]) + ' removed' : '')],
    [/^([\d.,]+) Teile gewählt$/, (m) => nf(m[1]) + ' pieces selected'],
    [/^([\d.,]+) unbekannte werden ausgelassen$/, (m) => nf(m[1]) + ' unknown ones are left out'],
    [/^Umkreis (\d+) m$/, (m) => 'Radius ' + m[1] + ' m'],
    [/^Portal-Netz: ([\d.,]+) Verbindungen$/, (m) => 'Portal network: ' + m[1] + ' connections'],
    [/^ohne Partner: (.*)$/, (m) => 'no partner: ' + m[1]],
    [/^mehr als 2 gleiche Namen: (.*)$/, (m) => 'more than 2 with the same name: ' + m[1]],
    [/^([\d.,]+) ohne Namen$/, (m) => m[1] + ' without a name'],
    [/^Tode: ([\d.,]+) erfasst$/, (m) => 'Deaths: ' + m[1] + ' recorded'],
    [/^(.*) \(gefunden\)$/, (m) => m[1] + ' (found)'],
    [/^([\d.,]+) da$/, (m) => m[1] + ' in stock'],
    [/^Herstellbar: ([\d.,]+)×$/, (m) => 'Craftable: ' + m[1] + '×'],
    [/^([\d.,]+) Teile ohne bekannte Kosten$/, (m) => m[1] + ' pieces without known cost'],
    [/^Letztes Update: (.*) \((.*)\)$/, (m) => 'Last update: ' + m[1] + ' (' + tr(m[2]) + ')'],
    [/^gerade eben$/, () => 'just now'],
    [/^vor (\d+) Min\.$/, (m) => m[1] + ' min ago'],
    [/^vor (\d+) Std\.$/, (m) => m[1] + ' h ago'],
    [/^vor (\d+) Tagen$/, (m) => m[1] + ' days ago'],
    [/^Laufwege: ([\d.,]+) Tag\(e\), ([\d.,]+) Felder à (\d+) m$/, (m) => 'Walking paths: ' + m[1] + ' day(s), ' + m[2] + ' cells of ' + m[3] + ' m'],
    [/^(\d+) h (\d+) min$/, (m) => m[0]],
    [/^([\d.,]+) Teile$/, (m) => nf(m[1]) + ' pieces'],
    [/^([\d.,]+) Kisten$/, (m) => nf(m[1]) + (m[1] === '1' ? ' chest' : ' chests')],
    [/^([\d.,]+) Stück$/, (m) => nf(m[1]) + ' items'],
    [/^([\d.,]+) Objekte gelesen$/, (m) => nf(m[1]) + ' objects read'],
    [/^\+ ([\d.,]+) weitere$/, (m) => '+ ' + nf(m[1]) + ' more'],
    [/^… ([\d.,]+) weitere – Suche nutzen$/, (m) => '… ' + nf(m[1]) + ' more – use the search'],
    [/^([\d.,]+) Kisten in diesem Gebiet\. Treffer werden gelb markiert, Kiste anklicken zeigt den Inhalt\.$/, (m) => nf(m[1]) + ' chests in this area. Matches are highlighted in yellow; click a chest to see its contents.'],
    [/^Basis „(.*)“ \(([\d.,]+) Teile, Detail\)$/, (m) => 'Base “' + m[1] + '” (' + nf(m[2]) + ' pieces, detailed)'],
    [/^(.*) \(([\d.,]+) Teile, Detail\)$/, (m) => tr(m[1]) + ' (' + nf(m[2]) + ' pieces, detailed)'],
    [/^(.*) \(([\d.,]+) Teile\)$/, (m) => tr(m[1]) + ' (' + nf(m[2]) + ' pieces)'],
    [/^Basis „(.*)“$/, (m) => 'Base “' + m[1] + '”'],
    [/^Basis (\d+)$/, (m) => 'Base ' + m[1]],
    [/^Basis (\d+)\/(\d+)$/, (m) => 'Base ' + m[1] + '/' + m[2]],
    [/^Außenposten \((.*)\)$/, (m) => 'Outpost (' + m[1] + ')'],
    [/^Außenposten bei Portal „(.*)“$/, (m) => 'Outpost near portal “' + m[1] + '”'],
    [/^Lese Chunks (.*)$/, (m) => 'Reading chunks ' + m[1]],
    [/^Unbekannt \((0x[0-9a-f]+)\)(.*)$/, (m) => 'Unknown (' + m[1] + ')' + m[2]],
    [/^Unbekannt$/, () => 'Unknown'],
    [/^Snapshot vom (.*)$/, (m) => 'Snapshot from ' + m[1]],
    [/^Format v(\d+)$/, (m) => 'format v' + m[1]],
    [/^Hinweise: (.*)$/, (m) => 'Notes: ' + m[1].split(' · ').map(tr).join(' · ')],
    [/^Stand ([^·]*)$/, (m) => 'as of ' + m[1]],
    [/^… und ([\d.,]+) weitere$/, (m) => '… and ' + m[1] + ' more'],
    [/^Portal „(.*)“ benutzen$/, (m) => 'Use portal “' + m[1] + '”'],
    [/^Portal „(.*)“ hat kein Gegenstück$/, (m) => 'Portal “' + m[1] + '” has no partner'],
    [/^Portal „(.*)“ → angekommen$/, (m) => 'Portal “' + m[1] + '” → arrived'],
    [/^geprüft (.*)$/, (m) => 'checked ' + m[1]],
    [/^nichts Neues, geprüft (.*)$/, (m) => 'nothing new, checked ' + m[1]],
    [/^aktualisiert (.*)$/, (m) => 'updated ' + m[1]],
    [/^Welt (\d.*)$/, (m) => 'world ' + m[1]],
    [/^Geteilte Welt$/, () => 'Shared world'],
    [/^Ordner beobachtet$/, () => 'watching folder'],
    [/^Live \(Mod\)$/, () => 'Live (mod)'],
    [/^([\d.,]+) Basen$/, (m) => nf(m[1]) + ' bases'],
    [/^([\d.,]+) Bauteile$/, (m) => nf(m[1]) + ' pieces'],
    [/^Verbinde mit dem Mod \((.*)\) …$/, (m) => 'Connecting to the mod (' + m[1] + ') …'],
    [/^Mod nicht erreichbar \((.*)\)(.*)$/, (m) => 'Mod not reachable (' + m[1] + ')' + m[2]],
    [/^Quelle nicht ladbar \((.*)\)(.*)$/, (m) => 'Source could not be loaded (' + m[1] + ')' + m[2]],
    [/^(.*) nicht ladbar$/, (m) => m[1] + ' could not be loaded'],
    [/^Export fehlgeschlagen: (.*)$/, (m) => 'Export failed: ' + m[1]],
    [/^Geöffnet: (.*)$/, (m) => 'Opened: ' + m[1]],
    [/^Fehler beim Laden: (.*)$/, (m) => 'Error while loading: ' + m[1]],
    [/^Fehler: (.*) \(Zeile (\d+)\)$/, (m) => 'Error: ' + m[1] + ' (line ' + m[2] + ')'],
    [/^Dateiende erreicht(.*)$/, (m) => 'Unexpected end of file' + m[1]],
    [/^× „(.*)“$/, (m) => '× “' + m[1] + '”'],
    [/^([\d.,]+) m\/s$/, (m) => m[0]],
    [/^Höhe (-?[\d.,]+) m$/, (m) => 'height ' + m[1] + ' m'],
    [/^(.*) ★(\d)$/, (m) => { const t = trExact(m[1]); return t == null ? null : t + ' ★' + m[2]; }],
    [/^(.*) – Valheim-Welt$/, (m) => m[1] + ' – Valheim world'],
    [/^(.*) · ([\d.]+)$/, (m) => { const t = trExact(m[1]); return t == null ? null : t + ' · ' + nf(m[2]); }]
  ];

  function trExact(s) {
    if (Object.prototype.hasOwnProperty.call(UI, s)) return UI[s];
    if (Object.prototype.hasOwnProperty.call(ITEMS, s)) return ITEMS[s];
    return null;
  }
  // Übersetzt einen ganzen (getrimmten) Text; null = nichts zu tun
  function trCore(s) {
    const e = trExact(s); if (e != null) return e;
    for (const [re, f] of RULES) { const m = re.exec(s); if (m) { const r = f(m); if (r != null) return r; } }
    if (s.includes(' · ')) {
      const parts = s.split(' · '); let any = false;
      const out = parts.map((p) => { const t = trCore(p.trim()); if (t != null) { any = true; return t; } return p; });
      if (any) return out.join(' · ');
    }
    if (/^[\s·]+/.test(s)) { const pre = s.match(/^[\s·]+/)[0], t = trCore(s.slice(pre.length)); if (t != null) return pre + t; }
    if (/^[^\wÄÖÜäöü„]{1,3} /.test(s)) { const i = s.indexOf(' ') + 1, t = trCore(s.slice(i)); if (t != null) return s.slice(0, i) + t; }
    return null;
  }
  function tr(s) {
    if (s == null) return s; s = String(s);
    const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s); if (!m[2]) return s;
    const t = trCore(m[2]); return t == null ? s : m[1] + t + m[3];
  }

  // ---------- Sprache wählen ----------
  const KEY = 'vw-lang';
  function detect() {
    try { const q = new URLSearchParams(location.search).get('lang'); if (q === 'de' || q === 'en') { try { localStorage.setItem(KEY, q); } catch (e) { } return q; } } catch (e) { }
    try { const s = localStorage.getItem(KEY); if (s === 'de' || s === 'en') return s; } catch (e) { }
    const l = (navigator.languages && navigator.languages[0]) || navigator.language || 'en';
    return /^de\b/i.test(l) ? 'de' : 'en';
  }
  let lang = detect();

  // ---------- DOM übersetzen ----------
  const ATTRS = ['title', 'placeholder', 'aria-label'];
  const origText = new WeakMap(), lastText = new WeakMap();
  const origAttr = new WeakMap();
  let busy = false;
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|INPUT)$/;

  function doText(n) {
    const cur = n.data;
    if (lastText.get(n) !== cur) origText.set(n, cur); // von der Seite neu gesetzt
    const o = origText.get(n); const v = lang === 'en' ? tr(o) : o;
    if (v !== cur) n.data = v;
    lastText.set(n, n.data);
  }
  function doAttrs(el) {
    let st = origAttr.get(el);
    for (const a of ATTRS) {
      if (!el.hasAttribute(a)) continue;
      const cur = el.getAttribute(a);
      if (!st) { st = {}; origAttr.set(el, st); }
      if (!st[a] || st[a].last !== cur) st[a] = { o: cur };
      const v = lang === 'en' ? tr(st[a].o) : st[a].o;
      if (v !== cur) el.setAttribute(a, v);
      st[a].last = v;
    }
    if (el.hasAttribute('data-en')) {
      if (el.__vwDe == null) el.__vwDe = el.innerHTML;
      if (el.__vwLang !== lang) { el.__vwLang = lang; el.innerHTML = lang === 'en' ? el.getAttribute('data-en') : el.__vwDe; }
      return true; // Inhalt ist schon fertig übersetzt
    }
    return false;
  }
  function walk(root) {
    if (!root) return;
    if (root.nodeType === 3) { if (!root.parentNode || !SKIP.test(root.parentNode.nodeName)) doText(root); return; }
    if (root.nodeType !== 1) return;
    if (root.nodeName === 'INPUT') { doAttrs(root); return; }
    if (SKIP.test(root.nodeName)) return;
    if (doAttrs(root)) return;
    if (root.closest && root.closest('[data-en]') && !root.hasAttribute('data-en')) return;
    for (let c = root.firstChild; c; c = c.nextSibling) walk(c);
  }
  function run(fn) { busy = true; try { fn(); } finally { busy = false; } }
  let mo = null;
  function observe() {
    if (mo || !g.MutationObserver) return;
    mo = new MutationObserver((list) => {
      if (busy) return;
      run(() => {
        for (const m of list) {
          if (m.type === 'characterData') walk(m.target);
          else if (m.type === 'attributes') { if (m.target.nodeType === 1) doAttrs(m.target); }
          else m.addedNodes.forEach(walk);
        }
        placeToggle();
      });
    });
    mo.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }

  // ---------- Umschalter ----------
  let btn = null;
  function placeToggle() {
    if (!document.body) return;
    if (!btn) {
      btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'vw-lang';
      btn.onclick = () => setLang(lang === 'en' ? 'de' : 'en');
      const st = document.createElement('style');
      st.textContent = '.vw-lang{font:600 12px/1 system-ui,sans-serif;letter-spacing:.04em;padding:6px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(20,26,30,.85);color:#ece6d8;cursor:pointer}.vw-lang.fx{position:fixed;top:12px;right:12px;z-index:50}.vw-lang b{color:#e0a854}';
      document.head.appendChild(st);
    }
    if (btn.__vwLang !== lang) {
      btn.__vwLang = lang;
      btn.innerHTML = lang === 'en' ? '<b>EN</b> · DE' : '<b>DE</b> · EN';
      btn.title = lang === 'en' ? 'Auf Deutsch umschalten' : 'Switch to English';
      btn.setAttribute('aria-label', btn.title);
    }
    const act = document.querySelector('.vw-act');
    const startVisible = (() => { const s = document.getElementById('start'); return s && !s.hidden; })();
    if (act && (!startVisible || !document.getElementById('start'))) { if (btn.parentNode !== act) { btn.classList.remove('fx'); act.insertBefore(btn, act.firstChild); } }
    else if (btn.parentNode !== document.body) { btn.classList.add('fx'); document.body.appendChild(btn); }
  }

  function apply() {
    document.documentElement.lang = lang;
    run(() => { walk(document.body); if (document.title) { if (g.__vwTitle == null) g.__vwTitle = document.title; document.title = lang === 'en' ? tr(g.__vwTitle) : g.__vwTitle; } placeToggle(); });
  }
  const listeners = [];
  function setLang(l) {
    if (l !== 'de' && l !== 'en') return; lang = l;
    try { localStorage.setItem(KEY, l); } catch (e) { }
    apply(); listeners.forEach((f) => { try { f(l); } catch (e) { } });
  }

  g.VW_I18N = {
    get lang() { return lang; },
    t: (s) => (lang === 'en' ? tr(s) : s),
    tr, setLang, onChange: (f) => listeners.push(f),
    locale: () => (lang === 'en' ? 'en-GB' : 'de-DE'),
    // Suche: deutscher Name passt auch, wenn auf Englisch gesucht wird
    names: (s) => (lang === 'en' ? [s, tr(s)] : [s])
  };

  function start() { apply(); observe(); }
  if (typeof document === 'undefined') return;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})(typeof window !== 'undefined' ? window : globalThis);
