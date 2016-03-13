var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var exphbs  = require('express-handlebars');
var url = require('url');
var pg = require('pg');
var imgur = require('imgur-node-api');
var cache = {};

var keys = require('./keys');
var conString = keys.postgres.url;
imgur.setClientID(keys.imgur.client_id);

server.listen(3000);

app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');

app.use('/', express.static(__dirname + '/home'));
app.use('/public', express.static(__dirname + '/views/public'));

app.get('/collaboard/:word', function (req, res) {

  pg.connect(conString, function(err, client, done) {
    if(err) return console.error('error fetching client from pool', err);
    client.query('SELECT * FROM message_data WHERE room_id=' + req.params.word, function(err, result) {
      var query_string = 'SELECT * FROM file_data WHERE room_id=' + req.params.word;
      client.query(query_string, function(error, query_result){
        done();
        if(error) return console.error('error running query', error);
        console.log(query_result.rows);
        result.rows = result.rows.map(function(thing){
          thing.sent_at = new Date(thing.sent_at).toLocaleTimeString();
          return thing;
        });
        query_result.rows = query_result.rows.map(function(thing){
          thing.uploaded_at = new Date(thing.uploaded_at).toLocaleTimeString();
          return thing;
        });
        console.log(result.rows);
        res.render("collaboard", {
          test: req.params.word,
          messages: result.rows,
          files: query_result.rows
        });
      });
    });
  });
});

io.on('connection', function (socket) {
  socket.on('room', function (data) {
    u = url.parse(data.url);
    socket.path = u.path.split('/')[2];
    socket.user = data.name;
    socket.join(socket.path);
    io.to(socket.path).emit('joined', data.name + " joined!");
    socket.emit('init', socket.path);

    pg.connect(conString, function(err, client, done) {
      if(err) return console.error('error fetching client from pool', err);
      var query_string = 'SELECT * FROM drawing_data WHERE id=\'' + socket.path + '\'';
      client.query(query_string, function(err, result) {
        done();
        if(err) return console.error('error running query', err);
        console.log(result.rows);
        for(var i = 0; i < result.rows.length; i++){
          socket.emit('draw', result.rows[i]);
        }
        // result.rows.forEach(function(row){
        //   socket.emit('draw', row);
        //   console.log(row);
        // });
      });
    });
  });

  socket.on('message', function(msg){
    console.log('message: ' + msg);
    console.log("THE PATH:" + socket.path);
    if(!socket.path) return;
    pg.connect(conString, function(err, client, done) {
      if(err) return console.error('error fetching client from pool', err);
      var query_string = 'INSERT INTO message_data (room_id, message, sender) VALUES (' + socket.path + ', \'' + msg + '\', \'' + socket.user + '\');'
      console.log(query_string);
      client.query(query_string, function(err, result) {
        done();
        if(err) return console.error('error running query', err);
      });
    });
    io.to(socket.path).emit('message', {message:msg, sender:socket.user, sent_at:new Date()});
  });

  socket.on('drawRequest', function (data) {
      if(!socket.path) return;
      // console.log(data);

      if(data.type == 'mousedown'){
        cache[socket.path] = cache[socket.path] || [];
        cache[socket.path].push(data);
        console.log("GOT ONE");
      }else if(data.type == 'mousemove'){
        cache[socket.path].push(data);
      }else if(data.type == 'mouseup'){
        cache[socket.path].push(data);
        pg.connect(conString, function(err, client, done) {
          for(var i = 0; i < cache[socket.path].length; i ++){
            var keysArr = [];
            var valsArr = [];
            for (var key in cache[socket.path][i]) {
                if (!data.hasOwnProperty(key)) continue;
                keysArr.push(key);
                valsArr.push(cache[socket.path][i][key]);
            }

            if(err) return console.error('error fetching client from pool', err);
            var query_string = 'INSERT INTO drawing_data (' + keysArr.join(', ') + ') VALUES (\'' + valsArr.join('\', \'') + '\');'
            // console.log(query_string);
            client.query(query_string, function(err, result) {
              if(err) return console.error('error running query', err);
            });
          }
          done();
        });
          // pg.connect(conString, function(err, client, done) {
          //   if(err) return console.error('error fetching client from pool', err);
          //   var query_string = 'INSERT INTO drawing_data (' + keysArr.join(', ') + ') VALUES (\'' + valsArr.join('\', \'') + '\');'
          //   console.log(query_string);
          //   client.query(query_string, function(err, result) {
          //     done();
          //     if(err) return console.error('error running query', err);
          //   });
          // });

        cache[socket.path] = [];
      }

      io.to(socket.path).emit('draw', {
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

  socket.on('file', function(data){
      console.log(data);

      pg.connect(conString, function(err, client, done) {
        if(err) return console.error('error fetching client from pool', err);
        var query_string = 'INSERT INTO file_data (room_id, url) VALUES (' + socket.path + ', \'' + data + '\');'
        console.log(query_string);
        client.query(query_string, function(err, result) {
          done();
          io.to(socket.path).emit('file', {url:data, uploaded_at:new Date().toLocaleTimeString()});
          if(err) return console.error('error running query', err);
        });
      });
  });

  socket.on('erase', function(id){
    pg.connect(conString, function(err, client, done) {
      if(err) return console.error('error fetching client from pool', err);
      var query_string = 'DELETE FROM drawing_data WHERE id=\'' + socket.path + '\';'
      console.log(query_string);
      client.query(query_string, function(err, result) {
        done();
        io.to(socket.path).emit("deleteShared",id);
        if(err) return console.error('error running query', err);
      });
    });
  });
});
