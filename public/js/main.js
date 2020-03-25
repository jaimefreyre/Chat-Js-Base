'use strict';

var app = {

  rooms: function(){

    var socket = io('/rooms', { transports: ['websocket'] });

    // Se conecta al Socket
    socket.on('connect', function () {

      // actualiza consultas y eventos
      socket.on('updateRoomsList', function(room) {

        // Mensaje Error
        $('.room-create p.message').remove();
        if(room.error != null){
          $('.room-create').append(`<p class="message error">${room.error}</p>`);
        }else{
          app.helpers.updateRoomsList(room);
        }
      });

      // Accion crear Consulta.
      $('.room-create button').on('click', function(e) {
        var inputEle = $("input[name='title']");
        var roomTitle = inputEle.val().trim();
        if(roomTitle !== '') {
          socket.emit('createRoom', roomTitle);
          inputEle.val('');
        }
      });

    });
  },

  chat: function(roomId, username){
    
    var socket = io('/chatroom', { transports: ['websocket'] });

      // Coneccion a Chat Consulta
      socket.on('connect', function () {

        socket.emit('join', roomId);

        // actualiza usuarios Lista
        socket.on('updateUsersList', function(users, clear) {

          $('.container p.message').remove();
          if(users.error != null){
            $('.container').html(`<p class="message error">${users.error}</p>`);
          }else{
            app.helpers.updateUsersList(users, clear);
          }
        });

        // Emision de evento notificacion nuevo mensaje
        $(".chat-message button").on('click', function(e) {

          var textareaEle = $("textarea[name='message']");
          var messageContent = textareaEle.val().trim();
          if(messageContent !== '') {
            var message = { 
              content: messageContent, 
              username: username,
              date: Date.now()
            };

            socket.emit('newMessage', roomId, message);
            textareaEle.val('');
            app.helpers.addMessage(message);
          }
        });

        // Remision de Usuarios de las consultas
        socket.on('removeUser', function(userId) {
          $('li#user-' + userId).remove();
          app.helpers.updateNumOfUsers();
        });

        // Nuevo Mensaje
        socket.on('addMessage', function(message) {
          app.helpers.addMessage(message);
        });
      });
  },

  // decoradores
  helpers: {

    encodeHTML: function (str){
      return $('<div />').text(str).html();
    },

    // Actualizar consultas
    updateRoomsList: function(room){
      room.title = this.encodeHTML(room.title);
      room.title = room.title.length > 25? room.title.substr(0, 25) + '...': room.title;
      var html = `<a href="/chat/${room._id}"><li class="room-item">${room.title}</li></a>`;

      if(html === ''){ return; }

      if($(".room-list ul li").length > 0){
        $('.room-list ul').prepend(html);
      }else{
        $('.room-list ul').html('').html(html);
      }
      
      this.updateNumOfRooms();
    },

    // Actualizar usuarios
    updateUsersList: function(users, clear){
        if(users.constructor !== Array){
          users = [users];
        }

        var html = '';
        for(var user of users) {
          user.username = this.encodeHTML(user.username);
          html += `<li class="clearfix" id="user-${user._id}">
                     <img src="${user.picture}" alt="${user.username}" />
                     <div class="about">
                        <div class="name">${user.username}</div>
                        <div class="status"><i class="fa fa-circle online"></i> online</div>
                     </div></li>`;
        }

        if(html === ''){ return; }

        if(clear != null && clear == true){
          $('.users-list ul').html('').html(html);
        }else{
          $('.users-list ul').prepend(html);
        }

        this.updateNumOfUsers();
    },

    // Agregar mensajes Historia
    addMessage: function(message){
      message.date      = (new Date(message.date)).toLocaleString();
      message.username  = this.encodeHTML(message.username);
      message.content   = this.encodeHTML(message.content);

      var html = `<li>
                    <div class="message-data">
                      <span class="message-data-name">${message.username}</span>
                      <span class="message-data-time">${message.date}</span>
                    </div>
                    <div class="message my-message" dir="auto">${message.content}</div>
                  </li>`;
      $(html).hide().appendTo('.chat-history ul').slideDown(200);

      // Scrollear ba
      $(".chat-history").animate({ scrollTop: $('.chat-history')[0].scrollHeight}, 1000);
    },

    // Actualizar consultas
    // Modificacion de lista de consultas
    updateNumOfRooms: function(){
      var num = $('.room-list ul li').length;
      $('.room-num-rooms').text(num +  " Room(s)");
    },

    // Actualiza numero online de usuarios
    // metodo por si se modifica la lista de Usuarios
    updateNumOfUsers: function(){
      var num = $('.users-list ul li').length;
      $('.chat-num-users').text(num +  " User(s)");
    }
  }
};
