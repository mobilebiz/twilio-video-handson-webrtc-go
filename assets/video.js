(() => {
    'use strict';

    const TWILIO_DOMAIN = location.host;    // 現在のURL
    const ROOM_NAME = 'VideoRoom';          // 部屋の名前
    const Video = Twilio.Video;             // Twilio Video JS SDK
    let videoRoom, localStream;
    let participantCount = 1;               // 現在の参加者数
    let maxWidth;                           // 映像の最大幅
    let minWidth;                           // 映像の最小幅

    // カメラ・マイクON/OFF管理
    let videoOn = true;
    let audioOn = true;

    // プレビュー画面の表示
    navigator.mediaDevices.getUserMedia({video: true, audio: true})
    .then(stream => {
        document.getElementById("myStream").srcObject = stream;
        // 自身の映像にCSSを適用
        document.getElementById("myStream").classList.add("video-style");

        // STEP 4. 自身のマイクから発話状態を検知する
        // STEP 4. End

        localStream = stream;
    });
    
    // ボタンの準備
    const btnJoinRoom = document.getElementById("button-join");
    const btnLeaveRoom = document.getElementById("button-leave");

    // ボタンにCSSを適用する
    btnJoinRoom.classList.add("uk-button", "uk-button-primary");
    btnLeaveRoom.classList.add("uk-button", "uk-button-danger");

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

    // カメラ・マイクのON/OFFボタンを表示
    const root = document.documentElement;
    // カメラボタン
    const toggle_camera = document.createElement("button");
    toggle_camera.id = "btn-toggle-camera";
    toggle_camera.classList.add("toggle-camera");
    const toggle_camera_image = document.createElement("span");
    toggle_camera_image.classList.add("camera-image");
    toggle_camera.append(toggle_camera_image);
    document.getElementById('my-video').append(toggle_camera);

    // カメラボタンが押されたときの処理
    toggle_camera.addEventListener('click', () => {
        if (videoRoom) {    // ルームに接続済みの場合のみ
            videoRoom.localParticipant.videoTracks.forEach(videoTrack => 
                videoOn ? videoTrack.track.disable() : videoTrack.track.enable());  
        }
        // フラグを反転
        videoOn = !videoOn;
        // ボタンのアイコンを切り替え
        root.style.setProperty('--camera-icon', `url('./images/camera_${videoOn ? 'on' : 'off'}.png')`);
    });

    // マイクボタン
    const toggle_mic = document.createElement("button");
    toggle_mic.id = "btn-toggle-mic";
    toggle_mic.classList.add("toggle-mic");
    const toggle_mic_image = document.createElement("span");
    toggle_mic_image.classList.add("mic-image");
    toggle_mic.append(toggle_mic_image);
    document.getElementById('my-video').append(toggle_mic);

    // マイクボタンが押されたときの処理
    toggle_mic.addEventListener('click', () => {
        if (videoRoom) {    // ルームに接続済みの場合のみ
            videoRoom.localParticipant.audioTracks.forEach(audioTrack => 
                audioOn ? audioTrack.track.disable() : audioTrack.track.enable());  
        }
        // フラグを反転
        audioOn = !audioOn;
        // ボタンのアイコンを切り替え
        root.style.setProperty('--mic-icon', `url('./images/mic_${audioOn ? 'on' : 'off'}.png')`);
    });

    // ルームに接続
    const connectRoom = (token) => {
        // 部屋に入室
        Video.connect(token, { 
            name: ROOM_NAME,
            // STEP 1. ドミナントスピーカーを有効にする
            // STEP 1. End
        })
        .then(room => {
            console.log(`Connected to Room ${room.name}`);
            videoRoom = room;

            // 入室時のローカルデバイスON/OFF制御
            room.localParticipant.videoTracks.forEach(videoTrack => 
                videoOn ? videoTrack.track.enable() : videoTrack.track.disable());  
            room.localParticipant.audioTracks.forEach(audioTrack => 
                audioOn ? audioTrack.track.enable() : audioTrack.track.disable());  

            // すでに入室している参加者を表示
            room.participants.forEach(participantConnected);

            // 誰かが入室してきたときの処理
            room.on('participantConnected', participantConnected);

            // 誰かが退室したときの処理
            room.on('participantDisconnected', participantDisconnected);

            // 自分が退室したときの処理
            room.once('disconnected', error => room.participants.forEach(participantDisconnected));

            // STEP 3. ドミナントスピーカーを検出したときの処理
            // STEP 3. End
        
            btnJoinRoom.disabled = true;
            btnLeaveRoom.disabled = false;
        })
        .catch(err => console.error(err));
    };

    // 他の参加者が入室したとき（もしくは入室していたとき）
    const participantConnected = (participant) => {
        console.log(`Participant ${participant.identity} connected'`);

        // 参加者を表示する 
        const div = document.createElement('div');
        div.id = participant.sid;
        div.classList.add('remote-video');
        
        // 参加者のトラック（映像、音声など）を処理
        participant.tracks.forEach(publication => {
            // トラックの状態を監視する
            if (publication.isSubscribed) {
                trackSubscribed(div, publication.track);
                handleTrackChanged(publication.track, participant);
            }
            publication.on('subscribed', track => handleTrackChanged(track, participant));
        });
        
        // 参加者のトラックが届いたとき
        participant.on('trackSubscribed', track => trackSubscribed(div, track));

        // 参加者のトラックが切れたとき
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
        // 映像トラックにCSSを設定
        if (track.kind === 'video') {
            child.classList.add("video-style");
        };
    }

    // トラックの非購読
    const trackUnsubscribed = (track) => {
        // トラックのデタッチ
        track.detach().forEach(element => element.remove());
    }

    // 映像のサイズを調整する
    const resizeVideo = () => {
        // サイズの計算と適用
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
    }

    // リモート側のカメラ・マイクが切り替わったときの処理
    const handleTrackChanged = ((track, participant) => {
        const dom = document.getElementById(participant.sid);

        // ミュートアイコンを表示
        const muteIcon = (dom => {
            const remote_mic = document.createElement('div');
            remote_mic.id = 'remote-mic';
            remote_mic.classList.add('remote-mic');
            const mic = document.createElement('sp');
            mic.classList.add('mic-image');
            mic.style.backgroundImage = "url('./images/mic_off.png')";
            remote_mic.append(mic);
            dom.append(remote_mic);
        });

        if (track.kind === 'audio' && !track.isEnabled) {
            // 参加中のメンバーがすでにマイクをOFFにしているのでミュートアイコンを表示
            muteIcon(dom);
        }
        // 参加中のメンバーがマイクをOFFにしたときの処理
        track.on('disabled', () => {
            if (track.kind === 'audio') {
                // ミュートアイコンを表示
                muteIcon(dom);
            }
        });
        // 参加中のメンバーがマイクをONにしたときの処理
        track.on('enabled', () => {
            if (track.kind === 'audio') {
                // ミュートアイコンを削除
                dom.childNodes.forEach(node => {
                    if (node.id === 'remote-mic') node.remove();
                });
            }
        });

    });

    // STEP 2. ドミナントスピーカーを目立たせる
    // STEP 2. End

    // STEP 5. 検出ループ
    // STEP 5. End
})();