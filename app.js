var express = require('express');
var app = express();
var serv = require('http').Server(app);
 
app.get('/',function(req, res) {
	res.sendFile(__dirname + '/client/index.html');
});
app.use('/client',express.static(__dirname + '/client'));
 
serv.listen(2000);
console.log("Server started.");
 
var SOCKET_LIST = {};
var PLAYER_LIST = {};
var TILES = [0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1];

var Player = function(id){
	var self = {
		x:250,
		y:250,
		id:id,
		number:"" + Math.floor(10 * Math.random()),
		pressingRight:false,
		pressingLeft:false,
		pressingUp:false,
		pressingDown:false,	
		maxSpd:80,
		time:0,
	}
	self.updatePosition = function(){
		if(self.pressingRight)
			self.x += self.maxSpd;
		if(self.pressingLeft)
			self.x -= self.maxSpd;
		if(self.pressingUp)
			self.y -= self.maxSpd;
		if(self.pressingDown)
			self.y += self.maxSpd;
	}
	return self;
}
 
var io = require('socket.io')(serv,{});
io.sockets.on('connection', function(socket){
	
	socket.id = Math.random();
	for(var i in SOCKET_LIST){
		var socket2 = SOCKET_LIST[i];
		socket2.emit('newPlayer',{id:socket.id});
	}
	SOCKET_LIST[socket.id] = socket;

	var players = [];
	for(var i in PLAYER_LIST){
		var player = PLAYER_LIST[i];
		players.push({
			x:player.x,
			y:player.y,
			id:player.id
		});
	}
	socket.emit('allPlayers',{positions:players});
 
	var player = Player(socket.id);
	PLAYER_LIST[socket.id] = player;
 
	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		delete PLAYER_LIST[socket.id];
	});

	socket.on('getMap',function(){
		socket.emit('newMap',TILES);
	});
 
	socket.on('keyPress',function(data){
		if(data.inputId === 'left')
			player.pressingLeft = data.state;
		else if(data.inputId === 'right')
			player.pressingRight = data.state;
		else if(data.inputId === 'up')
			player.pressingUp = data.state;
		else if(data.inputId === 'down')
			player.pressingDown = data.state;
	});

	socket.on('newPos',function(data){
		player.x = data.x;
		player.y = data.y;
		player.time = data.time;
	});

	socket.on('putTile',function(data){
		TILES[data.tile] = data.color;
	});
 
 
});
 
setInterval(function(){
	var pack = [];
	for(var i in PLAYER_LIST){
		var player = PLAYER_LIST[i];
		player.updatePosition();
		pack.push({
			x:player.x,
			y:player.y,
			id:player.id,
			time:player.time,
			number:player.number
		});
	}
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		socket.emit('newPositions',{positions:pack});
	}
 
 
 
 
},1000/8);
