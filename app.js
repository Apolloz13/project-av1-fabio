// Configuração da API do YouTube e variáveis globais
const API_KEY = 'AIzaSyDKsSyXuc-6IIJQ1jBZr8yW_AvtMsH6izw';
let player = null;
let currentTrack = null;
let currentPlaylist = [];
let currentTrackIndex = -1;
let isPlaying = false;
let searchTimeout = null;

// Gerenciamento de playlists
let playlists = JSON.parse(localStorage.getItem('playlists')) || {
    'Favoritas': [],
    'Músicas Curtidas': []
};

// Inicialização do player do YouTube
function onYouTubeIframeAPIReady() {
    console.log('YouTube API Carregada');
    player = new YT.Player('player-hidden', {
        height: '360',
        width: '640',
        videoId: '',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'enablejsapi': 1,
            'modestbranding': 1,
            'rel': 0,
            'origin': window.location.origin
        },
        events: {
            'onReady': onPlayerReady,
            'onStateChange': onPlayerStateChange,
            'onError': onPlayerError
        }
    });
}

function onPlayerReady(event) {
    console.log('Player pronto!');
    // Configura intervalo para atualizar a barra de progresso
    setInterval(() => {
        if (player && player.getCurrentTime && isPlaying) {
            const progress = (player.getCurrentTime() / player.getDuration()) * 100;
            document.querySelector('.progress-filled').style.width = `${progress}%`;
        }
    }, 1000);
    carregarPlaylistsSalvas();
}

function onPlayerStateChange(event) {
    console.log('Estado do player mudou:', event.data);
    switch(event.data) {
        case YT.PlayerState.ENDED:
            proximaMusica();
            break;
        case YT.PlayerState.PLAYING:
            isPlaying = true;
            break;
        case YT.PlayerState.PAUSED:
            isPlaying = false;
            break;
    }
    atualizarInterface();
}

function onPlayerError(event) {
    console.error('Erro no player:', event.data);
    mostrarErro('Erro ao reproduzir a música. Tentando próxima...');
    proximaMusica(); // Tenta tocar a próxima música em caso de erro
}

// Atualização da barra de progresso
function atualizarBarraProgresso(event) {
    if (player && player.getCurrentTime && player.getDuration) {
        const progress = (player.getCurrentTime() / player.getDuration()) * 100;
        document.querySelector('.progress-filled').style.width = `${progress}%`;
    }
}

// Busca de músicas no YouTube
async function buscarMusicas(termo) {
    if (!termo) {
        carregarPlaylistsSalvas();
        return;
    }

    try {
        const response = await fetch(`https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=${encodeURIComponent(termo + " music")}&type=video&videoCategoryId=10&key=${API_KEY}`);
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }

        const musicas = data.items.map(item => ({
            id: item.id.videoId,
            titulo: item.snippet.title,
            artista: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium.url
        }));

        // Atualiza a playlist atual com os resultados da busca
        currentPlaylist = musicas;
        currentTrackIndex = -1;

        renderizarResultados(musicas);
    } catch (error) {
        console.error('Erro na busca:', error);
        mostrarErro('Não foi possível realizar a busca. Por favor, tente novamente mais tarde.');
    }
}

// Gerenciamento de playlists
function salvarNaPlaylist(playlistNome, musicaIndex) {
    const musica = currentPlaylist[musicaIndex];
    
    if (!playlists[playlistNome]) {
        playlists[playlistNome] = [];
    }
    
    if (!playlists[playlistNome].find(m => m.id === musica.id)) {
        playlists[playlistNome].push(musica);
        localStorage.setItem('playlists', JSON.stringify(playlists));
        mostrarNotificacao(`Música adicionada à playlist ${playlistNome}`);
    } else {
        mostrarNotificacao('Esta música já está na playlist');
    }
}

