
    let mediaItems = [];        // will contain only image objects
    let mediaToDelete = null;

    let currentModalIndex = -1;
    let currentFilteredList = []; // simply mediaItems, no filter

    const grid = document.getElementById('grid');
    const modal = document.getElementById('modal');
    const mImg = document.getElementById('mImg');
    const closeModalBtn = document.getElementById('closeModal');
    const passwordModal = document.getElementById('passwordModal');
    const adminPassword = document.getElementById('adminPassword');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');
    const passwordError = document.getElementById('passwordError');
    const totalCount = document.getElementById('totalCount');
    const imageCount = document.getElementById('imageCount');
    const navPrev = document.getElementById('navPrev');
    const navNext = document.getElementById('navNext');

    // ---------- FALLBACK: real image entries from user's Cloudinary data ----------
    const FALLBACK_IMAGES = [
      {
        thumbnail: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto:low,w_400/IMG20260208091305",
        high_quality: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto,w_1280/IMG20260208091305"
      },
      {
        thumbnail: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto:low,w_400/IMG20260208091328",
        high_quality: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto,w_1280/IMG20260208091328"
      },
      {
        thumbnail: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto:low,w_400/IMG20260208091732",
        high_quality: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto,w_1280/IMG20260208091732"
      },
      {
        thumbnail: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto:low,w_400/IMG20260208092447",
        high_quality: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto,w_1280/IMG20260208092447"
      },
      {
        thumbnail: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto:low,w_400/IMG20260208092654",
        high_quality: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto,w_1280/IMG20260208092654"
      },
      {
        thumbnail: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto:low,w_400/IMG20260208092733",
        high_quality: "https://res.cloudinary.com/dnssyb7hu/image/upload/c_scale,f_auto,q_auto,w_1280/IMG20260208092733"
      }
    ];

    // ---------- stats update ----------
    function updateStats() {
      const total = mediaItems.length;
      totalCount.textContent = total;
      imageCount.textContent = total;   // all are images
    }

    function showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<i class="fas fa-check-circle" style="color: #2563eb;"></i> ${message}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2600);
    }

    // ---------- SHARE (copy link) ----------
    window.shareMedia = async function(url) {
      try {
        await navigator.clipboard.writeText(url);
        showToast('🔗 Link copied');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = url;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Link copied');
      }
    };

    // ---------- DOWNLOAD – with smart extension from blob type ----------
    window.downloadMedia = async function(url) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);

        // Extract base name from URL (last segment before query)
        let baseName = url.split('/').pop().split('?')[0] || 'image';
        // Remove any .trashed- prefix if present
        baseName = baseName.replace(/^\.trashed-\d+-/, '');

        // Determine extension from blob MIME type
        let extension = '';
        const mime = blob.type;
        if (mime.includes('jpeg') || mime.includes('jpg')) extension = '.jpg';
        else if (mime.includes('png')) extension = '.png';
        else if (mime.includes('gif')) extension = '.gif';
        else if (mime.includes('webp')) extension = '.webp';
        else if (mime.includes('svg')) extension = '.svg';
        else extension = ''; // let browser decide or no extension

        a.download = baseName + extension;
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('Download started');
      } catch {
        showToast('Download failed');
      }
    };

    // ---------- DELETE prompt (unchanged) ----------
    window.deleteMediaPrompt = function(url) {
      mediaToDelete = url;
      passwordModal.style.display = 'flex';
      adminPassword.value = '';
      passwordError.style.display = 'none';
    };

    async function confirmDeleteAction() {
      const pwd = adminPassword.value.trim();
      if (!pwd) {
        passwordError.textContent = 'Password required';
        passwordError.style.display = 'block';
        return;
      }
      try {
        const response = await fetch('/api/media', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pwd, url: mediaToDelete })
        });
        if (response.ok) {
          mediaItems = mediaItems.filter(item => item.high_quality !== mediaToDelete);
          render();
          passwordModal.style.display = 'none';
          mediaToDelete = null;
          showToast('Image deleted');
          if (modal.style.display === 'flex' && mImg.src === mediaToDelete) {
            closeModalFunc();
          }
        } else {
          passwordError.textContent = 'Incorrect password';
          passwordError.style.display = 'block';
        }
      } catch {
        passwordError.textContent = 'Network error';
        passwordError.style.display = 'block';
      }
    }

    function cancelDeleteFunc() {
      passwordModal.style.display = 'none';
      mediaToDelete = null;
    }

    // ---------- RENDER – , no filter logic ----------
    function render() {
      if (!mediaItems.length) {
        grid.innerHTML = `<div class="error-state"><i class="fas fa-images" style="color: #aaa;"></i><h3 style="margin-bottom: 12px; font-weight: 400;">No Images Found</h3><p style="color: #999;">Add some images to get started</p></div>`;
        updateStats();
        return;
      }

      let html = '';
      mediaItems.forEach((item) => {
        const thumb = item.thumbnail;
        const high = item.high_quality;

        html += `<div class="masonry-item" data-url="${high}">`;
        html += `<img src="${thumb}" loading="lazy" alt="gallery image">`;
        // always image badge
        html += `<div class="media-badge"><i class="fas fa-image"></i></div>`;
        html += `<div class="item-actions">`;
        html += `<button class="item-btn" onclick="event.stopPropagation(); downloadMedia('${high}')" title="Download"><i class="fas fa-download"></i></button>`;
        html += `<button class="item-btn" onclick="event.stopPropagation(); shareMedia('${high}')" title="Copy link"><i class="fas fa-link"></i></button>`;
        html += `<button class="item-btn delete-item-btn" onclick="event.stopPropagation(); deleteMediaPrompt('${high}')" title="Delete"><i class="fas fa-trash-alt"></i></button>`;
        html += `</div>`;
        html += `</div>`;
      });

      grid.innerHTML = html;

      // attach click to open modal (no video hover effects)
      grid.querySelectorAll('.masonry-item').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.item-btn')) return;
          const url = el.dataset.url;
          openModal(url);
        });
      });

      updateStats();
    }

    // ---------- MODAL: only image ----------
    function openModal(url) {
      // currentFilteredList is all images (no filter)
      currentFilteredList = mediaItems.slice();
      currentModalIndex = currentFilteredList.findIndex(item => item.high_quality === url);

      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      mImg.src = url;
      mImg.style.display = 'block';

      // update toolbar actions for this image
      document.getElementById('modalShareBtn').onclick = (e) => { e.stopPropagation(); shareMedia(url); };
      document.getElementById('modalDownloadBtn').onclick = (e) => { e.stopPropagation(); downloadMedia(url); };
      document.getElementById('modalDeleteBtn').onclick = (e) => {
        e.stopPropagation();
        deleteMediaPrompt(url);
      };
    }

    // ---------- NAVIGATE with loading arrows ----------
    function navigateModal(direction) {
      if (currentFilteredList.length === 0 || currentModalIndex === -1) return;

      const arrow = direction === -1 ? navPrev : navNext;
      arrow.classList.add('loading');

      let newIndex = currentModalIndex + direction;
      if (newIndex < 0) newIndex = currentFilteredList.length - 1;
      if (newIndex >= currentFilteredList.length) newIndex = 0;

      const nextItem = currentFilteredList[newIndex];
      if (!nextItem) {
        arrow.classList.remove('loading');
        return;
      }

      const nextUrl = nextItem.high_quality;
      // preload image before switching
      const tempImg = new Image();
      tempImg.src = nextUrl;
      tempImg.onload = () => {
        currentModalIndex = newIndex;
        mImg.src = nextUrl;
        arrow.classList.remove('loading');

        // update modal buttons for new image
        document.getElementById('modalShareBtn').onclick = (e) => { e.stopPropagation(); shareMedia(nextUrl); };
        document.getElementById('modalDownloadBtn').onclick = (e) => { e.stopPropagation(); downloadMedia(nextUrl); };
        document.getElementById('modalDeleteBtn').onclick = (e) => {
          e.stopPropagation();
          deleteMediaPrompt(nextUrl);
        };
      };
      tempImg.onerror = () => {
        arrow.classList.remove('loading');
        showToast('Failed to load image');
      };
    }

    function closeModalFunc() {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
      currentModalIndex = -1;
      currentFilteredList = [];
      navPrev.classList.remove('loading');
      navNext.classList.remove('loading');
    }

    // ---------- LOAD REAL DATA, FILTER  ----------
    async function loadMedia() {
      grid.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p style="color: #999;">Loading images...</p></div>`;

      try {
        const res = await fetch('/api/media');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            // STRICT FILTER: keep only items where high_quality contains "/image/upload/"
            mediaItems = data.filter(item =>
              item.high_quality && item.high_quality.includes('/image/upload/')
            );
          } else {
            mediaItems = [];
          }
        } else {
          // fallback to real Cloudinary image entries (no pexels, no videos)
          mediaItems = [...FALLBACK_IMAGES];
        }
      } catch (error) {
        console.warn('Fetch failed, using fallback image set', error);
        mediaItems = [...FALLBACK_IMAGES];
      }

      // If after all we have zero items, keep fallback
      if (mediaItems.length === 0) {
        mediaItems = [...FALLBACK_IMAGES];
      }

      render();
    }

    // ---------- EVENT LISTENERS ----------
    closeModalBtn.addEventListener('click', closeModalFunc);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModalFunc(); });

    cancelDelete.addEventListener('click', cancelDeleteFunc);
    confirmDelete.addEventListener('click', confirmDeleteAction);
    adminPassword.addEventListener('keypress', (e) => { if (e.key === 'Enter') confirmDeleteAction(); });

    navPrev.addEventListener('click', () => navigateModal(-1));
    navNext.addEventListener('click', () => navigateModal(1));

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (modal.style.display === 'flex') closeModalFunc();
        if (passwordModal.style.display === 'flex') cancelDeleteFunc();
      }
      if (modal.style.display === 'flex') {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateModal(-1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateModal(1);
        }
      }
    });

    // START
    loadMedia();
