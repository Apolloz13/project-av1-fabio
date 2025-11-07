// Configuração da API do YouTube e variáveis globais
const API_KEY = 'AIzaSyDJa6VkXBBOTL29Ra_QArlZ8nbgZa2Vy4A';
let youtubePlayer = null;
let audioPlayer = null;
let currentTrack = null;
let currentPlaylist = [];
let currentTrackIndex = -1;
let isPlaying = false;
let searchTimeout = null;

// Músicas de exemplo (incluindo YouTube e MP3)
const musicasExemplo = [
    { titulo: "Blinding Lights", artista: "The Weeknd", youtubeId: "fHI8X4OXluQ" },
    { titulo: "Numb", artista: "Linkin Park", youtubeId: "kXYiU_JCYtU" },
    { titulo: "Shape of You", artista: "Ed Sheeran", youtubeId: "JGwWNGJdvx8" },
    { titulo: "Imagine", artista: "John Lennon", audioUrl: "https://cdn.pixabay.com/download/audio/2023/03/12/audio_9e3f4d.mp3" },
    { titulo: "Alive", artista: "Benjamin Tissot", audioUrl: "./assets/audio/alive.mp3" }
];

// Gerenciamento de playlists
let playlists = JSON.parse(localStorage.getItem('playlists')) || {
    'Favoritas': [],
    'Músicas Curtidas': []
};

