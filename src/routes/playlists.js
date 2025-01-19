const express = require('express');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();

// Criar uma nova playlist
router.post('/newplaylist', async (req, res) => {
    const { userId, name } = req.body;

    const { data, error } = await supabase.from('playlists').insert([{ user_id: userId, name }]);
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: 'Playlist criada com sucesso' });
});

// Adicionar canal a uma playlist
router.post('/addplaylist', async (req, res) => {
    const { playlistId, channelId } = req.body;

    const { data, error } = await supabase.from('playlist_items').insert([{ playlist_id: playlistId, tv_channel_id: channelId }]);
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: 'Playlist addicionada com sucesso' });
});

// lista a playlist de um usuario pelo id do usuario
router.get('/listplaylist/:userId', async (req, res) => {
    const { userId } = req.params;

    const { data, error } = await supabase.from('playlists').select().eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
});

// lista o conteudo de uma playlist pelo id da playlist de um usuario pelo id do usuario pegando o nome descrição do canal url e imagem
router.get('/listplaylistcontent/:userId/:playlistId', async (req, res) => {
    const { userId, playlistId } = req.params;

    const { data, error } = await supabase
        .from('playlist_items')
        .select('tv_channels(name, description, url, image)')
        .eq('playlist_id', playlistId);
    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
});

module.exports = router;
