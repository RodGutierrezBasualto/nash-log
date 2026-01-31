// Cosmic Gallery - main.js
// Fetch NASA API images and render with retro-futurist, neon UI
document.addEventListener('DOMContentLoaded', function () {
    const GALLERY = document.getElementById('gallery');
    const LOADER = document.getElementById('loader');
    const MODAL = document.getElementById('modal');
    const MODAL_IMG = document.getElementById('modal-img');
    const MODAL_TITLE = document.getElementById('modal-title');
    const MODAL_DESC = document.getElementById('modal-desc');
    const MODAL_DATE = document.getElementById('modal-date');

    // NASA APOD API (use demo key, public)
    const API = 'https://api.nasa.gov/planetary/apod?count=9&thumbs=true&api_key=DEMO_KEY';

    function showLoader(show) {
        LOADER.style.display = show ? 'block' : 'none';
    }

    function showModal(img, title, desc, date) {
        MODAL.classList.add('active');
        MODAL_IMG.src = img;
        MODAL_TITLE.textContent = title;
        MODAL_DESC.innerHTML = desc || '';
        MODAL_DATE.innerHTML = `<span style='color:#c77dff;'>${date}</span>` || '';
    }

    window.closeModal = function () {
        MODAL.classList.remove('active');
        MODAL_IMG.src = '';
    };
    MODAL.addEventListener('click', function (e) {
        if (e.target === MODAL) window.closeModal();
    });

    async function fetchImages() {
        showLoader(true);
        try {
            let resp = await fetch(API);
            let data = await resp.json();
            if (!Array.isArray(data)) throw new Error('Failed to load images');
            let images = data.filter(e => (e.media_type === 'image' || e.media_type === 'video'));
            renderGallery(images);
        } catch (e) {
            GALLERY.innerHTML = `<div style='color:#ffb3c6;'>Could not load images. Try again later.<br/>[${e.toString()}]</div>`;
        } finally {
            showLoader(false);
        }
    }

    function renderGallery(images) {
        GALLERY.innerHTML = '';
        images.forEach(img => {
            let url = img.media_type === 'video' ? img.thumbnail_url : img.url;
            let title = img.title || 'Untitled';
            let desc = img.explanation || '';
            let date = img.date || '';
            let card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <img src="${url}" alt="${title}" loading="lazy">
                <div class='info'>
                    <div class='title'>${title}</div>
                    <div class='desc'>${desc.slice(0, 110)}${desc.length > 110 ? '…' : ''}</div>
                    <div class='date'>${date}</div>
                </div>
            `;
            card.onclick = () => showModal(url, title, desc, date);
            GALLERY.appendChild(card);
        });
    }

    fetchImages();
});