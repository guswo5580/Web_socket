const express = require('express');
const multer = require('multer'); //이미지 처리
const path = require('path');
const fs = require('fs');

// 몽고디비 연결 
const Room = require('../schemas/room');
const Chat = require('../schemas/chat');

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find({

    });
    res.render('main', {
      rooms,
      title: '채팅방',
      error: req.flash('roomError')
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/room', (req, res) => {
  res.render('room', {
    title: '채팅방 생성'
  });
});

router.post('/room', async (req, res, next) => {
  try {
    //방 생성
    const room = new Room({
      title: req.body.title,
      max: req.body.max,
      owner: req.session.color,
      password: req.body.password
    });

    const newRoom = await room.save(); //방 생성 완료

    // app.set('io', io); (server.js)
    //req.app.get('io').of('/room').emit ~ Front로 신호 보내기
    const io = req.app.get('io'); //새로운 방이 생겼음을 전송
    io.of('/room').emit('newRoom', newRoom);
    //방으로 접속하는 라우터 전송
    res.redirect(`/room/${newRoom._id}?password=${req.body.password}`); //Room으로 접속
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.get('/room/:id', async (req, res, next) => {
  try {
    const room = await Room.findOne({
      _id: req.params.id
    });
    const io = req.app.get('io');
    if (!room) { //방이 존재하지 않는 경우
      req.flash('roomError', '존재하지 않는 방입니다');
      return res.redirect('/');
    }
    //비밀번호 검사 
    if (room.password && room.password !== req.query.password) {
      req.flash('roomError', '비밀번호가 틀렸습니다');
      return res.redirect('/');
    }
    const {
      rooms
    } = io.of('/chat').adapter;
    if (rooms && rooms[req.params.id] && room.max <= rooms[req.params.id].length) {
      req.flash('roomError', '허용인원 초과');
      return res.redirect('/');
    }

    //DB에 room id를 가진 Chat 정보를 get
    const chats = await Chat.find({
      room: room._id
    }).sort('createdAt');
    return res.render('chat', {
      room,
      title: room.title,
      chats,
      number: (rooms && rooms[req.params.id] && rooms[req.params.id].length + 1) || 1,
      //참여 시 기본값이 0으로 도출, 자신이 참가할 경우 1을 증가시키는 것을 디폴트로 설정
      user: req.session.color,
    });
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.delete('/room/:id', async (req, res, next) => {
  try {
    await Room.remove({
      _id: req.params.id
    });
    await Chat.remove({
      room: req.params.id
    });
    res.send('ok');
    setTimeout(() => {
      req.app.get('io').of('/room').emit('removeRoom', req.params.id);
    }, 2000);
  } catch (error) {
    console.error(error);
    next(error);
  }
});

router.post('/room/:id/chat', async (req, res, next) => {
  try {
    const chat = new Chat({
      room: req.params.id,
      user: req.session.color, //Hash color 값
      chat: req.body.chat,
    });
    await chat.save();
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    //Front 로 Chat 신호 보내기
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

fs.readdir('uploads', (error) => {
  if (error) {
    console.error('uploads 폴더가 없어 uploads 폴더를 생성합니다.');
    fs.mkdirSync('uploads');
  }
});
const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      cb(null, 'uploads/');
    },
    filename(req, file, cb) {
      const ext = path.extname(file.originalname);
      cb(null, path.basename(file.originalname, ext) + new Date().valueOf() + ext);
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
});
//gif 이미지 전송
router.post('/room/:id/gif', upload.single('gif'), async (req, res, next) => {
  try {
    const chat = new Chat({
      room: req.params.id,
      user: req.session.color,
      gif: req.file.filename,
    });
    await chat.save();
    req.app.get('io').of('/chat').to(req.params.id).emit('chat', chat);
    res.send('ok');
  } catch (error) {
    console.error(error);
    next(error);
  }
});

module.exports = router;