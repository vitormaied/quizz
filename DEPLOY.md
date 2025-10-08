# 🚀 Deploy no Railway

Este guia mostra como fazer o deploy da aplicação de Quiz no Railway.

## 📋 Pré-requisitos

- Conta no [Railway](https://railway.app/)
- Repositório no GitHub com o código da aplicação
- Node.js 18+ instalado localmente (para testes)

## 🔧 Passo a Passo

### 1. Preparar o Repositório

Certifique-se de que todos os arquivos estão commitados no GitHub:

```bash
git init
git add .
git commit -m "Preparar projeto para deploy no Railway"
git branch -M main
git remote add origin https://github.com/seu-usuario/seu-repositorio.git
git push -u origin main
```

### 2. Criar Projeto no Railway

1. Acesse [Railway](https://railway.app/) e faça login
2. Clique em **"New Project"**
3. Selecione **"Deploy from GitHub repo"**
4. Escolha o repositório do seu projeto
5. O Railway detectará automaticamente que é um projeto Node.js

### 3. Configurar Variáveis de Ambiente

No painel do Railway, adicione as seguintes variáveis de ambiente:

- `NODE_ENV` = `production`
- `PORT` = (Railway define automaticamente, não precisa adicionar)

**Importante:** O Railway já define a variável `PORT` automaticamente. O servidor irá usar essa porta.

### 4. Configuração de Build

O Railway usará automaticamente as configurações do arquivo `railway.json`:

- **Build Command:** `npm install && cd client && npm install && npm run build`
- **Start Command:** `node server/index.js`

### 5. Deploy Automático

Após a configuração:

1. O Railway fará o build automaticamente
2. Aguarde o processo de build completar (pode levar alguns minutos)
3. Após o deploy, você receberá uma URL pública
4. A aplicação estará acessível em: `https://seu-projeto.up.railway.app`

### 6. Domínio Personalizado (Opcional)

Para adicionar um domínio personalizado:

1. No painel do Railway, vá em **Settings**
2. Clique em **Domains**
3. Adicione seu domínio customizado
4. Configure os registros DNS conforme instruído

## 🔄 Deploy Contínuo

O Railway está configurado para fazer deploy automático sempre que você fizer push para a branch `main`:

```bash
git add .
git commit -m "Suas alterações"
git push origin main
```

## 🐛 Troubleshooting

### Build falhou?

1. Verifique os logs no painel do Railway
2. Certifique-se de que todas as dependências estão no `package.json`
3. Verifique se o Node.js version está compatível (18+)

### Aplicação não carrega?

1. Verifique se a variável `NODE_ENV` está como `production`
2. Confira se o servidor está escutando na porta correta (usar `process.env.PORT`)
3. Verifique os logs de runtime no Railway

### WebSocket não funciona?

O Railway suporta WebSocket automaticamente. Certifique-se de que:

1. O servidor Socket.IO está configurado corretamente
2. O CORS está permitindo a origem do Railway
3. A URL do frontend está usando `https://`

## 📊 Monitoramento

- **Logs:** Acesse a aba "Deployments" > "View Logs"
- **Métricas:** Veja uso de CPU, memória e rede na aba "Metrics"
- **Alertas:** Configure notificações em "Settings" > "Notifications"

## 💰 Custos

- **Plano Hobby:** $5/mês por 500 horas de execução
- **Plano Developer:** $20/mês com recursos ilimitados
- Primeiro deploy tem $5 de créditos grátis

## 🔗 Links Úteis

- [Documentação Railway](https://docs.railway.app/)
- [Railway CLI](https://docs.railway.app/develop/cli)
- [Suporte Railway](https://railway.app/help)

---

## ✅ Checklist de Deploy

- [ ] Código commitado no GitHub
- [ ] Projeto criado no Railway
- [ ] Variáveis de ambiente configuradas
- [ ] Build concluído com sucesso
- [ ] Aplicação acessível via URL do Railway
- [ ] WebSocket funcionando corretamente
- [ ] Teste de criação de quiz
- [ ] Teste de entrada de alunos
- [ ] Teste de jogo completo

**Pronto! Sua aplicação está no ar! 🎉**
