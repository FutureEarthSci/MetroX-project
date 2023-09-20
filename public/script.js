const socket = io();
let socketId = "";

//setup canvas
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = 1024;
canvas.height = 768;
canvas.style.marginTop = String(canvas.height * -1 * 0.25) + "px";
canvas.style.marginLeft = String(canvas.width * -1 * 0.5) + "px";

//elements
const joinDiv = document.getElementById("joinDiv");
const nameInput = document.getElementById("nameInput");//contained in joinDiv
const nameList = document.getElementById("nameList");
const startButton = document.getElementById("startButton");
const roundInfo = document.getElementById("roundInfo");
const cancelButton = document.getElementById("cancelButton");
const confirmButton = document.getElementById("confirmButton");
const leaderboard = document.getElementById("leaderboard");


let gameStates = {"join":[joinDiv, nameList], "lobby":[nameList, startButton], "transition":[canvas, nameList], "play":[canvas, nameList, roundInfo, cancelButton, confirmButton], "end":[canvas, roundInfo, leaderboard]};
let currentState = "";

//intervals
let startTransitionInterval = "";
let deckTransitionInterval = "";
let deckTransitionTick = 0;


//game variables
let game_started = false;

let currentCard = "none";
let doneChoosing = false;
const deckLength = 14;
const cardWidth = 100;
const cardHeight = 200;

let chosenStation = -1;
let chosenBus = -1;

let transStations = [];
let busRecords = [];

let finishBonusCopy = [...Array(9)].map(e => Array(2).fill([]));
let finishBonusXs = [];

let score_v = [];



//images
let metro_logo_img = new Image();
metro_logo_img.src = "metro_logo.png";
let metro_board_img = new Image();
metro_board_img.src = "metro_board.png";
let three_img = new Image();
three_img.src = "three.png";
let four_img = new Image();
four_img.src = "four.png";
let five_img = new Image();
five_img.src = "five.png";
let six_reshuffle_img = new Image();
six_reshuffle_img.src = "six_reshuffle.png";
let two_skip_img = new Image();
two_skip_img.src = "two_skip.png";
let three_skip_img = new Image();
three_skip_img.src = "three_skip.png";
let transfer_img = new Image();
transfer_img.src = "transfer.png";
let free_img = new Image();
free_img.src = "free.png";
let card_back_img = new Image();
card_back_img.src = "card_back.png";
let x_img = new Image();
x_img.src = "x.png";
let oval_img = new Image();
oval_img.src = "oval.png";
let penalty_img = new Image();
penalty_img.src = "penalty.png";

const cardDict = {"3":three_img, "4":four_img, "5":five_img, "6-reshuffle":six_reshuffle_img, "free":free_img, "skip-2":two_skip_img, "skip-3":three_skip_img, "transfer":transfer_img};

changeGameState("join");

function changeGameState(newState){
    if (newState == currentState){return;}
    for (const [key, value] of Object.entries(gameStates)) {
        if (value != undefined){
            for (let i = 0; i < value.length; i++){
                value[i].style.visibility = "hidden";
            }
        }
    }
    for (let i = 0; i < gameStates[newState].length; i++){
        gameStates[newState][i].style.visibility = "visible";
    }
    currentState = newState;

    switch(newState){
        case "join":
            roundInfo.innerHTML = "";
            break;
        case "lobby":
            roundInfo.innerHTML = "waiting for someone to start game";
            break;
        case "transition":
            roundInfo.innerHTML = "please wait";
            break;
        case "play":
            roundInfo.innerHTML = "dont forget to cancel before changing station/bus";
            break;
        case "end":
            roundInfo.innerHTML = "game ended";
            break;
        default:
            roundInfo.innerHTML = "";
    }
}

function enterName(){
    if (nameInput.value){
        socket.emit("join attempt", nameInput.value);
    }
}

socket.on("updateNameList", (players) => {
    while (nameList.children.length > 1){
        nameList.lastChild.remove();
    }
    for (const [key, value] of Object.entries(players)) {
        var newUser = document.createElement("p");
        var text = document.createTextNode(value);
        newUser.appendChild(text);
        nameList.appendChild(newUser);
    }
})

socket.on("join success", (socket_id) => {
    changeGameState("lobby");
    socketId = socket_id;
})

function startGame(){
    if (!game_started){
        game_started = true;
        socket.emit("startGame");
    }
}

socket.on("gameStartTransition", () => {
    changeGameState("transition");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    startTransitionInterval = setInterval(updateStartTransition, 50);
    ctx.globalAlpha = 0.1;
})

socket.on("stopStartTransition", () => {
    stopStartTransition();
})

