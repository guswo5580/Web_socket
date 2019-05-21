const SocketIO = require('socket.io');
const axios = require('axios');
const cookieParser = require('cookie-parser');
const cookie = require('cookie-signature');

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

    // System 메시지를 DB에 저장하는 것으로 보낼 경우, 
    // 단적으로 DB에 접근하는 것보다는 Router에 접근 후, Router에서 접근하는 것이 더 좋은 방법
    // socket.to(roomId).emit('join', { //roomId에만 메세지를 전송 
    //   user: 'system',
    //   chat: `${req.session.color}님이 입장하셨습니다`,
    //   number: socket.adapter.rooms[rommId].length //방에 접속한 인원 전달
    // });
    axios.post(`http://localhost:8005/room/${roomId}/sys`, {
      type: 'join',
    }, {
      headers: {
        Cookie: `connect.sid=${'s%3A' + cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET)}`,
        //connect.sid = 암호화 된 쿠키, express session의 쿠키 값
        //connect.sid 가 남아있는 한 같은 사람으로 취급하는 것!!
        //방을 나가거나 들어갔을 때도, 같은 사람임을 인지할 수 있게 connect.sid를 같게 맞춰주기!! 
      }
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
        // socket.to(roomId).emit('exit', {
        //   user: 'system',
        //   chat: `${req.session.color}님이 퇴장하셨습니다`,
        //   number: socket.adapter.rooms[rommId].length //방에 접속한 인원 전달
        // });
        axios.post(`http://localhost:8005/room/${roomId}/sys`, {
          type: 'exit',
        }, {
          headers: {
            Cookie: `connect.sid=${'s%3A' + cookie.sign(req.signedCookies['connect.sid'], process.env.COOKIE_SECRET)}`,
          }
        });
      }
    });

    //한 사람에게만 적용할 때는 to로 id 값을 넣어주면 OK 
    socket.on('dm', (data) => {
      socket.to(data.target).emit('dm', data);
      //방 id 대신 개인의 socket id를 지정
    });

    socket.on('ban', (data) => {
      socket.to(data.id).emit('ban');
    });
  });
};