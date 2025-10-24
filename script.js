// Elementos do player
const playButton = document.querySelector('.play-btn');
const progressBar = document.querySelector('.progress');
const progressFilled = document.querySelector('.progress-filled');
const currentTimeSpan = document.querySelector('.current-time');
const totalTimeSpan = document.querySelector('.total-time');
const volumeBar = document.querySelector('.volume-bar');
const volumeFilled = document.querySelector('.volume-filled');

// Estado inicial
let isPlaying = false;

// Event Listeners
playButton.addEventListener('click', togglePlay);
progressBar.addEventListener('click', setProgress);
volumeBar.addEventListener('click', setVolume);

// Funções do player
function togglePlay() {
    isPlaying = !isPlaying;
    const icon = playButton.querySelector('i');
    
    if (isPlaying) {
        icon.classList.remove('fa-play');
        icon.classList.add('fa-pause');
        // Aqui você adicionaria a lógica para tocar a música
    } else {
        icon.classList.remove('fa-pause');
        icon.classList.add('fa-play');
        // Aqui você adicionaria a lógica para pausar a música
    }
}

function setProgress(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const duration = 225; // 3:45 em segundos
    const time = (clickX / width) * duration;
    
    progressFilled.style.width = `${(clickX / width) * 100}%`;
    updateTimeDisplay(time);
}

function setVolume(e) {
    const width = this.clientWidth;
    const clickX = e.offsetX;
    const volume = clickX / width;
    
    volumeFilled.style.width = `${(clickX / width) * 100}%`;
    // Aqui você adicionaria a lógica para ajustar o volume
}

function updateTimeDisplay(currentTime) {
    const minutes = Math.floor(currentTime / 60);
    const seconds = Math.floor(currentTime % 60);
    currentTimeSpan.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

// Função para adicionar interatividade aos cards de playlist
document.querySelectorAll('.playlist-card').forEach(card => {
    card.addEventListener('mouseenter', () => {
        // Aqui você pode adicionar animações ou efeitos quando o mouse passar sobre o card
    });
});