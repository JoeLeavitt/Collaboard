var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var connectedClients = {};

app.use('/', express.static('public'));

io.on('connection', function(socket){
    socket.on('message', function(msg){
        io.emit('message', msg);
    });

    socket.on("setClientId", function(data) {
        connectedClients[data.id] = {
            id : data.id,
            senderName : data.senderNamer
        }
        console.log(connectedClients);
    });

    socket.on("deketeSharedById", function(data){
        delete connectedClients[data.id];
        socket.broadcast.emit("deleteShared", {
            id : data.id
        });
    });

    socket.on("eraseRequestById", function(data){
        socket.broadcast.emit("eraseShared", {
            id : data.id
        });
    });

    socket.on("requestShare", function(data) {
        socket.broadcast.emit("createNewClient", {
            listenerId : data.listenerId,
            senderId : data.senderId,
            senderName : data.senderName
        });
    });

    socket.on("confirmShare", function(data){
        socket.broadcast.emit("setConfirmShare", {
            isSharing : data.isSharing,
            senderId : data.senderId,
            listenerId : data.listenerId,
            senderName : data.senderName
        });
    });

    socket.on('drawRequest', function(data) {
        docket.broadcast.emit('draw', {
            x: data.x,
            y: data.y,
            type: data.type,
            isTouchDevice : data.isTouchDeive,
            color: data.color,
            stroke: data.stroke,
            isLineDrawing: data.isLineDrawing,
            isErase: data.isErase,
            id: data.id
        });
    });
});

http.listen(3000, function(){
    console.log('listening on *:3000');
});
