const express = require('express');
const createSupabaseClient = require('../connections/connections');
const supabase = createSupabaseClient();
const router = express.Router();

// 1. Desempenho dos canais (likes e favoritos)
router.get('/channel-performance', async (req, res) => {
  try {
    // Busca todos os canais
    const { data: channels, error: channelError } = await supabase
      .from('tv_channels')
      .select('*');
    if (channelError) throw channelError;
    
    // Busca todas as curtidas
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('tv_channel_id');
    if (likesError) throw likesError;
    
    // Busca todos os favoritos
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('tv_channel_id');
    if (favError) throw favError;
    
    // Para cada canal, calcula quantos likes e favoritos recebeu
    const performanceData = channels.map(channel => {
      const likeCount = likes.filter(like => like.tv_channel_id === channel.id).length;
      const favCount = favorites.filter(fav => fav.tv_channel_id === channel.id).length;
      return {
        id: channel.id,
        name: channel.name,
        likeCount,
        favoriteCount: favCount,
      };
    });
    
    res.status(200).json(performanceData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Usuários que mais curtiram canais (ranking dos usuários com mais likes dados)
router.get('/top-users-likes', async (req, res) => {
  try {
    // Busca todas as curtidas e agrupa por usuário (user_id)
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('user_id');
    if (likesError) throw likesError;
    
    const userLikesCount = {};
    likes.forEach(like => {
      userLikesCount[like.user_id] = (userLikesCount[like.user_id] || 0) + 1;
    });
    
    // Converte o objeto para um array
    const userLikesArray = Object.entries(userLikesCount).map(([userId, count]) => ({
      userId,
      likesGiven: count,
    }));
    
    // Ordena de forma decrescente (quem deu mais likes primeiro)
    userLikesArray.sort((a, b) => b.likesGiven - a.likesGiven);
    
    // Busca os detalhes dos usuários (nome, avatar, etc.)
    const userIds = userLikesArray.map(item => item.userId);
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, avatar')
      .in('id', userIds);
    if (usersError) throw usersError;
    
    // Combina os dados dos usuários com a contagem de curtidas
    const topUsers = userLikesArray.map(item => {
      const userDetail = users.find(u => u.id === item.userId);
      return {
        id: item.userId,
        username: userDetail ? userDetail.username : 'Usuário não encontrado',
        avatar: userDetail ? userDetail.avatar : null,
        likesGiven: item.likesGiven,
      };
    });
    
    res.status(200).json(topUsers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Categorias de canais mais populares (soma de likes e favoritos por categoria)
router.get('/popular-categories', async (req, res) => {
  try {
    // Busca canais com a categoria
    const { data: channels, error: channelsError } = await supabase
      .from('tv_channels')
      .select('id, name, categoria');
    if (channelsError) throw channelsError;
    
    // Busca todas as curtidas
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('tv_channel_id');
    if (likesError) throw likesError;
    
    // Busca todos os favoritos
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('tv_channel_id');
    if (favError) throw favError;
    
    // Agrupa os dados por categoria
    const categoryStats = {};
    channels.forEach(channel => {
      const channelLikes = likes.filter(like => like.tv_channel_id === channel.id).length;
      const channelFavs = favorites.filter(fav => fav.tv_channel_id === channel.id).length;
      if (!categoryStats[channel.categoria]) {
        categoryStats[channel.categoria] = { likes: 0, favorites: 0, channelsCount: 0 };
      }
      categoryStats[channel.categoria].likes += channelLikes;
      categoryStats[channel.categoria].favorites += channelFavs;
      categoryStats[channel.categoria].channelsCount++;
    });
    
    // Transforma o objeto em um array para ordenação
    const popularCategories = Object.entries(categoryStats).map(([categoria, stats]) => ({
      categoria,
      likes: stats.likes,
      favorites: stats.favorites,
      channelsCount: stats.channelsCount,
      total: stats.likes + stats.favorites,
    }));
    
    // Ordena do mais popular para o menos popular (com base na soma de likes e favoritos)
    popularCategories.sort((a, b) => b.total - a.total);
    
    res.status(200).json(popularCategories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Evolução de likes (tendência de curtidas ao longo do tempo)
// Aqui assumimos que a tabela 'likes' possui um campo 'created_at' do tipo timestamp
router.get('/likes-evolution', async (req, res) => {
  try {
    const { data: likes, error: likesError } = await supabase
      .from('likes')
      .select('created_at');
    if (likesError) throw likesError;
    
    // Agrupa os likes por mês (formato "YYYY-MM")
    const evolution = {};
    likes.forEach(like => {
      const date = new Date(like.created_at);
      const month = date.toISOString().slice(0, 7); // "2023-08", por exemplo
      evolution[month] = (evolution[month] || 0) + 1;
    });
    
    // Converte para array e ordena cronologicamente
    const evolutionArray = Object.entries(evolution)
      .map(([month, count]) => ({ month, likes: count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    res.status(200).json(evolutionArray);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Evolução de cadastros (novos usuários ao longo do tempo)
// Aqui assumimos que a tabela 'users' possui um campo 'createdAt' (ou 'created_at') com a data de cadastro
router.get('/registrations-evolution', async (req, res) => {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('created_at');
    if (usersError) throw usersError;
    
    // Agrupa os cadastros por mês (formato "YYYY-MM")
    const regEvolution = {};
    users.forEach(user => {
      const date = new Date(user.created_at);
      const month = date.toISOString().slice(0, 7);
      regEvolution[month] = (regEvolution[month] || 0) + 1;
    });
    
    // Converte para array e ordena cronologicamente
    const regEvolutionArray = Object.entries(regEvolution)
      .map(([month, count]) => ({ month, registrations: count }))
      .sort((a, b) => a.month.localeCompare(b.month));
    
    res.status(200).json(regEvolutionArray);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
