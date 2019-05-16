const WebSocket = require('ws');

module.exports = (server) => { //WSS 는 main PORT 와 같은 PORT를 적용 
  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws, req) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    //proxy를 거치기 전의 ip || final ip
    console.log('새로운 클라이언트 접속', ip);
    ws.on('message', (message) => {
      console.log(message);
    });
    ws.on('error', (error) => {
      console.error(error);
    });
    ws.on('close', () => {
      console.log('클라이언트 접속 해제', ip);
      clearInterval(ws.interval); 
      //client가 종료 시 interval 해제, 메시지 전송 끊기
    });

    //주기적으로 서버 -> 클라이언트 메시지 전송
    const interval = setInterval(() => {
      if (ws.readyState === ws.OPEN) { //다른 상태일 때는 메시지 전송X 
        ws.send('메시지 전송');
      }
    }, 3000);
    ws.interval = interval;
  });
};

//WSS 연결 상태(readyState)
//connecting : 연결 중 
//open : (양방향) 연결 수립
//closing : 종료 중
//closed : 종료
