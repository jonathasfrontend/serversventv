const express = require('express');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();


// Buscar favoritos de um usuário
router.get('/favorites/:userId', async (req, res) => {
    const { userId } = req.params;

    const { data, error } = await supabase
        .from('favorites')
        .select('tv_channels(*)')
        .eq('user_id', userId);

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
});

// Adicionar um canal aos favoritos
router.post('/favorites', async (req, res) => {
    const { userId, channelId } = req.body;

    // Verificar se o canal já está nos favoritos
    const { data: existingFavorites, error: findError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .eq('tv_channel_id', channelId);

    if (findError) {
        return res.status(500).json({ error: findError.message });
    }

    if (existingFavorites && existingFavorites.length > 0) {
        return res.status(400).json({ error: 'O canal já está nos favoritos.' });
    }

    // Adicionar o canal aos favoritos
    const { data, error } = await supabase
        .from('favorites')
        .insert([{ user_id: userId, tv_channel_id: channelId }]);

    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: 'Canal adicionado aos favoritos!' });
});

// desfavoritar um canal pelo id do usuário e do canal
router.delete('/unfavorite/:userId/:channelId', async (req, res) => {
    const { userId, channelId } = req.params;

    // Verificar se o canal está nos favoritos
    const { data: existingFavorites, error: findError } = await supabase
        .from('favorites')
        .select('*')
        .eq('user_id', userId)
        .eq('tv_channel_id', channelId);

    if (findError) {
        return res.status(500).json({ error: findError.message });
    }

    if (!existingFavorites || existingFavorites.length === 0) {
        return res.status(400).json({ error: 'O canal não está nos favoritos.' });
    }

    // Remover o canal dos favoritos
    const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('tv_channel_id', channelId);

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json({ message: 'Canal removido dos favoritos!' });
});

module.exports = router;