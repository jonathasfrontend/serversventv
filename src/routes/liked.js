const express = require('express');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();


// Listar canais curtidos por um usuário
router.get('/liked/:userId', async (req, res) => {
    const { userId } = req.params;

    const { data, error } = await supabase
        .from('likes')
        .select('tv_channels(*)')
        .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
});

// Curtir um canal (com verificação)
router.post('/like', async (req, res) => {
    const { userId, channelId } = req.body;

    try {
        // Verificar se o usuário já curtiu o canal
        const { data: existingLike, error: findError } = await supabase
            .from('likes')
            .select('*')
            .eq('user_id', userId)
            .eq('tv_channel_id', channelId)

        if (findError && findError.details !== 'Results contain 0 rows') {
            return res.status(500).json({ error: findError.message });
        }

        if (existingLike) {
            return res.status(400).json({ error: 'Você já curtiu este canal.' });
        }

        // Adicionar o like ao canal
        const { data, error } = await supabase
            .from('likes')
            .insert([{ user_id: userId, tv_channel_id: channelId }]);

        if (error) return res.status(500).json({ error: error.message });

        res.status(201).json({ message: 'Canal curtido com sucesso!', like: data[0] });
    } catch (err) {
        res.status(500).json({ error: 'Erro ao curtir o canal.', details: err.message });
    }
});


// Listar canais com likes e quem deu like
router.get('/channelswithlikes', async (req, res) => {
    try {
        // Obter todos os canais
        const { data: channels, error: channelError } = await supabase
            .from('tv_channels')
            .select('id, name, description, url, image');

        if (channelError) return res.status(500).json({ error: channelError.message });

        // Obter likes com detalhes dos usuários
        const { data: likes, error: likeError } = await supabase
            .from('likes')
            .select('tv_channel_id, user_id, users (id, username)');

        if (likeError) return res.status(500).json({ error: likeError.message });

        // Combinar canais com likes
        const result = channels.map(channel => {
            const channelLikes = likes.filter(like => like.tv_channel_id === channel.id);
            return {
                id: channel.id,
                name: channel.name,
                description: channel.description,
                url: channel.url,
                image: channel.image,
                like_count: channelLikes.length,
                liked_by: channelLikes.map(like => ({
                    user_id: like.users.id,
                    user_name: like.users.username
                }))
            };
        });

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;