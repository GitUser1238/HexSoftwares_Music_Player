// ---------- ELEMENTS ----------
const audio = document.getElementById('audio');
const trackListEl = document.getElementById('trackList');
const nowTitle = document.getElementById('nowTitle');
const nowArtist = document.getElementById('nowArtist');
const coverLarge = document.getElementById('coverLarge');
const progress = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const currentTimeEl = document.getElementById('currentTime');
const durationTimeEl = document.getElementById('durationTime');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const shuffleBtn = document.getElementById('shuffleBtn');
const repeatBtn = document.getElementById('repeatBtn');
const volume = document.getElementById('volume');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const changeCoverBtn = document.getElementById('changeCoverBtn');
const coverInput = document.getElementById('coverInput');
const removeCoverBtn = document.getElementById('removeCoverBtn');
const bg = document.getElementById('bg');

// ---------- PLAYLIST STORAGE ----------
const SAVED = localStorage.getItem('webplayer_playlist');
let playlist = [];

if (SAVED) {
  try {
    const savedPlaylist = JSON.parse(SAVED);
    // Filter out invalid blob URLs that are no longer accessible
    playlist = savedPlaylist.filter(track => {
      // Only keep tracks with valid URLs (not blob URLs that would be invalid after refresh)
      return track.src && !track.src.startsWith('blob:');
    });
  } catch (e) {
    console.error('Error loading playlist from localStorage:', e);
  }
}

function savePlaylist() {
  localStorage.setItem('webplayer_playlist', JSON.stringify(playlist));
}

// ---------- WAVEFORM ----------
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
let audioCtx, analyser, source;
let bufferLength = 0;
let dataArray;
let smoothArray = [];

function initAudioCtx() {
  if (audioCtx) return;
  
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024; // higher = more detail
  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);
  smoothArray = new Float32Array(bufferLength);
  source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  handleResize();
  draw();
}

// resize handling using ResizeObserver + DPR scaling
const resizeObserver = new ResizeObserver(handleResize);
resizeObserver.observe(canvas);

function handleResize() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(1, Math.floor(canvas.clientWidth));
  const h = Math.max(1, Math.floor(canvas.clientHeight));
  
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  
  // scale drawing by DPR
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function smooth(prev, next, factor = 0.08) { 
  return prev + (next - prev) * factor; 
}

