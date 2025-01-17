import { chat } from "../db/chat";
import { Server } from "socket.io";
import { chatMessage } from "../../@types";
import { broadcast } from "../@types";
import { serverEmiters, clientEmiters } from "../../socketEvents";
import jwt from 'jsonwebtoken';
import NodeMediaServer from 'node-media-server';
import { Db } from 'mongodb';

export function registerWebsocketEvents(
  io: Server,
  broadcast: broadcast,
  nms: NodeMediaServer,
  db: Db
): void{

  function emitChatError(recipient: string, errorMsg: string){
    io.to(recipient).emit(serverEmiters.CHAT_MESSAGE_ERROR, {
      errorMsg: errorMsg,
      messages: chat.messages
    });
  };

  nms.on('postPublish', (_, streamPath) => {
    if (streamPath === '/live2/main'){
      io.emit(serverEmiters.STREAM_REBOOT)
    };
  });

  io.on('connection', (socket) => {
    
    // stream events ~~~~~~~~~~~~~~~~~~~~~~~~~
    socket.on(clientEmiters.FETCH_CURRENTLY_PLAYING, () => {
      socket.emit(
        serverEmiters.CURRENTLY_PLAYING,
        broadcast.main.getCurrentlyPlaying()
      );
    });

    // chat events ~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    socket.on(
      clientEmiters.SET_SOCKET_ID, 
      (setUserId: (userId: string) => void) => {
        setUserId(socket.id);
    });
    
    socket.on(
      clientEmiters.CHAT_MESSAGE, 
      (message: chatMessage, token: string) => {
        try {
          if (message.message.length > 800) {
            return emitChatError(
              socket.id,
              'Message cannot exceed 800 charaters'
            );
          };

          if (!process.env.JWT_KEY) {
            return emitChatError(
              socket.id,
              'Server error'
            );
          };

          const { username } = jwt.verify(
            token, 
            process.env.JWT_KEY
          ) as jwt.JwtPayload;

          if (username !== message.userId) {
            return emitChatError(
              socket.id, 
              'Please login to post a message'
            );
          };

          socket.broadcast.emit(
            serverEmiters.RECEIVE_CHAT_MESSAGE, chat.addMessage(message, db)
          );

        } catch (err) {
          return emitChatError(
            socket.id, 
            'Please login to post a message'
          );
        }
    });
  });
};