socket.on("deckTransition", (newCard, oldCard, deckInd) => {
    changeGameState("transition");
    deckTransitionTick = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    deckTransitionInterval = setInterval(updateDeckTransition, 40, newCard, oldCard, deckInd);

    currentCard = newCard;
})

function updateDeckTransition(newCard, oldCard, deckInd){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (oldCard != "none"){
        ctx.drawImage(cardDict[oldCard], 580, 500, cardWidth, cardHeight);
    }
    if (deckInd < deckLength - 1){
        ctx.drawImage(card_back_img, 200, 500, cardWidth, cardHeight);
    }
    if (deckTransitionTick <= 10){
        ctx.drawImage(card_back_img, 200 + deckTransitionTick * 10, 500, cardWidth * (10 - deckTransitionTick)/10, cardHeight);
    }
    else if (deckTransitionTick <= 20){
        ctx.drawImage(cardDict[newCard], 200 + deckTransitionTick * 10, 500, cardWidth * (deckTransitionTick - 10)/10, cardHeight);
    }
    else {
        ctx.drawImage(cardDict[newCard], 580, 500, cardWidth, cardHeight);
    }
    deckTransitionTick++;
}

function updateStartTransition(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(metro_logo_img, 400, 200)
    if (ctx.globalAlpha < 1.0){
        ctx.globalAlpha += 0.05;
    }
}

function stopDeckTransition(){
    clearInterval(deckTransitionInterval);
}

function stopStartTransition(){
    clearInterval(startTransitionInterval);
    ctx.globalAlpha = 1.0;
}

socket.on("startRound", () => {
    stopDeckTransition();
    changeGameState("play");
    refreshMap();
    doneChoosing = false;
    canConfirm = true;
})


function refreshMap(){
    ctx.font = "25px Arial";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(metro_board_img, 0, 0);
    ctx.drawImage(cardDict[currentCard], 840, 30, cardWidth, cardHeight);

    ctx.drawImage(penalty_img, 840, 300, 200, 250);
    if (currentState == "end"){
        for (let i = 0; i < score_v.length; i++){
            ctx.fillStyle = "#000000";
            ctx.fillText(score_v[i], scorePositions[i][0], scorePositions[i][1] + 10);
        }
    }

    for (let i = 0; i < allStations.length; i++){
        if (allStations[i].getCrossed() || allStations[i].getNumber() == chosenStation){
            let transferFound = false;
            for (let j = 0; j < transStations.length; j++){
                if (transStations[j].number == allStations[i].getNumber()){
                    transferFound = true;
                    ctx.fillStyle = "#000000";
                    ctx.fillText(transStations[j].score, allStations[i].getPosition()[0] - 10, allStations[i].getPosition()[1] + 1);
                }
            }
            if (!transferFound){
                ctx.drawImage(x_img, allStations[i].getPosition()[0] - 10, allStations[i].getPosition()[1] - 10, 20, 20);
            }
        }
    }
    for (let i = 0; i < routes.length; i++){
        if (i == chosenBus){
            let x2 = busPositions[i][0];
            let y2 = busPositions[i][1];
            let w = busPositions[i][2];
            let h = 40;
            ctx.fillStyle = "#808080";
            ctx.strokeRect(x2, y2, w, h);
        }
    }
    for (let i = 0; i < busRecords.length; i++){
        ctx.fillStyle = "#000000";
        ctx.fillText(busRecords[i].str, busRecords[i].pos[0],busRecords[i].pos[1] + 15);
    }
    
    for (let i = 0; i < finishBonusXs.length; i++){
        if (finishBonusXs[i].self){

            ctx.drawImage(oval_img, finishBonusXs[i].pos[0], finishBonusXs[i].pos[1], 35, 35);
        }
        else {
            let self_in_same_spot = false;
            for (let j = 0; j < finishBonusXs.length; j++){
                if (j != i && (finishBonusXs[j].pos[0] == finishBonusXs[i].pos[0]) && (finishBonusXs[j].pos[1] == finishBonusXs[i].pos[1])&&finishBonusXs[j].self){
                    self_in_same_spot = true;
                }
            }
            if (!self_in_same_spot){
                ctx.drawImage(x_img, finishBonusXs[i].pos[0], finishBonusXs[i].pos[1], 24, 24);
            }
            
        }
    }
}

function cancel(){
    if (doneChoosing){
        doneChoosing = false;
        chosenStation = -1;
        chosenBus = -1;
        refreshMap();
    }
}

let canConfirm = false;

