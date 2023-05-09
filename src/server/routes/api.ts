import express from "express";
import { auth } from "../controllers/auth";
import { chat } from "../db/chat";
import { queryArchive } from "../controllers/queryArchive";

export const apiRouter = express.Router()

  .get('/chatHistory', 
    (_, res) => res.json(chat.messages)
  )

  .post('/createUser', 
    auth.createNewUser,
    auth.setJwt, 
    (_, res) => res.json({
      username: res.locals.username,
      chatColor: res.locals.chatColor,
      jwt: res.locals.jwt
    })
  )

  .post('/login',
    auth.verifyUserLogin,
    auth.setJwt,
    (_, res) => res.json({
      username: res.locals.username,
      chatColor: res.locals.chatColor,
      jwt: res.locals.jwt
    })
  )

  .get('/verifySession',
    auth.vaildateJwt,
    (_, res) => res.json({
      username: res.locals.username,
      chatColor: res.locals.chatColor
    })  
  )

  .get('/listArchiveUsers',
    queryArchive.showUsers,
    (_, res) => res.json({
      users: res.locals.users
    })
  )

  .get('/getPosts',
    queryArchive.search,
    (_, res) => res.json({
      posts: res.locals.selectedPosts
    })
  )