// Inicialização dos players
function onYouTubeIframeAPIReady() {
    console.log('YouTube API Carregada');
    
    // Garantir que o elemento existe antes de criar o player
    const playerElement = document.getElementById('youtube-player');
    if (!playerElement) {
        console.error('Elemento do player não encontrado');
        return;
    }

    youtubePlayer = new YT.Player('youtube-player', {
        events: {
            'onReady': function(event) {
                console.log('Player YouTube pronto');
                playerReady = true;
            },
            'onStateChange': function(event) {
                if (event.data === YT.PlayerState.PLAYING) {
                    isPlaying = true;
                    atualizarInterface();
                } else if (event.data === YT.PlayerState.PAUSED) {
                    isPlaying = false;
                    atualizarInterface();
                } else if (event.data === YT.PlayerState.ENDED) {
                    proximaMusica();
                }
            }
        },
        height: '0',
        width: '0',
        playerVars: {
            'playsinline': 1,
            'controls': 0,
            'enablejsapi': 1,
            'modestbranding': 1,
            'rel': 0,
            'origin': window.location.origin,
            'allow': 'autoplay; encrypted-media; accelerometer; gyroscope; picture-in-picture; clipboard-write; web-share'
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
    playerReady = true;
    
    // Inicializa o audio player
    audioPlayer = document.getElementById('audio-player');
    audioPlayer.addEventListener('ended', onTrackEnded);
    audioPlayer.addEventListener('timeupdate', updateProgress);
    audioPlayer.addEventListener('play', () => updatePlayState(true));
    audioPlayer.addEventListener('pause', () => updatePlayState(false));
    
    startProgressInterval();
    carregarPlaylistsSalvas();
    
    // Adiciona listener para a barra de progresso
    const progressBar = document.querySelector('.progress-bar');
    progressBar.addEventListener('click', (e) => {
        if (!currentTrack) return;
        
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        
        if (currentTrack.youtubeId) {
            const duration = youtubePlayer.getDuration();
            youtubePlayer.seekTo(duration * pos, true);
        } else if (currentTrack.audioUrl) {
            const duration = audioPlayer.duration;
            audioPlayer.currentTime = duration * pos;
        }
    });
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
        const response = await fetch(`https://youtube.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=${encodeURIComponent(termo + " official music video")}&type=video&videoCategoryId=10&key=${API_KEY}&videoDuration=medium&relevanceLanguage=pt&safeSearch=moderate`);
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

// Funções de pesquisa
async function pesquisarMusicas(query) {
    if (!query.trim()) return;

    try {
        // Pesquisa no YouTube
        const apiKey = 'AIzaSyDJa6VkXBBOTL29Ra_QArlZ8nbgZa2Vy4A'; // Chave de API do YouTube
        const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " music")}&type=video&maxResults=20&key=${apiKey}&videoCategoryId=10&videoDuration=medium&relevanceLanguage=pt`);
        
        if (!response.ok) throw new Error('Erro na pesquisa do YouTube');
        
        const data = await response.json();
        
        const resultados = data.items.map(item => ({
            youtubeId: item.id.videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.default.url
        }));

        mostrarResultados(resultados);
    } catch (error) {
        console.error('Erro ao pesquisar músicas:', error);
        mostrarErro('Não foi possível realizar a pesquisa');
    }
}

function mostrarResultados(resultados) {
    const contentArea = document.querySelector('.content-area');
    contentArea.innerHTML = '';

    const resultadosContainer = document.createElement('div');
    resultadosContainer.className = 'search-results';

    resultados.forEach(track => {
        const item = document.createElement('div');
        item.className = 'track-item';

        const thumb = document.createElement('img');
        thumb.src = track.thumbnail;
        thumb.alt = track.title;
        thumb.className = 'track-thumb';

        const info = document.createElement('div');
        info.className = 'track-info';
        
        const title = document.createElement('h3');
        title.textContent = track.title;
        
        const artist = document.createElement('p');
        artist.textContent = track.artist;

        const addButton = document.createElement('button');
        addButton.className = 'add-to-playlist';
        addButton.innerHTML = '▶️';
        addButton.title = 'Tocar música';

        info.appendChild(title);
        info.appendChild(artist);
        
        item.appendChild(thumb);
        item.appendChild(info);
        item.appendChild(addButton);

        // Adiciona evento de clique para tocar a música
        item.addEventListener('click', () => {
            tocarMusica(track);
        });

        resultadosContainer.appendChild(item);
    });

    contentArea.appendChild(resultadosContainer);
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

    // Limpa a área de conteúdo
    contentArea.innerHTML = '';

    // Cria o container de resultados
    const searchResults = document.createElement('div');
    searchResults.className = 'search-results';

    // Cria o container de músicas
    const musicasContainer = document.createElement('div');
    musicasContainer.className = 'musicas-container';

    // Adiciona cada música
    musicas.forEach((musica, index) => {
        const card = document.createElement('div');
        card.className = 'musica-card';
        card.dataset.videoId = musica.id;

        const thumbnail = document.createElement('img');
        thumbnail.src = musica.thumbnail || `https://img.youtube.com/vi/${musica.id}/hqdefault.jpg`;
        thumbnail.alt = musica.titulo;
        thumbnail.onerror = () => {
            thumbnail.src = 'https://via.placeholder.com/480x360.png?text=Sem+Imagem';
        };

        const info = document.createElement('div');
        info.className = 'musica-info';

        const titulo = document.createElement('h3');
        titulo.textContent = musica.titulo;

        const artista = document.createElement('p');
        artista.textContent = musica.artista;

        const buttons = document.createElement('div');
        buttons.className = 'card-buttons';

        const playButton = document.createElement('button');
        playButton.className = 'play-button';
        playButton.textContent = currentTrack && currentTrack.id === musica.id && isPlaying ? 'Pausar' : 'Tocar';
        playButton.onclick = () => tocarMusica(musica.id, musica.titulo, musica.artista, musica.thumbnail);

        const addButton = document.createElement('button');
        addButton.className = 'add-playlist-button';
        addButton.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>';
        addButton.onclick = () => mostrarOpcoesPlaylist(index);

        buttons.appendChild(playButton);
        buttons.appendChild(addButton);
        info.appendChild(titulo);
        info.appendChild(artista);
        info.appendChild(buttons);

        card.appendChild(thumbnail);
        card.appendChild(info);
        musicasContainer.appendChild(card);
    });

    searchResults.appendChild(musicasContainer);
    contentArea.appendChild(searchResults);
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
let playerReady = false;

// Funções de controle de reprodução
function tocarMusica(track) {
    if (currentTrack === track) {
        togglePlay();
        return;
    }

    // Para qualquer reprodução atual
    if (currentTrack) {
        if (currentTrack.youtubeId) {
            youtubePlayer.stopVideo();
        } else if (currentTrack.audioUrl) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
        }
    }

    currentTrack = track;
    
    try {
        if (track.youtubeId) {
            audioPlayer.pause();
            youtubePlayer.loadVideoById(track.youtubeId);
            isPlaying = true;
        } else if (track.audioUrl) {
            youtubePlayer.stopVideo();
            audioPlayer.src = track.audioUrl;
            audioPlayer.play()
                .then(() => {
                    isPlaying = true;
                    atualizarInterface();
                })
                .catch(error => {
                    console.error('Erro ao reproduzir áudio:', error);
                    mostrarErro('Não foi possível reproduzir esta música');
                });
        }
        
        atualizarInterface();
    } catch (error) {
        console.error('Erro ao tocar música:', error);
        mostrarErro('Erro ao reproduzir música');
    }
}

function togglePlay() {
    if (!currentTrack) return;

    try {
        if (currentTrack.youtubeId) {
            if (isPlaying) {
                youtubePlayer.pauseVideo();
            } else {
                youtubePlayer.playVideo();
            }
        } else if (currentTrack.audioUrl) {
            if (isPlaying) {
                audioPlayer.pause();
            } else {
                audioPlayer.play();
            }
        }
    } catch (error) {
        console.error('Erro ao alternar reprodução:', error);
        mostrarErro('Erro ao controlar reprodução');
    }
}

function updatePlayState(playing) {
    isPlaying = playing;
    atualizarInterface();
}

function updateProgress() {
    if (!currentTrack) return;

    let progress = 0;
    if (currentTrack.youtubeId && youtubePlayer.getCurrentTime) {
        progress = (youtubePlayer.getCurrentTime() / youtubePlayer.getDuration()) * 100;
    } else if (currentTrack.audioUrl) {
        progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    }

    document.querySelector('.progress-filled').style.width = `${progress}%`;
}

function onTrackEnded() {
    proximaMusica();
}

// Função para obter thumbnail da música
function getThumbnail(track) {
    if (track.youtubeId) {
        return `https://img.youtube.com/vi/${track.youtubeId}/mqdefault.jpg`;
    }
    return 'assets/images/default-cover.jpg'; // Imagem padrão para MP3s
}

// Função para tocar a música
function tocarMusica(videoId, titulo, artista, thumbnail) {
    console.log('Tentando tocar música:', { videoId, titulo, artista });
    
    if (!youtubePlayer || !playerReady) {
        console.error('Player não está pronto');
        mostrarErro('Player não está pronto. Aguarde um momento e tente novamente.');
        return;
    }

    if (currentTrack && currentTrack.id === videoId) {
        togglePlay();
        return;
    }

    try {
        currentTrack = {
            id: videoId,
            titulo: titulo,
            artista: artista,
            thumbnail: thumbnail,
            youtubeId: videoId  // Adicionando youtubeId
        };

        // Atualiza a playlist atual
        if (!currentPlaylist.find(track => track.id === videoId)) {
            currentPlaylist.push(currentTrack);
            currentTrackIndex = currentPlaylist.length - 1;
        }

        // Carrega e toca o vídeo
        youtubePlayer.loadVideoById({
            videoId: videoId,
            suggestedQuality: 'small'
        });
        
        player.playVideo();
        isPlaying = true;
        atualizarInterface();

        // Atualiza a barra de progresso
        if (!progressInterval) {
            startProgressInterval();
        }
    } catch (error) {
        console.error('Erro ao tocar música:', error);
        mostrarErro('Não foi possível reproduzir esta música');
    }
}

// Funções de controle de playlist
function proximaMusica() {
    if (!currentPlaylist.length) return;

    let currentIndex = currentPlaylist.findIndex(track => 
        track === currentTrack
    );

    let nextIndex = currentIndex + 1;
    if (nextIndex >= currentPlaylist.length) {
        nextIndex = 0;
    }

    tocarMusica(currentPlaylist[nextIndex]);
}

function musicaAnterior() {
    if (!currentPlaylist.length) return;

    let currentIndex = currentPlaylist.findIndex(track => 
        track === currentTrack
    );

    let prevIndex = currentIndex - 1;
    if (prevIndex < 0) {
        prevIndex = currentPlaylist.length - 1;
    }

    tocarMusica(currentPlaylist[prevIndex]);
}

function shufflePlaylist() {
    if (!currentPlaylist.length) return;

    let currentIndex = currentPlaylist.length;
    let randomIndex;

    // Salva a música atual
    const currentTrackCopy = currentTrack;

    // Algoritmo Fisher-Yates
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        [currentPlaylist[currentIndex], currentPlaylist[randomIndex]] = 
        [currentPlaylist[randomIndex], currentPlaylist[currentIndex]];
    }

    // Se havia uma música tocando, encontra ela na nova ordem
    if (currentTrackCopy) {
        currentTrack = currentPlaylist.find(track => 
            (track.youtubeId && track.youtubeId === currentTrackCopy.youtubeId) ||
            (track.audioUrl && track.audioUrl === currentTrackCopy.audioUrl)
        );
    }

    atualizarInterface();
}