function draw(){
  requestAnimationFrame(draw);
  
  if(!analyser) return;

  // Get frequency data instead of time domain for bar visualization
  analyser.getByteFrequencyData(dataArray);
  const w = canvas.clientWidth; 
  const h = canvas.clientHeight;

  ctx.clearRect(0, 0, w, h);

  // background gradient fill for better contrast
  const grad = ctx.createLinearGradient(0, 0, w, 0);
  grad.addColorStop(0, 'rgba(139,92,246,0.10)');
  grad.addColorStop(1, 'rgba(6,182,212,0.10)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // draw bars
  const barCount = Math.min(bufferLength, Math.floor(w / 4)); // Limit number of bars based on canvas width
  const barWidth = w / barCount; // Full width allocation per bar
  const barSpacing = (w / barCount) * 0.1; // Small space between bars
  const actualBarWidth = barWidth - barSpacing; // Actual bar width accounting for spacing
  
  for(let i = 0; i < barCount; i++) {
    // Get the amplitude for this bar
    const value = dataArray[Math.floor(i * bufferLength / barCount)] / 255; // Normalize to 0-1
    const barHeight = value * (h * 0.9); // Scale to 90% of canvas height
    
    // Calculate x position for the bar
    const x = i * barWidth + barSpacing / 2;
    const y = (h - barHeight) / 2; // Center the bar vertically
    
    // Create gradient for each bar
    const barGradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
    barGradient.addColorStop(0, 'rgba(139, 92, 246, 0.8)'); // Purple
    barGradient.addColorStop(1, 'rgba(6, 182, 212, 0.8)'); // Cyan
    
    ctx.fillStyle = barGradient;
    
    // Draw rounded rectangle for each bar (compatible version)
    const radius = Math.min(4, actualBarWidth / 3); // Ensure radius doesn't exceed bar width
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + actualBarWidth - radius, y);
    ctx.quadraticCurveTo(x + actualBarWidth, y, x + actualBarWidth, y + radius);
    ctx.lineTo(x + actualBarWidth, y + barHeight - radius);
    ctx.quadraticCurveTo(x + actualBarWidth, y + barHeight, x + actualBarWidth - radius, y + barHeight);
    ctx.lineTo(x + radius, y + barHeight);
    ctx.quadraticCurveTo(x, y + barHeight, x, y + barHeight - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    
    // Mirror effect for bottom half
    const mirrorY = h/2 + (h/2 - y);
    const mirrorHeight = barHeight;
    
    const mirrorGradient = ctx.createLinearGradient(0, mirrorY - mirrorHeight/2, 0, mirrorY);
    mirrorGradient.addColorStop(0, 'rgba(6, 182, 212, 0.4)'); // Cyan
    mirrorGradient.addColorStop(1, 'rgba(139, 92, 246, 0.3)'); // Purple
    
    ctx.fillStyle = mirrorGradient;
    
    ctx.beginPath();
    ctx.moveTo(x + radius, mirrorY);
    ctx.lineTo(x + actualBarWidth - radius, mirrorY);
    ctx.quadraticCurveTo(x + actualBarWidth, mirrorY, x + actualBarWidth, mirrorY - radius);
    ctx.lineTo(x + actualBarWidth, mirrorY - mirrorHeight + radius);
    ctx.quadraticCurveTo(x + actualBarWidth, mirrorY - mirrorHeight, x + actualBarWidth - radius, mirrorY - mirrorHeight);
    ctx.lineTo(x + radius, mirrorY - mirrorHeight);
    ctx.quadraticCurveTo(x, mirrorY - mirrorHeight, x, mirrorY - mirrorHeight + radius);
    ctx.lineTo(x, mirrorY - radius);
    ctx.quadraticCurveTo(x, mirrorY, x + radius, mirrorY);
    ctx.closePath();
    ctx.fill();
    
    // Add a subtle glow effect
    ctx.shadowColor = 'rgba(139, 92, 246, 0.3)';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0; // Reset shadow for next frame
  }

  // Add a subtle center line
  ctx.beginPath();
  ctx.moveTo(0, h/2);
  ctx.lineTo(w, h/2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

// ---------- STATE & UI ----------
let currentIndex = 0; 
let isPlaying = false; 
let shuffle = false; 
let repeat = false;

function formatTime(sec) { 
  if (!isFinite(sec)) return '0:00'; 
  
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60).toString().padStart(2, '0'); 
  
  return m + ':' + s; 
}

function renderPlaylist() {
  trackListEl.innerHTML = '';
  
  if (!playlist.length) { 
    trackListEl.innerHTML = `<div class="empty">No songs — drag & drop audio files here</div>`; 
    return; 
  }

  playlist.forEach((t, i) => {
    const div = document.createElement('div'); 
    div.className = 'track'; 
    div.dataset.index = i;
    
    const coverHtml = t.cover ? 
      `<div class='cover'><img src='${t.cover}' alt='cover'></div>` : 
      `<div class='cover'>${(t.title || '♪').charAt(0)}</div>`;
    
    div.innerHTML = coverHtml + 
      `<div class='meta'><div class='title'>${t.title || 'Unknown'}</div>` +
      `<div class='artist'>${t.artist || 'Local file'}</div></div>` +
      `<div class='dur' id='dur-${i}'>…</div>`;
    
    // remove button
    const removeBtn = document.createElement('button'); 
    removeBtn.className = 'remove-btn'; 
    removeBtn.title = 'Remove'; 
    removeBtn.innerHTML = '✖';
    removeBtn.addEventListener('click', (e) => { 
      e.stopPropagation(); 
      removeTrack(i); 
    });
    div.appendChild(removeBtn);

    div.addEventListener('click', () => { 
      loadTrack(i); 
      playAudio(); 
    });
    
    trackListEl.appendChild(div);

    // get duration
    const a = new Audio(); 
    a.src = t.src; 
    a.addEventListener('loadedmetadata', () => { 
      const d = document.getElementById(`dur-${i}`); 
      if (d) d.textContent = formatTime(a.duration); 
    });
  });
  
  highlightActive();
}

function highlightActive() { 
  document.querySelectorAll('.track').forEach(el => el.classList.remove('active')); 
  
  const el = document.querySelector(`.track[data-index='${currentIndex}']`); 
  
  if (el) el.classList.add('active'); 
}

function updateBackground(cover) { 
  if (cover) { 
    bg.classList.remove('default'); 
    bg.style.backgroundImage = `linear-gradient(rgba(6,6,9,0.36),rgba(6,6,9,0.36)), url('${cover}')`; 
    bg.style.filter = 'blur(36px) saturate(1.1)'; 
    bg.style.opacity = '1'; 
  } else { 
    bg.classList.add('default'); 
    bg.style.backgroundImage = ''; 
    bg.style.opacity = '1'; 
  } 
}

function loadTrack(index) { 
  if (index < 0 || index >= playlist.length) return; 
  
  const track = playlist[index]; 
  
  if (!track) return; 
  
  currentIndex = index; 
  audio.src = track.src; 
  nowTitle.textContent = track.title || 'Unknown title'; 
  nowArtist.textContent = track.artist || 'Local file'; 
  coverLarge.innerHTML = ''; 
  
  if (track.cover) { 
    const img = document.createElement('img'); 
    img.src = track.cover; 
    img.alt = 'cover'; 
    coverLarge.appendChild(img); 
  } else { 
    coverLarge.textContent = (track.title || '♪').charAt(0); 
  } 
  
  audio.load(); 
  progressBar.style.width = '0%'; 
  currentTimeEl.textContent = '0:00'; 
  durationTimeEl.textContent = '0:00'; 
  highlightActive(); 
  savePlaylist(); 
  initAudioCtx(); 
  updateBackground(track.cover); 
}

function playAudio() { 
  if (!playlist.length) return; 
  
  initAudioCtx(); 
  
  audio.play().then(() => { 
    isPlaying = true; 
    playBtn.textContent = '⏸'; 
  }).catch(() => {});
} 

function pauseAudio() { 
  audio.pause(); 
  isPlaying = false; 
  playBtn.textContent = '▶'; 
}

// ---------- REMOVE TRACK ----------
function removeTrack(index) {
  if (index < 0 || index >= playlist.length) return;
  
  // revoke blob URL if any
  try { 
    const s = playlist[index].src; 
    if (typeof s === 'string' && s.startsWith('blob:')) { 
      URL.revokeObjectURL(s); 
    } 
  } catch (e) {}

  const wasPlayingThis = (index === currentIndex);
  playlist.splice(index, 1);

  // adjust currentIndex
  if (playlist.length === 0) { // cleared
    audio.pause(); 
    audio.removeAttribute('src'); 
    audio.load(); 
    nowTitle.textContent = 'Select or drop a song'; 
    nowArtist.textContent = '—'; 
    coverLarge.textContent = '♪'; 
    updateBackground(null); 
    currentIndex = 0; 
    savePlaylist(); 
    renderPlaylist(); 
    return;
  }

  if (currentIndex > index) currentIndex--;
  else if (wasPlayingThis) { // if removed track was playing, load next sensible track
    currentIndex = Math.min(index, playlist.length - 1);
    loadTrack(currentIndex);
    pauseAudio(); // don't auto-play after removal
  }

  savePlaylist(); 
  renderPlaylist(); 
  highlightActive();
}

// ---------- CONTROLS ----------
playBtn.addEventListener('click', () => { 
  if (!audio.src) loadTrack(currentIndex); 
  isPlaying ? pauseAudio() : playAudio(); 
});

prevBtn.addEventListener('click', () => { 
  previousTrack(); 
});

nextBtn.addEventListener('click', () => { 
  nextTrack(); 
});

function nextTrack() { 
  if (!playlist.length) return; 
  
  let previousIndex = currentIndex; 
  
  if (shuffle) { 
    let newIndex; 
    do { 
      newIndex = Math.floor(Math.random() * playlist.length); 
    } while (playlist.length > 1 && newIndex === previousIndex); 
    
    currentIndex = newIndex; 
  } else { 
    currentIndex = (currentIndex + 1) % playlist.length; 
  } 
  
  loadTrack(currentIndex); 
  playAudio(); 
}

function previousTrack() { 
  if (!playlist.length) return; 
  
  let previousIndex = currentIndex; 
  
  if (shuffle) { 
    let newIndex; 
    do { 
      newIndex = Math.floor(Math.random() * playlist.length); 
    } while (playlist.length > 1 && newIndex === previousIndex); 
    
    currentIndex = newIndex; 
  } else { 
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length; 
  } 
  
  loadTrack(currentIndex); 
  playAudio(); 
}

shuffleBtn.addEventListener('click', () => { 
  shuffle = !shuffle; 
  shuffleBtn.classList.toggle('active', shuffle); 
});

repeatBtn.addEventListener('click', () => { 
  repeat = !repeat; 
  repeatBtn.classList.toggle('active', repeat); 
});

audio.addEventListener('ended', () => { 
  if (repeat) { 
    loadTrack(currentIndex); 
    playAudio(); 
  } else nextTrack(); 
});

audio.addEventListener('timeupdate', () => { 
  if (audio.duration) { 
    progressBar.style.width = (audio.currentTime / audio.duration) * 100 + '%'; 
    currentTimeEl.textContent = formatTime(audio.currentTime); 
  } 
});

audio.addEventListener('loadedmetadata', () => { 
  durationTimeEl.textContent = formatTime(audio.duration); 
});

progress.addEventListener('click', e => { 
  const r = progress.getBoundingClientRect(); 
  const pct = (e.clientX - r.left) / r.width; 
  
  if (audio.duration) audio.currentTime = pct * audio.duration; 
});

volume.addEventListener('input', e => { 
  audio.volume = e.target.value; 
});

// Utility function to extract album art from audio file
async function extractAlbumArt(file) {
  return new Promise((resolve) => {
    // Try to use a third-party library approach or manual parsing
    // For now, we'll implement a simplified ID3 parser
    const reader = new FileReader();
    
    reader.onload = function(event) {
      const buffer = event.target.result;
      const data = new Uint8Array(buffer);
      
      // Look for ID3 header
      if (data[0] === 73 && data[1] === 68 && data[2] === 51) { // "ID3"
        try {
          // Parse ID3v2 header
          const majorVersion = data[3];
          const revision = data[4];
          
          // Unsynchronize flag (bit 7 of byte 5)
          const unsyncFlag = (data[5] & 0x80) !== 0;
          // Extended header flag (bit 6 of byte 5)
          const extHeaderFlag = (data[5] & 0x40) !== 0;
          
          // Size is encoded as sync-safe integer (bits 7-0 of each byte)
          const tagSize = ((data[6] & 0x7f) << 21) | ((data[7] & 0x7f) << 14) | ((data[8] & 0x7f) << 7) | (data[9] & 0x7f);
          
          let offset = 10; // Past header
          
          // Skip extended header if present
          if (extHeaderFlag) {
            const extHeaderSize = ((data[offset] & 0xFF) << 24) | ((data[offset + 1] & 0xFF) << 16) | ((data[offset + 2] & 0xFF) << 8) | (data[offset + 3] & 0xFF);
            offset += 4 + extHeaderSize;
          }
          
          // Parse frames
          while (offset < tagSize + 10) { // tag starts at offset 0, header is 10 bytes
            // Frame ID (4 bytes in ID3v2.3+, 3 bytes in ID3v2.2)
            const frameId = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2], data[offset + 3]);
            
            // In ID3v2.2, frame IDs are 3 chars, so check for that too
            const frameIdV22 = String.fromCharCode(data[offset], data[offset + 1], data[offset + 2]);
            
            if (frameId === "APIC" || frameIdV22 === "PIC") {
              // Found album art frame
              let frameOffset = offset + 10; // Skip frame header (10 bytes for ID3v2.3+)
              
              if (frameIdV22 === "PIC") {
                // ID3v2.2 has 6-byte header
                frameOffset = offset + 6;
              }
              
              // For APIC frame:
              // Byte 10: Text encoding
              const encoding = data[frameOffset];
              frameOffset++;
              
              // MIME type (null-terminated string)
              let mimeTypeEnd = frameOffset;
              while (data[mimeTypeEnd] !== 0 && mimeTypeEnd < data.length) {
                mimeTypeEnd++;
              }
              const mimeType = String.fromCharCode.apply(null, data.subarray(frameOffset, mimeTypeEnd));
              frameOffset = mimeTypeEnd + 1;
              
              // Picture type (byte)
              frameOffset++;
              
              // Description (null-terminated string)
              let descEnd = frameOffset;
              while (data[descEnd] !== 0 && descEnd < data.length) {
                descEnd++;
              }
              frameOffset = descEnd + 1;
              
              // Image data starts here
              // Frame size was stored in the frame header
              let frameSize;
              if (frameIdV22 === "PIC") {
                // In ID3v2.2, frame size is 3 bytes
                frameSize = (data[offset + 3] << 16) | (data[offset + 4] << 8) | data[offset + 5];
              } else {
                // In ID3v2.3+, frame size is 4 bytes
                frameSize = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7];
              }
              
              // Calculate image data size
              const descriptionLength = descEnd - (mimeTypeEnd + 1) + 1; // +1 for null terminator
              const imageDataStart = frameOffset;
              
              // The image data size is the frame size minus all the preceding fields
              const imageDataEnd = Math.min(imageDataStart + (frameSize - (encoding === 0 ? 1 : 2) - mimeType.length - 1 - 1 - descriptionLength), data.length);
              
              // Extract image data
              const imageData = data.subarray(imageDataStart, imageDataEnd);
              
              // Convert to base64
              let binary = '';
              for (let i = 0; i < imageData.length; i++) {
                binary += String.fromCharCode(imageData[i]);
              }
              const base64 = btoa(binary);
              
              // Use proper MIME type
              let properMimeType = mimeType;
              if (frameIdV22 === "PIC") {
                // In ID3v2.2, image format is 3-char identifier
                if (mimeType === "JPG") properMimeType = "image/jpeg";
                else if (mimeType === "PNG") properMimeType = "image/png";
              }
              
              const coverUrl = `data:${properMimeType};base64,${base64}`;
              resolve(coverUrl);
              return;
            }
            
            // Calculate next frame offset
            let frameSize;
            if (frameIdV22 === "PIC") {
              // ID3v2.2: 6-byte header, 3-byte size
              frameSize = (data[offset + 3] << 16) | (data[offset + 4] << 8) | data[offset + 5];
              offset += 6 + frameSize;
            } else {
              // ID3v2.3+: 10-byte header, 4-byte size
              frameSize = (data[offset + 4] << 24) | (data[offset + 5] << 16) | (data[offset + 6] << 8) | data[offset + 7];
              offset += 10 + frameSize;
            }
          }
        } catch (e) {
          console.log('Error parsing ID3 tags:', e);
        }
      }
      
      // If no album art found, resolve with null
      resolve(null);
    };
    
    reader.onerror = function() {
      resolve(null);
    };
    
    // Read first portion of the file to find metadata
    const slice = file.slice(0, Math.min(2 * 1024 * 1024, file.size)); // Read first 2MB
    reader.readAsArrayBuffer(slice);
  });
}

