import { useNavigate } from 'react-router-dom';

function Home() {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="card max-w-2xl w-full text-center">
        <h1 className="text-5xl font-bold text-primary mb-4">QuizApp</h1>
        <p className="text-gray-600 text-xl mb-8">
          Plataforma interativa de quiz para sala de aula
        </p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/create')}
            className="btn btn-primary w-full text-xl py-4"
          >
            👨‍🏫 Sou Professor - Criar Quiz
          </button>

          <button
            onClick={() => navigate('/join')}
            className="btn btn-secondary w-full text-xl py-4"
          >
            👨‍🎓 Sou Aluno - Entrar na Sala
          </button>
        </div>

        <div className="mt-8 text-gray-500">
          <p>Crie quizzes interativos em tempo real</p>
          <p>Acompanhe o desempenho dos alunos ao vivo</p>
        </div>
      </div>
    </div>
  );
}

export default Home;