// Funções de interface e utilidades
function atualizarInterface() {
    const playButton = document.querySelector('#play-pause');
    playButton.textContent = isPlaying ? '⏸️' : '▶️';

    // Atualiza informações da música atual
    const songInfo = document.querySelector('.song-info');
    if (currentTrack) {
        songInfo.textContent = currentTrack.title || 'Sem título';
    } else {
        songInfo.textContent = 'Nenhuma música selecionada';
    }

    // Atualiza a playlist
    atualizarPlaylist();
}

function atualizarPlaylist() {
    const playlistElement = document.querySelector('.playlist');
    playlistElement.innerHTML = '';

    playlist.forEach((track, index) => {
        const item = document.createElement('div');
        item.className = 'playlist-item';
        if (track === currentTrack) {
            item.classList.add('playing');
        }

        // Thumbnail
        const thumb = document.createElement('img');
        thumb.src = getThumbnail(track);
        thumb.className = 'track-thumbnail';
        item.appendChild(thumb);

        // Informações da música
        const info = document.createElement('div');
        info.className = 'track-info';
        info.textContent = track.title || 'Sem título';
        item.appendChild(info);

        // Evento de clique
        item.addEventListener('click', () => tocarMusica(track));

        playlistElement.appendChild(item);
    });
}

function mostrarErro(mensagem) {
    const errorElement = document.querySelector('.error-message');
    if (errorElement) {
        errorElement.textContent = mensagem;
        errorElement.style.display = 'block';
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 3000);
    } else {
        console.error(mensagem);
    }
}

