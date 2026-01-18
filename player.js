/**
 * StreamFlow Ultimate Player Controller
 * Handles streaming logic, UI interactions, OSD, and settings.
 */

class StreamFlowUltimate {
    constructor() {
        // --- Core Elements ---
        this.video = document.getElementById('videoPlayer');
        this.urlInput = document.getElementById('videoUrl');
        this.loadBtn = document.getElementById('loadBtn');
        this.playerContainer = document.getElementById('playerContainer');
        this.playerSection = document.getElementById('playerSection');
        this.urlSection = document.getElementById('urlSection');
        this.backBtn = document.getElementById('backBtn');
        
        // --- Controls ---
        this.playPauseBtn = document.getElementById('playPauseBtn');
        this.bigPlayBtn = document.getElementById('bigPlayBtn');
        this.volumeSlider = document.getElementById('volumeSlider');
        this.muteBtn = document.getElementById('muteBtn');
        this.fullscreenBtn = document.getElementById('fullscreenBtn');
        this.pipBtn = document.getElementById('pipBtn');
        
        // --- Progress ---
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressPlayed');
        this.progressBuffer = document.getElementById('progressBuffer');
        this.progressTooltip = document.getElementById('progressTooltip');
        this.currentTimeEl = document.getElementById('currentTime');
        this.durationEl = document.getElementById('duration');
        
        // --- Settings & OSD ---
        this.settingsBtn = document.getElementById('settingsBtn');
        this.settingsMenu = document.getElementById('settingsMenu');
        this.useProxy = document.getElementById('useProxy');
        
        // --- State ---
        this.isPlaying = false;
        this.osdTimeout = null;
        this.controlsTimeout = null;
        this.isDragging = false;
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.bindVideoEvents();
        this.checkUrlParam();
        
        // Initialize volume
        this.updateVolumeIcon(1);
    }
    
