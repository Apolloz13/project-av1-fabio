// Selecionando elementos do card
const musicaCard = document.querySelector('.musica-card');
const playButton = musicaCard?.querySelector('.play-button');
const cardInfo = musicaCard?.querySelector('.card-info');
const btnFavorito = musicaCard?.querySelector('.btn-favorito');
const btnPlaylist = musicaCard?.querySelector('.btn-playlist');
const artistaElement = musicaCard?.querySelector('.artista');
const duracaoElement = musicaCard?.querySelector('.duracao');

// Estado inicial do player
let isPlaying = false;

// Adicionando event listeners ao card de música
if (musicaCard) {
    musicaCard.addEventListener('click', togglePlay);
    musicaCard.addEventListener('mouseenter', showDetails);
    musicaCard.addEventListener('mouseleave', hideDetails);
}

// Eventos específicos para os botões (evitando propagação do evento)
if (playButton) {
    playButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que o click do botão ative o click do card
        togglePlay();
    });
}

/**
 * Toggle play/pause no card de música
 * - Alterna o estado de reprodução
 * - Atualiza o ícone do botão play/pause
 * - Aplica animações e efeitos visuais
 */
function togglePlay() {
    if (!playButton || !musicaCard) return;
    
    isPlaying = !isPlaying;
    const icon = playButton.querySelector('i');
    
    if (isPlaying) {
        // Atualiza para estado de reprodução
        icon.classList.replace('fa-play', 'fa-pause');
        playButton.style.transform = 'scale(0.95)';
        playButton.style.backgroundColor = '#1ed760';
        musicaCard.classList.add('is-playing');
    } else {
        // Retorna ao estado inicial
        icon.classList.replace('fa-pause', 'fa-play');
        playButton.style.transform = 'scale(1)';
        playButton.style.backgroundColor = '#1db954';
        musicaCard.classList.remove('is-playing');
    }
}

/**
 * Mostra detalhes extras do card no hover
 * - Aumenta opacidade das informações
 * - Aplica efeito de elevação
 * - Adiciona classe para efeitos visuais
 */
function showDetails() {
    if (!musicaCard || !cardInfo) return;

    musicaCard.classList.add('show-details');
    
    // Destaca informações
    if (artistaElement) artistaElement.style.opacity = '1';
    if (duracaoElement) duracaoElement.style.opacity = '1';
    
    // Efeito de elevação
    musicaCard.style.transform = 'translateY(-5px)';
    musicaCard.style.boxShadow = '0 8px 16px rgba(0,0,0,0.3)';
}

/**
 * Esconde os detalhes extras do card
 * - Reduz opacidade das informações
 * - Remove efeito de elevação
 * - Remove classe de efeitos
 */
function hideDetails() {
    if (!musicaCard || !cardInfo) return;

    musicaCard.classList.remove('show-details');
    
    // Reseta opacidade
    if (artistaElement) artistaElement.style.opacity = '0.7';
    if (duracaoElement) duracaoElement.style.opacity = '0.7';
    
    // Remove elevação
    musicaCard.style.transform = 'translateY(0)';
    musicaCard.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
}

// Eventos auxiliares para os botões de ação
if (btnFavorito) {
    btnFavorito.addEventListener('click', (e) => {
        e.stopPropagation();
        btnFavorito.classList.toggle('active');
        const icon = btnFavorito.querySelector('i');
        if (icon) {
            icon.style.color = btnFavorito.classList.contains('active') ? '#1db954' : '#b3b3b3';
        }
    });
}

if (btnPlaylist) {
    btnPlaylist.addEventListener('click', (e) => {
        e.stopPropagation();
        btnPlaylist.style.transform = 'scale(1.1)';
        setTimeout(() => {
            btnPlaylist.style.transform = 'scale(1)';
        }, 200);
    });
}