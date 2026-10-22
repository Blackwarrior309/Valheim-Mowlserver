// Valheim Welt Live – inoffizieller Begleit-Mod (BepInEx).
// Liest die Welt-Objekte (ZDOs) aus dem Speicher des Spiels/Servers und stellt sie bereit:
//   * lokal als Webseite:   http://localhost:8686/   (3D-Karte, Kisten, Spieler live)
//   * als Datei:            BepInEx/config/ValheimWeltLive/welt.vwdump   (für FTP-Sync auf Servern)
// Format VWD1: siehe docs/FORMAT.md im Repo. Nicht von Iron Gate.
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Reflection;
using System.Text;
using System.Threading;
using BepInEx;
using BepInEx.Configuration;
using UnityEngine;

namespace ValheimWeltLive
{
    [BepInPlugin(Guid, Name, Version)]
    public class Plugin : BaseUnityPlugin
    {
        public const string Guid = "de.valheimweltviewer.live";
        public const string Name = "Valheim Welt Live";
        public const string Version = "0.7.2";
        static bool loggedFile;

        ConfigEntry<bool> cfgHttp, cfgBindAll, cfgWriteFile, cfgStrip, cfgTracks, cfgDeaths, cfgDetails, cfgFastGzip, cfgPerfLog;
        ConfigEntry<int> cfgMaxObjects; ConfigEntry<float> cfgMaxMs;
        ConfigEntry<bool> cfgLive; ConfigEntry<string> cfgLiveHost; ConfigEntry<int> cfgLivePort; ConfigEntry<float> cfgLivePlayerSec, cfgLiveCreatureSec;
        LiveFeed feed; string liveTopic; float nextLivePlayers, nextLiveCreatures, nextLiveStat, nextLivePlaytime, nextLivePerf, nextLiveKills;
        float perfAcc, perfMax; int perfFrames; readonly List<string> perfHist = new List<string>(); ZDOMan hookedMan;
        ConfigEntry<int> cfgPort, cfgWorldSeconds, cfgTrackSeconds, cfgTrackDays;
        ConfigEntry<float> cfgPlayerSeconds;
        ConfigEntry<string> cfgFilePath;

        HttpListener http;
        Thread httpThread;
        volatile byte[] dumpGz;          // letzter Dump, gzip
        volatile string playersJson = "[]";
        volatile string infoJson = "{}";
        long dumpTime;
        byte[] biomeGrid; string biomeWorld; bool biomeBusy;          // Biom-Raster aus dem Weltgenerator (einmal je Welt)
        const int BIO_N = 320; const float BIO_RES = 64f, BIO_X0 = -10240f;
        float nextWorld, nextPlayers;
        volatile bool building;
        string webRoot;

        static readonly int H_CREATOR = StableHash("creator"), H_OWNER = StableHash("owner"), H_ITEMS = StableHash("items"), H_SCALE = StableHash("scale");
        static readonly int[] STRING_KEYS = { StableHash("text"), StableHash("tag"), StableHash("ownerName"), StableHash("author"), StableHash("tagauthor"), -1847800717 };
        static readonly int H_AUTHOR = StableHash("author"), H_TAGAUTHOR = StableHash("tagauthor");

