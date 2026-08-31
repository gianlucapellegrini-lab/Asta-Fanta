const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const TIMER_DEFAULT = 10; // Secondi per ogni offerta
let countdown = TIMER_DEFAULT;
let timerId = null;
let currentBid = 0;
let highestBidder = "Nessuno";

app.use(express.static(__dirname + '/public'));

function startTimer() {
    clearInterval(timerId);
    countdown = TIMER_DEFAULT;
    io.emit('update', { countdown, currentBid, highestBidder });

    timerId = setInterval(() => {
        if (countdown > 0) {
            countdown--;
            io.emit('tick', countdown);
        } else {
            clearInterval(timerId);
            io.emit('sold', { highestBidder, currentBid });
        }
    }, 1000);
}

io.on('connection', (socket) => {
    // Invia lo stato attuale al nuovo giocatore connesso
    socket.emit('update', { countdown, currentBid, highestBidder });

    // Gestisce il rilancio
    socket.on('raiseBid', (data) => {
        currentBid += 1;
        highestBidder = data.playerName;
        startTimer(); // Riavvia il timer per tutti
    });

    // Reset dell'asta per un nuovo calciatore
    socket.on('resetAuction', () => {
        currentBid = 0;
        highestBidder = "Nessuno";
        startTimer();
    });
});

server.listen(3000, () => console.log('Server attivo sulla porta 3000'));