// ---------- DRAG & DROP ----------
async function handleFiles(files) { 
  // Store current playback state
  const wasPlaying = isPlaying;
  const currentTrackIndex = currentIndex;
  const currentTrackTime = audio.currentTime;
  const originalPlaylistLength = playlist.length;
  
  // Process files with album art extraction
  const promises = [...files].map(async (file) => {
    if (file.type.startsWith('audio/')) {
      const url = URL.createObjectURL(file);
      
      // Extract album art if available
      let cover = await extractAlbumArt(file);
      
      return {
        title: file.name.replace(/\.[^/.]+$/, ''), 
        artist: 'Local file', 
        src: url, 
        fileName: file.name,
        cover: cover || undefined // Only add cover if it exists
      };
    }
    return null;
  });
  
  const newTracks = (await Promise.all(promises)).filter(track => track !== null);
  
  // Add tracks to playlist
  playlist.push(...newTracks);
  
  renderPlaylist(); 
  savePlaylist(); 
  
  // Restore previous playback state
  if (wasPlaying && currentTrackIndex < originalPlaylistLength) {
    // If music was playing before adding files, continue from the same track
    loadTrack(currentTrackIndex);
    audio.currentTime = currentTrackTime;
    playAudio();
  } else if (!wasPlaying && originalPlaylistLength > 0 && currentTrackIndex < playlist.length) {
    // If wasn't playing but we have a valid current track, update the display
    loadTrack(currentTrackIndex);
  } else if (playlist.length > 0 && originalPlaylistLength === 0) {
    // Only load first track if the playlist was empty before
    loadTrack(0);
    playAudio(); // Automatically start playing when first songs are added
  }
}

