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

    // verificar se tem algum canal
    if (!data.length) return res.status(404).json({ error: 'Nenhum canal encontrado' });

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

    // verificar se o canal existe
    if (!data) return res.status(404).json({ error: 'Canal não encontrado' });

    res.status(200).json(data);
});

// lista os canais pela categoria
router.get('/categoria/:categoria', async (req, res) => {
    const { categoria } = req.params;

    const { data, error } = await supabase
        .from('tv_channels')
        .select('*')
        .eq('categoria', categoria);

    if (error) return res.status(500).json({ error: error.message });

    // Verifica se existe a categoria
    if (!data.length) return res.status(404).json({ error: 'Categoria não encontrada' });

    res.status(200).json(data);
});

// Criar um canal
router.post('/', async (req, res) => {
    const { name, description, categoria, url, image } = req.body;

    const { data, error } = await supabase.from('tv_channels').insert([{ name, description, categoria, url, image }]);
    if (error) return res.status(500).json({ error: error.message });

    // verifica se o já existe o canal pelo nome do canal {name}
    if (data.length === 0) return res.status(409).json({ error: `O canal ${name} já existe!` });

    res.status(201).json({ message: `O canal ${name} foi criado com sucesso!` });
});

// Atualizar um canal
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, categoria, url, image } = req.body;

    const { data, error } = await supabase
        .from('tv_channels')
        .update({ name, description, categoria, url, image })
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    // verifica se existe o canal
    if (!data.length) return res.status(404).json({ error: 'Canal não encontrado' });

    res.status(200).json({ message: `O canal ${name} foi atualizado com sucesso!` });
});

// Deletar um canal
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    const { data, error } = await supabase
        .from('tv_channels')
        .delete()
        .eq('id', id);

    if (error) return res.status(500).json({ error: error.message });

    // verifica se existe o canal
    if (!data.length) return res.status(404).json({ error: 'Canal não encontrado' });

    res.status(200).json({ message: 'Canal deletado com sucesso' });
});

module.exports = router;
