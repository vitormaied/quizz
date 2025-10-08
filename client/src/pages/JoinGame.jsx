import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function JoinGame() {
  const navigate = useNavigate();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleJoin = (e) => {
    e.preventDefault();

    if (!roomCode.trim() || !playerName.trim()) {
      setError('Por favor, preencha todos os campos');
      return;
    }

    // Salvar dados no localStorage e navegar
    localStorage.setItem('roomCode', roomCode.toUpperCase());
    localStorage.setItem('playerName', playerName);
    navigate('/play');
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="card max-w-md w-full">
        <h1 className="text-3xl font-bold text-center text-primary mb-6">
          Entrar na Sala
        </h1>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Código da Sala
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="EX: ABC123"
              maxLength={6}
              className="input uppercase"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-semibold mb-2">
              Seu Nome
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Digite seu nome"
              maxLength={20}
              className="input"
            />
          </div>

          {error && (
            <div className="bg-danger text-white p-3 rounded-lg">
              {error}
            </div>
          )}

          <button type="submit" className="btn btn-primary w-full">
            Entrar
          </button>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn bg-gray-300 hover:bg-gray-400 text-gray-800 w-full"
          >
            Voltar
          </button>
        </form>
      </div>
    </div>
  );
}

export default JoinGame;