dropzone.addEventListener('click', () => fileInput.click()); 

fileInput.addEventListener('change', () => handleFiles(fileInput.files)); 

['dragenter', 'dragover'].forEach(ev => 
  dropzone.addEventListener(ev, e => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    dropzone.classList.add('dragover'); 
  })
);

['dragleave', 'drop'].forEach(ev => 
  dropzone.addEventListener(ev, e => { 
    e.preventDefault(); 
    e.stopPropagation(); 
    dropzone.classList.remove('dragover'); 
  })
);

dropzone.addEventListener('drop', e => { 
  handleFiles(e.dataTransfer.files); 
});

// ---------- COVER UPLOAD ----------
changeCoverBtn.addEventListener('click', () => { 
  coverInput.click(); 
});

coverInput.addEventListener('change', async () => { 
  const f = coverInput.files && coverInput.files[0]; 
  
  if (!f) return; 
  
  const reader = new FileReader(); 
  reader.onload = (ev) => { 
    const data = ev.target.result; 
    
    if (playlist[currentIndex]) { 
      // Save the current playback state
      const wasPlaying = isPlaying;
      const currentTime = audio.currentTime;
      
      playlist[currentIndex].cover = data; 
      savePlaylist(); 
      renderPlaylist(); 
      
      // Update the cover without reloading the entire track
      if (playlist[currentIndex].cover) { 
        const img = document.createElement('img'); 
        img.src = playlist[currentIndex].cover; 
        img.alt = 'cover'; 
        coverLarge.innerHTML = '';
        coverLarge.appendChild(img); 
      } else { 
        coverLarge.textContent = (playlist[currentIndex].title || '♪').charAt(0); 
      }
      
      updateBackground(playlist[currentIndex].cover);
      
      // Restore playback state if it was playing
      if (wasPlaying) {
        audio.currentTime = currentTime;
        playAudio();
      }
    } 
  }; 
  
  reader.readAsDataURL(f); 
});

