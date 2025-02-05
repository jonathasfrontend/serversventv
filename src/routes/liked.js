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

// Listar canais curtidos por um usuário pela nametag
router.get('/likedby/:nametag', async (req, res) => {
    const { nametag } = req.params;

    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('nametag', nametag)
        .single();

    if (userError) return res.status(500).json({ error: userError.message });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { data, error } = await supabase
        .from('likes')
        .select('tv_channels(*)')
        .eq('user_id', user.id);

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
});

// Listar canais com likes e quem deu like
router.get('/channelswithlikes', async (req, res) => {
    try {
        // Obter todos os canais
        const { data: channels, error: channelError } = await supabase
            .from('tv_channels')
            .select('id, name, description, categoria, url, image');

        if (channelError) return res.status(500).json({ error: channelError.message });

        // Obter likes com detalhes dos usuários id, username e avatar
        const { data: likes, error: likeError } = await supabase
            .from('likes')
            .select('tv_channel_id, user_id, users (id, username, avatar)');

        if (likeError) return res.status(500).json({ error: likeError.message });

        // Combinar canais com likes
        const result = channels.map(channel => {
            const channelLikes = likes.filter(like => like.tv_channel_id === channel.id);
            return {
                id: channel.id,
                name: channel.name,
                description: channel.description,
                categoria: channel.categoria,
                url: channel.url,
                image: channel.image,
                like_count: channelLikes.length,
                liked_by: channelLikes.map(like => ({
                    user_id: like.users.id,
                    user_name: like.users.username,
                    user_avatar: like.users.avatar
                }))
            };
        });

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Listar canais com likes e quem deu like pela categoria do canal
router.get('/channelswithlikes/:categoria', async (req, res) => {
    const { categoria } = req.params;

    try {
        // Obter todos os canais
        const { data: channels, error: channelError } = await supabase
            .from('tv_channels')
            .select('id, name, description, categoria, url, image')
            .eq('categoria', categoria);

        if (channelError) return res.status(500).json({ error: channelError.message });

        // Obter likes com detalhes dos usuários id, username e avatar
        const { data: likes, error: likeError } = await supabase
            .from('likes')
            .select('tv_channel_id, user_id, users (id, username, avatar)');

        if (likeError) return res.status(500).json({ error: likeError.message });

        // Combinar canais com likes
        const result = channels.map(channel => {
            const channelLikes = likes.filter(like => like.tv_channel_id === channel.id);
            return {
                id: channel.id,
                name: channel.name,
                description: channel.description,
                categoria: channel.categoria,
                url: channel.url,
                image: channel.image,
                like_count: channelLikes.length,
                liked_by: channelLikes.map(like => ({
                    user_id: like.users.id,
                    user_name: like.users.username,
                    user_avatar: like.users.avatar
                }))
            };
        });

        // verifica se exite a categoria
        if (!result.length) return res.status(404).json({ error: 'Categoria não encontrada' });

        res.status(200).json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
    if (like.length) return res.status(400).json({ error: 'Você já curtiu este canal' });

    // Adicionar like
    const { data, error } = await supabase
        .from('likes')
        .insert([{ user_id: userId, tv_channel_id: channelId }]);

    if (error) return res.status(500).json({ error: error.message });

    // Emitir evento WebSocket com o ID do canal e o número de curtidas atualizado
    const { data: likeCountData, error: countError } = await supabase
        .from('likes')
        .select('*', { count: 'exact' })
        .eq('tv_channel_id', channelId);

    if (countError) return res.status(500).json({ error: countError.message });

    res.status(201).json({ message: 'Canal curtido com sucesso' });
});

// Descurtir um canal pelo id do usuário e do canal
router.delete('/unlike/:userId/:channelId', async (req, res) => {
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

    // Verificar se o usuário curtiu o canal
    const { data: like, error: likeError } = await supabase
        .from('likes')
        .select()
        .eq('user_id', userId)
        .eq('tv_channel_id', channelId);

    if (likeError) return res.status(500).json({ error: likeError.message });
    if (!like.length) return res.status(400).json({ error: 'Usuário não curtiu este canal' });

    // Remover like
    const { error } = await supabase
        .from('likes')
        .delete()
        .eq('user_id', userId)
        .eq('tv_channel_id', channelId);

    if (error) return res.status(500).json({ error: error.message });

    // Emitir evento WebSocket com o ID do canal e o número de curtidas atualizado
    const { data: likeCountData, error: countError } = await supabase
        .from('likes')
        .select('*', { count: 'exact' })
        .eq('tv_channel_id', channelId);

    if (countError) return res.status(500).json({ error: countError.message });

    io.emit('channelLiked', {
        channelId,
        likeCount: likeCountData.length,
    });

    res.status(200).json({ message: 'Canal descurtido com sucesso' });
});

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

        // Verificar se há algum like
        if (!likes.length) {
            return res.status(404).json({ error: 'Nenhum like encontrado' });
        }

        // Contar likes por canal
        const likeCount = likes.reduce((acc, like) => {
            acc[like.tv_channel_id] = acc[like.tv_channel_id] ? acc[like.tv_channel_id] + 1 : 1;
            return acc;
        }, {});

        // Obter as chaves do objeto de contagem
        const likeKeys = Object.keys(likeCount);
        if (likeKeys.length === 0) {
            return res.status(404).json({ error: 'Nenhum like encontrado' });
        }

        // Encontrar o canal com mais likes
        const mostLikedChannelId = likeKeys.reduce((a, b) =>
            likeCount[a] > likeCount[b] ? a : b
        );

        // Encontrar o canal com base no id
        const mostLikedChannel = channels.find(channel => channel.id === mostLikedChannelId);

        return res.status(200).json(mostLikedChannel);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;