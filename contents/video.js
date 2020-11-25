(() => {
    'use strict';

    const TWILIO_DOMAIN = location.host;    // 現在のURL
    const ROOM_NAME = 'VideoRoom';          // 部屋の名前
    const Video = Twilio.Video;             // Twilio Video JS SDK
    let videoRoom, localStream;
    let participantCount = 1;               // 現在の参加者数
    let maxWidth;                           // 映像の最大幅
    let minWidth;                           // 映像の最小幅

    // プレビュー画面の表示
    navigator.mediaDevices.getUserMedia({video: true, audio: true})
    .then(stream => {
        document.getElementById("myStream").srcObject = stream;
        // STEP 1. 自身の映像にCSSを適用
        document.getElementById("myStream").classList.add("video-style");
        // STEP 1. End
        localStream = stream;
    });
    
    // ボタンの準備
    const btnJoinRoom = document.getElementById("button-join");
    const btnLeaveRoom = document.getElementById("button-leave");

    // STEP 3. ボタンにCSSを適用する
    btnJoinRoom.classList.add("uk-button", "uk-button-primary");
    btnLeaveRoom.classList.add("uk-button", "uk-button-danger");
    // STEP 3. End

    // 入室ボタンが押されたときの処理
    btnJoinRoom.onclick = (() => {
        // アクセストークンを取得
        axios.get(`${document.location.protocol}//${TWILIO_DOMAIN}/video-token?roomName=${ROOM_NAME}`)
        .then(async body => {
            const token = body.data.token;
            console.log(`Token got. ${token}`); // 本番環境ではコメントアウトしましょう

            connectRoom(token); // ルームに接続
        });
    });

    // 退出ボタンが押されたときの処理
    btnLeaveRoom.onclick = (() => {
        // 部屋から退室
        videoRoom.disconnect();
        console.log(`Disconnected to Room ${videoRoom.name}`);
        btnJoinRoom.disabled = false;
        btnLeaveRoom.disabled = true;
    });

    // ルームに接続
    const connectRoom = (token) => {
        // 部屋に入室
        Video.connect(token, { name: ROOM_NAME })
        .then(room => {
            console.log(`Connected to Room ${room.name}`);
            videoRoom = room;

            // すでに入室している参加者を表示
            room.participants.forEach(participantConnected);

            // 誰かが入室してきたときの処理
            room.on('participantConnected', participantConnected);

            // 誰かが退室したときの処理
            room.on('participantDisconnected', participantDisconnected);

            // 自分が退室したときの処理
            room.once('disconnected', error => room.participants.forEach(participantDisconnected));
        
            btnJoinRoom.disabled = true;
            btnLeaveRoom.disabled = false;
        })
        .catch(err => console.error(err));
    };

    // 他の参加者が入室したとき
    const participantConnected = (participant) => {
        console.log(`Participant ${participant.identity} connected'`);

        // 参加者を表示する 
        const div = document.createElement('div');
        div.id = participant.sid;
        
        // 参加者のトラック（映像、音声など）を処理
        participant.tracks.forEach(publication => {
            if (publication.isSubscribed) {
                trackSubscribed(div, publication.track);
            }
        });
        
        // 参加者の映像が届いたとき
        participant.on('trackSubscribed', track => trackSubscribed(div, track));

        // 参加者の映像が切れたとき
        participant.on('trackUnsubscribed', trackUnsubscribed);
    
        // 参加者の画像を表示
        const videoZone = document.getElementById("video-zone");
        videoZone.appendChild(div);

        // 参加者数をインクリメント
        participantCount++;
        resizeVideo();
    }

    // 他の参加者が退室したとき
    const participantDisconnected = (participant) => {
        console.log(`Participant ${participant.identity} disconnected.`);

        // 他の参加者の画面を削除する
        document.getElementById(participant.sid).remove();

        // 参加者数をデクリメント
        participantCount--;
        resizeVideo();
    }

    // トラックの購読
    const trackSubscribed = (div, track) => {
        // トラックをアタッチする
        const child = div.appendChild(track.attach());
        // STEP 2. 映像トラックにCSSを設定
        if (track.kind === 'video') {
            child.classList.add("video-style");
        };
        // STEP 2. End
    }

    // トラックの非購読
    const trackUnsubscribed = (track) => {
        // トラックのデタッチ
        track.detach().forEach(element => element.remove());
    }

    // 映像のサイズを調整する
    const resizeVideo = () => {
        // STEP 4. サイズの計算と適用
        const root = document.documentElement;
        if (!maxWidth && participantCount === 2) {
            // 最初の参加者が入ってきたときに、CSSの:rootに設定されている値を取得
            maxWidth = Number(getComputedStyle(root).getPropertyValue('--video-width').replace('px', ''));
            // 最小幅は、最大幅の半分とする
            minWidth = maxWidth / 2;
        }
        // 新しい幅を計算してみる
        const newWidth = maxWidth * 2 / participantCount;
        if (newWidth < minWidth) {
            // 最小幅より小さくなった場合は、最小幅を指定
            root.style.setProperty('--video-width', `${minWidth}px`);
        } else if (newWidth > maxWidth) {
            // 最大幅より大きくなった場合は、最大幅を指定
            root.style.setProperty('--video-width', `${maxWidth}px`);
        } else {
            // 計算した値を採用
            root.style.setProperty('--video-width', `${newWidth}px`);
        }
        // STEP 4. End
    }

})();