        void Awake()
        {
            cfgHttp = Config.Bind("Web", "Enabled", !Application.isBatchMode, "Start the built-in web page/API.");
            cfgPort = Config.Bind("Web", "Port", 8686, "Port of the web page (http://localhost:PORT/).");
            cfgBindAll = Config.Bind("Web", "BindAll", false, "true = reachable from the network too (server/LAN). On Windows this may need admin rights or a URL reservation.");
            cfgWorldSeconds = Config.Bind("Daten", "WorldIntervalSeconds", Application.isBatchMode ? 300 : 30, "How often the whole world is read again (seconds, min. 10). Servers: 300.");
            cfgPlayerSeconds = Config.Bind("Daten", "PlayerIntervalSeconds", Application.isBatchMode ? 5f : 1f, "How often player positions are updated (seconds).");
            cfgMaxObjects = Config.Bind("Leistung", "MaxObjectsPerFrame", 2048, "World dump: at most this many objects per frame (64–65536). Smaller = smoother, dump takes longer.");
            cfgMaxMs = Config.Bind("Leistung", "MaxMillisecondsPerFrame", 2f, "World dump: time budget per frame in milliseconds. Whichever limit is reached first ends the frame's portion.");
            cfgFastGzip = Config.Bind("Leistung", "FastCompression", true, "true = gzip 'Fastest' (less CPU, slightly bigger file), false = 'Optimal'.");
            cfgPerfLog = Config.Bind("Leistung", "LogPerformance", true, "Log one line per world dump: objects, scan time, max ms per frame, compression time, sizes, extra memory, skipped dumps.");
            cfgWriteFile = Config.Bind("Datei", "WriteDumpFile", Application.isBatchMode, "Also write the world dump to a file (for FTP sync, e.g. Nitrado). Set to true on servers.");
            cfgFilePath = Config.Bind("Datei", "DumpPath", "", "Empty = BepInEx/config/ValheimWeltLive/welt.vwdump");
            cfgStrip = Config.Bind("Datenschutz", "StripSteamIds", true, "Do not output Steam IDs (authors of signs/portals).");
            cfgTracks = Config.Bind("Spuren", "RecordPositions", false, "Server: record player positions for the walking heatmap (spuren-YYYYMMDD.csv next to the dump file). Only with the consent of your players.");
            cfgTrackSeconds = Config.Bind("Spuren", "PositionIntervalSeconds", 10, "Seconds between recorded positions.");
            cfgTrackDays = Config.Bind("Spuren", "KeepDays", 3, "Days of position files kept on the server (the live map copies them to GitHub).");
            cfgDeaths = Config.Bind("Spuren", "RecordDeaths", true, "Server: record every new tombstone (tode.csv next to the dump file) – also deaths whose tombstone is looted before the next save.");
            cfgDetails = Config.Bind("Spieler", "ShareDetails", true, "Include local player health, stamina, eitr, equipment and recorded world statistics in /api/players. Shared with map visitors when live game sharing is enabled.");
            cfgLive = Config.Bind("Live", "Enabled", Application.isBatchMode, "Server: send player positions, health/stamina and creatures (with pet names) every few seconds to the live map's public MQTT channel (outgoing connection only). Everyone on the map can see it.");
            cfgLiveHost = Config.Bind("Live", "Broker", "broker.emqx.io", "MQTT broker (the live map uses the same one).");
            cfgLivePort = Config.Bind("Live", "Port", 1883, "MQTT port (plain TCP).");
            cfgLivePlayerSec = Config.Bind("Live", "PlayerSeconds", 1f, "Seconds between player updates.");
            cfgLiveCreatureSec = Config.Bind("Live", "CreatureSeconds", 5f, "Seconds between creature updates.");
            LoadPlayerStats();
            webRoot = Path.Combine(Path.GetDirectoryName(Info.Location) ?? ".", "web");
            // Kisten-Suche im Spiel (nur auf Spieler-Rechnern, nicht auf dedizierten Servern)
            if (!Application.isBatchMode)
            {
                var ws = gameObject.AddComponent<WeltSuche>(); WeltSuche.Instance = ws; ws.Log = Logger;
                ws.cfgKey = Config.Bind("Suche", "Hotkey", new KeyboardShortcut(KeyCode.F7), "Opens/closes the chest search window in game.");
                ws.cfgUrl = Config.Bind("Suche", "LiveMapUrl", "", "Optional: your live map's world file, e.g. https://NAME.github.io/REPO/live/welt.vwelt – then far away chests are found too (as map pins).");
                ws.cfgPins = Config.Bind("Suche", "MaxPins", 30, "Maximum map pins per search.");
                try { SuchePatches.Apply(new HarmonyLib.Harmony(Guid), Logger); } catch (Exception e) { Logger.LogWarning("Suche: " + e.Message); }
            }
            if (cfgHttp.Value) StartHttp();
            if (cfgLive.Value) { feed = new LiveFeed(cfgLiveHost.Value, cfgLivePort.Value, "vwl_srv_" + System.Guid.NewGuid().ToString("N").Substring(0, 12), Logger); feed.Start(); }
            Logger.LogInfo($"{Name} {Version} loaded. Web: {(cfgHttp.Value ? "http://localhost:" + cfgPort.Value + "/" : "off")}, dump file: {(cfgWriteFile.Value ? "on" : "off")}");
        }

        void OnDestroy()
        {
            feed?.Stop(); if (playTotal != null) SavePlaytime(); SaveKills();
            SavePlayerStats();
            try { http?.Stop(); http?.Close(); } catch { }
        }

        void Update()
        {
            if (statsNetwork != ZNet.instance) { statsSession = null; statsNetwork = ZNet.instance; }
            if (ZNet.instance == null || ZDOMan.instance == null) { statsSession = null; return; }
            float t = Time.realtimeSinceStartup;
            if (feed != null && ZNet.instance.IsServer())
            {
                float fdt = Time.unscaledDeltaTime; perfAcc += fdt; perfFrames++; if (fdt > perfMax) perfMax = fdt;
                if (hookedMan != ZDOMan.instance) { hookedMan = ZDOMan.instance; try { ZDOMan.instance.m_onZDODestroyed += OnZdoDestroyed; } catch (Exception e) { Logger.LogWarning("Kills: " + e.Message); } }
                LiveTick(t);
            }
            if (t >= nextPlayers) { nextPlayers = t + Mathf.Max(0.25f, cfgPlayerSeconds.Value); try { playersJson = CollectPlayers(); } catch (Exception e) { Logger.LogDebug(e); } if (cfgHttp.Value) { try { creaturesJson = CollectCreatures(); } catch (Exception e) { Logger.LogDebug(e); } } /* Gegner/Dungeon nur für die eigene Webseite – auf dem Server (Web aus) gespart */ if (cfgHttp.Value && t >= nextDungeon) { nextDungeon = t + 1.5f; try { dungeonJson = CollectDungeon(); } catch (Exception e) { Logger.LogDebug(e); } } }
            if (!biomeBusy && WorldGenerator.instance != null && ZNet.instance != null && (biomeGrid == null || biomeWorld != ZNet.instance.GetWorldName())) StartCoroutine(BuildBiomes());
            if (t >= nextWorld) { nextWorld = t + Mathf.Max(10, cfgWorldSeconds.Value); if (!building) StartCoroutine(BuildDump()); else { skippedDumps++; Logger.LogWarning("World dump skipped – previous one still running (" + skippedDumps + " so far)."); } }
            if (cfgWriteFile.Value && ZNet.instance.IsServer())
            {
                if (cfgTracks.Value && t >= nextTrack) { nextTrack = t + Mathf.Max(2, cfgTrackSeconds.Value); try { SampleTracks(); } catch (Exception e) { Logger.LogDebug(e); } }
                if (cfgDeaths.Value && !tombBusy && t >= nextTomb) { nextTomb = t + 15f; StartCoroutine(ScanTombs()); }
            }
        }

        // ---------------- Spuren & Tode (nur Server, Dateien neben dem Dump) ----------------
        float nextTrack, nextTomb, lastFlush; bool tombBusy;
        readonly StringBuilder trackBuf = new StringBuilder();
        readonly HashSet<ZDOID> seenTombs = new HashSet<ZDOID>();
        string DataDir() { string p = string.IsNullOrEmpty(cfgFilePath.Value) ? Path.Combine(Paths.ConfigPath, "ValheimWeltLive", "welt.vwdump") : cfgFilePath.Value; return Path.GetDirectoryName(p); }
        static long Unix() { return (long)(DateTime.UtcNow - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalSeconds; }
        void SampleTracks()
        {
            long now = Unix();
            foreach (var peer in ZNet.instance.GetPeers())
            {
                if (peer == null || string.IsNullOrEmpty(peer.m_playerName) || peer.m_refPos == Vector3.zero) continue;
                trackBuf.Append(now).Append(';').Append(peer.m_playerName.Replace(";", ",")).Append(';').Append(Mathf.RoundToInt(peer.m_refPos.x)).Append(';').Append(Mathf.RoundToInt(peer.m_refPos.z)).Append('\n');
            }
            if (Time.realtimeSinceStartup - lastFlush < 60f || trackBuf.Length == 0) return;
            lastFlush = Time.realtimeSinceStartup;
            string dir = DataDir(); Directory.CreateDirectory(dir);
            File.AppendAllText(Path.Combine(dir, "spuren-" + DateTime.UtcNow.ToString("yyyyMMdd") + ".csv"), trackBuf.ToString()); trackBuf.Length = 0;
            // alte Tage löschen, damit der Server nicht vollläuft
            foreach (var f in Directory.GetFiles(dir, "spuren-*.csv"))
            {
                DateTime d; if (DateTime.TryParseExact(Path.GetFileNameWithoutExtension(f).Substring(7), "yyyyMMdd", null, System.Globalization.DateTimeStyles.AssumeUniversal, out d) && (DateTime.UtcNow - d).TotalDays > Math.Max(1, cfgTrackDays.Value)) try { File.Delete(f); } catch { }
            }
        }
        IEnumerator ScanTombs()
        {
            tombBusy = true; var list = new List<ZDO>(); int idx = 0; bool done = false; int guard = 0;
            while (!done && guard++ < 2000) { try { done = ZDOMan.instance.GetAllZDOsWithPrefabIterative("Player_tombstone", list, ref idx); } catch (Exception e) { Logger.LogDebug(e); break; } if (!done) yield return null; if (ZNet.instance == null) { tombBusy = false; yield break; } }
            try
            {
                var sb = new StringBuilder(); long now = Unix(); long ticks = ZNet.instance.GetTime().Ticks;
                foreach (var z in list)
                {
                    if (z == null || !seenTombs.Add(z.m_uid)) continue;
                    long tod = z.GetLong("timeOfDeath", 0L); long when = tod > 0 ? now - Math.Max(0L, (ticks - tod) / 10000000L) : now;
                    Vector3 p = z.GetPosition();
                    sb.Append(when).Append(';').Append(z.GetString("ownerName", "").Replace(";", ",")).Append(';').Append(Mathf.RoundToInt(p.x)).Append(';').Append(Mathf.RoundToInt(p.y)).Append(';').Append(Mathf.RoundToInt(p.z)).Append('\n');
                }
                if (sb.Length > 0)
                {
                    string dir = DataDir(); Directory.CreateDirectory(dir); string f = Path.Combine(dir, "tode.csv");
                    File.AppendAllText(f, sb.ToString());
                    var lines = File.ReadAllLines(f); if (lines.Length > 2000) File.WriteAllLines(f, lines.Skip(lines.Length - 1500).ToArray());
                }
            }
            catch (Exception e) { Logger.LogDebug(e); }
            tombBusy = false;
        }

        // ---------------- Biome ----------------
        static byte BiomeIndex(Heightmap.Biome b)
        {
            switch (b)
            {
                case Heightmap.Biome.Meadows: return 1; case Heightmap.Biome.Swamp: return 2; case Heightmap.Biome.Mountain: return 3;
                case Heightmap.Biome.BlackForest: return 4; case Heightmap.Biome.Plains: return 5; case Heightmap.Biome.AshLands: return 6;
                case Heightmap.Biome.DeepNorth: return 7; case Heightmap.Biome.Ocean: return 8; case Heightmap.Biome.Mistlands: return 9;
                default: return 0;
            }
        }
        IEnumerator BuildBiomes()
        {
            biomeBusy = true; string w = ZNet.instance.GetWorldName(); var g = new byte[BIO_N * BIO_N]; var sw = System.Diagnostics.Stopwatch.StartNew();
            for (int j = 0; j < BIO_N; j++)
            {
                for (int i = 0; i < BIO_N; i++)
                {
                    float x = BIO_X0 + (i + 0.5f) * BIO_RES, z = BIO_X0 + (j + 0.5f) * BIO_RES;
                    try { g[j * BIO_N + i] = (x * x + z * z > 10500f * 10500f) ? (byte)8 : BiomeIndex(WorldGenerator.instance.GetBiome(new Vector3(x, 0f, z))); } catch { }
                }
                if (sw.Elapsed.TotalMilliseconds >= Math.Max(0.25, cfgMaxMs.Value)) { yield return null; sw.Reset(); sw.Start(); }   // Zeitbudget je Frame wie beim Welt-Abzug
                if (WorldGenerator.instance == null) { biomeBusy = false; yield break; }
            }
            biomeGrid = g; biomeWorld = w; biomeBusy = false;
            Logger.LogInfo("Biome grid computed (" + BIO_N + "×" + BIO_N + ").");
        }

        // ---------------- aufgedeckte Karte ----------------
        static readonly FieldInfo F_EXPLORED = typeof(Minimap).GetField("m_explored", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);
        static readonly FieldInfo F_EXPLORED_OTHERS = typeof(Minimap).GetField("m_exploredOthers", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);
        byte[] CollectExplored(out int size, out float pixel)
        {
            size = 0; pixel = 0f;
            var mm = Minimap.instance; if (mm == null || F_EXPLORED == null) return null;     // dedizierter Server hat keine Karte
            var a = F_EXPLORED.GetValue(mm) as BitArray; if (a == null) return null;
            size = mm.m_textureSize; pixel = mm.m_pixelSize;
            var bytes = new byte[(a.Length + 7) / 8]; a.CopyTo(bytes, 0);
            var b = F_EXPLORED_OTHERS != null ? F_EXPLORED_OTHERS.GetValue(mm) as BitArray : null;   // vom Kartentisch geteilt
            if (b != null && b.Length == a.Length) { var o = new byte[bytes.Length]; b.CopyTo(o, 0); for (int i = 0; i < bytes.Length; i++) bytes[i] |= o[i]; }
            return bytes;
        }

        // ---------------- Spieler ----------------
        string CollectPlayers()
        {
            var sb = new StringBuilder("["); bool first = true; var seen = new HashSet<string>();
            Action<string, Vector3, Player> Add = (n, p, character) =>
            {
                if (string.IsNullOrEmpty(n) || !seen.Add(n)) return;
                if (!first) sb.Append(','); first = false;
                sb.Append("{\"name\":").Append(Json(n)).Append(",\"x\":").Append(F(p.x)).Append(",\"y\":").Append(F(p.y)).Append(",\"z\":").Append(F(p.z));
                if (character == Player.m_localPlayer && character != null && cfgDetails.Value) AppendDetails(sb, character);
                else if (character != null && cfgDetails.Value) AppendRemoteDetails(sb, character);
                sb.Append('}');
            };
            if (Player.m_localPlayer != null) Add(Player.m_localPlayer.GetPlayerName(), Player.m_localPlayer.transform.position, Player.m_localPlayer);
            foreach (var pl in Player.GetAllPlayers()) if (pl != null) Add(pl.GetPlayerName(), pl.transform.position, pl);
            if (ZNet.instance.IsServer()) foreach (var peer in ZNet.instance.GetPeers()) if (peer != null && peer.m_refPos != Vector3.zero) Add(peer.m_playerName, peer.m_refPos, null);
            // Mitspieler, die ihre Position teilen (auch weit weg, im Multiplayer)
            try { foreach (var pi in ZNet.instance.GetPlayerList()) if (pi.m_publicPosition && pi.m_position != Vector3.zero) Add(pi.m_name, pi.m_position, null); } catch { }
            return sb.Append(']').ToString();
        }

        // Local, world-specific observation statistics. Never infer remote stamina/equipment.
        [Serializable] public class PlayerStats { public string world, name; public double playedSeconds, distance; public int deaths, visits; public long since; }
        [Serializable] public class PlayerStatsFile { public List<PlayerStats> players = new List<PlayerStats>(); }
        PlayerStatsFile playerStats = new PlayerStatsFile();
        ZNet statsNetwork; PlayerStats statsSession; Player statsCharacter; float statsTime, statsSaved; Vector3 statsPosition; bool statsDead;
        string StatsPath => Path.Combine(Paths.ConfigPath, "ValheimWeltLive", "player-stats.json");
        void LoadPlayerStats() { try { if (File.Exists(StatsPath)) playerStats = JsonUtility.FromJson<PlayerStatsFile>(File.ReadAllText(StatsPath)) ?? new PlayerStatsFile(); if (playerStats.players == null) playerStats.players = new List<PlayerStats>(); } catch (Exception e) { Logger.LogWarning("Player statistics: " + e.Message); } }
        void SavePlayerStats() { try { Directory.CreateDirectory(Path.GetDirectoryName(StatsPath)); string tmp = StatsPath + ".tmp"; File.WriteAllText(tmp, JsonUtility.ToJson(playerStats)); if (File.Exists(StatsPath)) File.Replace(tmp, StatsPath, null); else File.Move(tmp, StatsPath); } catch (Exception e) { Logger.LogWarning("Player statistics: " + e.Message); } }
        PlayerStats SamplePlayer(Player p) {
            string world = ZNet.instance.GetWorldName(), name = p.GetPlayerName();
            try { var w = typeof(ZNet).GetField("m_world", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Static | BindingFlags.Instance)?.GetValue(ZNet.instance) as World; if (w != null) world += "|" + w.m_seedName; } catch { }
            float now = Time.realtimeSinceStartup; bool dead = p.IsDead();
            if (statsSession == null || statsSession.world != world || statsSession.name != name) {
                statsSession = playerStats.players.Find(x => x.world == world && x.name == name);
                if (statsSession == null) { statsSession = new PlayerStats { world = world, name = name, since = Unix() }; playerStats.players.Add(statsSession); }
                statsSession.visits++; statsTime = now; statsPosition = p.transform.position; statsCharacter = p; statsDead = dead; SavePlayerStats();
            } else {
                float dt = now - statsTime; Vector3 delta = p.transform.position - statsPosition;
                if (dt > 0 && dt <= 10) {
                    statsSession.playedSeconds += dt;
                    // Only grounded foot travel. Exclude portals, respawn and large jumps.
                    if (p == statsCharacter && !dead && !statsDead && p.IsOnGround() && !p.IsSwimming() && p.GetStandingOnShip() == null && !p.IsTeleporting() && delta.magnitude <= 15f * dt) statsSession.distance += new Vector2(delta.x, delta.z).magnitude;
                    if (dead && !statsDead) statsSession.deaths++;
                }
                statsTime = now; statsPosition = p.transform.position; statsCharacter = p; statsDead = dead;
            }
            if (now - statsSaved > 30) { statsSaved = now; SavePlayerStats(); }
            return statsSession;
        }
        static string EquippedName(ItemDrop.ItemData item) { if (item == null) return ""; return WeltSuche.L(item.m_shared.m_name); }
        static ItemDrop.ItemData Hand(Player p, string field) { for (Type t = p.GetType(); t != null; t = t.BaseType) { var f = t.GetField(field, BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.DeclaredOnly); if (f != null) return f.GetValue(p) as ItemDrop.ItemData; } return null; }
        void AppendDetails(StringBuilder sb, Player p) {
            try {
                var stats = SamplePlayer(p); var d = new StringBuilder(",\"details\":{");
                d.Append("\"health\":").Append(F(p.GetHealth())).Append(",\"maxHealth\":").Append(F(p.GetMaxHealth()));
                d.Append(",\"stamina\":").Append(F(p.GetStamina())).Append(",\"maxStamina\":").Append(F(p.GetMaxStamina()));
                d.Append(",\"eitr\":").Append(F(p.GetEitr())).Append(",\"maxEitr\":").Append(F(p.GetMaxEitr()));
                if (p.InBed()) d.Append(",\"inBed\":true"); if (p.IsDead()) d.Append(",\"dead\":true");
                d.Append(",\"playedSeconds\":").Append(F((float)stats.playedSeconds)).Append(",\"distance\":").Append(F((float)stats.distance));
                d.Append(",\"deaths\":").Append(stats.deaths).Append(",\"visits\":").Append(stats.visits).Append(",\"since\":").Append(stats.since);
                d.Append(",\"left\":").Append(Json(EquippedName(Hand(p, "m_leftItem")))).Append(",\"right\":").Append(Json(EquippedName(Hand(p, "m_rightItem"))));
                d.Append(",\"equipment\":["); bool first = true;
                foreach (var item in p.GetInventory().GetAllItems()) if (item.m_equipped) { if (!first) d.Append(','); first = false; d.Append("{\"slot\":").Append(Json(item.m_shared.m_itemType.ToString())).Append(",\"name\":").Append(Json(EquippedName(item))).Append('}'); }
                sb.Append(d.Append("]}"));
            } catch (Exception e) { Logger.LogDebug("Player details: " + e.Message); }
        }

        // Mitspieler in der Nähe: nur Werte, die das Spiel selbst übers Netz schickt (ZDO der Figur)
        static readonly KeyValuePair<string, int>[] VIS = {
            new KeyValuePair<string, int>("Rechts", ZDOVars.s_rightItem), new KeyValuePair<string, int>("Links", ZDOVars.s_leftItem),
            new KeyValuePair<string, int>("Helm", ZDOVars.s_helmetItem), new KeyValuePair<string, int>("Brust", ZDOVars.s_chestItem),
            new KeyValuePair<string, int>("Beine", ZDOVars.s_legItem), new KeyValuePair<string, int>("Umhang", ZDOVars.s_shoulderItem),
            new KeyValuePair<string, int>("Gürtel", ZDOVars.s_utilityItem), new KeyValuePair<string, int>("Trinket", ZDOVars.s_trinketItem),
            new KeyValuePair<string, int>("Rücken rechts", ZDOVars.s_rightBackItem), new KeyValuePair<string, int>("Rücken links", ZDOVars.s_leftBackItem) };
        static readonly Dictionary<int, int> VISQ = new Dictionary<int, int> { { ZDOVars.s_rightItem, ZDOVars.s_rightItemQuality }, { ZDOVars.s_leftItem, ZDOVars.s_leftItemQuality }, { ZDOVars.s_shoulderItem, ZDOVars.s_shoulderItemQuality }, { ZDOVars.s_rightBackItem, ZDOVars.s_rightBackItemQuality }, { ZDOVars.s_leftBackItem, ZDOVars.s_leftBackItemQuality } };
        static string ItemNameOf(int hash)
        {
            try { var go = ObjectDB.instance != null ? ObjectDB.instance.GetItemPrefab(hash) : null; var id = go != null ? go.GetComponent(typeof(ItemDrop)) as ItemDrop : null; if (id != null) return WeltSuche.L(id.m_itemData.m_shared.m_name); return go != null ? go.name : ""; } catch { return ""; }
        }
        void AppendRemoteDetails(StringBuilder sb, Player p)
        {
            var zdo = ZDOMan.instance != null ? ZDOMan.instance.GetZDO(p.GetZDOID()) : null; if (zdo == null) return;
            AppendZdoDetails(sb, zdo, p.GetHealth(), p.GetMaxHealth(), true);
        }
        // Werte einer Spielfigur aus ihrem ZDO (das schickt das Spiel selbst übers Netz) – auf dem Server für alle Online-Spieler verfügbar
        void AppendZdoDetails(StringBuilder sb, ZDO zdo, float hp, float mhp, bool remote)
        {
            try {
                var d = new StringBuilder(",\"details\":{" + (remote ? "\"remote\":true," : ""));
                d.Append("\"health\":").Append(F(hp)).Append(",\"maxHealth\":").Append(F(mhp));
                d.Append(",\"stamina\":").Append(F(zdo.GetFloat(ZDOVars.s_stamina, 0f))).Append(",\"eitr\":").Append(F(zdo.GetFloat(ZDOVars.s_eitr, 0f)));
                if (zdo.GetBool(ZDOVars.s_dead, false)) d.Append(",\"dead\":true");
                if (zdo.GetBool(ZDOVars.s_inBed, false)) d.Append(",\"inBed\":true");
                string left = "", right = "";
                d.Append(",\"equipment\":["); bool first = true;
                foreach (var kv in VIS)
                {
                    int h = zdo.GetInt(kv.Value, 0); if (h == 0) continue; string n = ItemNameOf(h); if (string.IsNullOrEmpty(n)) continue;
                    int q; if (VISQ.TryGetValue(kv.Value, out q)) { int ql = zdo.GetInt(q, 0); if (ql > 1) n += " ★" + ql; }
                    if (kv.Value == ZDOVars.s_rightItem) right = n; else if (kv.Value == ZDOVars.s_leftItem) left = n;
                    if (!first) d.Append(','); first = false; d.Append("{\"slot\":").Append(Json(kv.Key)).Append(",\"name\":").Append(Json(n)).Append('}');
                }
                d.Append("],\"left\":").Append(Json(left)).Append(",\"right\":").Append(Json(right));
                sb.Append(d.Append('}'));
            } catch (Exception e) { Logger.LogDebug("Remote details: " + e.Message); }
        }

        // Dungeon-Ansicht: Räume, Truhen, Aufsammelbares und Abbaubares im Dungeon, in dem die eigene Figur gerade ist (liegt ~5000 m über der Welt)
        volatile string dungeonJson = "{\"inside\":false}"; float nextDungeon;
        string CollectDungeon()
        {
            var me = Player.m_localPlayer; if (me == null || me.transform.position.y < 3000f) return "{\"inside\":false}";
            Vector3 c = me.transform.position; const float R = 260f;
            Func<Vector3, bool> near = (v) => v.y > 3000f && Mathf.Abs(v.x - c.x) < R && Mathf.Abs(v.z - c.z) < R;
            var sb = new StringBuilder("{\"inside\":true,\"x\":").Append(F(c.x)).Append(",\"y\":").Append(F(c.y)).Append(",\"z\":").Append(F(c.z)).Append(",\"r\":").Append(F(me.transform.eulerAngles.y));
            sb.Append(",\"rooms\":["); bool first = true;
            foreach (UnityEngine.Object o in UnityEngine.Object.FindObjectsOfType(typeof(Room)))
            {
                var rm = o as Room; if (rm == null) continue; var t = rm.transform; if (!near(t.position)) continue;
                string nm = rm.gameObject.name; int k = nm.IndexOf('('); if (k > 0) nm = nm.Substring(0, k).Trim();
                if (!first) sb.Append(','); first = false;
                sb.Append('[').Append(F(t.position.x)).Append(',').Append(F(t.position.y)).Append(',').Append(F(t.position.z)).Append(',').Append(F(t.eulerAngles.y)).Append(',')
                  .Append(rm.m_size.x).Append(',').Append(rm.m_size.y).Append(',').Append(rm.m_size.z).Append(',').Append(Json(nm)).Append(',').Append(rm.m_entrance ? 1 : 0).Append(']');
            }
            sb.Append("],\"chests\":["); first = true;
            foreach (UnityEngine.Object o in UnityEngine.Object.FindObjectsOfType(typeof(Container)))
            {
                var ct = o as Container; if (ct == null || !near(ct.transform.position)) continue; var inv = ct.GetInventory(); var p = ct.transform.position;
                if (!first) sb.Append(','); first = false;
                sb.Append('[').Append(F(p.x)).Append(',').Append(F(p.y)).Append(',').Append(F(p.z)).Append(',').Append(Json(WeltSuche.L(ct.m_name))).Append(",[");
                bool f2 = true; if (inv != null) foreach (var it in inv.GetAllItems()) { if (!f2) sb.Append(','); f2 = false; sb.Append('[').Append(Json(WeltSuche.L(it.m_shared.m_name))).Append(',').Append(it.m_stack).Append(']'); }
                sb.Append("]]");
            }
            sb.Append("],\"picks\":["); first = true;
            foreach (UnityEngine.Object o in UnityEngine.Object.FindObjectsOfType(typeof(Pickable)))
            {
                var pk = o as Pickable; if (pk == null || !near(pk.transform.position)) continue; bool picked = false; try { picked = pk.GetPicked(); } catch { }
                if (picked) continue; string nm = ""; try { var idp = pk.m_itemPrefab != null ? pk.m_itemPrefab.GetComponent(typeof(ItemDrop)) as ItemDrop : null; nm = idp != null ? WeltSuche.L(idp.m_itemData.m_shared.m_name) : pk.gameObject.name; } catch { }
                var p = pk.transform.position; if (!first) sb.Append(','); first = false;
                sb.Append('[').Append(F(p.x)).Append(',').Append(F(p.y)).Append(',').Append(F(p.z)).Append(',').Append(Json(nm)).Append(']');
            }
            sb.Append("],\"rocks\":["); first = true;
            foreach (UnityEngine.Object o in UnityEngine.Object.FindObjectsOfType(typeof(MineRock5)))
            {
                var mr = o as MineRock5; if (mr == null || !near(mr.transform.position)) continue; var p = mr.transform.position;
                if (!first) sb.Append(','); first = false;
                sb.Append('[').Append(F(p.x)).Append(',').Append(F(p.y)).Append(',').Append(F(p.z)).Append(',').Append(Json(WeltSuche.L(mr.m_name))).Append(']');
            }
            return sb.Append("]}").ToString();
        }

        // Gegner und Tiere im geladenen Gebiet (auch in Dungeons)
        volatile string creaturesJson = "[]";
        // ---------------- Live-Kanal (Server) ----------------
        static string Topicify(string s) { var sb = new StringBuilder(); foreach (char ch in s ?? "") sb.Append(char.IsLetterOrDigit(ch) && ch < 128 ? ch : '_'); return sb.Length > 0 ? sb.ToString() : "welt"; }
        string WorldSeed()
        {
            try { var w = typeof(ZNet).GetField("m_world", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Static | BindingFlags.Instance)?.GetValue(ZNet.instance) as World; if (w != null && !string.IsNullOrEmpty(w.m_seedName)) return w.m_seedName; } catch { }
            return ZNet.instance.GetWorldName();
        }
        void LiveTick(float t)
        {
            if (liveTopic == null) liveTopic = "vwelt-srv/" + Topicify(WorldSeed());
            long now = Unix() * 1000;
            if (t >= nextLivePlayers)
            {
                string pl = "[]"; try { pl = CollectServerPlayers(); } catch (Exception e) { Logger.LogDebug(e); }
                nextLivePlayers = t + Mathf.Max(0.5f, pl == "[]" ? 5f : cfgLivePlayerSec.Value);
                feed.Publish(liveTopic + "/players", "{\"t\":" + now + ",\"players\":" + pl + "}", true);
            }
            if (t >= nextLiveCreatures)
            {
                nextLiveCreatures = t + Mathf.Max(1f, cfgLiveCreatureSec.Value);
                string cr = "[]"; try { cr = CollectCreatures(); } catch (Exception e) { Logger.LogDebug(e); }
                feed.Publish(liveTopic + "/creatures", "{\"t\":" + now + ",\"creatures\":" + cr + "}", true);
            }
            if (t >= nextLivePlaytime)   // Bestenliste Spielzeit: alle je gesehenen Spieler (auch offline), gespeichert auf dem Broker
            {
                nextLivePlaytime = t + 60f; if (playTotal == null) LoadPlaytime();
                var sb = new StringBuilder("{\"t\":" + now + ",\"players\":{"); bool f = true;
                foreach (var kv in playTotal) { if (!f) sb.Append(','); f = false; sb.Append(Json(kv.Key)).Append(':').Append(Math.Round(kv.Value)); }
                feed.Publish(liveTopic + "/playtime", sb.Append("}}").ToString(), true);
            }
            if (t >= nextLivePerf) { nextLivePerf = t + 10f; try { feed.Publish(liveTopic + "/perf", CollectPerf(now), true); } catch (Exception e) { Logger.LogDebug(e); } }
            if (killsDirty && t >= nextLiveKills || t >= nextLiveKills + 60f) { nextLiveKills = t + 5f; killsDirty = false; try { feed.Publish(liveTopic + "/kills", KillsJson(now), true); if (t - killsSaved > 60f) { killsSaved = t; SaveKills(); } } catch (Exception e) { Logger.LogDebug(e); } }
            if (t >= nextLiveStat) { nextLiveStat = t + 600f; if (cfgPerfLog.Value) Logger.LogInfo($"Live feed: {(feed.Connected ? "verbunden" : "getrennt" + (feed.LastError != "" ? " (" + feed.LastError + ")" : ""))}, {feed.Sent} Nachrichten gesendet, Thema {liveTopic}/…"); }
        }
        // ---------------- Leistung (Lag-Messung) ----------------
        static readonly FieldInfo F_INSTANCES = typeof(ZNetScene).GetField("m_instances", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);
        string CollectPerf(long now)
        {
            float fps = perfAcc > 0 ? perfFrames / perfAcc : 0, avg = perfFrames > 0 ? perfAcc / perfFrames * 1000f : 0, max = perfMax * 1000f;
            perfAcc = 0; perfFrames = 0; perfMax = 0;
            int zdos = 0; try { var d = GetZdoDict(); if (d != null) zdos = d.Count; } catch { }
            int inst = 0; var zone = new Dictionary<long, int>();
            try
            {
                if (ZNetScene.instance != null && F_INSTANCES?.GetValue(ZNetScene.instance) is IDictionary di)
                {
                    inst = di.Count;
                    foreach (var k in di.Keys) { if (!(k is ZDO z)) continue; var p = z.GetPosition(); if (p.y > 3000f) continue; long key = ((long)Mathf.FloorToInt(p.x / 64f) << 32) ^ (uint)Mathf.FloorToInt(p.z / 64f); int c; zone.TryGetValue(key, out c); zone[key] = c + 1; }
                }
            }
            catch { }
            var hot = zone.OrderByDescending((kv) => kv.Value).Take(6).Select((kv) => "[" + ((int)(kv.Key >> 32) * 64 + 32) + "," + ((int)(uint)kv.Key * 64 + 32) + "," + kv.Value + "]");
            string pt = "[" + now + "," + F(fps) + "," + F(max) + "," + inst + "]"; perfHist.Add(pt); if (perfHist.Count > 90) perfHist.RemoveAt(0);   // 15 Minuten Verlauf
            return "{\"t\":" + now + ",\"fps\":" + F(fps) + ",\"avgMs\":" + F(avg) + ",\"maxMs\":" + F(max) + ",\"zdos\":" + zdos + ",\"inst\":" + inst + ",\"peers\":" + ZNet.instance.GetPeers().Count + ",\"hot\":[" + string.Join(",", hot.ToArray()) + "],\"hist\":[" + string.Join(",", perfHist.ToArray()) + "]}";
        }

        // ---------------- Kills (Bestenliste) ----------------
        // Server-Sicht: eine Kreatur, deren Objekt mit Leben 0 verschwindet, ist gestorben. Gutgeschrieben wird dem nächsten Spieler im Umkreis von 50 m,
        // Bosse allen Spielern im Umkreis von 80 m. Wer genau den letzten Schlag gesetzt hat, sieht der Server nicht.
        sealed class KillStat { public int total; public readonly Dictionary<string, int> by = new Dictionary<string, int>(); public readonly Dictionary<string, int> boss = new Dictionary<string, int>(); }
        Dictionary<string, KillStat> kills; bool killsDirty; float killsSaved;
        readonly Dictionary<int, string> charName = new Dictionary<int, string>(); readonly HashSet<int> charBoss = new HashSet<int>(), notChar = new HashSet<int>();
        bool CreatureInfo(int prefab, out string name, out bool boss)
        {
            name = null; boss = false; if (notChar.Contains(prefab)) return false;
            if (!charName.TryGetValue(prefab, out name))
            {
                var go = ZNetScene.instance != null ? ZNetScene.instance.GetPrefab(prefab) : null;
                var ch = go != null ? go.GetComponent(typeof(Character)) as Character : null;
                if (ch == null || ch is Player) { notChar.Add(prefab); return false; }
                name = WeltSuche.L(ch.m_name); charName[prefab] = name; if (ch.m_boss) charBoss.Add(prefab);
            }
            boss = charBoss.Contains(prefab); return true;
        }
        void OnZdoDestroyed(ZDO z)
        {
            try
            {
                if (z == null || ZNet.instance == null || !ZNet.instance.IsServer()) return;
                string name; bool boss; if (!CreatureInfo(z.GetPrefab(), out name, out boss)) return;
                if (z.GetBool(ZDOVars.s_tamed, false)) return;                 // eigene Tiere zählen nicht
                if (z.GetFloat(ZDOVars.s_health, 1f) > 0f) return;            // verschwunden, nicht gestorben
                Vector3 pos = z.GetPosition(); if (kills == null) LoadKills();
                var near = new List<KeyValuePair<string, float>>();
                foreach (var peer in ZNet.instance.GetPeers())
                {
                    if (peer == null || string.IsNullOrEmpty(peer.m_playerName)) continue;
                    ZDO pz = null; try { if (!peer.m_characterID.IsNone()) pz = ZDOMan.instance.GetZDO(peer.m_characterID); } catch { }
                    float d = Vector3.Distance(pz != null ? pz.GetPosition() : peer.m_refPos, pos); if (d <= (boss ? 80f : 50f)) near.Add(new KeyValuePair<string, float>(peer.m_playerName, d));
                }
                if (near.Count == 0) return;
                var who = boss ? near.Select((n) => n.Key).ToList() : new List<string> { near.OrderBy((n) => n.Value).First().Key };
                foreach (var w in who)
                {
                    KillStat k; if (!kills.TryGetValue(w, out k)) kills[w] = k = new KillStat();
                    k.total++; int c; k.by.TryGetValue(name, out c); k.by[name] = c + 1;
                    if (boss) { k.boss.TryGetValue(name, out c); k.boss[name] = c + 1; }
                }
                killsDirty = true;
                if (boss) Logger.LogInfo("Boss besiegt: " + name + " – dabei: " + string.Join(", ", who.ToArray()));
            }
            catch (Exception e) { Logger.LogDebug("Kills: " + e.Message); }
        }
        string KillsJson(long now)
        {
            if (kills == null) LoadKills();
            var sb = new StringBuilder("{\"t\":" + now + ",\"players\":{"); bool f = true;
            foreach (var kv in kills)
            {
                if (!f) sb.Append(','); f = false;
                sb.Append(Json(kv.Key)).Append(":{\"total\":").Append(kv.Value.total).Append(",\"by\":{");
                sb.Append(string.Join(",", kv.Value.by.OrderByDescending((x) => x.Value).Take(40).Select((x) => Json(x.Key) + ":" + x.Value).ToArray())).Append("},\"boss\":{");
                sb.Append(string.Join(",", kv.Value.boss.Select((x) => Json(x.Key) + ":" + x.Value).ToArray())).Append("}}");
            }
            return sb.Append("}}").ToString();
        }
        void LoadKills()
        {
            kills = new Dictionary<string, KillStat>();
            try
            {
                string f = Path.Combine(DataDir(), "kills.json"); if (!File.Exists(f)) return;
                if (!(MiniJson.Parse(File.ReadAllText(f)) is Dictionary<string, object> root) || !(root.TryGetValue("players", out var po) && po is Dictionary<string, object> pl)) return;
                foreach (var kv in pl)
                {
                    if (!(kv.Value is Dictionary<string, object> o)) continue; var k = new KillStat();
                    if (o.TryGetValue("total", out var tv) && tv is double td) k.total = (int)td;
                    if (o.TryGetValue("by", out var bv) && bv is Dictionary<string, object> bd) foreach (var x in bd) if (x.Value is double d) k.by[x.Key] = (int)d;
                    if (o.TryGetValue("boss", out var sv) && sv is Dictionary<string, object> sd) foreach (var x in sd) if (x.Value is double d) k.boss[x.Key] = (int)d;
                    kills[kv.Key] = k;
                }
            }
            catch (Exception e) { Logger.LogDebug("Kills laden: " + e.Message); }
        }
        void SaveKills() { try { if (kills == null) return; string dir = DataDir(); Directory.CreateDirectory(dir); File.WriteAllText(Path.Combine(dir, "kills.json"), KillsJson(Unix() * 1000)); } catch (Exception e) { Logger.LogDebug("Kills speichern: " + e.Message); } }

        // Alle Online-Spieler vom Server aus: Position und Werte aus der Spielfigur (ZDO), sonst die gemeldete Position
        // Spielzeit: seit wann online (diese Sitzung) und gesamt (gespeichert in spielzeit.json neben dem Dump)
        readonly Dictionary<string, long> onlineSince = new Dictionary<string, long>(); Dictionary<string, double> playTotal; float playLastT, playSaved;
        void LoadPlaytime()
        {
            playTotal = new Dictionary<string, double>();
            try { string f = Path.Combine(DataDir(), "spielzeit.json"); if (File.Exists(f) && MiniJson.Parse(File.ReadAllText(f)) is Dictionary<string, object> d) foreach (var kv in d) if (kv.Value is double v) playTotal[kv.Key] = v; } catch (Exception e) { Logger.LogDebug("Spielzeit: " + e.Message); }
        }
        void SavePlaytime()
        {
            try { string dir = DataDir(); Directory.CreateDirectory(dir); var sb = new StringBuilder("{"); bool f = true; foreach (var kv in playTotal) { if (!f) sb.Append(','); f = false; sb.Append(Json(kv.Key)).Append(':').Append(Math.Round(kv.Value)); } File.WriteAllText(Path.Combine(dir, "spielzeit.json"), sb.Append('}').ToString()); } catch (Exception e) { Logger.LogDebug("Spielzeit: " + e.Message); }
        }
        string CollectServerPlayers()
        {
            if (playTotal == null) LoadPlaytime();
            float tNow = Time.realtimeSinceStartup; double dt = playLastT > 0 ? Math.Min(30, tNow - playLastT) : 0; playLastT = tNow; long nowMs = Unix() * 1000;
            var here = new HashSet<string>();
            var sb = new StringBuilder("["); bool first = true;
            foreach (var peer in ZNet.instance.GetPeers())
            {
                if (peer == null || string.IsNullOrEmpty(peer.m_playerName)) continue;
                ZDO z = null; try { if (!peer.m_characterID.IsNone()) z = ZDOMan.instance.GetZDO(peer.m_characterID); } catch { }
                Vector3 p = z != null ? z.GetPosition() : peer.m_refPos; if (p == Vector3.zero) continue;
                string nm = peer.m_playerName; here.Add(nm);
                long since; if (!onlineSince.TryGetValue(nm, out since)) { since = nowMs; onlineSince[nm] = since; }
                double tot; playTotal.TryGetValue(nm, out tot); tot += dt; playTotal[nm] = tot;
                if (!first) sb.Append(','); first = false;
                sb.Append("{\"name\":").Append(Json(nm)).Append(",\"x\":").Append(F(p.x)).Append(",\"y\":").Append(F(p.y)).Append(",\"z\":").Append(F(p.z));
                sb.Append(",\"since\":").Append(since).Append(",\"total\":").Append(Math.Round(tot));
                if (z != null) { sb.Append(",\"r\":").Append(F(z.GetRotation().eulerAngles.y)); AppendZdoDetails(sb, z, z.GetFloat(ZDOVars.s_health, 0f), z.GetFloat(ZDOVars.s_maxHealth, 0f), false); }
                sb.Append('}');
            }
            foreach (var k in onlineSince.Keys.Where((k) => !here.Contains(k)).ToList()) onlineSince.Remove(k);   // abgemeldet
            if (tNow - playSaved > 60f) { playSaved = tNow; SavePlaytime(); }
            return sb.Append(']').ToString();
        }

        string CollectCreatures()
        {
            var sb = new StringBuilder("["); bool first = true; int n = 0;
            foreach (var c in Character.GetAllCharacters())
            {
                if (c == null || c is Player || n >= 400) continue;
                try
                {
                    var pos = c.transform.position; string pf = c.gameObject.name; int k = pf.IndexOf('('); if (k > 0) pf = pf.Substring(0, k).Trim();
                    if (!first) sb.Append(','); first = false; n++;
                    sb.Append("{\"p\":").Append(Json(pf)).Append(",\"n\":").Append(Json(WeltSuche.L(c.m_name)))
                      .Append(",\"x\":").Append(F(pos.x)).Append(",\"y\":").Append(F(pos.y)).Append(",\"z\":").Append(F(pos.z))
                      .Append(",\"hp\":").Append(F(c.GetHealth())).Append(",\"mhp\":").Append(F(c.GetMaxHealth())).Append(",\"lv\":").Append(c.GetLevel())
                      .Append(",\"f\":").Append(Json(c.m_faction.ToString()));
                    if (c.IsTamed()) { sb.Append(",\"tame\":1"); try { var cz = ZDOMan.instance.GetZDO(c.GetZDOID()); string tn = cz != null ? cz.GetString(ZDOVars.s_tamedName, "") : ""; if (!string.IsNullOrEmpty(tn)) sb.Append(",\"tn\":").Append(Json(tn)); } catch { } }
                    if (c.IsBoss()) sb.Append(",\"boss\":1");
                    sb.Append('}');
                }
                catch { }
            }
            return sb.Append(']').ToString();
        }

        // ---------------- Welt-Dump (VWD1) ----------------
        // Ablauf (Format unverändert, siehe docs/FORMAT.md):
        //  1. Hauptthread: ZDO-Liste kopieren und in kleinen Portionen lesen – begrenzt durch MaxObjectsPerFrame UND MaxMillisecondsPerFrame.
        //     Jedes Objekt wird sofort binär in einen Puffer geschrieben (keine Zwischenliste, keine Kopie des ganzen Abzugs).
        //  2. Hintergrund: Kopf + Puffer + Karte/Biome direkt gzip-komprimiert in welt.vwdump.tmp schreiben, Datei schließen,
        //     dann die alte welt.vwdump ersetzen. Bei einem Fehler bleibt die letzte gültige Datei stehen.
        //  Kein ZDO- oder Unity-Zugriff im Hintergrund. Es läuft immer nur ein Abzug; fällige Abzüge während eines laufenden werden übersprungen.
        int skippedDumps; static readonly UTF8Encoding UTF8NoBom = new UTF8Encoding(false);
        sealed class CountingStream : Stream   // zählt die unkomprimierten Bytes, ohne sie zu speichern
        {
            readonly Stream inner; public long Count;
            public CountingStream(Stream s) { inner = s; }
            public override void Write(byte[] b, int o, int c) { inner.Write(b, o, c); Count += c; }
            public override void Flush() { inner.Flush(); }
            public override bool CanRead => false; public override bool CanSeek => false; public override bool CanWrite => true;
            public override long Length => Count; public override long Position { get => Count; set => throw new NotSupportedException(); }
            public override int Read(byte[] b, int o, int c) { throw new NotSupportedException(); }
            public override long Seek(long o, SeekOrigin s) { throw new NotSupportedException(); }
            public override void SetLength(long v) { throw new NotSupportedException(); }
        }

        IEnumerator BuildDump()
        {
            building = true;
            var swTotal = System.Diagnostics.Stopwatch.StartNew(); var swFrame = new System.Diagnostics.Stopwatch();
            long memStart = GC.GetTotalMemory(false); double maxFrameMs = 0; int frames = 0;
            byte[] explored = null; int expSize = 0; float expPixel = 0f;
            byte[] bio = biomeGrid;
            string world = "", seed = ""; List<string> keys = new List<string>(); string players = playersJson;
            var locs = new List<KeyValuePair<string, Vector3>>(); var locPlaced = new List<bool>();
            // ZDOs Gebiet für Gebiet lesen (ZDOMan.m_objectsBySector): pro Frame wird nur ein Stück einer Gebietsliste kopiert –
            // kein Kopieren der kompletten Objektliste in einem Frame (das kostete bei ~1 Mio. Objekten 30–170 ms auf einmal).
            var sectors = F_SECTORS?.GetValue(ZDOMan.instance) as List<ZDO>[];
            IDictionary dict = null; if (sectors == null) dict = GetZdoDict();
            if (sectors == null && dict == null) { Logger.LogWarning("ZDOs not found (game version changed?)"); building = false; yield break; }
            int perFrame = Mathf.Clamp(cfgMaxObjects.Value, 64, 65536); double budgetMs = Math.Max(0.25, cfgMaxMs.Value);
            bool strip = cfgStrip.Value;
            int expected = 0; try { var d0 = GetZdoDict(); if (d0 != null) expected = d0.Count; } catch { }
            var recBuf = new MemoryStream(Math.Min(int.MaxValue / 2, Math.Max(1 << 20, expected * 26)));   // ~25 Byte je Objekt
            var bw = new BinaryWriter(recBuf, UTF8NoBom, true);
            var strs = new List<KeyValuePair<int, string>>(8);
            int recCount = 0, stale = 0, inFrame = 0;
            var tmpZ = new List<ZDO>(4096); var tmpId = new List<ZDOID>(4096);
            var tame = new List<KeyValuePair<int, Vector3>>(); var tameName = new List<string>(); var tameLv = new List<int>();   // zahme Tiere (Abschnitt TAME)
            swFrame.Start();
            int total = sectors != null ? sectors.Length + 1 : 1;   // +1: Portale führt das Spiel in einer eigenen Liste (nicht in den Gebieten)
            for (int si = 0; si < total; si++)
            {
                tmpZ.Clear(); tmpId.Clear();
                if (sectors != null && si == sectors.Length) { try { foreach (var z in ZDOMan.instance.GetPortalList()) if (z != null) { tmpZ.Add(z); tmpId.Add(z.m_uid); } } catch (Exception e) { Logger.LogDebug("Portale: " + e.Message); } }
                else if (sectors != null) { var lst = sectors[si]; if (lst != null) for (int k = 0; k < lst.Count; k++) { var z = lst[k]; if (z != null) { tmpZ.Add(z); tmpId.Add(z.m_uid); } } }
                else { foreach (DictionaryEntry e in dict) { tmpZ.Add((ZDO)e.Value); tmpId.Add((ZDOID)e.Key); } }   // Rückfall (alte Spielversion): wie früher alles auf einmal
                for (int k = 0; k < tmpZ.Count; k++)
                {
                    ZDO z = tmpZ[k];
                    // ZDOs werden vom Spiel wiederverwendet: nur übernehmen, wenn das Objekt noch dieselbe ID hat wie beim Kopieren
                    if (z.m_uid == tmpId[k])
                    {
                        try
                        {
                            Vector3 pos = z.GetPosition(); float yaw = z.GetRotation().eulerAngles.y, scale = 1f;
                            Vector3 sc = z.GetVec3(H_SCALE, Vector3.zero); if (sc != Vector3.zero) scale = sc.x;
                            long creator = z.GetLong(H_CREATOR, 0L), owner = z.GetLong(H_OWNER, 0L);
                            strs.Clear();
                            foreach (int key in STRING_KEYS)
                            {
                                if (strip && (key == H_AUTHOR || key == H_TAGAUTHOR)) continue;
                                string v = z.GetString(key, ""); if (!string.IsNullOrEmpty(v)) strs.Add(new KeyValuePair<int, string>(key, v));
                            }
                            byte[] it = z.GetByteArray(H_ITEMS, null); if (it != null && it.Length == 0) it = null;
                            byte m = 0; if (creator != 0) m |= 1; if (owner != 0) m |= 2; if (strs.Count > 0) m |= 4; if (it != null) m |= 8;
                            bw.Write(z.GetPrefab()); bw.Write(pos.x); bw.Write(pos.y); bw.Write(pos.z); bw.Write(yaw); bw.Write(scale); bw.Write(m);
                            if ((m & 1) != 0) bw.Write(creator);
                            if ((m & 2) != 0) bw.Write(owner);
                            if ((m & 4) != 0) { int n = Math.Min(255, strs.Count); bw.Write((byte)n); for (int i = 0; i < n; i++) { bw.Write(strs[i].Key); bw.Write(strs[i].Value); } }
                            if ((m & 8) != 0) { bw.Write(it.Length); bw.Write(it); }
                            recCount++;
                            if (z.GetBool(ZDOVars.s_tamed, false)) { tame.Add(new KeyValuePair<int, Vector3>(z.GetPrefab(), pos)); tameName.Add(z.GetString(ZDOVars.s_tamedName, "")); tameLv.Add(z.GetInt(ZDOVars.s_level, 1)); }
                        }
                        catch { }
                    }
                    else stale++;
                    if (++inFrame >= perFrame || ((inFrame & 63) == 0 && swFrame.Elapsed.TotalMilliseconds >= budgetMs))
                    {
                        double ms = swFrame.Elapsed.TotalMilliseconds; if (ms > maxFrameMs) maxFrameMs = ms; frames++;
                        inFrame = 0; yield return null; swFrame.Reset(); swFrame.Start();
                        if (ZNet.instance == null) { bw.Dispose(); recBuf.Dispose(); building = false; yield break; }   // Welt verlassen
                    }
                }
                // leere Gebiete: Zeitbudget auch beim bloßen Durchlaufen der Gebietsliste beachten
                if ((si & 1023) == 1023 && swFrame.Elapsed.TotalMilliseconds >= budgetMs)
                {
                    double ms = swFrame.Elapsed.TotalMilliseconds; if (ms > maxFrameMs) maxFrameMs = ms; frames++;
                    inFrame = 0; yield return null; swFrame.Reset(); swFrame.Start();
                    if (ZNet.instance == null) { bw.Dispose(); recBuf.Dispose(); building = false; yield break; }
                }
            }
            { double ms = swFrame.Elapsed.TotalMilliseconds; if (ms > maxFrameMs) maxFrameMs = ms; frames++; }
            tmpZ = null; tmpId = null; bw.Flush();
            double scanMs = swTotal.Elapsed.TotalMilliseconds; long memScan = GC.GetTotalMemory(false) - memStart;
            bool dedicated = false;
            try
            {
                world = ZNet.instance.GetWorldName() ?? "";
                dedicated = ZNet.instance.IsDedicated();
                try { var w = typeof(ZNet).GetField("m_world", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Static | BindingFlags.Instance)?.GetValue(ZNet.instance) as World; if (w != null) seed = w.m_seedName ?? ""; } catch { }
                try { keys = ZoneSystem.instance.GetGlobalKeys(); } catch { }
                try { CollectLocations(locs, locPlaced); } catch (Exception e) { Logger.LogDebug("Locations: " + e.Message); }
                try { explored = CollectExplored(out expSize, out expPixel); } catch (Exception e) { explored = null; Logger.LogDebug("Map: " + e.Message); }
            }
            catch (Exception e) { Logger.LogError("Dump failed: " + e); bw.Dispose(); recBuf.Dispose(); building = false; yield break; }

            // Schreiben im Hintergrund – nur fertige Kopien (Strings, Bytes), kein Zugriff auf ZDOs oder Unity
            long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalMilliseconds;
            var livePlayers = ParsePlayers(players);
            bool keepInMemory = cfgHttp.Value, toFile = cfgWriteFile.Value;
            string path = string.IsNullOrEmpty(cfgFilePath.Value) ? Path.Combine(Paths.ConfigPath, "ValheimWeltLive", "welt.vwdump") : cfgFilePath.Value;
            var level = cfgFastGzip.Value ? System.IO.Compression.CompressionLevel.Fastest : System.IO.Compression.CompressionLevel.Optimal;
            int interval = Math.Max(10, cfgWorldSeconds.Value);
            bool done = false, ok = false; long rawBytes = 0, gzBytes = 0; double zipMs = 0; string err = null;
            ThreadPool.QueueUserWorkItem(_ =>
            {
                var sw = System.Diagnostics.Stopwatch.StartNew(); string tmp = path + ".tmp"; MemoryStream mem = null;
                try
                {
                    Stream target;
                    if (keepInMemory) target = mem = new MemoryStream();
                    else { Directory.CreateDirectory(Path.GetDirectoryName(path)); target = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None, 1 << 16); }
                    using (target)
                    {
                        CountingStream cnt;
                        using (var gz = new GZipStream(target, level, true))
                        {
                            cnt = new CountingStream(gz);
                            using (var w = new BinaryWriter(cnt, UTF8NoBom, true))
                            {
                                w.Write(Encoding.ASCII.GetBytes("VWD1")); w.Write(1); w.Write(world); w.Write(seed); w.Write(now);
                                w.Write(keys.Count); foreach (var k in keys) w.Write(k);
                                w.Write(livePlayers.Count); foreach (var p in livePlayers) { w.Write(p.Key); w.Write(p.Value.x); w.Write(p.Value.y); w.Write(p.Value.z); }
                                w.Write(locs.Count); for (int i = 0; i < locs.Count; i++) { w.Write(locs[i].Key); w.Write(locs[i].Value.x); w.Write(locs[i].Value.z); w.Write((byte)(locPlaced[i] ? 1 : 0)); }
                                w.Write(recCount); w.Flush();
                                cnt.Write(recBuf.GetBuffer(), 0, (int)recBuf.Length);   // Datensätze ohne weitere Kopie
                                // aufgedeckte Karte (nur im Spiel-Client vorhanden): "EXPL", Größe, Pixelgröße, Bits
                                if (explored != null) { w.Write(Encoding.ASCII.GetBytes("EXPL")); w.Write(expSize); w.Write(expPixel); w.Write(explored.Length); w.Write(explored); }
                                if (bio != null) { w.Write(Encoding.ASCII.GetBytes("BIOM")); w.Write(BIO_N); w.Write(BIO_RES); w.Write(BIO_X0); w.Write(bio.Length); w.Write(bio); }
                                // zahme Tiere: "TAME", Anzahl, je Tier: Prefab, x, z, Name, Stufe (ältere Leser hören hier einfach auf)
                                if (tame.Count > 0) { w.Write(Encoding.ASCII.GetBytes("TAME")); w.Write(tame.Count); for (int i = 0; i < tame.Count; i++) { w.Write(tame[i].Key); w.Write(tame[i].Value.x); w.Write(tame[i].Value.z); w.Write(tameName[i] ?? ""); w.Write(tameLv[i]); } }
                                w.Flush();
                            }
                        }
                        rawBytes = cnt.Count; target.Flush();
                        if (target is FileStream fs) { fs.Flush(true); gzBytes = fs.Length; }
                    }
                    recBuf.Dispose();
                    if (mem != null)
                    {
                        var gzArr = mem.ToArray(); mem = null; gzBytes = gzArr.Length; dumpGz = gzArr;
                        if (toFile) { Directory.CreateDirectory(Path.GetDirectoryName(path)); using (var fs = new FileStream(tmp, FileMode.Create, FileAccess.Write, FileShare.None, 1 << 16)) { fs.Write(gzArr, 0, gzArr.Length); fs.Flush(true); } }
                    }
                    if (toFile) ReplaceFile(tmp, path);
                    dumpTime = now;
                    infoJson = "{\"mod\":\"" + Version + "\",\"world\":" + Json(world) + ",\"zdos\":" + recCount + ",\"dumpTime\":" + now + ",\"bytes\":" + gzBytes + ",\"worldInterval\":" + interval + ",\"server\":" + (dedicated ? "true" : "false") + "}";
                    ok = true;
                }
                catch (Exception e) { err = e.Message; try { if (File.Exists(tmp)) File.Delete(tmp); } catch { } }   // alte welt.vwdump bleibt unangetastet
                finally { try { recBuf.Dispose(); } catch { } zipMs = sw.Elapsed.TotalMilliseconds; done = true; }
            });
            while (!done) yield return null;
            long memPeak = GC.GetTotalMemory(false) - memStart;
            if (!ok) Logger.LogError("Writing dump: " + err);
            else if (toFile && !loggedFile) { loggedFile = true; Logger.LogInfo($"World dump written: {recCount} objects, {gzBytes / 1024} KB -> {path}"); }
            if (cfgPerfLog.Value)
                Logger.LogInfo($"Dump {(ok ? "ok" : "FEHLER")}: {recCount} ZDOs von {expected} ({stale} übersprungen, {(sectors != null ? "gebietsweise" : "Gesamtliste")}) · Scan {scanMs / 1000:0.0} s in {frames} Frames, max {maxFrameMs:0.00} ms/Frame (Budget {budgetMs:0.##} ms, {perFrame}/Frame) · " +
                    $"gzip {(cfgFastGzip.Value ? "schnell" : "stark")} {zipMs / 1000:0.0} s · roh {rawBytes / 1048576.0:0.0} MB → {gzBytes / 1048576.0:0.0} MB · " +
                    $"Speicher +{Math.Max(0, memScan) / 1048576.0:0} MB nach Scan, +{Math.Max(0, memPeak) / 1048576.0:0} MB am Ende (GC, ungefähr) · übersprungene Abzüge bisher: {skippedDumps}");
            building = false;
        }

        // welt.vwdump.tmp → welt.vwdump: ersetzen in einem Schritt, wo das Dateisystem es kann; sonst kurz löschen + umbenennen
        static void ReplaceFile(string tmp, string path)
        {
            if (!File.Exists(path)) { File.Move(tmp, path); return; }
            try { File.Replace(tmp, path, null); }
            catch (Exception) { File.Delete(path); File.Move(tmp, path); }
        }
        static readonly FieldInfo F_SECTORS = typeof(ZDOMan).GetField("m_objectsBySector", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);
        static IDictionary GetZdoDict()
        {
            var f = typeof(ZDOMan).GetField("m_objectsByID", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);
            return f?.GetValue(ZDOMan.instance) as IDictionary;
        }

        void CollectLocations(List<KeyValuePair<string, Vector3>> outL, List<bool> placed)
        {
            var f = typeof(ZoneSystem).GetField("m_locationInstances", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Instance);
            var dict = f?.GetValue(ZoneSystem.instance) as IDictionary; if (dict == null) return;
            foreach (var li in dict.Values)
            {
                var t = li.GetType();
                var loc = t.GetField("m_location")?.GetValue(li); if (loc == null) continue;
                string name = loc.GetType().GetField("m_prefabName")?.GetValue(loc) as string;
                if (string.IsNullOrEmpty(name)) { var pr = loc.GetType().GetField("m_prefab")?.GetValue(loc); name = pr?.GetType().GetProperty("Name")?.GetValue(pr) as string; }
                var pos = (Vector3)(t.GetField("m_position")?.GetValue(li) ?? Vector3.zero);
                bool pl = (bool)(t.GetField("m_placed")?.GetValue(li) ?? false);
                if (string.IsNullOrEmpty(name)) continue;
                outL.Add(new KeyValuePair<string, Vector3>(name, pos)); placed.Add(pl);
            }
        }

        // ---------------- HTTP ----------------
        void StartHttp()
        {
            try
            {
                http = new HttpListener();
                http.Prefixes.Add(cfgBindAll.Value ? $"http://*:{cfgPort.Value}/" : $"http://localhost:{cfgPort.Value}/");
                if (!cfgBindAll.Value) http.Prefixes.Add($"http://127.0.0.1:{cfgPort.Value}/");
                http.Start();
                httpThread = new Thread(HttpLoop) { IsBackground = true, Name = "ValheimWeltLive-HTTP" };
                httpThread.Start();
            }
            catch (Exception e) { Logger.LogError("Web server could not start: " + e.Message + " (port in use? BindAll may need admin rights)"); }
        }

        void HttpLoop()
        {
            while (http != null && http.IsListening)
            {
                HttpListenerContext ctx;
                try { ctx = http.GetContext(); } catch { break; }
                ThreadPool.QueueUserWorkItem(_ => Handle(ctx));
            }
        }

        void Handle(HttpListenerContext ctx)
        {
            var res = ctx.Response;
            try
            {
                res.AddHeader("Access-Control-Allow-Origin", "*");
                res.AddHeader("Access-Control-Allow-Private-Network", "true");
                res.AddHeader("Access-Control-Allow-Headers", "*");
                res.AddHeader("Cache-Control", "no-store");
                if (ctx.Request.HttpMethod == "OPTIONS") { res.StatusCode = 204; res.Close(); return; }
                string p = ctx.Request.Url.AbsolutePath;
                if (p == "/api/info") { Send(res, infoJson, "application/json"); return; }
                if (p == "/api/players") { Send(res, playersJson, "application/json"); return; }
                if (p == "/api/creatures") { Send(res, creaturesJson, "application/json"); return; }
                if (p == "/api/dungeon") { Send(res, dungeonJson, "application/json"); return; }
                if (p == "/api/find") { var q = ctx.Request.QueryString["q"]; if (!string.IsNullOrEmpty(q)) WeltSuche.PendingQuery = q; Send(res, "{\"ok\":true}", "application/json"); return; }
                if (p == "/api/world.vwdump")
                {
                    var gz = dumpGz; if (gz == null) { res.StatusCode = 503; Send(res, "{\"error\":\"Welt wird noch gelesen\"}", "application/json"); return; }
                    res.ContentType = "application/octet-stream"; res.AddHeader("Content-Encoding", "gzip"); res.AddHeader("X-Dump-Time", dumpTime.ToString());
                    res.ContentLength64 = gz.Length; res.OutputStream.Write(gz, 0, gz.Length); res.Close(); return;
                }
                // statische Webseite (Viewer) aus dem Ordner "web"
                string rel = p == "/" ? "index.html" : Uri.UnescapeDataString(p.TrimStart('/')).Replace('/', Path.DirectorySeparatorChar);
                string full = Path.GetFullPath(Path.Combine(webRoot, rel));
                if (!full.StartsWith(Path.GetFullPath(webRoot)) || !File.Exists(full)) { res.StatusCode = 404; Send(res, "Nicht gefunden", "text/plain"); return; }
                var data = File.ReadAllBytes(full);
                res.AddHeader("Cache-Control", "no-cache"); // nach Updates immer die neue Webseite laden
                res.ContentType = Mime(full); res.ContentLength64 = data.Length; res.OutputStream.Write(data, 0, data.Length); res.Close();
            }
            catch (Exception e) { try { res.StatusCode = 500; res.Close(); } catch { } Logger.LogDebug(e.Message); }
        }

        static void Send(HttpListenerResponse res, string s, string type)
        {
            var b = Encoding.UTF8.GetBytes(s); res.ContentType = type + "; charset=utf-8"; res.ContentLength64 = b.Length; res.OutputStream.Write(b, 0, b.Length); res.Close();
        }

        static string Mime(string f)
        {
            switch (Path.GetExtension(f).ToLowerInvariant())
            {
                case ".html": return "text/html; charset=utf-8";
                case ".js": return "text/javascript; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".json": return "application/json";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                default: return "application/octet-stream";
            }
        }

        // ---------------- Hilfen ----------------
        static List<KeyValuePair<string, Vector3>> ParsePlayers(string json)
        {
            // Mini-Parser für das eigene Spieler-JSON
            var list = new List<KeyValuePair<string, Vector3>>();
            foreach (var part in json.Trim('[', ']').Split(new[] { "},{" }, StringSplitOptions.RemoveEmptyEntries))
            {
                try
                {
                    string s = part.Trim('{', '}');
                    int ni = s.IndexOf("\"name\":") + 7; int ne = s.IndexOf(",\"x\":");
                    string name = s.Substring(ni, ne - ni).Trim('"').Replace("\\\"", "\"").Replace("\\\\", "\\");
                    float x = Num(s, "\"x\":"), y = Num(s, "\"y\":"), z = Num(s, "\"z\":");
                    list.Add(new KeyValuePair<string, Vector3>(name, new Vector3(x, y, z)));
                }
                catch { }
            }
            return list;
        }
        static float Num(string s, string key) { int i = s.IndexOf(key) + key.Length; int e = s.IndexOfAny(new[] { ',', '}' }, i); if (e < 0) e = s.Length; return float.Parse(s.Substring(i, e - i), System.Globalization.CultureInfo.InvariantCulture); }
        static string F(float v) => v.ToString("0.##", System.Globalization.CultureInfo.InvariantCulture);
        static string Json(string s)
        {
            var sb = new StringBuilder("\"");
            foreach (char c in s ?? "") { if (c == '"' || c == '\\') sb.Append('\\').Append(c); else if (c < 32) sb.Append("\\u").Append(((int)c).ToString("x4")); else sb.Append(c); }
            return sb.Append('"').ToString();
        }
        // Valheim GetStableHashCode
        public static int StableHash(string s)
        {
            unchecked
            {
                int h1 = 5381, h2 = h1;
                for (int i = 0; i < s.Length; i += 2) { h1 = ((h1 << 5) + h1) ^ s[i]; if (i == s.Length - 1) break; h2 = ((h2 << 5) + h2) ^ s[i + 1]; }
                return h1 + h2 * 1566083941;
            }
        }
    }
}
