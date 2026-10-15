// Valheim Welt Live – inoffizieller Begleit-Mod (BepInEx).
// Liest die Welt-Objekte (ZDOs) aus dem Speicher des Spiels/Servers und stellt sie bereit:
//   * lokal als Webseite:   http://localhost:8686/   (3D-Karte, Kisten, Spieler live)
//   * als Datei:            BepInEx/config/ValheimWeltLive/welt.vwdump   (für FTP-Sync auf Servern)
// Format VWD1: siehe docs/FORMAT.md im Repo. Nicht von Iron Gate.
using System;
using System.Collections;
using System.Collections.Generic;
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
        public const string Version = "0.2.0";
        static bool loggedFile;

        ConfigEntry<bool> cfgHttp, cfgBindAll, cfgWriteFile, cfgStrip;
        ConfigEntry<int> cfgPort, cfgWorldSeconds;
        ConfigEntry<float> cfgPlayerSeconds;
        ConfigEntry<string> cfgFilePath;

        HttpListener http;
        Thread httpThread;
        volatile byte[] dumpGz;          // letzter Dump, gzip
        volatile byte[] dumpRaw;         // letzter Dump, roh (für Datei)
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
            cfgHttp = Config.Bind("Web", "Enabled", true, "Start the built-in web page/API.");
            cfgPort = Config.Bind("Web", "Port", 8686, "Port of the web page (http://localhost:PORT/).");
            cfgBindAll = Config.Bind("Web", "BindAll", false, "true = reachable from the network too (server/LAN). On Windows this may need admin rights or a URL reservation.");
            cfgWorldSeconds = Config.Bind("Daten", "WorldIntervalSeconds", 30, "How often the whole world is read again (seconds, min. 10). Servers: 300.");
            cfgPlayerSeconds = Config.Bind("Daten", "PlayerIntervalSeconds", 1f, "How often player positions are updated (seconds).");
            cfgWriteFile = Config.Bind("Datei", "WriteDumpFile", false, "Also write the world dump to a file (for FTP sync, e.g. Nitrado). Set to true on servers.");
            cfgFilePath = Config.Bind("Datei", "DumpPath", "", "Empty = BepInEx/config/ValheimWeltLive/welt.vwdump");
            cfgStrip = Config.Bind("Datenschutz", "StripSteamIds", true, "Do not output Steam IDs (authors of signs/portals).");
            webRoot = Path.Combine(Path.GetDirectoryName(Info.Location) ?? ".", "web");
            if (cfgHttp.Value) StartHttp();
            Logger.LogInfo($"{Name} {Version} loaded. Web: {(cfgHttp.Value ? "http://localhost:" + cfgPort.Value + "/" : "off")}, dump file: {(cfgWriteFile.Value ? "on" : "off")}");
        }

        void OnDestroy()
        {
            try { http?.Stop(); http?.Close(); } catch { }
        }

        void Update()
        {
            if (ZNet.instance == null || ZDOMan.instance == null) return;
            float t = Time.realtimeSinceStartup;
            if (t >= nextPlayers) { nextPlayers = t + Mathf.Max(0.25f, cfgPlayerSeconds.Value); try { playersJson = CollectPlayers(); } catch (Exception e) { Logger.LogDebug(e); } }
            if (!biomeBusy && WorldGenerator.instance != null && ZNet.instance != null && (biomeGrid == null || biomeWorld != ZNet.instance.GetWorldName())) StartCoroutine(BuildBiomes());
            if (t >= nextWorld && !building) { nextWorld = t + Mathf.Max(10, cfgWorldSeconds.Value); StartCoroutine(BuildDump()); }
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
            biomeBusy = true; string w = ZNet.instance.GetWorldName(); var g = new byte[BIO_N * BIO_N]; int done = 0;
            for (int j = 0; j < BIO_N; j++)
            {
                for (int i = 0; i < BIO_N; i++)
                {
                    float x = BIO_X0 + (i + 0.5f) * BIO_RES, z = BIO_X0 + (j + 0.5f) * BIO_RES;
                    try { g[j * BIO_N + i] = (x * x + z * z > 10500f * 10500f) ? (byte)8 : BiomeIndex(WorldGenerator.instance.GetBiome(new Vector3(x, 0f, z))); } catch { }
                }
                if (++done % 4 == 0) yield return null;            // auf viele Frames verteilen
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
            Action<string, Vector3> Add = (n, p) =>
            {
                if (string.IsNullOrEmpty(n) || !seen.Add(n)) return;
                if (!first) sb.Append(','); first = false;
                sb.Append("{\"name\":").Append(Json(n)).Append(",\"x\":").Append(F(p.x)).Append(",\"y\":").Append(F(p.y)).Append(",\"z\":").Append(F(p.z)).Append('}');
            };
            if (Player.m_localPlayer != null) Add(Player.m_localPlayer.GetPlayerName(), Player.m_localPlayer.transform.position);
            foreach (var pl in Player.GetAllPlayers()) if (pl != null) Add(pl.GetPlayerName(), pl.transform.position);
            if (ZNet.instance.IsServer()) foreach (var peer in ZNet.instance.GetPeers()) if (peer != null && peer.m_refPos != Vector3.zero) Add(peer.m_playerName, peer.m_refPos);
            // Mitspieler, die ihre Position teilen (auch weit weg, im Multiplayer)
            try { foreach (var pi in ZNet.instance.GetPlayerList()) if (pi.m_publicPosition && pi.m_position != Vector3.zero) Add(pi.m_name, pi.m_position); } catch { }
            return sb.Append(']').ToString();
        }

        // ---------------- Welt-Dump (VWD1) ----------------
        struct Rec { public int prefab; public Vector3 pos; public float yaw, scale; public long creator, owner; public List<KeyValuePair<int, string>> strings; public byte[] items; }

        IEnumerator BuildDump()
        {
            building = true;
            byte[] explored = null; int expSize = 0; float expPixel = 0f;
            byte[] bio = biomeGrid;
            List<Rec> recs = null; string world = "", seed = ""; List<string> keys = new List<string>(); string players = playersJson;
            var locs = new List<KeyValuePair<string, Vector3>>(); var locPlaced = new List<bool>();
            // ZDO-Liste kopieren und in kleinen Portionen (je Frame 16384 Objekte) auslesen – kein Ruckler für Spieler
            var dict = GetZdoDict();
            if (dict == null) { Logger.LogWarning("ZDOs not found (game version changed?)"); building = false; yield break; }
            ZDO[] all = null;
            try { all = new ZDO[dict.Count]; dict.Values.CopyTo(all, 0); } catch (Exception e) { Logger.LogWarning("ZDO list: " + e.Message); }
            if (all == null) { building = false; yield break; }
            recs = new List<Rec>(all.Length);
            bool strip = cfgStrip.Value;
            for (int zi = 0; zi < all.Length; zi++)
            {
                ZDO z = all[zi];
                if (z != null)
                {
                    try
                    {
                        var r = new Rec { prefab = z.GetPrefab(), pos = z.GetPosition(), yaw = z.GetRotation().eulerAngles.y, scale = 1f };
                        Vector3 sc = z.GetVec3(H_SCALE, Vector3.zero); if (sc != Vector3.zero) r.scale = sc.x;
                        r.creator = z.GetLong(H_CREATOR, 0L); r.owner = z.GetLong(H_OWNER, 0L);
                        foreach (int k in STRING_KEYS)
                        {
                            if (strip && (k == H_AUTHOR || k == H_TAGAUTHOR)) continue;
                            string v = z.GetString(k, ""); if (string.IsNullOrEmpty(v)) continue;
                            (r.strings ?? (r.strings = new List<KeyValuePair<int, string>>())).Add(new KeyValuePair<int, string>(k, v));
                        }
                        byte[] it = z.GetByteArray(H_ITEMS, null); if (it != null && it.Length > 0) r.items = it;
                        recs.Add(r);
                    }
                    catch { }
                }
                if ((zi & 16383) == 16383) yield return null;
                if (ZNet.instance == null) { building = false; yield break; }   // Welt verlassen
            }
            try
            {
                world = ZNet.instance.GetWorldName() ?? "";
                try { var w = typeof(ZNet).GetField("m_world", BindingFlags.NonPublic | BindingFlags.Public | BindingFlags.Static | BindingFlags.Instance)?.GetValue(ZNet.instance) as World; if (w != null) seed = w.m_seedName ?? ""; } catch { }
                try { keys = ZoneSystem.instance.GetGlobalKeys(); } catch { }
                try { CollectLocations(locs, locPlaced); } catch (Exception e) { Logger.LogDebug("Locations: " + e.Message); }
                try { explored = CollectExplored(out expSize, out expPixel); } catch (Exception e) { explored = null; Logger.LogDebug("Map: " + e.Message); }
            }
            catch (Exception e) { Logger.LogError("Dump failed: " + e); building = false; yield break; }

            // Schreiben im Hintergrund, damit das Spiel nicht ruckelt
            long now = (long)(DateTime.UtcNow - new DateTime(1970, 1, 1)).TotalMilliseconds;
            var livePlayers = ParsePlayers(players);
            bool done = false;
            ThreadPool.QueueUserWorkItem(_ =>
            {
                try
                {
                    var ms = new MemoryStream();
                    using (var bw = new BinaryWriter(ms, Encoding.UTF8, true))
                    {
                        bw.Write(Encoding.ASCII.GetBytes("VWD1")); bw.Write(1); bw.Write(world); bw.Write(seed); bw.Write(now);
                        bw.Write(keys.Count); foreach (var k in keys) bw.Write(k);
                        bw.Write(livePlayers.Count); foreach (var p in livePlayers) { bw.Write(p.Key); bw.Write(p.Value.x); bw.Write(p.Value.y); bw.Write(p.Value.z); }
                        bw.Write(locs.Count); for (int i = 0; i < locs.Count; i++) { bw.Write(locs[i].Key); bw.Write(locs[i].Value.x); bw.Write(locs[i].Value.z); bw.Write((byte)(locPlaced[i] ? 1 : 0)); }
                        bw.Write(recs.Count);
                        foreach (var r in recs)
                        {
                            byte m = 0; if (r.creator != 0) m |= 1; if (r.owner != 0) m |= 2; if (r.strings != null) m |= 4; if (r.items != null) m |= 8;
                            bw.Write(r.prefab); bw.Write(r.pos.x); bw.Write(r.pos.y); bw.Write(r.pos.z); bw.Write(r.yaw); bw.Write(r.scale); bw.Write(m);
                            if ((m & 1) != 0) bw.Write(r.creator);
                            if ((m & 2) != 0) bw.Write(r.owner);
                            if ((m & 4) != 0) { bw.Write((byte)Math.Min(255, r.strings.Count)); for (int i = 0; i < r.strings.Count && i < 255; i++) { bw.Write(r.strings[i].Key); bw.Write(r.strings[i].Value); } }
                            if ((m & 8) != 0) { bw.Write(r.items.Length); bw.Write(r.items); }
                        }
                        // aufgedeckte Karte (nur im Spiel-Client vorhanden): "EXPL", Größe, Pixelgröße, Bits
                        if (explored != null) { bw.Write(Encoding.ASCII.GetBytes("EXPL")); bw.Write(expSize); bw.Write(expPixel); bw.Write(explored.Length); bw.Write(explored); }
                        if (bio != null) { bw.Write(Encoding.ASCII.GetBytes("BIOM")); bw.Write(BIO_N); bw.Write(BIO_RES); bw.Write(BIO_X0); bw.Write(bio.Length); bw.Write(bio); }
                    }
                    byte[] raw = ms.ToArray();
                    var gz = new MemoryStream(); using (var z = new GZipStream(gz, CompressionMode.Compress, true)) z.Write(raw, 0, raw.Length);
                    dumpRaw = raw; dumpGz = gz.ToArray(); dumpTime = now;
                    infoJson = "{\"mod\":\"" + Version + "\",\"world\":" + Json(world) + ",\"zdos\":" + recs.Count + ",\"dumpTime\":" + now + ",\"bytes\":" + dumpGz.Length + ",\"worldInterval\":" + Math.Max(10, cfgWorldSeconds.Value) + ",\"server\":" + (ZNet.instance != null && ZNet.instance.IsDedicated() ? "true" : "false") + "}";
                    if (cfgWriteFile.Value)
                    {
                        string path = string.IsNullOrEmpty(cfgFilePath.Value) ? Path.Combine(Paths.ConfigPath, "ValheimWeltLive", "welt.vwdump") : cfgFilePath.Value;
                        Directory.CreateDirectory(Path.GetDirectoryName(path));
                        File.WriteAllBytes(path + ".tmp", dumpGz); // gzip-komprimiert (VWD1 innen)
                        if (File.Exists(path)) File.Delete(path);
                        File.Move(path + ".tmp", path);
                        if (!loggedFile) { loggedFile = true; Logger.LogInfo($"World dump written: {recs.Count} objects, {dumpGz.Length / 1024} KB -> {path}"); }
                    }
                }
                catch (Exception e) { Logger.LogError("Writing dump: " + e.Message); }
                finally { done = true; }
            });
            while (!done) yield return null;
            Logger.LogDebug($"Dump: {recs.Count} objects, {(dumpGz?.Length ?? 0) / 1024} KB");
            building = false;
        }

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
