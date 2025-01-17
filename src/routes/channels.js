const express = require('express');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();

// Listar todos os canais
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('tv_channels')
        .select('*');

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
});

// Listar um canal
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
        .from('tv_channels')
        .select('*').eq('id', id)
        .single();

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json(data);
});

// Criar um canal
router.post('/', async (req, res) => {
    const { name, description, url, image } = req.body;

    const { data, error } = await supabase.from('tv_channels').insert([{ name, description, url, image }]);
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: `O canal ${name} foi criado com sucesso!` });
});

module.exports = router;
