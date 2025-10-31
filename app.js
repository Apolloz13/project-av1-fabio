// Mock de dados - Array de músicas
// Em uma aplicação real, estes dados viriam de uma API REST ou GraphQL,
// possivelmente com endpoints como: GET /api/tracks ou GET /api/playlists/{id}/tracks
const musicas = [
    {
        titulo: "Bohemian Rhapsody",
        artista: "Queen",
        capaUrl: "https://example.com/covers/bohemian.jpg"
    },
    {
        titulo: "Imagine",
        artista: "John Lennon",
        capaUrl: "https://example.com/covers/imagine.jpg"
    },
    {
        titulo: "Billie Jean",
        artista: "Michael Jackson",
        capaUrl: "https://example.com/covers/billiejean.jpg"
    },
    {
        titulo: "Sweet Child O' Mine",
        artista: "Guns N' Roses",
        capaUrl: "https://example.com/covers/sweet.jpg"
    },
    {
        titulo: "Garota de Ipanema",
        artista: "Tom Jobim",
        capaUrl: "https://example.com/covers/ipanema.jpg"
    }
];

// Expondo o array para uso global
window.musicas = musicas;
