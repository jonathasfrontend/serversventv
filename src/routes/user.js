const express = require('express');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const generateToken = (params) => jwt.sign(params, process.env.JWT_SECRET, { expiresIn: '1h' });

// lista todos os usuários cadastrados
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('users').select('*');

    if (error) return res.status(400).json({ error: error.message });

    const users = data.map(user => {
        return {
            id: user.id,
            username: user.username,
            nametag: user.nametag,
            cargo: user.cargo,
            email: user.email,
            avatar: user.avatar,
            createdAt: user.created_at,
        };
    });

    return res.status(200).json(users);
});

// lista todos os usuários com suas curtidas, favoritos e playlists
router.get('/full', async (req, res) => { 
    try {
        // 1. Buscar todos os usuários
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');
        if (usersError) throw usersError;

        // 2. Buscar todas as curtidas, com os canais associados
        const { data: likes, error: likesError } = await supabase
            .from('likes')
            .select('user_id, tv_channels(*)');
        if (likesError) throw likesError;

        // 3. Buscar todos os favoritos, com os canais associados
        const { data: favorites, error: favoritesError } = await supabase
            .from('favorites')
            .select('user_id, tv_channels(*)');
        if (favoritesError) throw favoritesError;

        // 4. Buscar todas as playlists
        const { data: playlists, error: playlistsError } = await supabase
            .from('playlists')
            .select('*');
        if (playlistsError) throw playlistsError;

        // 5. Buscar os canais de cada playlist (assumindo a existência da tabela "playlist_channels")
        const { data: playlistChannels, error: pcError } = await supabase
            .from('playlist_items')
            .select('playlist_id, tv_channels(*)');
        if (pcError) throw pcError;

        // Agrupar as curtidas por usuário
        const likesByUser = {};
        likes.forEach(item => {
            if (!likesByUser[item.user_id]) {
                likesByUser[item.user_id] = [];
            }
            // Se o relacionamento estiver definido, item.tv_channels conterá os dados do canal
            if (item.tv_channels) {
                likesByUser[item.user_id].push(item.tv_channels);
            }
        });

        // Agrupar os favoritos por usuário
        const favoritesByUser = {};
        favorites.forEach(item => {
            if (!favoritesByUser[item.user_id]) {
                favoritesByUser[item.user_id] = [];
            }
            if (item.tv_channels) {
                favoritesByUser[item.user_id].push(item.tv_channels);
            }
        });

        // Agrupar os canais das playlists: mapeia playlist_id para os canais contidos nela
        const playlistChannelsMap = {};
        playlistChannels.forEach(item => {
            if (!playlistChannelsMap[item.playlist_id]) {
                playlistChannelsMap[item.playlist_id] = [];
            }
            if (item.tv_channels) {
                playlistChannelsMap[item.playlist_id].push(item.tv_channels);
            }
        });

        // Agrupar as playlists por usuário, inserindo os canais em cada playlist
        const playlistsByUser = {};
        playlists.forEach(playlist => {
            // Para cada playlist, anexa os canais que ela contém
            playlist.channels = playlistChannelsMap[playlist.id] || [];
            if (!playlistsByUser[playlist.user_id]) {
                playlistsByUser[playlist.user_id] = [];
            }
            playlistsByUser[playlist.user_id].push(playlist);
        });

        // Combinar os dados para cada usuário
        const fullUserData = users.map(user => ({
            ...user,
            likedChannels: likesByUser[user.id] || [],
            favoritedChannels: favoritesByUser[user.id] || [],
            playlists: playlistsByUser[user.id] || []
        }));

        res.status(200).json(fullUserData);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// lista o usuario pelo nametag que é o username em lowercase e sem espaços e retorna o id, username, email e avatar
router.get('/:nametag', async (req, res) => {
    const { nametag } = req.params;

    const { data, error } = await supabase.from('users').select('*').eq('nametag', nametag).single();

    if (error) return res.status(400).json({ error: error.message });

    if (!data) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const user = {
        id: data.id,
        username: data.username,
        nametag: data.nametag,
        email: data.email,
        avatar: data.avatar,
        createdAt: data.created_at,
    };

    return res.status(200).json(user);
});

// cadastra um novo usuário com username, email, password e avatar
router.post('/signup', async (req, res) => {
    try {
        const { username, email, cargo, password, avatar } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);

        // confere se o nome de usuário possui apenas letras mas pode ter espaços e mais de 3 caracteres
        const usernameRegex = /^[a-zA-Z ]{3,}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: 'Nome de usuário inválido.' });
        }

        // verificação de email válido mais robusta com @ e terminar com .com
        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Email inválido.' });
        }

        // confere se a senha posui mais de 8 caracteres
        if (password.length < 8) {
            return res.status(400).json({ error: 'Sua senha deve conter 8 caracteres.' });
        }

        // verifica se a senha do usuário possui letras e números e caracteres especiais mas pode ter espaços
        const passwordRegex = /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&* ]*$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({ error: 'Sua senha deve conter letra, número e caractere especial.' });
        }

        // pega o username do usuario e transforma em lowercase e remove espaços
        const usertag = username.toLowerCase().replace(/\s/g, '');

        // Inserir usuário no banco de dados e retornar os dados inseridos
        const { data, error } = await supabase
            .from('users')
            .insert([{ username, nametag: usertag, email, avatar, cargo, password: hashedPassword, created_at: new Date() }])
            .select('*'); // Garantir que os dados retornem após inserção

        if (error || !data || data.length === 0) {
            return res.status(500).json({ error: error?.message || 'Erro ao registrar usuário.' });
        }

        const token = generateToken({ id: data[0].id });

        res.status(201).json({ token, email, username, usertag, id: data[0].id, avatar });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

