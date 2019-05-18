const express = require('express');

const Room = require('../schemas/room');
const Chat = require('../schemas/chat');

router.get('/', async (req, res, next) => {
  try {
    const rooms = await Room.find({

    });
    res.render('main', {
      rooms,
      title : '채팅방',
      error : req.flash('roomError')
    });
  } catch(error){
    console.error(error);
    next(error);
  }
});

router.get('/room', (req, res) => {
  res.render('room', {title : '채팅방 생성'});
});

router.post('/room', async (req, res, next) => {
  try{
    //방을 만들기
    const room = new Room({
      title : req.body.title,
      max : req.body.max,
      owner : req.session.color,
      password : req.body.password
    });
    const newRoom = await room.save(); //방 생성 완료
    //새로운 방이 생겼음을 전송
    const io = req.app.get('io');
    io.of('/room').emit('newRoom', newRoom);
    //방으로 접속하는 라우터 전송
    res.redirect(`/room/${newRoom._id}?password=${req.body.password}`);
  }catch(error){
    console.error(error);
    next(error);
  }
});

router.get('/room/:id', async (req, res, next) => {
    try{
      const room = await Room.findOne({_id:req.params.id});
      const io = req.app.get('io');
      if(!room){ //방이 존재하지 않는 경우
        req.flash('roomError', '존재하지 않는 방입니다');
        return res.redirect('/');
      }
      if(room.password && room.password !== req.query.password){
        req.flash('roomError', '비밀번호가 틀렸습니다');
        return res.redirect('/');
      }
      const { rooms } = io.of('/chat').adapter;
      if(rooms && rooms[req.params.id] && room.max <= rooms[req.params.id].length){
        req.flash('roomError', '허용인원 초과');
        return res.redirect('/');
      }
      return res.render('chat', {
        room,
        title : room.title,
        chats : [],
        user : req.session.color
      });
    }catch(error){
      console.error(error);
      next(error);
    }
});

module.exports = router;
