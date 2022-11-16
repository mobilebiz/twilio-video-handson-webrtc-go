(async () => {
  'use strict';

  const TWILIO_DOMAIN = location.host; // 現在のURL
  const ROOM_NAME = 'VideoRoom'; // 部屋の名前
  const Video = Twilio.Video; // Twilio Video JS SDK
  let videoRoom, localTracks;

  // STEP 1. プレビュー画面の表示
  // STEP 1. End

  // ボタンの準備
  const btnJoinRoom = document.getElementById('button-join');
  const btnLeaveRoom = document.getElementById('button-leave');

  // 入室ボタンが押されたときの処理
  btnJoinRoom.onclick = () => {
    // STEP 2. アクセストークンを取得
    // STEP 2. End
  };

  // 退出ボタンが押されたときの処理
  btnLeaveRoom.onclick = () => {
    // STEP 4. 部屋から退室
    // STEP 4. End
  };

  // ルームに接続
  const connectRoom = (token) => {
    // STEP 3. 部屋に入室
    // STEP 3. End
  };

  // 他の参加者が入室したとき
  const participantConnected = (participant) => {
    console.log(`Participant ${participant.identity} connected'`);

    // STEP 5. 参加者を表示する
    // STEP 5. End
  };

  // 他の参加者が退室したとき
  const participantDisconnected = (participant) => {
    console.log(`Participant ${participant.identity} disconnected.`);

    // STEP 6. 他の参加者の画面を削除する
    // STEP 6. End
  };

  // トラックの購読
  const trackSubscribed = (div, track) => {
    // STEP 7. トラックをアタッチする
    // STEP 7. End
  };

  // トラックの非購読
  const trackUnsubscribed = (track) => {
    // STEP 8. トラックのデタッチ
    // STEP 8 End
  };
})();
