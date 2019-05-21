const SocketIO = require('socket.io');
const axios = require('axios');

//app , session 설정 정보 get
module.exports = (server, app, sessionMiddleware) => {
  const io = SocketIO(server, {
    path: '/socket.io'
  }); //소켓 설정

  //Express 변수 저장 방법
  app.set('io', io);
  //req.app.get('io').of('/room').emit ~ Front로 신호 보내기 

  //Name Space(기본값 '/'), Name에 따라 보내는 소켓 정보 구성
  const room = io.of('/room');
  const chat = io.of('/chat');
  io.use((socket, next) => {
    //express 미들웨어 -> socket IO에서 사용하는 방법
    sessionMiddleware(socket.request, socket.request.res, next);
  });

  room.on('connection', (socket) => {
    console.log('room namespace 접속');
    socket.on('disconnect', () => {
      console.log('room namespace 접속 해제')
    });
  });

  chat.on('connection', (socket) => {
    console.log('chat namespace 접속');
    //header 추출 
    //room/efefef -> (req.headers.referer)
    const req = socket.request;
    const {
      headers: {
        referer
      }
    } = req;
    const roomId = referer.split('/')[referer.split('/').length - 1]
      .replace(/\?.+/, '');

    socket.join(roomId); //방에 접속

    socket.to(roomId).emit('join', { //roomId에만 메세지를 전송 
      user: 'system',
      chat: `${req.session.color}님이 입장하셨습니다`
    });

    socket.on('disconnect', () => { //접속 해제 
      console.log('chat namespace 접속 해제');
      socket.leave(roomId); //방 나가기
      //방에 인원이 하나도 없다면, 방을 삭제 요청
      const currentRoom = socket.adapter.rooms[roomId];
      const userCount = currentRoom ? currentRoom.length : 0;
      if (userCount === 0) {
        axios.delete(`http://localhost:8005/room/${roomId}`)
          .then(() => {
            console.log('방 제거 요청 성공');
          })
          .catch((error) => {
            console.error(error);
          })
      } else {
        socket.to(roomId).emit('exit', {
          user: 'system',
          chat: `${req.session.color}님이 퇴장하셨습니다`
        });
      }
    });
  });
};