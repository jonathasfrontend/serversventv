const express = require('express');
const axios = require('axios');
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


module.exports = router;
