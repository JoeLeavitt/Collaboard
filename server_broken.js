    var connectedClients = {};
    var express = require('express');
    var app = express();
    var server = require('http').Server(app);
    io = require('socket.io')(server);

    server.listen(3000);

    app.use('/', express.static('public'));
    app.use('/node_modules', express.static('node_modules'));

    io.on('connection', function (socket) {

        //socket.on('message', function(msg){
         //   io.emit('message', msg);
        //})

        socket.on("setClientId", function (data) {
            connectedClients[data.id] = {
            	id : data.id,
            	senderName : data.senderName
            }
            console.log(connectedClients);
        });

        socket.on("deleteSharedById", function (data) {
            delete connectedClients[data.id]; //removes key from map
            socket.broadcast.emit("deleteShared",{ id : data.id}); //send to sender
        });

        socket.on("eraseRequestById", function (data) {
            socket.broadcast.emit("eraseShared",{ id : data.id});
        });

        socket.on("getUserList", function (data) {
            socket.emit("setUserList", connectedClients); //send to sender
        });

        socket.on("requestShare", function (data) {
            socket.broadcast.emit("createNewClient", {
                listenerId: data.listenerId,
                senderId: data.senderId,
                senderName : data.senderName
            });
        });

        socket.on("confirmShare", function (data) {
            socket.broadcast.emit("setConfirmShare", {
                isSharing: data.isSharing,
                senderId: data.senderId,
                listenerId: data.listenerId,
                senderName : data.senderName
            });
        });

        socket.on('drawRequest', function (data) {
            socket.broadcast.emit('draw', {
                x: data.x,
                y: data.y,
                type: data.type,
                isTouchDevice : data.isTouchDevice,
                color: data.color,
                stroke: data.stroke,
                isLineDrawing: data.isLineDrawing,
                isErase: data.isErase,
                id: data.id
            });
        });

    });