// Renderização dos resultados da busca
function renderizarResultados(musicas) {
    const contentArea = document.querySelector('.content-area');
    
    if (musicas.length === 0) {
        contentArea.innerHTML = `
            <div class="no-results">
                <p>Nenhuma música encontrada</p>
                <p>Tente buscar por outro termo</p>
            </div>`;
        return;
    }

    contentArea.innerHTML = `
        <div class="search-results">
            <div class="musicas-container">
                ${musicas.map((musica, index) => `
                    <div class="musica-card" data-video-id="${musica.id}">
                        <img src="${musica.thumbnail}" alt="${musica.titulo}">
                        <div class="musica-info">
                            <h3>${musica.titulo}</h3>
                            <p>${musica.artista}</p>
                            <div class="card-buttons">
                                <button class="play-button" onclick="tocarMusica('${musica.id}', '${musica.titulo.replace(/'/g, "\\'")}', '${musica.artista.replace(/'/g, "\\'")}', '${musica.thumbnail.replace(/'/g, "\\'")}')">
                                    ${currentTrack && currentTrack.id === musica.id && isPlaying ? 'Pausar' : 'Tocar'}
                                </button>
                                <button class="add-playlist-button" onclick="mostrarOpcoesPlaylist(${index})">
                                    <svg viewBox="0 0 24 24" width="20" height="20">
                                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

// Função para renderizar todas as músicas
function renderizarTodasMusicas() {
    const container = document.querySelector('.container');
    const generosHTML = Object.entries(musicasPorGenero)
        .map(([genero, musicas]) => criarSecaoGenero(genero, musicas))
        .join('');
    container.innerHTML = generosHTML;
}

// Função para renderizar as playlists na sidebar
function renderizarPlaylists() {
    const playlistList = document.querySelector('.playlist-list');
    playlistList.innerHTML = '';
    
    Object.entries(playlists).forEach(([nome, musicas]) => {
        const playlistEl = document.createElement('div');
        playlistEl.className = 'playlist-item';
        playlistEl.innerHTML = `
            <svg viewBox="0 0 24 24" width="24" height="24">
                <path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" fill="currentColor"/>
            </svg>
            ${nome} (${musicas.length})
        `;
        playlistEl.addEventListener('click', () => {
            carregarPlaylist(nome, musicas);
        });
        playlistList.appendChild(playlistEl);
    });
}

// Função para criar o HTML de um card de música
function criarCardMusica(musica, index) {
    const isAtual = musicaAtual && musicaAtual.id === musica.id;
    return `
        <div class="musica-card ${isAtual ? 'playing' : ''}">
            <img src="${musica.capaUrl}" alt="Capa do álbum ${musica.titulo}">
            <div class="musica-info">
                <h3>${musica.titulo}</h3>
                <p>${musica.artista}</p>
                <div class="card-buttons">
                    <button class="play-button" onclick="tocarMusica(${index})">
                        ${isAtual && isPlaying ? 'Pausar' : 'Tocar'}
                    </button>
                    <button class="add-playlist-button" onclick="mostrarOpcoesPlaylist('${encodeURIComponent(JSON.stringify(musica))}')">
                        <svg viewBox="0 0 24 24" width="20" height="20">
                            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    `;
}

// Função para mostrar opções de playlist
function mostrarOpcoesPlaylist(musicaIndex) {
    const musica = currentPlaylist[musicaIndex];
    const playlistNames = Object.keys(playlists);
    
    const menuHTML = `
        <div class="playlist-menu">
            <h3>Adicionar à Playlist:</h3>
            <div class="playlist-options">
                ${playlistNames.map(nome => `
                    <button onclick="salvarNaPlaylist('${nome}', ${musicaIndex})">${nome}</button>
                `).join('')}
            </div>
            <hr>
            <button class="new-playlist-option" onclick="criarNovaPlaylistComMusica(${musicaIndex})">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                </svg>
                Nova Playlist
            </button>
        </div>
    `;
    
    // Remove menu anterior se existir
    const oldMenu = document.querySelector('.playlist-menu-container');
    if (oldMenu) oldMenu.remove();
    
    const menu = document.createElement('div');
    menu.className = 'playlist-menu-container';
    menu.innerHTML = menuHTML;
    document.body.appendChild(menu);
    
    // Remove o menu quando clicar fora dele
    setTimeout(() => {
        document.addEventListener('click', function removeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', removeMenu);
            }
        });
    }, 0);
}

// Função para criar nova playlist com uma música
function criarNovaPlaylistComMusica(musicaIndex) {
    const nome = prompt('Digite o nome da nova playlist:');
    if (nome && nome.trim()) {
        if (!playlists[nome]) {
            playlists[nome] = [];
            salvarNaPlaylist(nome, musicaIndex);
            renderizarPlaylists();
            mostrarNotificacao('Playlist criada com sucesso!');
        } else {
            mostrarErro('Já existe uma playlist com este nome');
        }
    }
}

// Controles do player
function tocarMusica(videoId, titulo, artista, thumbnail) {
    console.log('Tentando tocar música:', videoId);
    
    if (currentTrack && currentTrack.id === videoId) {
        togglePlay();
        return;
    }

    if (!player) {
        console.error('Player não está pronto');
        mostrarErro('Player não está pronto. Aguarde um momento e tente novamente.');
        return;
    }

    try {
        currentTrack = {
            id: videoId,
            titulo: titulo,
            artista: artista,
            thumbnail: thumbnail
        };

        player.loadVideoById({
            videoId: videoId,
            suggestedQuality: 'small'
        });
        
        isPlaying = true;
        atualizarInterface();
    } catch (error) {
        console.error('Erro ao tocar música:', error);
        mostrarErro('Não foi possível reproduzir esta música');
    }
}

function togglePlay() {
    if (!currentTrack || !player) return;
    
    try {
        if (isPlaying) {
            player.pauseVideo();
            isPlaying = false;
        } else {
            player.playVideo();
            isPlaying = true;
        }
        atualizarInterface();
    } catch (error) {
        console.error('Erro ao alternar reprodução:', error);
        mostrarErro('Erro ao controlar a reprodução');
    }
}