// Função de inicialização segura
function initializeApp() {
    // Inicializa os players
    audioPlayer = document.getElementById('audio-player');
    if (audioPlayer) {
        audioPlayer.addEventListener('ended', onTrackEnded);
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('play', () => updatePlayState(true));
        audioPlayer.addEventListener('pause', () => updatePlayState(false));
    }

    // Inicializa a barra de progresso
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        progressBar.addEventListener('click', (e) => {
            if (!currentTrack) return;
            
            const rect = progressBar.getBoundingClientRect();
            const pos = (e.clientX - rect.left) / rect.width;
            
            if (currentTrack.youtubeId && youtubePlayer) {
                const duration = youtubePlayer.getDuration();
                youtubePlayer.seekTo(duration * pos, true);
            } else if (currentTrack.audioUrl && audioPlayer) {
                const duration = audioPlayer.duration;
                audioPlayer.currentTime = duration * pos;
            }
        });
    }

    // Inicializa a busca
    const searchInput = document.getElementById('search-input');
    const searchButton = document.querySelector('.search-button');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                buscarMusicas(e.target.value);
            }, 500);
        });
    }

    if (searchButton) {
        searchButton.addEventListener('click', () => {
            if (searchInput) {
                buscarMusicas(searchInput.value);
            }
        });
    }

    // Carrega as playlists salvas
    carregarPlaylistsSalvas();
}