// atualiza a senha um usuário pelo id fazendo a verificação da senha atual com a nova senha e a confirmação da nova senha
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { password, newPassword, confirmPassword } = req.body;

    if (!password || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'As senhas não conferem.' });
    }

    const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) return res.status(400).json({ error: error.message });

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
        return res.status(400).json({ error: 'Senha atual inválida.' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const { data: updatedUser, error: updateError } = await supabase.from('users').update({
        password: hashedPassword,
    }).eq('id', id).single();

    if (updateError) return res.status(400).json({ error: updateError.message });

    return res.status(200).json({ message: 'Senha atualizada com sucesso.' });
});

// autliza cargo de um usuário pelo id
router.put('/update-cargo/:id', async (req, res) => {
    const { id } = req.params;
    const { cargo } = req.body;

    if (!cargo) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) return res.status(400).json({ error: error.message });

    const { data: updatedUser, error: updateError } = await supabase.from('users').update({
        cargo,
    }).eq('id', id).single();

    if (updateError) return res.status(400).json({ error: updateError.message });

    return res.status(200).json({ message: 'Cargo atualizado com sucesso.' });
});

// atualiza o username de um usuário pelo id
router.put('/update-username/:id', async (req, res) => {
    const { id } = req.params;
    const { username } = req.body;

    if (!username) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) return res.status(400).json({ error: error.message });

    // confere se o nome de usuário possui apenas letras mas pode ter espaços e mais de 3 caracteres
    const usernameRegex = /^[a-zA-Z ]{3,}$/;
    if (!usernameRegex.test(username)) {
        return res.status(400).json({ error: 'Nome de usuário inválido.' });
    }

    // pega o username do usuario e transforma em lowercase e remove espaços
    const usertag = username.toLowerCase().replace(/\s/g, '');

    const { data: updatedUser, error: updateError } = await supabase.from('users').update({
        username,
        nametag: usertag,
    }).eq('id', id).single();

    if (updateError) return res.status(400).json({ error: updateError.message });

    return res.status(200).json({ message: 'Nome de usuário atualizado com sucesso.' });
});

// atualiza o email de um usuário pelo id
router.put('/update-email/:id', async (req, res) => {
    const { id } = req.params;
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    // verificação de email válido mais robusta com @ e terminar com .com
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email inválido.' });
    }

    const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) return res.status(400).json({ error: error.message });

    const { data: updatedUser, error: updateError } = await supabase.from('users').update({
        email,
    }).eq('id', id).single();

    if (updateError) return res.status(400).json({ error: updateError.message });

    return res.status(200).json({ message: 'Email atualizado com sucesso.' });
});

// atualiza o avatar de um usuário pelo id
router.put('/update-avatar/:id', async (req, res) => {
    const { id } = req.params;
    const { avatar } = req.body;

    if (!avatar) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) return res.status(400).json({ error: error.message });

    const { data: updatedUser, error: updateError } = await supabase.from('users').update({
        avatar,
    }).eq('id', id).single();

    if (updateError) return res.status(400).json({ error: updateError.message });

    return res.status(200).json({ message: 'Avatar atualizado com sucesso.' });
});

// deleta um usuário pelo id
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) return res.status(400).json({ error: error.message });

    if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    const { data: deletedUser, deleteError } = await supabase.from('users').delete().eq('id', id).single();

    if (deleteError) return res.status(400).json({ error: deleteError.message });

    return res.status(200).json({ message: 'Usuário deletado com sucesso.' });
});

module.exports = router;    