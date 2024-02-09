/******************* Room Arguments *******************/
let userName
let roomID
new URLSearchParams(window.location.search).forEach((value, name) => {
    if (name == "userName") {
        userName = value
    } else if  (name == "roomID") {
        roomID = value
    }
});

/******************* HTML Elements *******************/
const drawBox = document.querySelector(".drawBox");
const roomLogBox = document.querySelector(".roomLogBox");
const selectionBox = document.querySelector(".selectionBox");

const welcomeMess = document.getElementById("welcomeMess");
const roomLog = document.getElementById("roomLog");
const selectionButton = document.getElementById("selectionButton");
const ansButton = document.getElementById("ansButton");

const canvas = document.getElementById("myCanvas");
const context = canvas.getContext("2d");
const brushPalette = document.getElementById("brushPalette");
const brushSlider = document.getElementById("brushSlider");
const clearButton = document.getElementById("clearButton");
const submitButton = document.getElementById("submitButton");

/******************* Websocket code *******************/
let socket = new WebSocket(`ws://localhost:8050/${roomID}/${userName}`);
let userScore = 0; // Initialize user score
let friendScore = 0; // Initialize friend's score
let backgroundMusic = document.getElementById("backgroundMusic");
backgroundMusic.volume = 0.3;



function showNotification(message, type) {
    const notification = document.getElementById("notification");
    const notificationText = document.getElementById("notificationText");

    notificationText.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        closeNotification();
    }, 5000); // Close the notification after 5 seconds
}

function endGame(message) {
    showNotification(message, "info");
    disableDrawingElements();
    window.location.replace(`/summary.html?userScore=${userScore}&friendScore=${friendScore}`);
}

function closeNotification() {
    const notification = document.getElementById("notification");
    notification.classList.remove("show");
}

function updateUserScores() {
    userScore += 1;
    userScoreDisplay.textContent = `User Score: ${userScore}`;

    if (userScore === 5) {
        endGame("You Win!");
    }
}

function updateFriendScores() {
    friendScore += 1;
    friendScoreDisplay.textContent = `Friend's Score: ${friendScore}`;

    if (friendScore === 5) {
        endGame("You Lose!");
    }
}


socket.onopen = () => {
    console.log("Connected to Websocket Server");
};

socket.onmessage = (msg) => {
    let data = JSON.parse(msg.data);
    if (data.type == 1) {
        s = data.body.split(";");

        if (s[0] == "choose") {
            roomLog.innerHTML = "Ready to begin! Choose an object below.";
            pickItems();
            socket.send("wait");
        } else if (s[0] == "wait") {
            roomLog.innerHTML = "Friend is choosing something to draw";
        } else if (s[0] == "drawing") {
            roomLog.innerHTML = "Friend is drawing the object";
        } else if (s[0] == "done") {
            roomLog.innerHTML = "Can you guess the object?";
            for (let i=0; i < 4; i++) {
                document.getElementById(`option${i+1}`).innerHTML = s[i+1];
            }
            guessItems();
        } else if (s[0] == "correct0") {
            document.getElementById("successSound").play();
            showNotification("You got it right!", "success");
            updateUserScores();
            roomLog.innerHTML = "Ready to begin! Choose an object below.";
            resetOptionSelection();
            resetOptionText();
            resetCanvas();
            pickItems();
            socket.send("wait");
        } else if (s[0] == "correct1") {
            document.getElementById("successSound").play();
            updateFriendScores();
            resetOptionSelection();
            resetOptionText();
            resetCanvas();
            showNotification("Your friend got it right!", "success");
        } else if (s[0] == "wrong0") {
            document.getElementById("failSound").play();
            showNotification("You got it wrong :(", "error");
            roomLog.innerHTML = "Ready to begin! Choose an object below.";
            resetOptionSelection();
            resetOptionText();
            resetCanvas();
            pickItems();
            socket.send("wait");
        } else if (s[0] == "wrong1") {
            document.getElementById("failSound").play();
            resetOptionSelection();
            resetOptionText();
            resetCanvas();
            showNotification("Your friend got it wrong :(", "error");
        }

    } else if (data.type == 2) {
        let image = new Image();
        image.onload = function() {
            context.drawImage(image, 0, 0);
        };
        image.src = data.body
    }
}

