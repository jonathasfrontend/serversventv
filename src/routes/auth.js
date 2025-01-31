const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();

const generateToken = (params) => jwt.sign(params, process.env.JWT_SECRET, { expiresIn: '1h' });

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

    res.status(200).json({ token, email: user.email, username: user.username, tag: user.nametag, id: user.id, avatar: user.avatar });
});

module.exports = router;
