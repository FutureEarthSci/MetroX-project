const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.use(express.static('public'));

const port = 3000;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

//players
let players = {};
let numberPlayers = 0;
let numberResponses = 0;
let numberScoreResponses = 0;
let scoreResponses = [];

//deck
let deck = ["3", "3", "3", "4", "4", "4", "5", "5", "6-reshuffle", "free", "skip-2", "skip-2", "skip-3", "transfer"];

let deckInd = 0;
let previousCard = "none";


let nonFreeTurns = 0;//count number of bus spots filled


let finishBonus = new Array (9);
for (let i = 0; i < finishBonus.length; i++){
    finishBonus[i] = new Array(2);
    for (let j = 0; j < 2; j++){
        finishBonus[i][j] = new Array(100).fill(0);
    }
}
let currentRouteFinishers = [];


//game
let gameStarted = false;
let gameEnded = false;


io.on('connection', (socket) => {
    socket.on("join attempt", (name) => {
        let alreadyInUse = false;
        for (const [key, value] of Object.entries(players)){
          if (name === value){
            alreadyInUse = true;
          }
        }
        if (!gameStarted && !alreadyInUse){
            players[socket.id] = name;
            numberPlayers = Object.keys(players).length;
            io.to(socket.id).emit("join success", socket.id);
            io.emit("updateNameList", players);
            
        }
        else {
            console.log(socket.id, " tried to join after game started or with duplicate name");
        }
    })
    socket.on("startGame", () => {
        if (numberPlayers > 0){
            gameStarted = true;
            gameEnded = false;
            startFirstRound();
        }
    })
    socket.on("doneRound", (routeCompleted) => {
        numberResponses++;
        if (sum(routeCompleted) > 0){
            for (let i = 0; i < routeCompleted.length; i++){
                if (routeCompleted[i] == 1){
                    currentRouteFinishers.push({plyr:socket.id, rte:i});
                }
            }
        }
        if (numberResponses >= numberPlayers){

            calculateFinishers();
            let output = finishBonus;
            setTimeout(() => {
                io.emit("updateRouteFinish", output);
                endRound();
            },1300)
        }
    })
    socket.on("doneScoring", (score_out) => {
        numberScoreResponses++;
        scoreResponses.push({id:socket.id, scor:score_out});
        if (numberScoreResponses >= numberPlayers){
            io.emit("end_screen", scoreResponses, players);
        }
    })
    socket.on("disconnect", () => {
        delete(players[socket.id]);
        numberPlayers = Object.keys(players).length;
        io.emit("updateNameList", players);
    })
})

server.listen(port, () => {
    console.log('started on ', port);
});


function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      let j = Math.floor(Math.random() * (i + 1));
      let temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
}

function startFirstRound(){
    numberResponses = 0;
    numberScoreResponses = 0;
    scoreResponses = [];
    //play transition
    io.emit("gameStartTransition");
    setTimeout(() => {
        shuffle(deck);
        deckInd = 0;
        io.emit("stopStartTransition");
        sendDeckTransition();
    }, 2000);
}

function sendDeckTransition(){
    
    io.emit("deckTransition", deck[deckInd], previousCard, deckInd);
    setTimeout(() => {
        io.emit("startRound", deck[deckInd]);
    }, 2000);
}

function endRound(){
    if (deck[deckInd] != "free"){
        nonFreeTurns++;
        if (nonFreeTurns >= 3){
            gameEnded = true;
            io.emit("calculateScores", finishBonus);
        }
    }
    if (!gameEnded){
        numberResponses = 0;
        deckInd++;
        previousCard = deck[deckInd - 1];
        if (previousCard == "6-reshuffle"){
            previousCard = "none";
            shuffle(deck);
            deckInd = 0;
        }
        currentRouteFinishers = [];
        sendDeckTransition();
    }
}

function sum(n){
    let s = 0;
    for (let i = 0; i < n.length; i++){
        s += n[i];
    }
    return s;
}


function calculateFinishers(){
    for (let i = 0; i < finishBonus.length; i++){
        if (finishBonus[i][0][0] == 0){
            let count = 0;
            for (let j = 0; j < currentRouteFinishers.length; j++){
                
                if (currentRouteFinishers[j].rte == i){
                    finishBonus[i][0][count] = currentRouteFinishers[j].plyr;
                    count++;
                }
            }
        }

        else if (finishBonus[i][1][0] == 0){
            let count = 0;
            for (let j = 0; j < currentRouteFinishers.length; j++){
                
                if (currentRouteFinishers[j].rte == i){
                    finishBonus[i][1][count] = currentRouteFinishers[j].plyr;
                    count++;
                }
            }
        }
        
    }
}
