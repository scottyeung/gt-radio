import express from "express";
import { auth } from "../controllers/auth";
import { chat } from "../db/chat";


export const apiRouter = express.Router()

  .get('/chatHistory', 
    (_, res) => res.json(chat.messages)
  )

  .post('/createUser', 
    auth.createNewUser,
    auth.setJwt, 
    (_, res) => res.json({
      username: res.locals.username,
      jwt: res.locals.jwt
    })
  )

  .post('/login',
    auth.verifyUserLogin,
    auth.setJwt,
    (_, res) => res.json({
      username: res.locals.username,
      jwt: res.locals.jwt
    })
  )

  .get('/verifySession',
    auth.vaildateJwt,
    (_, res) => res.json({
      username: res.locals.username
    })  
  )
