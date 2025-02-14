const express = require('express');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();

// Criar uma nova playlist
router.post('/createplaylist', async (req, res) => {
    const { name, userId } = req.body;

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase.from('users').select().eq('id', userId);
    if (userError) return res.status(500).json({ error: userError.message });
    if (!user.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Verifica se a playlist já foi cadastrada com mesmo nome
    const { data: dataPlaylist, error: errorPlaylist } = await supabase
        .from('playlists')
        .select()
        .eq('name', name)
        .eq('user_id', userId);

    // verifica se o nome da playlist já existe para o usuario
    if (errorPlaylist) return res.status(500).json({ error: errorPlaylist.message });
    if (dataPlaylist.length) return res.status(400).json({ error: 'Essa playlist com esse nome já existe!' });

    // Inserir a nova playlist e retornar os dados inseridos
    const { data, error } = await supabase
        .from('playlists')
        .insert([{ name, user_id: userId }])
        .select();

    if (error) return res.status(500).json({ error: error.message });

    // Retorna o primeiro item do array de dados (a playlist recém-criada)
    res.status(201).json(data[0]);
});


// Adicionar canal a uma playlist
router.post('/addplaylist', async (req, res) => {
    const { playlistId, channelId } = req.body;

    // Verificar se a playlist existe
    const { data: playlist, error: playlistError } = await supabase.from('playlists').select().eq('id', playlistId);
    if (playlistError) return res.status(500).json({ error: playlistError.message });
    if (!playlist.length) return res.status(404).json({ error: 'Playlist não encontrada' });

    // Verificar se o canal existe
    const { data: channel, error: channelError } = await supabase.from('tv_channels').select().eq('id', channelId);
    if (channelError) return res.status(500).json({ error: channelError.message });
    if (!channel.length) return res.status(404).json({ error: 'Canal não encontrado' });

    // verifica se canal já está na playlist do usuario pelo id do canal e da playlist
    const { data: playlistItem, error: playlistItemError } = await supabase.from('playlist_items').select().eq('tv_channel_id', channelId).eq('playlist_id', playlistId);
    if (playlistItemError) return res.status(500).json({ error: playlistItemError.message });
    if (playlistItem.length) return res.status(400).json({ error: 'Esse canal já está na playlist!' });

    // Adicionar o canal a playlist
    const { data, error } = await supabase.from('playlist_items').insert([{ playlist_id: playlistId, tv_channel_id: channelId }]);
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: 'Playlist addicionada com sucesso' });
});

// lista a playlist de um usuario pelo id do usuario
router.get('/listplaylist/:userId', async (req, res) => {
    const { userId } = req.params;

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase.from('users').select().eq('id', userId);
    if (userError) return res.status(500).json({ error: userError.message });
    if (!user.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    const { data, error } = await supabase.from('playlists').select().eq('user_id', userId);
    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
});

// lista o conteudo de uma playlist pelo id da playlist e do usuario e mostrando os canais com name description url e image
router.get('/playlist/:userId/:playlistId', async (req, res) => {
    const { userId, playlistId } = req.params;

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase.from('users').select().eq('id', userId);
    if (userError) return res.status(500).json({ error: userError.message });
    if (!user.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Verificar se a playlist existe
    const { data: playlist, error: playlistError } = await supabase.from('playlists').select().eq('id', playlistId);
    if (playlistError) return res.status(500).json({ error: playlistError.message });
    if (!playlist.length) return res.status(404).json({ error: 'Playlist não encontrada' });

    const { data, error } = await supabase
        .from('playlist_items')
        .select('tv_channels(name, description, url, image)')
        .eq('playlist_id', playlistId);

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
});

// atualiza o nome de uma playlist pelo id da playlist e do usuario passando e o novo nome
router.put('/updateplaylist', async (req, res) => {
    const { playlistId, userId, name } = req.body;

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase.from('users').select().eq('id', userId);
    if (userError) return res.status(500).json({ error: userError.message });
    if (!user.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Verificar se a playlist existe
    const { data: playlist, error: playlistError } = await supabase.from('playlists').select().eq('id', playlistId);
    if (playlistError) return res.status(500).json({ error: playlistError.message });
    if (!playlist.length) return res.status(404).json({ error: 'Playlist não encontrada' });

    // verifica se o nome da playlist já existe para o usuario
    const { data: playlistName, error: playlistNameError } = await supabase.from('playlists').select().eq('name', name).eq('user_id', userId);
    if (playlistNameError) return res.status(500).json({ error: playlistNameError.message });
    if (playlistName.length) return res.status(400).json({ error: 'Essa playlist com esse nome já existe!' });

    const { data, error } = await supabase.from('playlists').update({ name }).eq('id', playlistId);
    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json({ message: 'Playlist atualizada com sucesso!' });
});

// deleta um canal de uma playlist pelo id do canal e da playlist
router.delete('/deleteplaylistitem', async (req, res) => {
    const { playlistId, channelId } = req.body;

    // Verificar se a playlist existe
    const { data: playlist, error: playlistError } = await supabase.from('playlists').select().eq('id', playlistId);
    if (playlistError) return res.status(500).json({ error: playlistError.message });
    if (!playlist.length) return res.status(404).json({ error: 'Playlist não encontrada' });

    // Verificar se o canal existe
    const { data: channel, error: channelError } = await supabase.from('tv_channels').select().eq('id', channelId);
    if (channelError) return res.status(500).json({ error: channelError.message });
    if (!channel.length) return res.status(404).json({ error: 'Canal não encontrado' });

    const { data, error } = await supabase.from('playlist_items').delete().eq('playlist_id', playlistId).eq('tv_channel_id', channelId);
    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json({ message: 'Canal deletado da playlist com sucesso!' });
});

// deleta uma playlist pelo id da playlist e do usuario
router.delete('/deleteplaylist', async (req, res) => {
    const { playlistId, userId } = req.body;

    // Verificar se o usuário existe
    const { data: user, error: userError } = await supabase.from('users').select().eq('id', userId);
    if (userError) return res.status(500).json({ error: userError.message });
    if (!user.length) return res.status(404).json({ error: 'Usuário não encontrado' });

    // Verificar se a playlist existe
    const { data: playlist, error: playlistError } = await supabase.from('playlists').select().eq('id', playlistId);
    if (playlistError) return res.status(500).json({ error: playlistError.message });
    if (!playlist.length) return res.status(404).json({ error: 'Playlist não encontrada' });

    const { data, error } = await supabase.from('playlists').delete().eq('id', playlistId);
    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json({ message: 'Playlist deletada com sucesso!' });
});

module.exports = router;
