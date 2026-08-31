const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.static(path.join(__dirname, '../public')));

// Stato globale dell'asta
let auctionState = {
  status: 'setup', // setup, active, ended
  player: '',
  timerDuration: 10,
  timeLeft: 0,
  currentPrice: 0,
  highestBidder: '',
  adminName: ''
};

let timerInterval = null;

function startTimer() {
  clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    if (auctionState.status === 'active') {
      auctionState.timeLeft--;
      if (auctionState.timeLeft <= 0) {
        auctionState.timeLeft = 0;
        auctionState.status = 'ended';
        clearInterval(timerInterval);
        io.emit('auction_ended', auctionState);
      } else {
        io.emit('timer_update', { timeLeft: auctionState.timeLeft });
      }
    }
  }, 1000);
}

io.on('connection', (socket) => {
  // Invia lo stato corrente al nuovo utente connesso
  socket.emit('init_state', auctionState);

  // Configurazione e avvio nuova asta da parte dell'Admin
  socket.on('start_auction', (data) => {
    auctionState = {
      status: 'active',
      player: data.player,
      timerDuration: parseInt(data.duration),
      timeLeft: parseInt(data.duration),
      currentPrice: 0,
      highestBidder: 'Nessuna offerta',
      adminName: data.adminName
    };
    startTimer();
    io.emit('auction_started', auctionState);
  });

  // Gestione del rilancio
  socket.on('place_bid', (data) => {
    const { userName } = data;
    
    // Validazione: l'asta deve essere attiva e non ci si può autorilanciare
    if (auctionState.status === 'active' && auctionState.highestBidder !== userName) {
      auctionState.currentPrice += 1;
      auctionState.highestBidder = userName;
      auctionState.timeLeft = auctionState.timerDuration; // Reset del timer
      
      io.emit('bid_updated', auctionState);
    }
  });

  // Ritorno alla schermata di configurazione (solo Admin)
  socket.on('reset_auction', () => {
    auctionState.status = 'setup';
    auctionState.player = '';
    auctionState.currentPrice = 0;
    auctionState.highestBidder = '';
    clearInterval(timerInterval);
    io.emit('init_state', auctionState);
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server attivo sulla porta ${PORT}`);
});