function confirm(){
    if (doneChoosing && canConfirm){
        canConfirm = false;

        let prevArray = checkRouteFinishes();
        driveBus();
        refreshMap();
        cancel();
        let newArray = checkRouteFinishes();
        let result = Array(newArray.length).fill(0);
        for (let i = 0; i < newArray.length; i++){
            result[i] = newArray[i] - prevArray[i];
        }

        socket.emit("doneRound", result);
    }
}
//calculate stations crossed
function driveBus(){
    if (currentCard == "free" && chosenStation > 0){
        allStations[chosenStation - 1].cross();
    }
    else {
        let recordStr = "";

        let firstEmpty = -1;
        let found = false;
        for (let i = 0; i < routes[chosenBus].length; i++){

            if (!allStations[routes[chosenBus][i] - 1].getCrossed() && !found){
                firstEmpty = i;
                found = true;
            }
        }
        if ((currentCard.length == 1 || currentCard == "6-reshuffle") && chosenBus >= 0 && firstEmpty >= 0){
            let count = parseInt(currentCard.charAt(0));
    
            for (let i = 0; i < count; i++){
                if (firstEmpty + i < routes[chosenBus].length){
    
                    allStations[routes[chosenBus][firstEmpty + i] - 1].cross();
                }
            }
            recordStr = count.toString();
        }
        else if (currentCard.charAt(0) == "s" && chosenBus >= 0 && firstEmpty >= 0){

            let count = parseInt(currentCard.charAt(5));
            for (let i = 0; i < routes[chosenBus].length; i++){
                if (i >= firstEmpty && count > 0 && !allStations[routes[chosenBus][i] - 1].getCrossed()){
                    allStations[routes[chosenBus][i] - 1].cross();
                    count--;
                }
            }
            recordStr = currentCard.charAt(5);
        }
        else if (currentCard == "transfer" && chosenBus >= 0 && firstEmpty >= 0){
            let numRoutes = 0;
            for (let i = 0; i < routes.length; i++){
                let sfound = false;
                for (let j = 0; j < routes[i].length; j++){
                    if (routes[i][j] == routes[chosenBus][firstEmpty]){
                        sfound = true;
                    }
                }
                if (sfound){numRoutes++;}
            }
            allStations[routes[chosenBus][firstEmpty] - 1].cross();
            transStations.push({number: allStations[routes[chosenBus][firstEmpty] - 1].getNumber(), score: numRoutes*2});

            recordStr = "X";
        }
        busesFilled[chosenBus]++;
        const bruh = {pos:busSpaces[chosenBus][busesFilled[chosenBus] - 1], str:recordStr};
        busRecords.push(bruh);
    }
    
}

function checkRouteFinishes(){
    let array = Array(9).fill(0);
    for (let i = 0; i < routes.length; i++){
        let completed = true;
        for (let j = 0; j < routes[i].length; j++){
            if (!allStations[routes[i][j] - 1].getCrossed()){
                completed = false;
            }
        }
        if (completed){
            array[i] = 1;
        }
    }
    let output = array;
    return output;
}

socket.on("updateRouteFinish", (finishbonus) => {
    finishBonusCopy = finishbonus;

    finishBonusXs = [];
    for (let i = 0; i < finishBonusCopy.length; i++){
        for (let j = 0; j < finishBonusCopy[i].length; j++){
            for (let k = 0; k < finishBonusCopy[i][j].length; k++){
                if (finishBonusCopy[i][j][k] == socketId){
                    finishBonusXs.push({self:true, pos:[busPositions[i][0] - ((2 - j) * 24), busPositions[i][1] + (j * 15)]});
                }
                else if (finishBonusCopy[i][j][k] != 0){
                    finishBonusXs.push({self:false, pos:[busPositions[i][0] - ((2 - j) * 24), busPositions[i][1] + (j * 15)]});
                }
            }
        }
    }
})

socket.on("calculateScores", (finishBonus) => {
    finishBonusCopy = finishBonus;
    let num = allStations.length;
    for (let i = 0; i < allStations.length; i++){
        if (allStations[i].getCrossed()){
            num--;
        }
    }
    let penalty_value = 0;
    if (num <= 4){penalty_value = 0;}
    else if (num <= 7){penalty_value = 4 - num;}
    else if (num <= 19){penalty_value = -4 - Math.floor((num - 8)*0.5);}
    else if (num > 19){penalty_value = -10;}
    let trans_score = 0;
    for (let i = 0; i < transStations.length; i++){
        trans_score += transStations[i].score;
    }
    let finishBonus_score = 0;
    for (let i = 0; i < finishBonusCopy.length; i++){
        for (let j = 0; j < finishBonusCopy[i].length; j++){
            for (let k = 0; k < finishBonusCopy[i][j].length; k++){
                if (finishBonusCopy[i][j][k] == socketId){
                    finishBonus_score += bonusPoints[i][j];
                }
            }
        }
    }
    score_v[0] = finishBonus_score;
    score_v[1] = trans_score;
    score_v[2] = num;
    score_v[3] = penalty_value;
    score_v[4] = score_v[0] + score_v[1] + score_v[3];
    changeGameState("end");
    /*
    while (leaderboard.firstChild){
        leaderboard.firstChild.remove();
    }*/
    socket.emit("doneScoring", score_v[4]);
})

