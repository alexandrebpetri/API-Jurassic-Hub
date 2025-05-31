require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
const port = process.env.PORT || 3000;

// Rota teste para verificar conexão
app.get('/', async (req, res) => {
  try {
    const now = new Date();
    res.send(`Conectado com sucesso! Hora atual: ${now.toISOString()}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao conectar ao servidor');
  }
});

// Rota para buscar os jogos
app.get('/games', async (req, res) => {
  try {
    const games = await prisma.games.findMany({
  orderBy: { id: 'asc' },
  include: {
    developer: true,
    game_category: {
      include: {
        category: true
      }
    }
  }
});

const formattedGames = games.map(game => ({
  id: game.id,
  name: game.name,
  image: game.image,
  description: game.description,
  price: game.price,
  release_date: game.release_date,
  developer: game.developer?.name,
  categories: game.game_category.map(gc => gc.category.name)
}));


    res.json(formattedGames);
  } catch (err) {
    console.error(err);
    res.status(500).send('Erro ao buscar jogos');
  }
});


// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
