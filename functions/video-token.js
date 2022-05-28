const uuid = require('uuid');
exports.handler = function (context, event, callback) {
  // ルーム名を取得
  const ROOM_NAME = event.roomName || '';
  if (ROOM_NAME === '') callback(new Error('roomName parameter was not set.'));

  // 環境変数から各種情報をセット
  const ACCOUNT_SID = context.ACCOUNT_SID;
  const API_KEY = context.TWILIO_VIDEO_KEY;
  const API_SECRET = context.TWILIO_VIDEO_SECRET;

  const IDENTITY = uuid.v4(); // ランダムにクライアント名を生成

  const AccessToken = Twilio.jwt.AccessToken;
  const VideoGrant = AccessToken.VideoGrant;

  // 参加できるルームをトークンで限定
  const videoGrant = new VideoGrant({
    room: ROOM_NAME,
  });

  const accessToken = new AccessToken(ACCOUNT_SID, API_KEY, API_SECRET);

  accessToken.addGrant(videoGrant);
  accessToken.identity = IDENTITY;
  callback(null, {
    token: accessToken.toJwt(),
  });
};
