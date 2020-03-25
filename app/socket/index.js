'use strict';

var config 	= require('../config');
var redis 	= require('redis').createClient;
var adapter = require('socket.io-redis');

var Room = require('../models/room');

/**
 * Encapsulamos todo el codigo de eventos 
 *
 */
var ioEvents = function(io) {

	// Consultas
	io.of('/rooms').on('connection', function(socket) {

		socket.on('createRoom', function(title) {
			Room.findOne({'title': new RegExp('^' + title + '$', 'i')}, function(err, room){
				if(err) throw err;
				if(room){
					socket.emit('updateRoomsList', { error: 'Ya existe esta Consulta.' });
				} else {
					Room.create({ 
						title: title
					}, function(err, newRoom){
						if(err) throw err;
						socket.emit('updateRoomsList', newRoom);
						socket.broadcast.emit('updateRoomsList', newRoom);
					});
				}
			});
		});
	});

	// Dialogo
	io.of('/chatroom').on('connection', function(socket) {

		socket.on('join', function(roomId) {
			// Se busca la consulta
			Room.findById(roomId, function(err, room){
				// Se rastrea Error
				if(err) throw err;
				if(!room){
					socket.emit('updateUsersList', { error: 'Consulta no exist.' });
				} else {
					if(socket.request.session.passport == null){
						return;
					}

					Room.addUser(room, socket, function(err, newRoom){

						socket.join(newRoom.id);

						Room.getUsers(newRoom, socket, function(err, users, cuntUserInRoom){
							if(err) throw err;
							
							socket.emit('updateUsersList', users, true);

							if(cuntUserInRoom === 1){
								socket.broadcast.to(newRoom.id).emit('updateUsersList', users[users.length - 1]);
							}
						});
					});
				}
			});
		});

		socket.on('disconnect', function() {

			if(socket.request.session.passport == null){
				return;
			}

			Room.removeUser(socket, function(err, room, userId, cuntUserInRoom){
				if(err) throw err;

				socket.leave(room.id);

				if(cuntUserInRoom === 1){
					socket.broadcast.to(room.id).emit('removeUser', userId);
				}
			});
		});

		socket.on('newMessage', function(roomId, message) {
			socket.broadcast.to(roomId).emit('addMessage', message);
		});

	});
}

/**
 * Inicia Socket.io
 * configuracion Redis como adaptador de Socket.io
 *
 */
var init = function(app){

	var server 	= require('http').Server(app);
	var io 		= require('socket.io')(server);

	// Forzar a Socket.io solo usar "websockets"; No Long Polling.
	io.set('transports', ['websocket']);

	// Usando Redis
	let port = config.redis.port;
	let host = config.redis.host;
	 let password = config.redis.password;
	let pubClient = redis(port, host, { auth_pass: password });
	let subClient = redis(port, host, { auth_pass: password, return_buffers: true, });
	io.adapter(adapter({ pubClient, subClient }));

	// Socket sesion Data
	io.use((socket, next) => {
		require('../session')(socket.request, {}, next);
	});

	// Define la clase completa de eventos
	ioEvents(io);

	// Define el server
	return server;
}

module.exports = init;