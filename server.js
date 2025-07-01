require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(cors());

// Configuração do multer para armazenar arquivos em memória
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Teste de rota
app.get('/', (req, res) => {
  const now = new Date();
  res.send(`Servidor ativo - ${now.toISOString()}`);
});

// Upload de imagem associada a um jogo (via campo `game_id` na tabela de imagem)
app.post('/upload/:gameId', upload.single('image'), async (req, res) => {
  try {
    const { gameId } = req.params;
    const imageBuffer = req.file?.buffer;

    if (!gameId || isNaN(gameId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const game = await prisma.games.findUnique({ where: { id: parseInt(gameId) } });
    if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });

    const newImage = await prisma.image.create({
      data: {
        data: imageBuffer,
        game_id: game.id // garante que o campo game_id na tabela image será preenchido
      }
    });

    await prisma.games.update({
      where: { id: game.id },
      data: {
        image_id: newImage.id // conecta a imagem ao jogo
      }
    });

    res.status(200).json({ message: 'Imagem enviada com sucesso', imageId: newImage.id });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao salvar a imagem' });
  }
});


app.get('/image/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const image = await prisma.image.findUnique({
      where: { id }
    });

    if (!image || !image.data) {
      return res.status(404).send('Imagem não encontrada');
    }

    res.setHeader('Content-Type', 'image/jpeg'); // ou image/png, conforme o tipo
    res.send(image.data);
  } catch (error) {
    console.error(error);
    res.status(500).send('Erro ao carregar imagem');
  }
});

// Atualiza a imagem associada a um jogo
app.put('/upload/:gameId', upload.single('image'), async (req, res) => {
  try {
    const { gameId } = req.params;
    const imageBuffer = req.file?.buffer;

    if (!gameId || isNaN(gameId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const game = await prisma.games.findUnique({ where: { id: parseInt(gameId) } });
    if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });

    const updated = await prisma.image.updateMany({
      where: { game_id: game.id },
      data: { data: imageBuffer }
    });

    if (updated.count === 0) {
      return res.status(404).json({ error: 'Imagem não encontrada para este jogo' });
    }

    res.status(200).json({ message: 'Imagem atualizada com sucesso' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar a imagem' });
  }
});

// Exclui a imagem associada a um jogo

app.delete('/upload/:gameId', async (req, res) => {
  try {
    const { gameId } = req.params;

    if (!gameId || isNaN(gameId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const game = await prisma.games.findUnique({ where: { id: parseInt(gameId) } });
    if (!game) return res.status(404).json({ error: 'Jogo não encontrado' });

    // Limpa a referência image_id no jogo
    await prisma.games.update({
      where: { id: game.id },
      data: { image_id: null }
    });

    // Remove o registro da imagem
    const deleted = await prisma.image.deleteMany({
      where: { game_id: game.id }
    });

    if (deleted.count === 0) {
      return res.status(404).json({ error: 'Imagem não encontrada' });
    }

    res.status(200).json({ message: 'Imagem excluída com sucesso' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir a imagem' });
  }
});

// Rota para buscar todos os jogos
app.get('/games', async (req, res) => {
  try {
    const games = await prisma.games.findMany({
      orderBy: { id: 'asc' },
      include: {
        developer: true,
        game_category: {
          include: { category: true }
        },
        image_games_image_idToimage: true // relação para buscar os dados da imagem
      }
    });

    const formatted = games.map(game => ({
      id: game.id,
      name: game.name,
      image: game.image_games_image_idToimage
        ? `data:image/jpeg;base64,${game.image_games_image_idToimage.data.toString('base64')}`
        : null,
      description: game.description,
      price: game.price,
      release_date: game.release_date,
      developer: game.developer?.name,
      categories: game.game_category.map(gc => gc.category.name)
    }));

    res.json(formatted);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar jogos' });
  }
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
