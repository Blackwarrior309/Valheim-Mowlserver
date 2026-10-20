// Live-Kanal für die Karte: kleiner MQTT-3.1.1-Sender (nur ausgehende TCP-Verbindung, kein offener Port).
// Läuft komplett in einem eigenen Hintergrund-Thread; das Spiel legt nur fertige JSON-Texte ab (immer nur der neueste je Thema).
using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Threading;

namespace ValheimWeltLive
{
    sealed class LiveFeed
    {
        readonly string host; readonly int port; readonly string clientId; readonly BepInEx.Logging.ManualLogSource log;
        readonly object lk = new object();
        readonly Dictionary<string, KeyValuePair<byte[], bool>> pending = new Dictionary<string, KeyValuePair<byte[], bool>>();
        Thread thread; volatile bool stop;
        public volatile bool Connected; public long Sent; public string LastError = "";

        public LiveFeed(string host, int port, string clientId, BepInEx.Logging.ManualLogSource log) { this.host = host; this.port = port; this.clientId = clientId; this.log = log; }
        public void Start() { if (thread != null) return; thread = new Thread(Run) { IsBackground = true, Name = "ValheimWeltLive-Live" }; thread.Start(); }
        public void Stop() { stop = true; }
        /// <summary>Legt die neueste Nachricht für ein Thema ab; ältere, noch nicht gesendete werden ersetzt.</summary>
        public void Publish(string topic, string json, bool retain)
        {
            var b = Encoding.UTF8.GetBytes(json);
            lock (lk) pending[topic] = new KeyValuePair<byte[], bool>(b, retain);
        }

        void Run()
        {
            int backoff = 3000;
            while (!stop)
            {
                TcpClient c = null;
                try
                {
                    c = new TcpClient(); c.NoDelay = true;
                    var ar = c.BeginConnect(host, port, null, null);
                    if (!ar.AsyncWaitHandle.WaitOne(10000)) throw new IOException("Zeitüberschreitung beim Verbinden");
                    c.EndConnect(ar);
                    var s = c.GetStream(); s.WriteTimeout = 10000; s.ReadTimeout = 10000;
                    // CONNECT: Protokoll "MQTT" Stufe 4, saubere Sitzung, Keepalive 60 s
                    var id = Encoding.UTF8.GetBytes(clientId);
                    var body = new MemoryStream();
                    body.Write(new byte[] { 0, 4, (byte)'M', (byte)'Q', (byte)'T', (byte)'T', 4, 0x02, 0, 60 }, 0, 10);
                    body.WriteByte((byte)(id.Length >> 8)); body.WriteByte((byte)id.Length); body.Write(id, 0, id.Length);
                    Packet(s, 0x10, body.ToArray());
                    var ack = new byte[4]; ReadFull(s, ack);
                    if (ack[0] != 0x20 || ack[3] != 0) throw new IOException("Broker lehnt ab (" + ack[3] + ")");
                    Connected = true; backoff = 3000; log.LogInfo($"Live feed connected ({host}:{port})");
                    var lastPing = DateTime.UtcNow; var drain = new byte[4096];
                    while (!stop)
                    {
                        List<KeyValuePair<string, KeyValuePair<byte[], bool>>> batch = null;
                        lock (lk) { if (pending.Count > 0) { batch = new List<KeyValuePair<string, KeyValuePair<byte[], bool>>>(pending); pending.Clear(); } }
                        if (batch != null)
                            foreach (var kv in batch)
                            {
                                var t = Encoding.UTF8.GetBytes(kv.Key); var p = kv.Value.Key;
                                var b = new byte[2 + t.Length + p.Length];
                                b[0] = (byte)(t.Length >> 8); b[1] = (byte)t.Length; Buffer.BlockCopy(t, 0, b, 2, t.Length); Buffer.BlockCopy(p, 0, b, 2 + t.Length, p.Length);
                                Packet(s, (byte)(0x30 | (kv.Value.Value ? 1 : 0)), b); Sent++;
                            }
                        if ((DateTime.UtcNow - lastPing).TotalSeconds > 30) { Packet(s, 0xC0, new byte[0]); lastPing = DateTime.UtcNow; }
                        while (c.Available > 0) { if (s.Read(drain, 0, Math.Min(drain.Length, c.Available)) <= 0) throw new IOException("Verbindung geschlossen"); }   // nur PINGRESP – verwerfen
                        if (c.Client.Poll(0, SelectMode.SelectRead) && c.Available == 0) throw new IOException("Verbindung geschlossen");
                        Thread.Sleep(100);
                    }
                }
                catch (Exception e) { LastError = e.Message; if (Connected) log.LogWarning("Live feed disconnected: " + e.Message); else log.LogDebug("Live feed: " + e.Message); }
                Connected = false;
                try { c?.Close(); } catch { }
                if (stop) break;
                Thread.Sleep(backoff); backoff = Math.Min(60000, backoff * 2);
            }
        }

        static void Packet(Stream s, byte header, byte[] body)
        {
            var ms = new MemoryStream(body.Length + 5); ms.WriteByte(header);
            int len = body.Length; do { byte d = (byte)(len % 128); len /= 128; if (len > 0) d |= 0x80; ms.WriteByte(d); } while (len > 0);
            ms.Write(body, 0, body.Length);
            s.Write(ms.GetBuffer(), 0, (int)ms.Length);
        }
        static void ReadFull(Stream s, byte[] b) { int o = 0; while (o < b.Length) { int n = s.Read(b, o, b.Length - o); if (n <= 0) throw new IOException("Verbindung geschlossen"); o += n; } }
    }
}