    bindEvents() {
        // UI Navigation
        this.loadBtn.addEventListener('click', () => this.loadVideo());
        this.urlInput.addEventListener('keypress', (e) => e.key === 'Enter' && this.loadVideo());
        this.backBtn.addEventListener('click', () => this.goHome());
        document.getElementById('retryBtn').addEventListener('click', () => this.loadVideo());
        
        // Player Controls
        const togglePlay = () => this.togglePlay();
        this.playPauseBtn.addEventListener('click', togglePlay);
        this.bigPlayBtn.addEventListener('click', togglePlay);
        this.video.addEventListener('click', togglePlay);
        
        this.fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
        this.pipBtn.addEventListener('click', () => this.togglePiP());
        
        // Volume
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.volumeSlider.addEventListener('input', (e) => {
            this.video.volume = e.target.value;
            this.video.muted = false;
            this.updateVolumeIcon(this.video.volume);
            this.showOSD(this.video.volume > 0.5 ? 'osdVolUp' : 'osdVolDown');
        });
        
        // Progress Bar Interaction
        this.progressContainer.addEventListener('click', (e) => this.seek(e));
        this.progressContainer.addEventListener('mousemove', (e) => this.hoverProgress(e));
        this.progressContainer.addEventListener('mousedown', () => this.isDragging = true);
        document.addEventListener('mouseup', () => this.isDragging = false);
        document.addEventListener('mousemove', (e) => this.isDragging && this.seek(e));
        
        // Settings Menu
        this.settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.settingsMenu.classList.toggle('active');
        });
        document.addEventListener('click', (e) => {
            if (!this.settingsMenu.contains(e.target) && e.target !== this.settingsBtn) {
                this.settingsMenu.classList.remove('active');
            }
        });
        
        // Speed Options
        document.querySelectorAll('.speed-opt').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const speed = parseFloat(e.target.dataset.speed);
                this.video.playbackRate = speed;
                document.querySelectorAll('.speed-opt').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
        
        // Keyboard Shortcuts
        document.addEventListener('keydown', (e) => this.handleKeys(e));
        
        // Mouse movement for controls visibility
        this.playerContainer.addEventListener('mousemove', () => {
            this.playerContainer.classList.add('show-controls');
            clearTimeout(this.controlsTimeout);
            this.controlsTimeout = setTimeout(() => {
                if (this.isPlaying) this.playerContainer.classList.remove('show-controls');
            }, 3000);
        });
    }
    
    bindVideoEvents() {
        this.video.addEventListener('play', () => {
            this.isPlaying = true;
            this.playerContainer.classList.add('playing');
            this.showOSD('osdPlay');
            document.getElementById('loadingOverlay').classList.remove('active');
        });
        
        this.video.addEventListener('pause', () => {
            this.isPlaying = false;
            this.playerContainer.classList.remove('playing');
            this.showOSD('osdPause');
        });
        
        this.video.addEventListener('timeupdate', () => this.updateProgress());
        this.video.addEventListener('progress', () => this.updateBuffer());
        
        this.video.addEventListener('waiting', () => {
            document.getElementById('loadingOverlay').classList.add('active');
        });
        this.video.addEventListener('canplay', () => {
            document.getElementById('loadingOverlay').classList.remove('active');
            document.getElementById('errorOverlay').classList.remove('active');
        });
        
        this.video.addEventListener('loadedmetadata', () => {
            this.durationEl.textContent = this.formatTime(this.video.duration);
        });
        
        this.video.addEventListener('error', () => {
            document.getElementById('loadingOverlay').classList.remove('active');
            document.getElementById('errorOverlay').classList.add('active');
        });
    }
    
    loadVideo() {
        let url = this.urlInput.value.trim();
        if (!url) return;
        
        if (this.useProxy.checked) {
            url = `http://localhost:4000/proxy?url=${encodeURIComponent(url)}`;
        }
        
        this.urlSection.classList.add('hidden');
        this.playerSection.classList.add('active');
        
        // Determine type
        if (url.includes('.m3u8') && typeof Hls !== 'undefined') {
            const hls = new Hls();
            hls.loadSource(url);
            hls.attachMedia(this.video);
        } else {
            this.video.src = url;
        }
        
        this.video.load();
        this.video.play().catch(e => console.log("Auto-play blocked"));
    }
    
    goHome() {
        this.video.pause();
        this.video.src = "";
        this.playerSection.classList.remove('active');
        this.urlSection.classList.remove('hidden');
        this.playerContainer.classList.remove('playing');
        document.getElementById('errorOverlay').classList.remove('active');
    }
    
    togglePlay() {
        this.video.paused ? this.video.play() : this.video.pause();
    }
    
    toggleMute() {
        this.video.muted = !this.video.muted;
        this.updateVolumeIcon(this.video.muted ? 0 : this.video.volume);
        this.volumeSlider.value = this.video.muted ? 0 : this.video.volume;
        this.showOSD(this.video.muted ? 'osdVolDown' : 'osdVolUp');
    }
    
    updateVolumeIcon(vol) {
        const hybrid = document.querySelector('.volume-hybrid');
        if (vol === 0 || this.video.muted) {
            document.querySelector('.i-vol-high').style.display = 'none';
            document.querySelector('.i-vol-mute').style.display = 'block';
        } else {
            document.querySelector('.i-vol-high').style.display = 'block';
            document.querySelector('.i-vol-mute').style.display = 'none';
        }
    }
    
    seek(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        this.video.currentTime = pos * this.video.duration;
    }
    
    hoverProgress(e) {
        const rect = this.progressContainer.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        const time = pos * this.video.duration;
        this.progressTooltip.textContent = this.formatTime(time);
        this.progressTooltip.style.left = `${pos * 100}%`;
    }
    
    updateProgress() {
        if (!this.video.duration) return;
        const pct = (this.video.currentTime / this.video.duration) * 100;
        this.progressFill.style.width = `${pct}%`;
        this.currentTimeEl.textContent = this.formatTime(this.video.currentTime);
    }
    
    updateBuffer() {
        if (!this.video.duration) return;
        if (this.video.buffered.length > 0) {
            const end = this.video.buffered.end(this.video.buffered.length - 1);
            const pct = (end / this.video.duration) * 100;
            this.progressBuffer.style.width = `${pct}%`;
        }
    }
    
    showOSD(id) {
        // Hide all OSDs
        document.querySelectorAll('.osd-icon').forEach(el => el.classList.remove('active'));
        
        const el = document.getElementById(id);
        if (el) {
            el.classList.add('active');
            clearTimeout(this.osdTimeout);
            this.osdTimeout = setTimeout(() => {
                el.classList.remove('active');
            }, 600);
        }
    }
    
    toggleFullscreen() {
        if (!document.fullscreenElement) {
            this.playerContainer.requestFullscreen();
            this.playerContainer.classList.add('fullscreen');
        } else {
            document.exitFullscreen();
            this.playerContainer.classList.remove('fullscreen');
        }
    }
    
    async togglePiP() {
        if (document.pictureInPictureElement) {
            await document.exitPictureInPicture();
        } else {
            await this.video.requestPictureInPicture();
        }
    }
    
    handleKeys(e) {
        if (e.target.tagName === 'INPUT') return;
        
        switch(e.key.toLowerCase()) {
            case ' ':
            case 'k': e.preventDefault(); this.togglePlay(); break;
            case 'f': this.toggleFullscreen(); break;
            case 'm': this.toggleMute(); break;
            case 'arrowright': 
                this.video.currentTime += 10; 
                this.showOSD('osdForward'); 
                break;
            case 'arrowleft': 
                this.video.currentTime -= 10; 
                this.showOSD('osdRewind'); 
                break;
            case 'arrowup': 
                e.preventDefault();
                this.video.volume = Math.min(1, this.video.volume + 0.1); 
                this.volumeSlider.value = this.video.volume;
                this.showOSD('osdVolUp');
                break;
            case 'arrowdown': 
                e.preventDefault();
                this.video.volume = Math.max(0, this.video.volume - 0.1); 
                this.volumeSlider.value = this.video.volume;
                this.showOSD('osdVolDown');
                break;
        }
    }
    
    formatTime(seconds) {
        if (!seconds) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }
    
    checkUrlParam() {
        const params = new URLSearchParams(window.location.search);
        const url = params.get('url');
        if (url) {
            this.urlInput.value = url;
            this.loadVideo();
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    window.player = new StreamFlowUltimate();
});
