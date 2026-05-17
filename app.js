// ── Server URLs ──
const CF     = 'https://speed.cloudflare.com';         // download + ping (real internet)
const RENDER = 'https://speedcheck-opdv.onrender.com'; // upload (our server on Render)

// ── Small helper functions ──

// Move the progress bar to a percentage (0-100)
function setProgress(p) {
  document.getElementById('progressBar').style.width = p + '%';
}

// Update the status text below the progress bar
function setStatus(html) {
  document.getElementById('statusLabel').innerHTML = html;
}

// Show the red error box with a message
function showError(msg) {
  const el = document.getElementById('errorMsg');
  el.textContent = msg;
  el.style.display = 'block';
}

// Hide the error box
function hideError() {
  document.getElementById('errorMsg').style.display = 'none';
}

// Update the big speed number in real time
function setSpeed(mbps) {
  document.getElementById('speedDisplay').textContent = mbps.toFixed(1);
}

// Smooth count animation — counts from 'from' to 'to' over 'dur' ms
function animateNumber(id, from, to, dur, dec = 1) {
  const el = document.getElementById(id);
  const t0 = performance.now();
  function step(now) {
    const p = Math.min((now - t0) / dur, 1);
    const eased = 1 - Math.pow(1 - p, 3); // ease-out: slows at the end
    el.textContent = (from + (to - from) * eased).toFixed(dec);
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ────────────────────────────────────────
//  STEP 1 — Ping
//  Send 5 tiny requests to Cloudflare
//  Measure round-trip time for each
//  Return the median (middle value)
// ────────────────────────────────────────
async function measurePing() {
  const times = [];

  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    await fetch(CF + '/__down?bytes=0&t=' + Date.now(), { cache: 'no-store' });
    times.push(performance.now() - t0);
  }

  // Sort and pick the middle value — more accurate than average
  times.sort((a, b) => a - b);
  return Math.round(times[2]);
}

// ────────────────────────────────────────
//  STEP 2 — Download
//  Download 3 files from Cloudflare (0.5MB, 1MB, 2MB)
//  Calculate speed for each: (bytes × 8) / seconds / 1,000,000
//  Return the average of all 3
// ────────────────────────────────────────
async function measureDownload() {
  const files  = [500_000, 1_000_000, 2_000_000];
  const speeds = [];

  for (let i = 0; i < files.length; i++) {
    const size = files[i];

    const t0  = performance.now();
    const res = await fetch(CF + '/__down?bytes=' + size + '&t=' + Date.now(), { cache: 'no-store' });
    await res.blob(); // wait for full download
    const secs = (performance.now() - t0) / 1000;

    const mbps = (size * 8) / secs / 1e6;
    speeds.push(mbps);

    // Show live speed update after each file
    setSpeed(mbps);
    setProgress(20 + ((i + 1) / files.length) * 35);
  }

  const avg = speeds.reduce((a, b) => a + b) / speeds.length;
  return parseFloat(avg.toFixed(2));
}

// ────────────────────────────────────────
//  STEP 3 — Upload
//  Send 3 blobs to our Render server (0.5MB, 1MB, 2MB)
//  This is a REAL upload through the internet
//  Same speed formula as download
// ────────────────────────────────────────
async function measureUpload() {
  const sizes  = [500_000, 1_000_000, 2_000_000];
  const speeds = [];

  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];

    // Create a blob of zeros — no need for random data
    const blob = new Blob([new ArrayBuffer(size)]);

    const t0 = performance.now();
    await fetch(RENDER + '/upload', {
      method:  'POST',
      body:    blob,
      headers: { 'Content-Type': 'application/octet-stream' }
    });
    const secs = (performance.now() - t0) / 1000;

    const mbps = (size * 8) / secs / 1e6;
    speeds.push(mbps);

    setSpeed(mbps);
    setProgress(60 + ((i + 1) / sizes.length) * 35);
  }

  const avg = speeds.reduce((a, b) => a + b) / speeds.length;
  return parseFloat(avg.toFixed(2));
}

// ────────────────────────────────────────
//  MAIN — Run all 3 tests in order
// ────────────────────────────────────────
async function startTest() {
  const btn = document.getElementById('startBtn');

  // Reset UI
  btn.disabled = true;
  btn.textContent = 'Testing...';
  document.getElementById('results').classList.remove('visible');
  document.getElementById('speedDisplay').textContent = '0';
  document.getElementById('speedUnit').textContent = 'Mbps';
  setProgress(0);
  hideError();

  try {

    // 1. Ping
    setStatus('<span class="spinner"></span> Measuring ping...');
    const ping = await measurePing();
    setProgress(15);
    document.getElementById('pingResult').textContent = ping + ' ms';

    // 2. Download
    setStatus('<span class="spinner"></span> Testing download speed...');
    document.getElementById('speedUnit').textContent = 'Mbps  ↓';
    const dl = await measureDownload();
    setProgress(60);
    document.getElementById('dlResult').textContent = dl + ' Mbps';

    // 3. Upload
    setStatus('<span class="spinner"></span> Testing upload speed...');
    document.getElementById('speedUnit').textContent = 'Mbps  ↑';
    const ul = await measureUpload();
    setProgress(100);
    document.getElementById('ulResult').textContent = ul + ' Mbps';

    // Done — show results and animate final number
    setStatus('✅ Test complete!');
    document.getElementById('results').classList.add('visible');
    setTimeout(() => {
      animateNumber('speedDisplay', ul, dl, 800);
      document.getElementById('speedUnit').textContent = 'Mbps  ↓ Download';
    }, 300);

  } catch (err) {
    setStatus('❌ Test failed');
    showError('Something went wrong. Check your internet connection and try again.');
    console.error(err);
  }

  btn.disabled = false;
  btn.textContent = 'Test Again';
}
