(async () => {
  'use strict';

  const TWILIO_DOMAIN = location.host; // 現在のURL
  const ROOM_NAME = 'VideoRoom'; // 部屋の名前
  const Video = Twilio.Video; // Twilio Video JS SDK
  const VideoProcessors = Twilio.VideoProcessors; // Twilio Video Processors
  const BACKGROUND_IMAGE = './images/background.jpeg'; // 背景画像
  let videoRoom;
  let localTracks, virtualBackground;
  const img = new Image();

  // プレビュー画面の表示
  localTracks = await Video.createLocalTracks();
  const localVideo = document.getElementById('myStream');
  localTracks.forEach((track) => {
    if (track.kind === 'video' || track.kind === 'audio') {
      track.attach(localVideo);
    }
  });

  // バーチャル背景を設定
  img.onload = () => {
    virtualBackground = new VideoProcessors.VirtualBackgroundProcessor({
      assetsPath: `${document.location.protocol}//${TWILIO_DOMAIN}/twilio-video-processors-assets/`,
      backgroundImage: img,
    });
    virtualBackground.loadModel().then(async () => {
      if (localTracks) {
        const videoTrack = localTracks.filter(
          (track) => track.kind === 'video',
        );
        if (!videoTrack[0].processor) {
          videoTrack[0].addProcessor(virtualBackground);
        }
      }
    });
  };
  img.src = BACKGROUND_IMAGE;

  // ボタンの準備
  const btnJoinRoom = document.getElementById('button-join');
  const btnLeaveRoom = document.getElementById('button-leave');

  // 入室ボタンが押されたときの処理
  btnJoinRoom.onclick = () => {
    // アクセストークンを取得
    axios
      .get(
        `${document.location.protocol}//${TWILIO_DOMAIN}/video-token?roomName=${ROOM_NAME}`,
      )
      .then(async (body) => {
        const token = body.data.token;
        console.log(`Token got. ${token}`); // 本番環境ではコメントアウトしましょう

        connectRoom(token); // ルームに接続
      });
  };

  // 退出ボタンが押されたときの処理
  btnLeaveRoom.onclick = () => {
    // 部屋から退室
    videoRoom.disconnect();
    console.log(`Disconnected to Room ${videoRoom.name}`);
    btnJoinRoom.disabled = false;
    btnLeaveRoom.disabled = true;
  };

  // ルームに接続
  const connectRoom = (token) => {
    // 部屋に入室
    Video.connect(token, { name: ROOM_NAME, tracks: localTracks })
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
  };

  // 他の参加者が入室したとき
  const participantConnected = (participant) => {
    console.log(`Participant ${participant.identity} connected'`);

    // 参加者を表示する
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
  };

  // 他の参加者が退室したとき
  const participantDisconnected = (participant) => {
    console.log(`Participant ${participant.identity} disconnected.`);

    // 他の参加者の画面を削除する
    document.getElementById(participant.sid).remove();
  };

  // トラックの購読
  const trackSubscribed = (div, track) => {
    // トラックをアタッチする
    div.appendChild(track.attach());
  };

  // トラックの非購読
  const trackUnsubscribed = (track) => {
    // トラックのデタッチ
    track.detach().forEach((element) => element.remove());
  };
})();
