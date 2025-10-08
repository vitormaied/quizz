import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

function HostGame() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, finished
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [ranking, setRanking] = useState([]);
  const [quiz, setQuiz] = useState(null);
  const [pollResults, setPollResults] = useState([]);
  const [wordCloudData, setWordCloudData] = useState([]);

  useEffect(() => {
    const code = localStorage.getItem('roomCode');
    const isHost = localStorage.getItem('isHost');

    if (!code || !isHost) {
      navigate('/');
      return;
    }

    setRoomCode(code);

    // Conectar ao Socket.IO
    const socketUrl = import.meta.env.PROD ? window.location.origin : 'http://localhost:3000';
    const newSocket = io(socketUrl);
    setSocket(newSocket);

    newSocket.emit('host:join', { roomCode: code });

    newSocket.on('host:joined', ({ game }) => {
      setPlayers(game.players || []);
      setQuiz(game.quiz);
      setTotalQuestions(game.quiz.questions.length);
    });

    newSocket.on('player:joined', ({ player, totalPlayers }) => {
      setPlayers((prev) => [...prev, player]);
    });

    newSocket.on('player:left', ({ playerId, totalPlayers }) => {
      setPlayers((prev) => prev.filter((p) => p.id !== playerId));
    });

    newSocket.on('answer:received', ({ playerId, playerName, isCorrect, totalAnswered }) => {
      setAnswers((prev) => [
        ...prev,
        { playerId, playerName, isCorrect }
      ]);
    });

    newSocket.on('poll:update', ({ results, totalAnswers }) => {
      setPollResults(results);
    });

    newSocket.on('word-cloud:update', ({ words }) => {
      setWordCloudData(words);
    });

    newSocket.on('game:ended', ({ reason }) => {
      alert(reason);
      navigate('/');
    });

    return () => {
      newSocket.close();
    };
  }, [navigate]);

  const startGame = () => {
    if (players.length === 0) {
      alert('Aguarde pelo menos um aluno entrar');
      return;
    }

    if (!socket) {
      alert('Erro: Socket não conectado. Tente recarregar a página.');
      return;
    }

    console.log('Iniciando jogo...', { roomCode, players: players.length, quiz });
    socket.emit('game:start', { roomCode });
    setGameStatus('playing');
    setQuestionNumber(1);
    if (quiz && quiz.questions.length > 0) {
      setCurrentQuestion(quiz.questions[0]);
    }
  };

  const nextQuestion = () => {
    setAnswers([]);
    const nextIndex = questionNumber;
    if (quiz && nextIndex < quiz.questions.length) {
      setCurrentQuestion(quiz.questions[nextIndex]);
      setQuestionNumber(nextIndex + 1);
    }
    socket.emit('question:next', { roomCode });
  };

  const showRanking = () => {
    socket.emit('ranking:show', { roomCode });
  };

  const endGame = () => {
    if (confirm('Tem certeza que deseja encerrar o jogo?')) {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-primary">Sala do Professor</h1>
            <div className="text-right">
              <p className="text-sm text-gray-600">Código da Sala</p>
              <p className="text-4xl font-bold text-secondary">{roomCode}</p>
            </div>
          </div>

          {gameStatus === 'waiting' && (
            <div>
              <div className="bg-blue-100 border-l-4 border-blue-500 p-4 mb-6">
                <p className="text-blue-700">
                  Compartilhe o código <strong>{roomCode}</strong> com seus alunos
                </p>
              </div>

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-3">
                  Alunos Conectados ({players.length})
                </h2>
                {players.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Aguardando alunos entrarem...
                  </p>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {players.map((player, index) => (
                      <div key={index} className="bg-gray-100 p-3 rounded-lg">
                        <p className="font-semibold">👨‍🎓 {player.name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={startGame}
                className="btn btn-success w-full text-xl"
                disabled={players.length === 0}
              >
                Iniciar Quiz
              </button>
            </div>
          )}

          {gameStatus === 'playing' && (
            <div>
              <div className="mb-6">
                <p className="text-lg mb-2">
                  Pergunta {questionNumber} de {totalQuestions}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
                  ></div>
                </div>
              </div>

              {currentQuestion && (
                <div className="mb-6 border-2 border-gray-200 rounded-lg p-6">
                  <h2 className="text-2xl font-bold text-center mb-4">
                    {currentQuestion.question}
                  </h2>
                  {currentQuestion.image && (
                    <div className="flex justify-center mb-4">
                      <img
                        src={currentQuestion.image}
                        alt="Pergunta"
                        className="max-h-64 rounded-lg border-2 border-gray-300 object-contain"
                      />
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    {currentQuestion.options.map((option, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg border-2 ${
                          index === currentQuestion.correctAnswer
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-300 bg-gray-50'
                        }`}
                      >
                        <p className="font-semibold">
                          {index === currentQuestion.correctAnswer && '✓ '}
                          Opção {index + 1}: {option}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-6">
                <h2 className="text-xl font-bold mb-3">
                  Respostas Recebidas ({answers.length}/{players.length})
                </h2>

                {currentQuestion?.type === 'poll' && pollResults.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    <h3 className="font-semibold text-gray-700">📊 Resultados em Tempo Real:</h3>
                    {pollResults.map((count, index) => {
                      const total = pollResults.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={index} className="bg-white rounded-lg p-3 shadow">
                          <div className="flex justify-between mb-1">
                            <span className="font-semibold">{currentQuestion.options[index]}</span>
                            <span className="text-gray-600">{count} votos ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div
                              className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : currentQuestion?.type === 'word-cloud' && wordCloudData.length > 0 ? (
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-6 mb-4">
                    <h3 className="font-semibold text-gray-700 mb-3">☁️ Palavras Recebidas:</h3>
                    <div className="flex flex-wrap gap-2">
                      {wordCloudData.map((item, index) => (
                        <span
                          key={index}
                          className="bg-white px-3 py-1 rounded-full text-sm shadow"
                        >
                          {item.word}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {answers.map((answer, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-lg ${
                          answer.isCorrect === null ? 'bg-blue-100' :
                          answer.isCorrect ? 'bg-green-100' : 'bg-red-100'
                        }`}
                      >
                        <p className="font-semibold">
                          {answer.isCorrect === null ? '📊' : answer.isCorrect ? '✓' : '✗'} {answer.playerName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={showRanking}
                  className="btn bg-purple-500 hover:bg-purple-600 text-white w-full"
                >
                  Mostrar Ranking Parcial
                </button>

                <button
                  onClick={nextQuestion}
                  className="btn btn-primary w-full"
                >
                  {questionNumber < totalQuestions ? 'Próxima Pergunta' : 'Finalizar Quiz'}
                </button>

                <button
                  onClick={endGame}
                  className="btn btn-danger w-full"
                >
                  Encerrar Jogo
                </button>
              </div>
            </div>
          )}

          {gameStatus === 'finished' && (
            <div>
              <h2 className="text-2xl font-bold mb-6 text-center">
                🏆 Ranking Final
              </h2>

              <div className="space-y-3 mb-6">
                {ranking.map((player, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg flex justify-between items-center ${
                      index === 0
                        ? 'bg-yellow-100 border-2 border-yellow-500'
                        : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-bold">{player.position}º</span>
                      <span className="font-semibold">{player.name}</span>
                    </div>
                    <span className="text-xl font-bold text-primary">
                      {player.score} pts
                    </span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => navigate('/')}
                className="btn btn-primary w-full"
              >
                Voltar ao Início
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HostGame;
