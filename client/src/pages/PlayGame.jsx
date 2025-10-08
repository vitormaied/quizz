import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';

function PlayGame() {
  const navigate = useNavigate();
  const [socket, setSocket] = useState(null);
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, playing, answered, finished
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionNumber, setQuestionNumber] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [isCorrect, setIsCorrect] = useState(null);
  const [points, setPoints] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [ranking, setRanking] = useState([]);
  const [error, setError] = useState('');
  const [wordCloudAnswer, setWordCloudAnswer] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [pollResults, setPollResults] = useState([]);
  const [wordCloudData, setWordCloudData] = useState([]);

  useEffect(() => {
    const code = localStorage.getItem('roomCode');
    const name = localStorage.getItem('playerName');

    if (!code || !name) {
      navigate('/join');
      return;
    }

    setRoomCode(code);
    setPlayerName(name);

    // Conectar ao Socket.IO
    const newSocket = io('http://localhost:3000');
    setSocket(newSocket);

    newSocket.emit('player:join', { roomCode: code, playerName: name });

    newSocket.on('error', ({ message }) => {
      setError(message);
      setTimeout(() => navigate('/join'), 2000);
    });

    newSocket.on('player:joined', ({ totalPlayers }) => {
      console.log('Conectado! Total de jogadores:', totalPlayers);
    });

    newSocket.on('game:started', ({ question, questionNumber, totalQuestions }) => {
      setGameStatus('playing');
      setCurrentQuestion(question);
      setQuestionNumber(questionNumber);
      setTotalQuestions(totalQuestions);
      setTimeLeft(question.timeLimit);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setWordCloudAnswer('');
    });

    newSocket.on('question:new', ({ question, questionNumber, totalQuestions }) => {
      setGameStatus('playing');
      setCurrentQuestion(question);
      setQuestionNumber(questionNumber);
      setTotalQuestions(totalQuestions);
      setTimeLeft(question.timeLimit);
      setSelectedAnswer(null);
      setIsCorrect(null);
      setWordCloudAnswer('');
    });

    newSocket.on('answer:result', ({ isCorrect, points }) => {
      setIsCorrect(isCorrect);
      setPoints(points);
      setTotalScore((prev) => prev + points);
      setGameStatus('answered');
    });

    newSocket.on('ranking:update', ({ ranking }) => {
      setRanking(ranking);
    });

    newSocket.on('game:finished', ({ ranking }) => {
      setGameStatus('finished');
      setRanking(ranking);
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

  // Timer
  useEffect(() => {
    if (gameStatus === 'playing' && timeLeft > 0) {
      const timer = setTimeout(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && gameStatus === 'playing' && selectedAnswer === null) {
      // Tempo esgotado sem responder
      setGameStatus('answered');
      setIsCorrect(false);
      setPoints(0);
    }
  }, [timeLeft, gameStatus, selectedAnswer]);

  const submitAnswer = (answerIndex) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answerIndex);
    setShowAnimation(true);
    setTimeout(() => setShowAnimation(false), 500);

    socket.emit('answer:submit', {
      roomCode,
      answerIndex,
      timeLeft
    });
  };

  const submitWordCloud = () => {
    if (!wordCloudAnswer.trim()) return;

    setGameStatus('answered');
    socket.emit('word-cloud:submit', {
      roomCode,
      word: wordCloudAnswer.trim()
    });
    setWordCloudAnswer('');
  };

  const getOptionColor = (index) => {
    const colors = ['option-red', 'option-blue', 'option-yellow', 'option-green', 'option-purple', 'option-pink'];
    return colors[index % colors.length];
  };

  const getOptionIcon = (index) => {
    const icons = ['🔺', '🔷', '⭐', '💚', '⚡', '💜'];
    return icons[index % icons.length];
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="card max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-danger mb-4">Erro</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="card">
          <div className="flex justify-between items-center mb-6">
            <div>
              <p className="text-sm text-gray-600">Jogador</p>
              <p className="text-xl font-bold">{playerName}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Pontuação</p>
              <p className="text-2xl font-bold text-primary">{totalScore}</p>
            </div>
          </div>

          {gameStatus === 'waiting' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⏳</div>
              <h2 className="text-2xl font-bold mb-4">Aguardando início...</h2>
              <p className="text-gray-600">
                O professor iniciará o quiz em breve
              </p>
            </div>
          )}

          {gameStatus === 'playing' && currentQuestion && (
            <div className="animate-bounce-in">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-lg font-semibold">
                    Pergunta {questionNumber} de {totalQuestions}
                  </p>
                  <p className={`text-3xl font-bold ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-secondary'}`}>
                    {timeLeft}s
                  </p>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className={`h-4 rounded-full transition-all duration-1000 ${
                      timeLeft <= 5 ? 'bg-red-500' : 'bg-gradient-to-r from-green-500 to-blue-500'
                    }`}
                    style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-2xl md:text-3xl font-bold text-center mb-4 animate-slide-up">
                  {currentQuestion.question}
                </h2>
                {currentQuestion.image && (
                  <div className="flex justify-center mb-4 animate-slide-up">
                    <img
                      src={currentQuestion.image}
                      alt="Pergunta"
                      className="max-h-64 rounded-lg border-2 border-gray-300 object-contain shadow-lg"
                    />
                  </div>
                )}
              </div>

              {currentQuestion.type === 'word-cloud' ? (
                <div className="max-w-md mx-auto">
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-xl border-2 border-purple-300">
                    <p className="text-center text-gray-700 mb-4 font-semibold">
                      Digite sua resposta:
                    </p>
                    <input
                      type="text"
                      value={wordCloudAnswer}
                      onChange={(e) => setWordCloudAnswer(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && submitWordCloud()}
                      placeholder="Sua resposta..."
                      className="input mb-4"
                      autoFocus
                    />
                    <button
                      onClick={submitWordCloud}
                      disabled={!wordCloudAnswer.trim()}
                      className="btn btn-primary w-full"
                    >
                      Enviar Resposta
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => submitAnswer(index)}
                      disabled={selectedAnswer !== null}
                      className={`
                        relative overflow-hidden p-6 rounded-xl font-bold text-lg text-white
                        transition-all duration-300 transform shadow-lg
                        ${selectedAnswer === index ? 'scale-110 ring-4 ring-white' : 'hover:scale-105'}
                        ${selectedAnswer === null ? getOptionColor(index) : ''}
                        ${selectedAnswer === index ? getOptionColor(index) + ' animate-pulse-success' : ''}
                        ${selectedAnswer !== null && selectedAnswer !== index ? 'opacity-50' : ''}
                        disabled:cursor-not-allowed
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-3xl mr-3">{getOptionIcon(index)}</span>
                        <span className="flex-1 text-left">{option}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {gameStatus === 'answered' && (
            <div>
              {currentQuestion?.type === 'poll' ? (
                <div className="animate-bounce-in">
                  <h2 className="text-3xl font-bold text-center mb-6">📊 Resultados da Enquete</h2>
                  <div className="space-y-3 max-w-2xl mx-auto">
                    {pollResults.map((count, index) => {
                      const total = pollResults.reduce((a, b) => a + b, 0);
                      const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                      return (
                        <div key={index} className="bg-white rounded-lg p-4 shadow-md animate-slide-up">
                          <div className="flex justify-between mb-2">
                            <span className="font-semibold">{currentQuestion.options[index]}</span>
                            <span className="text-gray-600">{count} votos ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div
                              className={`h-4 rounded-full transition-all duration-500 ${getOptionColor(index)}`}
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-8 text-center animate-slide-up">
                    <div className="inline-flex items-center gap-2 bg-gray-100 px-6 py-3 rounded-full">
                      <div className="animate-spin">⏳</div>
                      <p className="text-gray-600 font-semibold">
                        Aguardando próxima pergunta...
                      </p>
                    </div>
                  </div>
                </div>
              ) : currentQuestion?.type === 'word-cloud' ? (
                <div className="animate-bounce-in">
                  <h2 className="text-3xl font-bold text-center mb-6">☁️ Nuvem de Palavras</h2>
                  <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-8 max-w-3xl mx-auto">
                    <div className="flex flex-wrap gap-3 justify-center items-center min-h-[300px]">
                      {wordCloudData.map((item, index) => {
                        const sizes = ['text-2xl', 'text-3xl', 'text-4xl', 'text-5xl', 'text-xl'];
                        const colors = ['text-blue-500', 'text-purple-500', 'text-pink-500', 'text-green-500', 'text-orange-500'];
                        return (
                          <span
                            key={index}
                            className={`${sizes[index % sizes.length]} ${colors[index % colors.length]} font-bold animate-bounce-in`}
                            style={{ animationDelay: `${index * 0.1}s` }}
                          >
                            {item.word}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-8 text-center animate-slide-up">
                    <div className="inline-flex items-center gap-2 bg-gray-100 px-6 py-3 rounded-full">
                      <div className="animate-spin">⏳</div>
                      <p className="text-gray-600 font-semibold">
                        Aguardando próxima pergunta...
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className={`text-center py-12 ${isCorrect ? 'flash-correct' : 'flash-incorrect'}`}>
                  <div className={`text-9xl mb-6 ${isCorrect ? 'animate-bounce-in' : 'animate-shake'}`}>
                    {isCorrect ? '✅' : '❌'}
                  </div>
                  <h2 className={`text-4xl md:text-5xl font-bold mb-4 animate-slide-up ${
                    isCorrect ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {isCorrect ? '🎉 Correto!' : '😔 Incorreto'}
                  </h2>
                  {isCorrect && (
                    <div className="animate-pulse-success">
                      <p className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text">
                        +{points} pontos
                      </p>
                    </div>
                  )}
                  <div className="mt-8 animate-slide-up">
                    <div className="inline-flex items-center gap-2 bg-gray-100 px-6 py-3 rounded-full">
                      <div className="animate-spin">⏳</div>
                      <p className="text-gray-600 font-semibold">
                        Aguardando próxima pergunta...
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {ranking.length > 0 && gameStatus !== 'finished' && (
            <div className="mt-6 border-t pt-6">
              <h3 className="text-xl font-bold mb-3">🏆 Ranking Parcial</h3>
              <div className="space-y-2">
                {ranking.map((player, index) => (
                  <div
                    key={index}
                    className={`flex justify-between p-2 rounded ${
                      player.name === playerName ? 'bg-yellow-100' : 'bg-gray-100'
                    }`}
                  >
                    <span>
                      {player.position}º {player.name}
                    </span>
                    <span className="font-bold">{player.score} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {gameStatus === 'finished' && (
            <div>
              <div className="text-center mb-6">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-3xl font-bold mb-2">Quiz Finalizado!</h2>
                <p className="text-2xl text-primary font-bold">
                  Pontuação Final: {totalScore}
                </p>
              </div>

              <div className="mb-6">
                <h3 className="text-xl font-bold mb-3">🏆 Ranking Final</h3>
                <div className="space-y-2">
                  {ranking.map((player, index) => (
                    <div
                      key={index}
                      className={`flex justify-between p-3 rounded-lg ${
                        player.name === playerName
                          ? 'bg-yellow-100 border-2 border-yellow-500'
                          : index < 3
                          ? 'bg-gray-100'
                          : 'bg-gray-50'
                      }`}
                    >
                      <span className="font-semibold">
                        {index === 0 && '🥇'}
                        {index === 1 && '🥈'}
                        {index === 2 && '🥉'}
                        {index > 2 && `${player.position}º`} {player.name}
                      </span>
                      <span className="font-bold text-primary">
                        {player.score} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  localStorage.clear();
                  navigate('/');
                }}
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

export default PlayGame;
