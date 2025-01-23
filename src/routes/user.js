const express = require('express');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();
const bcrypt = require('bcrypt');

// lista todos os usuários cadastrados
router.get('/', async (req, res) => {
    const { data, error } = await supabase.from('users').select('*');

    if (error) return res.status(400).json({ error: error.message });

    const users = data.map(user => {
        return {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            email: user.email,
            password:user.password,
        };
    });

    return res.status(200).json(users);
});

// cadastra um novo usuário com username, email, password e avatar
router.post('/signup', async (req, res) => {
    try {
        const { username, email, password, avatar } = req.body;

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

        // Inserir usuário no banco de dados e retornar os dados inseridos
        const { data, error } = await supabase
            .from('users')
            .insert([{ username, email, avatar, password: hashedPassword, created_at: new Date() }])
            .select('*'); // Garantir que os dados retornem após inserção

        if (error || !data || data.length === 0) {
            return res.status(500).json({ error: error?.message || 'Erro ao registrar usuário.' });            
        }

        const token = generateToken({ id: data[0].id });

        res.status(201).json({ token, email, username, id: data[0].id, avatar });
    } catch (err) {
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

// atualiza o username de um usuário pelo id e faz a verificação se o username já existe para outro usuário atualiza email e avatar
router.put('/update-userdata/:id', async (req, res) => {
    const { id } = req.params;
    const { username, email, avatar } = req.body;

    if (!username || !email || !avatar) {
        return res.status(400).json({ error: 'Preencha todos os campos.' });
    }

    const { data: user, error } = await supabase.from('users').select('*').eq('id', id).single();

    if (error) return res.status(400).json({ error: error.message });

    if (user.username !== username) {
        const { data: usernameExists, error: usernameError } = await supabase.from('users').select('*').eq('username', username);

        if (usernameError) return res.status(400).json({ error: usernameError.message });

        if (usernameExists) {
            return res.status(400).json({ error: 'Nome de usuário já existe.' });
        }
    }

    const { data: updatedUser, error: updateError } = await supabase.from('users').update({
        username,
        email,
        avatar,
    }).eq('id', id).single();

    if (updateError) return res.status(400).json({ error: updateError.message });

    return res.status(200).json({ message: 'Usuário atualizado com sucesso.' });
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