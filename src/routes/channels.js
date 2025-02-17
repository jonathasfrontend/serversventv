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

// rota para buscar os canais pelo nome do canal
router.get('/search/:search', async (req, res) => {
    const { search } = req.params;

    const { data, error } = await supabase
        .from('tv_channels')
        .select('*')
        .ilike('name', `%${search}%`);

    if (error) return res.status(500).json({ error: error.message });
    // Verifica se existe o canal
    if (!data.length) return res.status(404).json({ error: 'Canal não encontrado' });

    res.status(200).json(data);
});

// Criar um canal
router.post('/', async (req, res) => {
    const { name, categoria, image, url } = req.body;

    // verifica se o canal já foi cadastrado no banco com mesmo nome
    const { data: dataChannel, error: errorChannel } = await supabase
        .from('tv_channels')
        .select('*')
        .eq('name', name);

    if (errorChannel) return res.status(500).json({ error: errorChannel.message });
    if (dataChannel.length) return res.status(400).json({ error: 'Este canal já existe!' });

    const descriptionName = name.toLowerCase().replace(/ /g, '-');

    const { data, error } = await supabase.from('tv_channels').insert([{ name, description: descriptionName, categoria, url, image }]);
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: `O canal ${name} foi criado com sucesso!` });
});

// Atualizar um canal
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, categoria, image, url } = req.body;

    const descriptionName = name.toLowerCase().replace(/ /g, '-');

    const { data, error } = await supabase
        .from('tv_channels')
        .update({ name, description: descriptionName, categoria, url, image })
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

// Deleta todos os canais com verificação de senha do usuario com bcrypt da tabela users pelo id email do usuario
router.delete('/deleteAll/:id', async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
  
    // Busca o usuário para validar a senha
    const { data, error } = await supabase
      .from('users')
      .select('password')
      .eq('id', id)
      .single();
  
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(404).json({ error: 'Usuário não encontrado' });
  
    const isValidPassword = bcrypt.compareSync(password, data.password);
    if (!isValidPassword) return res.status(400).json({ error: 'Senha inválida' });
  
    // Adiciona uma cláusula WHERE que sempre retorna verdadeiro
    const { data: dataChannels, error: errorChannels } = await supabase
      .from('tv_channels')
      .delete()
      .not('id', 'is', null);  // Isso aplica um filtro "WHERE id IS NOT NULL"
  
    if (errorChannels) return res.status(500).json({ error: errorChannels.message });
  
    res.status(200).json({ message: 'Todos os canais foram deletados com sucesso!' });
  });
  

module.exports = router;
