const express = require('express');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();
const bcrypt = require('bcrypt');

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
    const { name, categoria, image } = req.body;

    // verifica se o canal já foi cadastrado no banco com mesmo nome
    const { data: dataChannel, error: errorChannel } = await supabase
        .from('tv_channels')
        .select('*')
        .eq('name', name);

    if (errorChannel) return res.status(500).json({ error: errorChannel.message });
    if (dataChannel.length) return res.status(400).json({ error: 'Este canal já existe!' });

    const descriptionName = name.toLowerCase().replace(/ /g, '-');
    const urlLink = image;

    const { data, error } = await supabase.from('tv_channels').insert([{ name, description: descriptionName, categoria, url: urlLink, image }]);
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: `O canal ${name} foi criado com sucesso!` });
});

// Atualizar um canal
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, categoria, image } = req.body;

    const descriptionName = name.toLowerCase().replace(/ /g, '-');
    const urlLink = image;

    const { data, error } = await supabase
        .from('tv_channels')
        .update({ name, description: descriptionName, categoria, url: urlLink, image })
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

    if (!data || data.length === 0) {
        return res.status(404).json({ error: 'Canal não encontrado' });
    }

    res.status(200).json({ message: 'Canal deletado com sucesso' });
});

// Deleta todos os canais com verificação de senha do usuario com bcrypt da tabela users
router.delete('/delete-all', async (req, res) => {
    const { id, password } = req.body;

    if (!id || !password) return res.status(400).json({ error: 'Preencha todos os campos' });

    const { data: user, error: userError } = await supabase
        .from('users')
        .select('password')
        .eq('id', id)
        .single();

    if (userError) return res.status(500).json({ error: userError.message });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ error: 'Senha incorreta' });

    const { data, error } = await supabase
        .from('tv_channels')
        .delete();

    if (error) return res.status(500).json({ error: error.message });

    res.status(200).json({ message: 'Todos os canais foram deletados com sucesso' });
});

module.exports = router;
