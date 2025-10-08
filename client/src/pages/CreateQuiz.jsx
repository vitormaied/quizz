import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

function CreateQuiz() {
  const navigate = useNavigate();
  const [quizTitle, setQuizTitle] = useState('');
  const [questions, setQuestions] = useState([
    {
      type: 'quiz', // quiz, true-false, poll, word-cloud
      question: '',
      image: null,
      options: ['', '', '', ''],
      correctAnswer: 0,
      timeLimit: 20
    }
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        type: 'quiz',
        question: '',
        image: null,
        options: ['', '', '', ''],
        correctAnswer: 0,
        timeLimit: 20
      }
    ]);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const updateOption = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const handleImageUpload = (qIndex, event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A imagem deve ter no máximo 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const newQuestions = [...questions];
        newQuestions[qIndex].image = reader.result;
        setQuestions(newQuestions);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = (qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].image = null;
    setQuestions(newQuestions);
  };

  const handleTypeChange = (qIndex, newType) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].type = newType;

    // Ajustar opções baseado no tipo
    if (newType === 'true-false') {
      newQuestions[qIndex].options = ['Verdadeiro', 'Falso'];
      newQuestions[qIndex].correctAnswer = 0;
    } else if (newType === 'word-cloud') {
      newQuestions[qIndex].options = [];
      newQuestions[qIndex].correctAnswer = null;
    } else if (newType === 'poll') {
      newQuestions[qIndex].correctAnswer = null;
      if (newQuestions[qIndex].options.length < 2) {
        newQuestions[qIndex].options = ['', ''];
      }
    } else if (newType === 'quiz') {
      if (newQuestions[qIndex].options.length < 4) {
        newQuestions[qIndex].options = ['', '', '', ''];
      }
      if (newQuestions[qIndex].correctAnswer === null) {
        newQuestions[qIndex].correctAnswer = 0;
      }
    }

    setQuestions(newQuestions);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validação
    if (!quizTitle.trim()) {
      alert('Digite um título para o quiz');
      return;
    }

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        alert(`Pergunta ${i + 1} está vazia`);
        return;
      }
      if (q.options.some(opt => !opt.trim())) {
        alert(`Todas as opções da pergunta ${i + 1} devem ser preenchidas`);
        return;
      }
    }

    try {
      const response = await axios.post('/api/game/create', {
        quiz: {
          title: quizTitle,
          questions
        }
      });

      // Salvar código da sala e navegar
      localStorage.setItem('roomCode', response.data.roomCode);
      localStorage.setItem('isHost', 'true');
      navigate('/host');
    } catch (error) {
      console.error('Erro ao criar quiz:', error);
      alert('Erro ao criar quiz. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen p-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="card">
          <h1 className="text-3xl font-bold text-primary mb-6">Criar Novo Quiz</h1>

          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                Título do Quiz
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Ex: Revisão de Matemática - Funções"
                className="input"
              />
            </div>

            <div className="space-y-6">
              {questions.map((q, qIndex) => (
                <div key={qIndex} className="border-2 border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold">Pergunta {qIndex + 1}</h3>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIndex)}
                        className="text-danger hover:text-danger/80"
                      >
                        ✕ Remover
                      </button>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">
                        Tipo de Pergunta
                      </label>
                      <select
                        value={q.type}
                        onChange={(e) => handleTypeChange(qIndex, e.target.value)}
                        className="input"
                      >
                        <option value="quiz">📝 Quiz (Múltipla Escolha)</option>
                        <option value="true-false">✓✗ Verdadeiro ou Falso</option>
                        <option value="poll">📊 Enquete</option>
                        <option value="word-cloud">☁️ Nuvem de Palavras</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">
                        Pergunta
                      </label>
                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                        placeholder="Digite a pergunta"
                        className="input"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">
                        Imagem (opcional)
                      </label>
                      {!q.image ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary transition-colors">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(qIndex, e)}
                            className="hidden"
                            id={`image-upload-${qIndex}`}
                          />
                          <label
                            htmlFor={`image-upload-${qIndex}`}
                            className="cursor-pointer"
                          >
                            <div className="text-4xl mb-2">📷</div>
                            <p className="text-gray-600">
                              Clique para adicionar uma imagem
                            </p>
                            <p className="text-sm text-gray-400 mt-1">
                              Máximo 5MB
                            </p>
                          </label>
                        </div>
                      ) : (
                        <div className="relative">
                          <img
                            src={q.image}
                            alt="Preview"
                            className="w-full max-h-64 object-contain rounded-lg border-2 border-gray-300"
                          />
                          <button
                            type="button"
                            onClick={() => removeImage(qIndex)}
                            className="absolute top-2 right-2 bg-danger text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-danger/80"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>

                    {q.type === 'word-cloud' ? (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                        <p className="text-blue-700 font-semibold">ℹ️ Nuvem de Palavras</p>
                        <p className="text-sm text-blue-600 mt-1">
                          Os alunos digitarão palavras livres. Uma nuvem de palavras será gerada com as respostas.
                        </p>
                      </div>
                    ) : (
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2">
                          {q.type === 'poll' ? 'Opções da Enquete' : 'Opções de Resposta'}
                        </label>
                        <div className="space-y-2">
                          {q.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex gap-2 items-center">
                              {q.type === 'quiz' || q.type === 'true-false' ? (
                                <input
                                  type="radio"
                                  name={`correct-${qIndex}`}
                                  checked={q.correctAnswer === oIndex}
                                  onChange={() => updateQuestion(qIndex, 'correctAnswer', oIndex)}
                                  className="w-5 h-5"
                                />
                              ) : (
                                <span className="w-5 h-5 flex items-center justify-center text-gray-400">
                                  {oIndex + 1}
                                </span>
                              )}
                              <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                placeholder={`Opção ${oIndex + 1}`}
                                className="input"
                                disabled={q.type === 'true-false'}
                              />
                            </div>
                          ))}
                        </div>
                        {q.type === 'quiz' || q.type === 'true-false' ? (
                          <p className="text-sm text-gray-500 mt-2">
                            Selecione a opção correta usando os botões de rádio
                          </p>
                        ) : (
                          <p className="text-sm text-gray-500 mt-2">
                            Enquetes não têm resposta correta
                          </p>
                        )}
                      </div>
                    )}

                    <div>
                      <label className="block text-gray-700 font-semibold mb-2">
                        Tempo Limite (segundos)
                      </label>
                      <input
                        type="number"
                        value={q.timeLimit}
                        onChange={(e) => updateQuestion(qIndex, 'timeLimit', parseInt(e.target.value))}
                        min={5}
                        max={60}
                        className="input"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 space-y-3">
              <button
                type="button"
                onClick={addQuestion}
                className="btn bg-green-500 hover:bg-green-600 text-white w-full"
              >
                + Adicionar Pergunta
              </button>

              <button type="submit" className="btn btn-primary w-full">
                Criar Quiz e Gerar Código
              </button>

              <button
                type="button"
                onClick={() => navigate('/')}
                className="btn bg-gray-300 hover:bg-gray-400 text-gray-800 w-full"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateQuiz;
