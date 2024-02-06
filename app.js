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
var NPC_LIST = {};

var Player = function(id){
	var self = {
		x:250,
		y:1250,
		id:id,
		face:false,
		dir:1,
		canshoot:true,
		type:0,
		direction:null
	}
	return self;
}

var npc_id = Math.random();
var npc = Player(npc_id);
npc.y = 250;
NPC_LIST[npc_id] = npc;

var toDelete = [];
var toAdd = [];
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
	var npcs = [];
	for(var i in NPC_LIST){
		var npc = NPC_LIST[i];
		npcs.push({
			x:npc.x,
			y:npc.y,
			id:npc.id
		});
	}
	socket.emit('allPlayers',{positions:players,npcpositions:npcs});

	var player = Player(socket.id);
	PLAYER_LIST[socket.id] = player;
 
	socket.on('disconnect',function(){
		delete SOCKET_LIST[socket.id];
		delete PLAYER_LIST[socket.id];
		toDelete.push({
			id:socket.id
		});
	});

	socket.on('newPos',function(data){
		player.x = data.x;
		player.y = data.y;
		player.face = data.face;
	});

});

function calculateDistance(x1, y1, x2, y2) {
	var deltaX = x2 - x1;
	var deltaY = y2 - y1;
	
	// Using the Math.sqrt() function to calculate the square root
	var distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
	
	return distance;
}

function Vector2(x, y) {
	var self = {
		x:x,
		y:y
	}
	return self;
}


function getNormalizedDirectionVector(startPoint, endPoint) {
  // Calculate the vector from start point to end point
  var directionVector = {
    x: endPoint.x - startPoint.x,
    y: endPoint.y - startPoint.y
  };

  // Calculate the magnitude (length) of the vector
  var magnitude = Math.sqrt(Math.pow(directionVector.x,2) + Math.pow(directionVector.y,2));

  // Normalize the vector (divide each component by the magnitude)
  var normalizedVector = {
    x: directionVector.x / magnitude,
    y: directionVector.y / magnitude
  };

  return normalizedVector;
}

var oldTime = Date.now();

setInterval(function(){
	var newTime = Date.now();
	var delta = (newTime-oldTime)*0.001;
	console.log(delta);
	oldTime = newTime;

	var packnpc = [];
	for(var i in NPC_LIST){
		var npc = NPC_LIST[i];
		if (npc.type == 0) {
			npc.x += 340*npc.dir*delta;
			if (npc.x > 860 || npc.x < 200){
				npc.dir *= -1;
			}
		}
		else if (npc.type == 1){
			npc.x += npc.direction.x * 10;
			npc.y += npc.direction.y * 10;
		}
		packnpc.push({
			x:npc.x,
			y:npc.y,
			id:npc.id
		});
	}

	var pack = [];
	for(var i in PLAYER_LIST){
		var player = PLAYER_LIST[i];
		if (calculateDistance(player.x,player.y,NPC_LIST[npc_id].x,NPC_LIST[npc_id].y) < 300 && player.canshoot == true){
			var getDirection = getNormalizedDirectionVector(Vector2(player.x,player.y),Vector2(NPC_LIST[npc_id].x,NPC_LIST[npc_id].y))
			console.log(getDirection)

			console.log("SHOOT");
			var npc_id_new = Math.random();
			var npc = Player(npc_id_new);
			npc.x = player.x;
			npc.direction = getDirection;
			npc.y = player.y;
			npc.type = 1;
			NPC_LIST[npc_id_new] = npc;
			player.canshoot = false;
			toAdd.push({
				x:npc.x,
				y:npc.y,
				id:npc.id,
				type:npc.type
			});
		}
		pack.push({
			x:player.x,
			y:player.y,
			id:player.id,
			face:player.face
		});
	}
	for(var i in SOCKET_LIST){
		var socket = SOCKET_LIST[i];
		if (toAdd.length > 0) {
			socket.emit('toAdd',{ids:toAdd});
		}
		var randomNum = Math.random();
  	var doit = randomNum < 0.5 ? 1 : 2;
		doit = 1;
		if (doit == 1){
			socket.emit('newPositions',{positions:pack,npcpositions:packnpc,diff:delta});
		}
		if (toDelete.length > 0) {
			socket.emit('toDelete',{ids:toDelete});
		}
	}
	toAdd = [];
	toDelete = [];
},1000/10);
