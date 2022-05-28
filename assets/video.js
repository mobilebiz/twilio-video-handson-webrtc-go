(() => {
  'use strict';

  const TWILIO_DOMAIN = location.host; // 現在のURL
  const ROOM_NAME = 'VideoRoom'; // 部屋の名前
  const Video = Twilio.Video; // Twilio Video JS SDK
  let videoRoom, localStream;

  // STEP 1. プレビュー画面の表示
  navigator.mediaDevices
    .getUserMedia({ video: true, audio: true })
    .then((stream) => {
      document.getElementById('myStream').srcObject = stream;
      localStream = stream;
    });
  // STEP 1. End

  // ボタンの準備
  const btnJoinRoom = document.getElementById('button-join');
  const btnLeaveRoom = document.getElementById('button-leave');

  // 入室ボタンが押されたときの処理
  btnJoinRoom.onclick = () => {
    // STEP 2. アクセストークンを取得
    axios
      .get(
        `${document.location.protocol}//${TWILIO_DOMAIN}/video-token?roomName=${ROOM_NAME}`,
      )
      .then(async (body) => {
        const token = body.data.token;
        console.log(`Token got. ${token}`); // 本番環境ではコメントアウトしましょう

        connectRoom(token); // ルームに接続
      });
    // STEP 2. End
  };

  // 退出ボタンが押されたときの処理
  btnLeaveRoom.onclick = () => {
    // STEP 4. 部屋から退室
    videoRoom.disconnect();
    console.log(`Disconnected to Room ${videoRoom.name}`);
    btnJoinRoom.disabled = false;
    btnLeaveRoom.disabled = true;
    // STEP 4. End
  };

  // ルームに接続
  const connectRoom = (token) => {
    // STEP 3. 部屋に入室
    Video.connect(token, { name: ROOM_NAME, tracks: localStream.getTracks() })
      .then((room) => {
        console.log(`Connected to Room ${room.name}`);
        videoRoom = room;

        // すでに入室している参加者を表示
        room.participants.forEach(participantConnected);

        // 誰かが入室してきたときの処理
        room.on('participantConnected', participantConnected);

        // 誰かが退室したときの処理
        room.on('participantDisconnected', participantDisconnected);

        // 自分が退室したときの処理
        room.once('disconnected', (error) =>
          room.participants.forEach(participantDisconnected),
        );

        btnJoinRoom.disabled = true;
        btnLeaveRoom.disabled = false;
      })
      .catch((err) => console.error(err));
    // STEP 3. End
  };

  // 他の参加者が入室したとき
  const participantConnected = (participant) => {
    console.log(`Participant ${participant.identity} connected'`);

    // STEP 5. 参加者を表示する
    const div = document.createElement('div');
    div.id = participant.sid;

    // 参加者のトラック（映像、音声など）を処理
    participant.tracks.forEach((publication) => {
      if (publication.isSubscribed) {
        trackSubscribed(div, publication.track);
      }
    });

    // 参加者の映像が届いたとき
    participant.on('trackSubscribed', (track) => trackSubscribed(div, track));

    // 参加者の映像が切れたとき
    participant.on('trackUnsubscribed', trackUnsubscribed);

    document.body.appendChild(div);
    // STEP 5. End
  };

  // 他の参加者が退室したとき
  const participantDisconnected = (participant) => {
    console.log(`Participant ${participant.identity} disconnected.`);

    // STEP 6. 他の参加者の画面を削除する
    document.getElementById(participant.sid).remove();
    // STEP 6. End
  };

  // トラックの購読
  const trackSubscribed = (div, track) => {
    // STEP 7. トラックをアタッチする
    div.appendChild(track.attach());
    // STEP 7. End
  };

  // トラックの非購読
  const trackUnsubscribed = (track) => {
    // STEP 8. トラックのデタッチ
    track.detach().forEach((element) => element.remove());
    // STEP 8 End
  };
})();
