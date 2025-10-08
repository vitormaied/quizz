import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:5173'],
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos em produção
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Armazenamento em memória (em produção, usar banco de dados)
const games = new Map();
const players = new Map();

// Gerar código de sala único
function generateRoomCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Criar nova sala de jogo
app.post('/api/game/create', (req, res) => {
  const { quiz } = req.body;
  const roomCode = generateRoomCode();

  games.set(roomCode, {
    quiz,
    players: [],
    currentQuestion: -1,
    status: 'waiting', // waiting, playing, finished
    createdAt: Date.now()
  });

  res.json({ roomCode });
});

// Socket.IO para comunicação em tempo real
io.on('connection', (socket) => {
  console.log('Novo cliente conectado:', socket.id);

  // Professor inicia o jogo
  socket.on('host:join', ({ roomCode }) => {
    const game = games.get(roomCode);
    if (game) {
      socket.join(roomCode);
      game.hostId = socket.id;
      socket.emit('host:joined', { game });
    } else {
      socket.emit('error', { message: 'Sala não encontrada' });
    }
  });

  // Aluno entra na sala
  socket.on('player:join', ({ roomCode, playerName }) => {
    const game = games.get(roomCode);

    if (!game) {
      socket.emit('error', { message: 'Sala não encontrada' });
      return;
    }

    if (game.status !== 'waiting') {
      socket.emit('error', { message: 'O jogo já começou' });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      score: 0,
      answers: []
    };

    game.players.push(player);
    players.set(socket.id, { roomCode, playerName });
    socket.join(roomCode);

    // Notifica todos na sala
    io.to(roomCode).emit('player:joined', {
      player,
      totalPlayers: game.players.length
    });
  });

  // Iniciar jogo
  socket.on('game:start', ({ roomCode }) => {
    const game = games.get(roomCode);
    console.log('game:start recebido', { roomCode, gameExists: !!game, hostMatch: game?.hostId === socket.id });

    if (game && game.hostId === socket.id) {
      game.status = 'playing';
      game.currentQuestion = 0;

      console.log('Iniciando jogo:', {
        roomCode,
        players: game.players.length,
        firstQuestion: game.quiz.questions[0]?.question
      });

      io.to(roomCode).emit('game:started', {
        question: game.quiz.questions[0],
        questionNumber: 1,
        totalQuestions: game.quiz.questions.length
      });
    } else {
      console.error('Erro ao iniciar jogo:', { roomCode, gameExists: !!game, socketId: socket.id, hostId: game?.hostId });
    }
  });

  // Próxima pergunta
  socket.on('question:next', ({ roomCode }) => {
    const game = games.get(roomCode);
    if (game && game.hostId === socket.id) {
      game.currentQuestion++;

      if (game.currentQuestion < game.quiz.questions.length) {
        io.to(roomCode).emit('question:new', {
          question: game.quiz.questions[game.currentQuestion],
          questionNumber: game.currentQuestion + 1,
          totalQuestions: game.quiz.questions.length
        });
      } else {
        game.status = 'finished';
        const ranking = game.players
          .sort((a, b) => b.score - a.score)
          .map((p, index) => ({ ...p, position: index + 1 }));

        io.to(roomCode).emit('game:finished', { ranking });
      }
    }
  });

  // Aluno responde
  socket.on('answer:submit', ({ roomCode, answerIndex, timeLeft }) => {
    const game = games.get(roomCode);
    const playerData = players.get(socket.id);

    if (game && playerData) {
      const player = game.players.find(p => p.id === socket.id);
      const currentQuestion = game.quiz.questions[game.currentQuestion];

      if (player && currentQuestion) {
        // Para enquetes, não há resposta certa ou errada
        const isCorrect = currentQuestion.type === 'poll' ? null : answerIndex === currentQuestion.correctAnswer;

        // Calcular pontos (mais pontos para respostas mais rápidas)
        let points = 0;
        if (currentQuestion.type !== 'poll' && isCorrect) {
          const timeBonus = Math.floor((timeLeft / currentQuestion.timeLimit) * 500);
          points = 500 + timeBonus;
        }

        player.score += points;
        player.answers.push({
          questionIndex: game.currentQuestion,
          answerIndex,
          isCorrect,
          points,
          timeLeft
        });

        // Atualizar contagem de respostas para enquetes
        if (currentQuestion.type === 'poll') {
          if (!game.pollResults) {
            game.pollResults = {};
          }
          if (!game.pollResults[game.currentQuestion]) {
            game.pollResults[game.currentQuestion] = Array(currentQuestion.options.length).fill(0);
          }
          game.pollResults[game.currentQuestion][answerIndex]++;

          // Enviar resultados atualizados da enquete
          io.to(roomCode).emit('poll:update', {
            results: game.pollResults[game.currentQuestion],
            totalAnswers: game.players.filter(p =>
              p.answers.some(a => a.questionIndex === game.currentQuestion)
            ).length
          });
        }

        // Notifica o professor sobre a resposta
        io.to(game.hostId).emit('answer:received', {
          playerId: socket.id,
          playerName: player.name,
          isCorrect,
          totalAnswered: game.players.filter(p =>
            p.answers.some(a => a.questionIndex === game.currentQuestion)
          ).length
        });

        socket.emit('answer:result', { isCorrect, points });
      }
    }
  });

  // Resposta de nuvem de palavras
  socket.on('word-cloud:submit', ({ roomCode, word }) => {
    const game = games.get(roomCode);
    const playerData = players.get(socket.id);

    if (game && playerData) {
      if (!game.wordCloudData) {
        game.wordCloudData = {};
      }
      if (!game.wordCloudData[game.currentQuestion]) {
        game.wordCloudData[game.currentQuestion] = [];
      }

      game.wordCloudData[game.currentQuestion].push({
        word,
        playerId: socket.id,
        playerName: playerData.playerName
      });

      // Enviar dados atualizados da nuvem de palavras
      io.to(roomCode).emit('word-cloud:update', {
        words: game.wordCloudData[game.currentQuestion]
      });

      io.to(game.hostId).emit('answer:received', {
        playerId: socket.id,
        playerName: playerData.playerName,
        isCorrect: null,
        totalAnswered: game.wordCloudData[game.currentQuestion].length
      });
    }
  });

  // Mostrar ranking parcial
  socket.on('ranking:show', ({ roomCode }) => {
    const game = games.get(roomCode);
    if (game && game.hostId === socket.id) {
      const ranking = game.players
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((p, index) => ({
          position: index + 1,
          name: p.name,
          score: p.score
        }));

      io.to(roomCode).emit('ranking:update', { ranking });
    }
  });

  // Desconexão
  socket.on('disconnect', () => {
    const playerData = players.get(socket.id);

    if (playerData) {
      const game = games.get(playerData.roomCode);
      if (game) {
        game.players = game.players.filter(p => p.id !== socket.id);
        io.to(playerData.roomCode).emit('player:left', {
          playerId: socket.id,
          totalPlayers: game.players.length
        });
      }
      players.delete(socket.id);
    }

    // Se o host desconectar, encerra o jogo
    games.forEach((game, roomCode) => {
      if (game.hostId === socket.id) {
        io.to(roomCode).emit('game:ended', { reason: 'O professor saiu da sala' });
        games.delete(roomCode);
      }
    });

    console.log('Cliente desconectado:', socket.id);
  });
});

// Rota catch-all para SPA em produção
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
