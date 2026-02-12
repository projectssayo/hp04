

    let mediaItems = [];
    let currentFilter = 'all';
    let mediaToDelete = null;

    let currentModalIndex = -1;
    let currentFilteredList = [];

    const grid = document.getElementById('grid');
    const modal = document.getElementById('modal');
    const mImg = document.getElementById('mImg');
    const mVid = document.getElementById('mVid');
    const closeModalBtn = document.getElementById('closeModal');
    const passwordModal = document.getElementById('passwordModal');
    const adminPassword = document.getElementById('adminPassword');
    const cancelDelete = document.getElementById('cancelDelete');
    const confirmDelete = document.getElementById('confirmDelete');
    const passwordError = document.getElementById('passwordError');
    const totalCount = document.getElementById('totalCount');
    const imageCount = document.getElementById('imageCount');
    const videoCount = document.getElementById('videoCount');
    const filterButtons = document.querySelectorAll('.filter-btn');

    const navPrev = document.getElementById('navPrev');
    const navNext = document.getElementById('navNext');

    function isVideo(url) {
      return url.includes('/video/') || /\.(mp4|webm|mov)$/i.test(url);
    }

    function updateStats() {
      const total = mediaItems.length;
      const images = mediaItems.filter(item => !isVideo(item.high_quality)).length;
      const videos = mediaItems.filter(item => isVideo(item.high_quality)).length;
      totalCount.textContent = total;
      imageCount.textContent = images;
      videoCount.textContent = videos;
    }

    function showToast(message) {
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<i class="fas fa-check-circle" style="color: #2563eb;"></i> ${message}`;
      document.body.appendChild(toast);
      setTimeout(() => toast.remove(), 2600);
    }

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

    window.downloadMedia = async function(url) {
      try {
        const response = await fetch(url);
        const blob = await response.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = url.split('/').pop().split('?')[0] || 'download';
        a.click();
        URL.revokeObjectURL(a.href);
        showToast('Download started');
      } catch {
        showToast('Download failed');
      }
    };

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
          showToast('Media deleted');
          if (modal.style.display === 'flex' && (mImg.src === mediaToDelete || mVid.src === mediaToDelete)) {
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



    function render() {
      if (!mediaItems.length) {
        grid.innerHTML = `<div class="error-state"><i class="fas fa-images" style="color: #aaa;"></i><h3 style="margin-bottom: 12px; font-weight: 400;">No Media Found</h3><p style="color: #999;">Add some media to get started</p></div>`;
        updateStats();
        return;
      }

      let filtered = mediaItems;
      if (currentFilter === 'image') filtered = mediaItems.filter(item => !isVideo(item.high_quality));
      else if (currentFilter === 'video') filtered = mediaItems.filter(item => isVideo(item.high_quality));

      if (filtered.length === 0) {
        grid.innerHTML = `<div class="error-state"><i class="fas fa-filter"></i><h3 style="margin-bottom: 12px; font-weight: 400;">No items match</h3><p>Try a different filter</p></div>`;
        updateStats();
        return;
      }

      let html = '';
      filtered.forEach((item) => {
        const isVid = isVideo(item.high_quality);
        const thumb = item.thumbnail;
        const high = item.high_quality;

        html += `<div class="masonry-item" data-url="${high}" data-is-video="${isVid}">`;

        if (isVid) {
          html += `<video src="${thumb}" preload="metadata" muted loop playsinline></video>`;
          html += `<div class="video-play-icon"><i class="fas fa-play"></i></div>`;
        } else {
          html += `<img src="${thumb}" loading="lazy" alt="gallery image">`;
        }

        html += `<div class="media-badge">${isVid ? '<i class="fas fa-video"></i>' : '<i class="fas fa-image"></i>'}</div>`;

        html += `<div class="item-actions">`;
        html += `<button class="item-btn" onclick="event.stopPropagation(); downloadMedia('${high}')" title="Download"><i class="fas fa-download"></i></button>`;
        html += `<button class="item-btn" onclick="event.stopPropagation(); shareMedia('${high}')" title="Copy link"><i class="fas fa-link"></i></button>`;
        html += `<button class="item-btn delete-item-btn" onclick="event.stopPropagation(); deleteMediaPrompt('${high}')" title="Delete"><i class="fas fa-trash-alt"></i></button>`;
        html += `</div>`;

        html += `</div>`;
      });

      grid.innerHTML = html;

      grid.querySelectorAll('.masonry-item video').forEach(video => {
        const parent = video.closest('.masonry-item');
        const playIcon = parent?.querySelector('.video-play-icon i');
        parent.addEventListener('mouseenter', () => {
          video.play().catch(() => {});
          if (playIcon) playIcon.className = 'fas fa-pause';
        });
        parent.addEventListener('mouseleave', () => {
          video.pause();
          if (playIcon) playIcon.className = 'fas fa-play';
        });
      });

      grid.querySelectorAll('.masonry-item').forEach(el => {
        el.addEventListener('click', (e) => {
          if (e.target.closest('.item-btn') || e.target.closest('.video-play-icon')) return;
          const url = el.dataset.url;
          const isVid = el.dataset.isVideo === 'true';
          openModal(url, isVid);
        });
      });

      updateStats();
    }



    function openModal(url, isVid) {
      if (currentFilter === 'all') currentFilteredList = mediaItems.slice();
      else if (currentFilter === 'image') currentFilteredList = mediaItems.filter(item => !isVideo(item.high_quality));
      else currentFilteredList = mediaItems.filter(item => isVideo(item.high_quality));

      currentModalIndex = currentFilteredList.findIndex(item => item.high_quality === url);

      modal.style.display = 'flex';
      document.body.style.overflow = 'hidden';

      if (isVid) {
        mImg.style.display = 'none';
        mVid.style.display = 'block';
        mVid.src = url;
        mVid.load();
        mVid.play().catch(() => {});
      } else {
        mVid.style.display = 'none';
        mVid.pause();
        mVid.src = '';
        mImg.style.display = 'block';
        mImg.src = url;
      }

      document.getElementById('modalShareBtn').onclick = (e) => { e.stopPropagation(); shareMedia(url); };
      document.getElementById('modalDownloadBtn').onclick = (e) => { e.stopPropagation(); downloadMedia(url); };
      document.getElementById('modalDeleteBtn').onclick = (e) => {
        e.stopPropagation();
        deleteMediaPrompt(url);
      };
    }



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
      const isVid = isVideo(nextUrl);


      if (!isVid) {
        const tempImg = new Image();
        tempImg.src = nextUrl;
        tempImg.onload = () => {


          currentModalIndex = newIndex;
          mImg.src = nextUrl;
          mImg.style.display = 'block';
          mVid.style.display = 'none';
          mVid.pause();


          arrow.classList.remove('loading');


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
      } else {


        const tempVid = document.createElement('video');
        tempVid.preload = 'auto';
        tempVid.src = nextUrl;
        tempVid.oncanplay = () => {
          currentModalIndex = newIndex;
          mVid.src = nextUrl;
          mVid.style.display = 'block';
          mImg.style.display = 'none';
          mVid.load();
          mVid.play().catch(() => {});
          arrow.classList.remove('loading');


          document.getElementById('modalShareBtn').onclick = (e) => { e.stopPropagation(); shareMedia(nextUrl); };
          document.getElementById('modalDownloadBtn').onclick = (e) => { e.stopPropagation(); downloadMedia(nextUrl); };
          document.getElementById('modalDeleteBtn').onclick = (e) => {
            e.stopPropagation();
            deleteMediaPrompt(nextUrl);
          };
        };
        tempVid.onerror = () => {
          arrow.classList.remove('loading');
          showToast('Failed to load video');
        };
      }
    }

    function closeModalFunc() {
      modal.style.display = 'none';
      document.body.style.overflow = 'auto';
      mVid.pause();
      currentModalIndex = -1;
      currentFilteredList = [];


      navPrev.classList.remove('loading');
      navNext.classList.remove('loading');
    }

    function setFilter(filter) {
      currentFilter = filter;
      filterButtons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === filter);
      });
      render();
    }



    async function loadMedia() {
      grid.innerHTML = `<div class="loading"><div class="loading-spinner"></div><p style="color: #999;">Loading media...</p></div>`;

      const kareriCollection = [
        { thumbnail: 'https://images.pexels.com/photos/2178179/pexels-photo-2178179.jpeg?auto=compress&cs=tinysrgb&w=400&h=500&fit=crop', high_quality: 'https://images.pexels.com/photos/2178179/pexels-photo-2178179.jpeg?auto=compress&cs=tinysrgb&w=1600' },
        { thumbnail: 'https://res.cloudinary.com/demo/video/upload/w_400/dog.mp4', high_quality: 'https://res.cloudinary.com/demo/video/upload/dog.mp4' },
        { thumbnail: 'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=400&h=600&fit=crop', high_quality: 'https://images.pexels.com/photos/2387873/pexels-photo-2387873.jpeg?auto=compress&cs=tinysrgb&w=1600' },
        { thumbnail: 'https://images.pexels.com/photos/1671325/pexels-photo-1671325.jpeg?auto=compress&cs=tinysrgb&w=400&h=300&fit=crop', high_quality: 'https://images.pexels.com/photos/1671325/pexels-photo-1671325.jpeg?auto=compress&cs=tinysrgb&w=1600' },
        { thumbnail: 'https://res.cloudinary.com/demo/video/upload/w_400/elephants.mp4', high_quality: 'https://res.cloudinary.com/demo/video/upload/elephants.mp4' },
        { thumbnail: 'https://images.pexels.com/photos/2553791/pexels-photo-2553791.jpeg?auto=compress&cs=tinysrgb&w=400&h=500&fit=crop', high_quality: 'https://images.pexels.com/photos/2553791/pexels-photo-2553791.jpeg?auto=compress&cs=tinysrgb&w=1600' }
      ];

      try {
        const res = await fetch('/api/media');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length && data[0].thumbnail && data[0].high_quality) {
            mediaItems = data;
          } else {
            mediaItems = kareriCollection;
          }
        } else {
          mediaItems = kareriCollection;
        }
      } catch {
        mediaItems = kareriCollection;
      }
      render();
    }



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

    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => setFilter(btn.dataset.filter));
    });

    loadMedia();
