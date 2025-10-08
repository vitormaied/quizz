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
  const [reviewMode, setReviewMode] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);

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

    newSocket.on('ranking:update', ({ ranking }) => {
      setRanking(ranking);
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

  const enterReviewMode = () => {
    setReviewMode(true);
    setReviewQuestionIndex(0);
  };

  const exitReviewMode = () => {
    setReviewMode(false);
  };

  const navigateReviewQuestion = (direction) => {
    if (direction === 'prev' && reviewQuestionIndex > 0) {
      setReviewQuestionIndex(reviewQuestionIndex - 1);
    } else if (direction === 'next' && reviewQuestionIndex < totalQuestions - 1) {
      setReviewQuestionIndex(reviewQuestionIndex + 1);
    }
  };

  const getQuestionStats = (questionIndex) => {
    if (!quiz || !players.length) return null;

    const question = quiz.questions[questionIndex];
    const playersWhoAnswered = players.filter(p =>
      p.answers && p.answers.some(a => a.questionIndex === questionIndex)
    );

    const stats = {
      totalAnswers: playersWhoAnswered.length,
      correctAnswers: 0,
      incorrectAnswers: 0,
      answerDistribution: {}
    };

    // Inicializar distribuição de respostas
    if (question.type === 'quiz' || question.type === 'true-false' || question.type === 'poll') {
      question.options.forEach((_, index) => {
        stats.answerDistribution[index] = { count: 0, players: [] };
      });
    }

    playersWhoAnswered.forEach(player => {
      const answer = player.answers.find(a => a.questionIndex === questionIndex);
      if (answer) {
        if (answer.isCorrect === true) stats.correctAnswers++;
        if (answer.isCorrect === false) stats.incorrectAnswers++;

        if (answer.answerIndex !== undefined && stats.answerDistribution[answer.answerIndex]) {
          stats.answerDistribution[answer.answerIndex].count++;
          stats.answerDistribution[answer.answerIndex].players.push(player.name);
        }
      }
    });

    return stats;
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

              {ranking.length > 0 && (
                <div className="mb-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <h3 className="text-xl font-bold mb-3 text-center">🏆 Ranking Parcial (Top 5)</h3>
                  <div className="space-y-2">
                    {ranking.map((player, index) => (
                      <div
                        key={index}
                        className={`flex justify-between p-3 rounded-lg ${
                          index === 0
                            ? 'bg-yellow-200 font-bold'
                            : 'bg-white'
                        }`}
                      >
                        <span>
                          {index === 0 && '🥇 '}
                          {index === 1 && '🥈 '}
                          {index === 2 && '🥉 '}
                          {index > 2 && `${player.position}º `}
                          {player.name}
                        </span>
                        <span className="font-bold text-purple-600">
                          {player.score} pts
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={showRanking}
                  className="btn bg-purple-500 hover:bg-purple-600 text-white w-full"
                >
                  Mostrar Ranking Parcial
                </button>

                <button
                  onClick={enterReviewMode}
                  className="btn bg-blue-500 hover:bg-blue-600 text-white w-full"
                >
                  📊 Revisar Respostas
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

              <div className="space-y-3">
                <button
                  onClick={enterReviewMode}
                  className="btn bg-blue-500 hover:bg-blue-600 text-white w-full"
                >
                  📊 Revisar Respostas por Pergunta
                </button>

                <button
                  onClick={() => navigate('/')}
                  className="btn btn-primary w-full"
                >
                  Voltar ao Início
                </button>
              </div>
            </div>
          )}

          {reviewMode && quiz && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">📊 Revisão de Respostas</h2>
                <button
                  onClick={exitReviewMode}
                  className="btn bg-gray-500 hover:bg-gray-600 text-white"
                >
                  ✕ Sair da Revisão
                </button>
              </div>

              {/* Navegação entre perguntas */}
              <div className="mb-6 flex items-center justify-between bg-gray-100 p-4 rounded-lg">
                <button
                  onClick={() => navigateReviewQuestion('prev')}
                  disabled={reviewQuestionIndex === 0}
                  className="btn bg-gray-300 hover:bg-gray-400 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Anterior
                </button>
                <span className="font-bold text-lg">
                  Pergunta {reviewQuestionIndex + 1} de {totalQuestions}
                </span>
                <button
                  onClick={() => navigateReviewQuestion('next')}
                  disabled={reviewQuestionIndex === totalQuestions - 1}
                  className="btn bg-gray-300 hover:bg-gray-400 text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Próxima →
                </button>
              </div>

              {/* Pergunta e Estatísticas */}
              {(() => {
                const question = quiz.questions[reviewQuestionIndex];
                const stats = getQuestionStats(reviewQuestionIndex);

                return (
                  <div>
                    {/* Pergunta */}
                    <div className="card mb-6">
                      <div className="mb-4">
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-semibold mb-2">
                          {question.type === 'quiz' && '📝 Quiz'}
                          {question.type === 'true-false' && '✓✗ Verdadeiro ou Falso'}
                          {question.type === 'poll' && '📊 Enquete'}
                          {question.type === 'word-cloud' && '☁️ Nuvem de Palavras'}
                        </span>
                      </div>
                      <h3 className="text-xl font-bold mb-4">{question.question}</h3>
                      {question.image && (
                        <img
                          src={question.image}
                          alt="Pergunta"
                          className="max-h-48 rounded-lg mb-4 object-contain"
                        />
                      )}
                    </div>

                    {/* Estatísticas */}
                    {stats && (
                      <div className="card mb-6">
                        <h4 className="text-lg font-bold mb-4">📈 Estatísticas</h4>
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-blue-50 p-4 rounded-lg text-center">
                            <p className="text-3xl font-bold text-blue-600">{stats.totalAnswers}</p>
                            <p className="text-sm text-gray-600">Respostas</p>
                          </div>
                          {question.type !== 'poll' && question.type !== 'word-cloud' && (
                            <>
                              <div className="bg-green-50 p-4 rounded-lg text-center">
                                <p className="text-3xl font-bold text-green-600">{stats.correctAnswers}</p>
                                <p className="text-sm text-gray-600">Corretas</p>
                              </div>
                              <div className="bg-red-50 p-4 rounded-lg text-center">
                                <p className="text-3xl font-bold text-red-600">{stats.incorrectAnswers}</p>
                                <p className="text-sm text-gray-600">Incorretas</p>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Distribuição de Respostas */}
                        {question.options && question.options.length > 0 && (
                          <div>
                            <h5 className="font-bold mb-3">Distribuição de Respostas:</h5>
                            <div className="space-y-3">
                              {question.options.map((option, index) => {
                                const distribution = stats.answerDistribution[index];
                                const percentage = stats.totalAnswers > 0
                                  ? Math.round((distribution.count / stats.totalAnswers) * 100)
                                  : 0;
                                const isCorrect = question.correctAnswer === index;

                                return (
                                  <div key={index} className={`p-3 rounded-lg border-2 ${
                                    isCorrect ? 'border-green-500 bg-green-50' : 'border-gray-300 bg-white'
                                  }`}>
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="font-semibold">
                                        {isCorrect && '✓ '}
                                        {option}
                                      </span>
                                      <span className="text-gray-600">
                                        {distribution.count} ({percentage}%)
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                                      <div
                                        className={`h-3 rounded-full transition-all ${
                                          isCorrect ? 'bg-green-500' : 'bg-blue-500'
                                        }`}
                                        style={{ width: `${percentage}%` }}
                                      ></div>
                                    </div>
                                    {distribution.players.length > 0 && (
                                      <details className="text-sm text-gray-600">
                                        <summary className="cursor-pointer hover:text-gray-800">
                                          Ver alunos ({distribution.players.length})
                                        </summary>
                                        <div className="mt-2 flex flex-wrap gap-2">
                                          {distribution.players.map((playerName, idx) => (
                                            <span key={idx} className="bg-gray-100 px-2 py-1 rounded">
                                              {playerName}
                                            </span>
                                          ))}
                                        </div>
                                      </details>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HostGame;
