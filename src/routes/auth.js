const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();

const generateToken = (params) => jwt.sign(params, process.env.JWT_SECRET, { expiresIn: '1h' });

router.post('/signup', async (req, res) => {
    try {
        const { username, email, password, avatar } = req.body;

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // confere se o email é válido
        if (!email.includes('@')) {
            return res.status(400).json({ error: 'Email inválido. use exemple@gmail.com' });
        }

        // confere se a senha posui mais de 8 caracteres
        if (password.length < 8) {
            return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres, incluindo números, letras e símbolos.' });
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

router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });

    const token = generateToken({ id: user.id });

    res.status(200).json({ token, email: user.email, username: user.username, id: user.id, avatar: user.avatar });
});

module.exports = router;