removeCoverBtn.addEventListener('click', () => { 
  if (playlist[currentIndex] && playlist[currentIndex].cover) { 
    // Save the current playback state
    const wasPlaying = isPlaying;
    const currentTime = audio.currentTime;
    
    delete playlist[currentIndex].cover; 
    savePlaylist(); 
    renderPlaylist(); 
    
    // Update the cover without reloading the entire track
    coverLarge.textContent = (playlist[currentIndex].title || '♪').charAt(0); 
    updateBackground(null);
    
    // Restore playback state if it was playing
    if (wasPlaying) {
      audio.currentTime = currentTime;
      playAudio();
    }
  } 
});

// ---------- INIT ----------
renderPlaylist(); 

if (playlist.length > 0) {
  loadTrack(0);
}

window.addEventListener('keydown', e => { 
  if (e.code === 'Space') { 
    e.preventDefault(); 
    playBtn.click(); 
  } 
  
  if (e.code === 'ArrowRight') { 
    nextBtn.click(); 
  } 
  
  if (e.code === 'ArrowLeft') { 
    prevBtn.click(); 
  } 
  
  if (e.key === 's' || e.key === 'S') { 
    shuffleBtn.click(); 
  } 
  
  if (e.key === 'r' || e.key === 'R') { 
    repeatBtn.click(); 
  } 
});