function proximaMusica() {
    if (currentPlaylist.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex + 1) % currentPlaylist.length;
    const proxima = currentPlaylist[currentTrackIndex];
    tocarMusica(proxima.id, proxima.titulo, proxima.artista, proxima.thumbnail);
}

function musicaAnterior() {
    if (currentPlaylist.length === 0) return;
    
    currentTrackIndex = (currentTrackIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
    const anterior = currentPlaylist[currentTrackIndex];
    tocarMusica(anterior.id, anterior.titulo, anterior.artista, anterior.thumbnail);
}

// Funções de interface
function atualizarInterface() {
    const playerCover = document.querySelector('.player-cover');
    const playerTitle = document.querySelector('.player-title');
    const playerArtist = document.querySelector('.player-artist');
    const playButton = document.querySelector('#playButton');

    if (currentTrack) {
        playerCover.src = currentTrack.thumbnail;
        playerTitle.textContent = currentTrack.titulo;
        playerArtist.textContent = currentTrack.artista;
        
        playButton.innerHTML = isPlaying
            ? '<svg viewBox="0 0 24 24" width="32" height="32"><path d="M6 6h4v12H6zm8 0h4v12h-4z" fill="currentColor"/></svg>'
            : '<svg viewBox="0 0 24 24" width="32" height="32"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
    }

    // Atualiza os cards se necessário
    const cards = document.querySelectorAll('.musica-card');
    cards.forEach(card => {
        const videoId = card.dataset.videoId;
        const playButton = card.querySelector('.play-button');
        if (currentTrack && videoId === currentTrack.id) {
            card.classList.add('playing');
            playButton.textContent = isPlaying ? 'Pausar' : 'Tocar';
        } else {
            card.classList.remove('playing');
            playButton.textContent = 'Tocar';
        }
    });
}

function mostrarNotificacao(mensagem) {
    const notificacao = document.createElement('div');
    notificacao.className = 'notificacao';
    notificacao.textContent = mensagem;
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
        notificacao.classList.add('fadeout');
        setTimeout(() => notificacao.remove(), 300);
    }, 2000);
}

function mostrarErro(mensagem) {
    const erro = document.createElement('div');
    erro.className = 'erro-mensagem';
    erro.textContent = mensagem;
    document.body.appendChild(erro);
    
    setTimeout(() => {
        erro.classList.add('fadeout');
        setTimeout(() => erro.remove(), 300);
    }, 3000);
}

// Inicialização dos eventos
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('search-input');
    const searchButton = document.querySelector('.search-button');
    const playButton = document.getElementById('playButton');
    const prevButton = document.getElementById('prevButton');
    const nextButton = document.getElementById('nextButton');
    const novaPlaylistBtn = document.getElementById('nova-playlist');

    // Configuração da busca
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            buscarMusicas(e.target.value);
        }, 500);
    });

    searchButton.addEventListener('click', () => {
        buscarMusicas(searchInput.value);
    });

    // Configuração dos controles do player
    playButton.addEventListener('click', togglePlay);
    prevButton.addEventListener('click', musicaAnterior);
    nextButton.addEventListener('click', proximaMusica);

    // Configuração do botão de nova playlist
    novaPlaylistBtn.addEventListener('click', () => {
        const nome = prompt('Digite o nome da nova playlist:');
        if (nome && nome.trim()) {
            if (!playlists[nome]) {
                playlists[nome] = [];
                localStorage.setItem('playlists', JSON.stringify(playlists));
                renderizarPlaylists();
                mostrarNotificacao('Playlist criada com sucesso!');
            } else {
                mostrarErro('Já existe uma playlist com este nome');
            }
        }
    });
});

function carregarPlaylist(nome, musicas) {
    currentPlaylist = musicas;
    currentTrackIndex = -1;
    
    const contentArea = document.querySelector('.content-area');
    contentArea.innerHTML = `
        <div class="playlist-view">
            <h2>${nome}</h2>
            <div class="musicas-container">
                ${musicas.map((musica, index) => `
                    <div class="musica-card" data-video-id="${musica.id}">
                        <img src="${musica.thumbnail}" alt="${musica.titulo}">
                        <div class="musica-info">
                            <h3>${musica.titulo}</h3>
                            <p>${musica.artista}</p>
                            <button class="play-button" onclick="tocarMusica('${musica.id}', '${musica.titulo.replace(/'/g, "\\'")}', '${musica.artista.replace(/'/g, "\\'")}', '${musica.thumbnail.replace(/'/g, "\\'")}')">
                                ${currentTrack && currentTrack.id === musica.id && isPlaying ? 'Pausar' : 'Tocar'}
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function carregarPlaylistsSalvas() {
    renderizarPlaylists();
    // Se não houver busca ativa, mostra uma mensagem de boas-vindas
    const contentArea = document.querySelector('.content-area');
    contentArea.innerHTML = `
        <div class="welcome-message">
            <h2>Bem-vindo ao Appolo Music!</h2>
            <p>Use a barra de busca para encontrar suas músicas favoritas ou selecione uma playlist.</p>
        </div>
    `;
}
