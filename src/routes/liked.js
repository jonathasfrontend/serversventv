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

// Curtir um canal (com verificação de se o usuário já curtiu) pelo id do usuário e do canal
router.post('/like/:userId/:channelId', async (req, res) => {
    const { userId, channelId } = req.params;

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase
        .from('users')
        .select()
        .eq('id', userId);

    if (userError) return res.status(500).json({ error: userError.message });
    if (!user.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Verificar se o canal existe
    const { data: channel, error: channelError } = await supabase
        .from('tv_channels')
        .select()
        .eq('id', channelId);

    if (channelError) return res.status(500).json({ error: channelError.message });
    if (!channel.length) return res.status(404).json({ error: 'Canal não encontrado' });

    // Verificar se o usuário já curtiu o canal
    const { data: like, error: likeError } = await supabase
        .from('likes')
        .select()
        .eq('user_id', userId)
        .eq('tv_channel_id', channelId);

    if (likeError) return res.status(500).json({ error: likeError.message });
    if (like.length) return res.status(400).json({ error: 'Usuário já curtiu este canal' });

    // Adicionar like
    const { data, error } = await supabase
        .from('likes')
        .insert([{ user_id: userId, tv_channel_id: channelId }]);

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: 'Canal curtido com sucesso' });
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