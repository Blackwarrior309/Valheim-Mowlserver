/* Rechen-Worker: Zip entpacken, Welt konvertieren, Snapshot packen */
importScripts('../lib/fflate.min.js', 'data.js', 'convert.js');
self.onmessage = (e) => {
  const { files, opts } = e.data;
  try {
    const list = [];
    const post = (t, f) => self.postMessage({ type: 'progress', text: t, frac: f });
    post('Entpacke …', 0.01);
    for (const f of files) {
      const u8 = new Uint8Array(f.buf);
      if (/\.zip$/i.test(f.name)) {
        const z = fflate.unzipSync(u8, { filter: (fi) => /\.(chunk|db2|fwl2?|chunk \d+)$/i.test(fi.name) || /\.chunk/i.test(fi.name) });
        for (const [name, data] of Object.entries(z)) if (!name.endsWith('/')) list.push({ name, data });
      } else list.push({ name: f.name, data: u8 });
    }
    const snap = VWConvert.convert(list, { gunzip: (u) => fflate.gunzipSync(u), progress: post, stripIds: !!opts.stripIds });
    post('Packe Datei …', 0.98);
    const gz = fflate.gzipSync(fflate.strToU8(JSON.stringify(snap)), { level: 9 });
    self.postMessage({ type: 'done', snap, gz }, [gz.buffer]);
  } catch (err) {
    self.postMessage({ type: 'error', message: err && err.message ? err.message : String(err) });
  }
};
