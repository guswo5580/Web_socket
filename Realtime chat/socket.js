const SocketIO = require('socket.io');

module.exports = (server) => {
  const io = SocketIO(server, { path: '/socket.io' });

  io.on('connection', (socket) => {
    const req = socket.request;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    console.log('새로운 클라이언트 접속!', ip, socket.id, req.ip);
    //socket.id 로 클라이언트 구분 
    socket.on('disconnect', () => {
      console.log('클라이언트 접속 해제', ip, socket.id);
      clearInterval(socket.interval);
    });
    socket.on('error', (error) => {
      console.error(error);
    });
    socket.on('reply', (data) => { //응답 시 실행
      console.log(data);
    });
    socket.interval = setInterval(() => {
      socket.emit('news', '메세지 전송');//key , value 
    }, 3000);
  });
};