socket.on("end_screen", (score_responses, playerDict) => {
    let score_responses_copy = new Array (score_responses.length);
    for (let j = 0; j < score_responses_copy.length; j++){
        score_responses_copy[j] = new Array(2).fill(0);
    }
    
    for (let i = 0; i < score_responses.length; i++){
        score_responses_copy[i][0] = score_responses[i].id;
        score_responses_copy[i][1] = score_responses[i].scor;
    }
    score_responses_copy.sort((a, b) => b[1] - a[1]);


    console.log("rounding");
    setTimeout(() => {
        roundInfo.innerHTML = "results in 3";
        setTimeout(() => {
            roundInfo.innerHTML = "results in 2";
            setTimeout(() => {
                roundInfo.innerHTML = "results in 1";
                setTimeout(() => {
                    canvas.style.position = "static";
                    
                    canvas.style.marginLeft = "36%";
                    console.log(leaderboard);
                    leaderboard.style.visibility = "visible";

                    var winName = document.createElement("h1");
                    let winText = playerDict[score_responses_copy[0][0]] + " is the winner with " + score_responses_copy[0][1] + " points!";
                    if (score_responses_copy[0][0] === socketId){winText = "YOU are the winner with " + score_responses_copy[0][1] + " points!";}
                    var text = document.createTextNode(winText);
                    winName.appendChild(text);
                    leaderboard.appendChild(winName);
                    for (let i = 1; i < score_responses_copy.length; i++){
                        var place = document.createElement("p");
                        var placeTxt = playerDict[score_responses_copy[i][0]] + ": " + score_responses_copy[i][1] + " points";
                        var t = document.createTextNode(placeTxt);
                        place.appendChild(t);
                        leaderboard.appendChild(place);
                    }
            
                }, 750);
            }, 750);
        }, 750);
    }, 750);
})

canvas.addEventListener("mousemove", (event) => {
    if (currentState == "play" || currentState == "end"){
        refreshMap();
        let rect = canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        for (let i = 0; i < allStations.length; i++){
            let x1 = allStations[i].getPosition()[0];
            let y1 = allStations[i].getPosition()[1];
            if (Math.sqrt((x-x1)*(x-x1) + (y-y1)*(y-y1)) <= 17){
                ctx.fillStyle = "#808080";
                if (allStations[i].getCrossed()){
                    ctx.fillStyle = "#cd4747";
                }
                ctx.beginPath();
                ctx.arc(x1, y1, 17, 0, 2 * Math.PI);
                ctx.stroke();
            }
        }
        for (let i = 0; i < busPositions.length; i++){
            let x2 = busPositions[i][0];
            let y2 = busPositions[i][1];
            let w = busPositions[i][2];
            let h = 40;
            if (x >= x2 && x <= x2 + w && y >= y2 && y <= y2 + h){
                ctx.fillStyle = "#808080";
                if (busesFilled[i] == busSpaces[i].length){
                    ctx.fillStyle = "#cd4747";
                }
                ctx.strokeRect(x2, y2, w, h);
            }
        }
    }
})

canvas.addEventListener("click", (event) => {
    if (currentState == "play" || currentState == "end"){

        let rect = canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        if (currentCard == "free"){
            for (let i = 0; i < allStations.length; i++){
                let x1 = allStations[i].getPosition()[0];
                let y1 = allStations[i].getPosition()[1];
                if (Math.sqrt((x-x1)*(x-x1) + (y-y1)*(y-y1)) <= 17 && !allStations[i].getCrossed() && !doneChoosing){
                    doneChoosing = true;
                    chosenStation = i + 1; //so that station 1 is at index 0;
                    refreshMap();
                }
            }
        }
        
        for (let i = 0; i < busPositions.length; i++){
            let x2 = busPositions[i][0];
            let y2 = busPositions[i][1];
            let w = busPositions[i][2];
            let h = 40;
            if (x >= x2 && x <= x2 + w && y >= y2 && y <= y2 + h && !doneChoosing && busesFilled[i] < busSpaces[i].length && currentCard != "free"){
                doneChoosing = true;
                chosenBus = i; //bus A is 0;
            }
        }
    }
})