// Inicializa o app quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeApp);

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Verificar e adicionar event listeners apenas se os elementos existirem
    const playPauseBtn = document.querySelector('#playButton');
    const nextBtn = document.querySelector('#nextButton');
    const prevBtn = document.querySelector('#prevButton');

    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlay);
    if (nextBtn) nextBtn.addEventListener('click', proximaMusica);
    if (prevBtn) prevBtn.addEventListener('click', musicaAnterior);

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

    // Intervalo para atualizar a barra de progresso
    let progressInterval = null;

    function startProgressInterval() {
        clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            if (player && player.getCurrentTime && isPlaying) {
                const progress = (player.getCurrentTime() / player.getDuration()) * 100;
                document.querySelector('.progress-filled').style.width = `${progress}%`;
            }
        }, 500);
    }

    function stopProgressInterval() {
        clearInterval(progressInterval);
        progressInterval = null;
    }
});

// Função para carregar e mostrar playlists salvas
function carregarPlaylistsSalvas() {
    // Carrega playlists do localStorage
    const playlistsSalvas = JSON.parse(localStorage.getItem('playlists')) || {
        'Favoritas': [],
        'Músicas Curtidas': []
    };

    // Atualiza a variável global de playlists
    playlists = playlistsSalvas;

    // Atualiza a sidebar com as playlists
    const playlistList = document.querySelector('.playlist-list');
    if (!playlistList) return;

    playlistList.innerHTML = '';

    Object.entries(playlists).forEach(([nome, musicas]) => {
        const playlistItem = document.createElement('div');
        playlistItem.className = 'playlist-item';
        
        const playlistIcon = document.createElement('svg');
        playlistIcon.setAttribute('viewBox', '0 0 24 24');
        playlistIcon.setAttribute('width', '24');
        playlistIcon.setAttribute('height', '24');
        playlistIcon.innerHTML = '<path d="M15 6H3v2h12V6zm0 4H3v2h12v-2zM3 16h8v-2H3v2zM17 6v8.18c-.31-.11-.65-.18-1-.18-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3V8h3V6h-5z" fill="currentColor"/>';
        
        const playlistName = document.createElement('span');
        playlistName.textContent = `${nome} (${musicas.length})`;
        
        playlistItem.appendChild(playlistIcon);
        playlistItem.appendChild(playlistName);
        
        playlistItem.addEventListener('click', () => {
            mostrarPlaylist(nome, musicas);
        });
        
        playlistList.appendChild(playlistItem);
    });

    // Mostra mensagem de boas-vindas na área de conteúdo
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
        contentArea.innerHTML = `
            <div class="welcome-message">
                <h2>Bem-vindo ao Appolo Music!</h2>
                <p>Use a barra de busca para encontrar suas músicas favoritas ou selecione uma playlist.</p>
            </div>
        `;
    }
}

// Função para mostrar uma playlist específica
function mostrarPlaylist(nome, musicas) {
    const contentArea = document.querySelector('.content-area');
    if (!contentArea) return;

    contentArea.innerHTML = `
        <div class="playlist-view">
            <h2>${nome}</h2>
            <div class="musicas-container">
                ${musicas.length > 0 ? musicas.map((musica, index) => `
                    <div class="musica-card" data-index="${index}">
                        <img src="${musica.thumbnail || `https://img.youtube.com/vi/${musica.id}/hqdefault.jpg`}" alt="${musica.titulo}" onerror="this.src='https://via.placeholder.com/480x360.png?text=Sem+Imagem'">
                        <div class="musica-info">
                            <h3>${musica.titulo}</h3>
                            <p>${musica.artista}</p>
                            <button class="play-button" onclick="tocarMusica('${musica.id}', '${musica.titulo.replace(/'/g, "\\'")}', '${musica.artista.replace(/'/g, "\\'")}', '${musica.thumbnail || ''}')">
                                ${currentTrack && currentTrack.id === musica.id && isPlaying ? 'Pausar' : 'Tocar'}
                            </button>
                        </div>
                    </div>
                `).join('') : '<p class="empty-playlist">Essa playlist está vazia. Adicione músicas através da busca!</p>'}
            </div>
        </div>
    `;
}
