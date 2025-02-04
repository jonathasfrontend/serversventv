const express = require('express');
const axios = require('axios');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();

const API_URL = 'https://metadatadb.lab.smartcontent.clarobrasil.mobi/graphql';

// Rota para obter os destaques
router.get('/movies', async (req, res) => {
    try {
        const query = {
            query: `
                {
                    trecResults: recommendationsPopularity(period: 7, limit: 10, genres: [], type: "movies") {
                        movies {
                            id
                            nowContentId
                            title
                            rating {
                                description
                            }
                            runTime
                            description {
                                short
                            }
                            assets {
                                ratio
                                url
                                category
                            }
                        }
                    }
                }
            `
        };

        const response = await axios.post(API_URL, query, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Verifica se há dados na resposta
        const movies = response.data.data?.trecResults?.movies || [];

        if (movies.length === 0) {
            return res.status(404).json({ message: 'Nenhum destaque encontrado.' });
        }

        // Retorna os filmes formatados
        return res.status(200).json({ destaques: movies });
    } catch (error) {
        console.error('Erro ao buscar os destaques:', error.message);
        return res.status(500).json({ message: 'Erro interno no servidor.' });
    }
});

router.get('/series', async (req, res) => {
    try {
        const query = {
            query: `
                {
                    recResults: recommendationsPopularity(period: 7, limit: 10, genres: [], type: "series") {
                        series {
                            id
                            nowContentId
                            title
                            rating {
                                description
                            }
                            runTime
                            description {
                                short
                            }
                            assets {
                                ratio
                                url
                                category
                            }
                        }
                    }
                }
            `
        };

        // Fazer a requisição POST para a API GraphQL
        const response = await axios.post(API_URL, query,
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        const series = response.data.data?.recResults?.series || [];

        if (series.length === 0) {
            return res.status(404).json({ message: 'Nenhum destaque encontrado.' });
        }

        return res.status(200).json({ destaques: series });

    } catch (error) {
        console.error('Erro ao buscar os destaques de séries:', error.message);
        return res.status(500).json({ error: 'Erro ao consultar a API externa.' });
    }
});

router.get('/channels', async (req, res) => {
    try {
        const query = {
            query: `
                {
                    trecResults: LiveRecommendationsPopularityNearRealTime(limit: 10, genres: [
                        "Filme Ação",
                        "Filme Comédia",
                        "Filme Infantil",
                        "Filme Aventura",
                        "Filme Ficção",
                        "Filme Romance",
                        "Filme Suspense",
                        "Filme Drama",
                        "Infantil Programa",
                        "Variedades Diversos",
                        "Jornalismo Esportivo",
                        "Jornalismo Informativo",
                        "Séries Policial",
                        "Documentário Diversos",
                        "Esporte Futebol",
                        "Infantil Desenho",
                        "Infantil Diversos"
                    ], channels: []) {
                        liveCatalogs {
                            id
                            name
                            shortName
                            description
                            genreCategory
                            channelName
                            genre
                            assets {
                                url
                                assetId
                            }
                        }
                        position
                        totalCount
                    }
                }
            `,
        };

        // Fazendo a requisição POST para a API externa
        const response = await axios.post(API_URL, query, {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Verificando e retornando os dados
        const liveCatalogs = response.data.data?.trecResults?.liveCatalogs || [];

        if (liveCatalogs.length === 0) {
            return res.status(404).json({ message: 'Nenhum destaque encontrado.' });
        }

        // Retorna os destaques formatados
        return res.status(200).json({ destaques: liveCatalogs });
    } catch (error) {
        console.error('Erro ao buscar os destaques de séries:', error.message);
        return res.status(500).json({ error: 'Erro ao consultar a API externa.' });
    }
});

// Lista o canal que tem mais likes
router.get('/mostliked', async (req, res) => {
    try {
        // Obter todos os canais
        const { data: channels, error: channelError } = await supabase
            .from('tv_channels')
            .select('id, name, description, categoria, url, image');

        if (channelError) return res.status(500).json({ error: channelError.message });

        // Obter likes
        const { data: likes, error: likeError } = await supabase
            .from('likes')
            .select('tv_channel_id');

        if (likeError) return res.status(500).json({ error: likeError.message });

        // Contar likes por canal
        const likeCount = likes.reduce((acc, like) => {
            acc[like.tv_channel_id] = acc[like.tv_channel_id] ? acc[like.tv_channel_id] + 1 : 1;
            return acc;
        }, {});

        // Encontrar o canal com mais likes
        const mostLikedChannelId = Object.keys(likeCount).reduce((a, b) => likeCount[a] > likeCount[b] ? a : b);

        // Encontrar o canal com mais likes
        const mostLikedChannel = channels.find(channel => channel.id === mostLikedChannelId);

        res.status(200).json(mostLikedChannel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Lista o canal que é mais favoritado
router.get('/mostfavorited', async (req, res) => {
    try {
        // Obter todos os canais
        const { data: channels, error: channelError } = await supabase
            .from('tv_channels')
            .select('id, name, description, categoria, url, image');

        if (channelError) return res.status(500).json({ error: channelError.message });

        // Obter favoritos
        const { data: favorites, error: favoriteError } = await supabase
            .from('favorites')
            .select('tv_channel_id');

        if (favoriteError) return res.status(500).json({ error: favoriteError.message });

        // Contar favoritos por canal
        const favoriteCount = favorites.reduce((acc, favorite) => {
            acc[favorite.tv_channel_id] = acc[favorite.tv_channel_id] ? acc[favorite.tv_channel_id] + 1 : 1;
            return acc;
        }, {});

        // Encontrar o canal com mais favoritos
        const mostFavoritedChannelId = Object.keys(favoriteCount).reduce((a, b) => favoriteCount[a] > favoriteCount[b] ? a : b);

        // Encontrar o canal com mais favoritos
        const mostFavoritedChannel = channels.find(channel => channel.id === mostFavoritedChannelId);

        // Verificar se tem algum favorito
        if (!favorites.length) return res.status(404).json({ error: 'Nenhum favorito encontrado' });

        res.status(200).json(mostFavoritedChannel);
    } catch (error) {
        console.error('Erro ao buscar os favoritos:', error.message);
        return res.status(500).json({ error: 'Erro ao consultar a API externa.' });
    }
});

module.exports = router;
