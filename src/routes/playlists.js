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

module.exports = router;