socket.onclose = (event) => {
    console.log("Socket Closed Connection: ", event);
};

socket.onerror = (error) => {
    console.log("Socket Error: ", error);
    window.alert("Room is full! Redirecting to lobby...");
    window.location.replace("/");
};

/******************* UI Related *******************/
welcomeMess.append(`Room #${roomID}: Welcome ${userName}!`)

function enableDrawingElements() {
    canvas.style.pointerEvents = "auto";
    clearButton.style.pointerEvents = "auto";
    submitButton.style.pointerEvents = "auto";
}

function disableDrawingElements() {
    canvas.style.pointerEvents = "none";
    clearButton.style.pointerEvents = "none";
    submitButton.style.pointerEvents = "none";
}

function resetOptionSelection() {
    for (let i=0; i < options.length; i++) {
        document.getElementById(`option${i+1}`).classList.remove("chosen");
    }
}

function resetOptionText() {
    for (let i=0; i < options.length; i++) {
        document.getElementById(`option${i+1}`).innerHTML = "-";
    }
}

function pickItems() {
    options = [];
    for (let i=0; i < 4; i++) {
        options.push(document.getElementById(`option${i+1}`));
    }

    items = shuffle(items);
    for (let i=0; i < options.length; i++) {
        options[i].innerHTML = items[i];
        options[i].setAttribute("onclick", "optionSelected(this, selectionButton)");
    }

    let opts = `option;${items[0]};${items[1]};${items[2]};${items[3]}`;
    socket.send(opts);
}

function guessItems() {
    options = [];
    for (let i=0; i < 4; i++) {
        options.push(document.getElementById(`option${i+1}`));
    }

    for (let i=0; i < 4; i++) {
        options[i].setAttribute("onclick", "optionSelected(this, ansButton)");
    }
}

let selectedItem;
function optionSelected(option, button) {
    resetOptionSelection();
    selectedItem = option.textContent;
    option.classList.add("chosen");
    button.style.visibility = "visible";
}

selectionButton.addEventListener("click", e => {
    socket.send(`drawing;${selectedItem}`);
    roomLog.innerHTML = `You chose ${selectedItem}. Start drawing!`;
    
    selectionButton.style.visibility = "hidden";

    for (let i=0; i < options.length; i++) {
        document.getElementById(`option${i+1}`).removeAttribute("onclick");
    }

    enableDrawingElements();
});

ansButton.addEventListener("click", e => {
    socket.send(`answer;${selectedItem}`);
    ansButton.style.visibility = "hidden";
});

/******************* Canvas Code *******************/
let isDrawing = false;
let x = 0;
let y = 0;

function broadcastDrawing() {
    let drawing = canvas.toDataURL("image/jpeg");
    let enc = new TextEncoder();
    socket.send(enc.encode(drawing));
}

function drawLine(x1, y1, x2, y2) {
    context.beginPath();
    context.strokeStyle = brushPalette.value;
    context.lineWidth = brushSlider.value;
    context.lineCap = "round";
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
    context.closePath();
}

function resetCanvas() {
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
}

resetCanvas();

canvas.addEventListener("mousedown", e => {
    x = e.offsetX;
    y = e.offsetY;
    isDrawing = true;
});

canvas.addEventListener("mousemove", e => {
    if (isDrawing === true) {
        drawLine(x, y, e.offsetX, e.offsetY);
        x = e.offsetX;
        y = e.offsetY;
    }
});

canvas.addEventListener("mouseup", e => {
    if (isDrawing === true) {
        drawLine(x, y, e.offsetX, e.offsetY);
        x = 0;
        y = 0;
        isDrawing = false;
        broadcastDrawing();
    }
});

clearButton.addEventListener("click", e => {
    resetCanvas();
    broadcastDrawing();
});

submitButton.addEventListener("click", e => {
    socket.send("done");
    disableDrawingElements();
});
