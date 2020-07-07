const localVideo = document.getElementById("local_video");
const remoteVideo = document.getElementById("remote_video");
const textForSendSdp = document.getElementById("text_for_send_sdp");
const textToReceiveSdp = document.getElementById("text_for_receive_sdp");
let localStream = null;
let peerConnection = null;
// let isOffer = false;

async function startVideo() {
  try {
    // getUserMediaに渡すMediaStreamConstraintsは闇らしい
    // https://leader22.github.io/slides/webrtc_meetup-16/#1
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false,
    });
    playVideo(localVideo, localStream);
  } catch (err) {
    // ユーザがデバイスの使用を拒否した場合にエラーが発生する
    console.error(`Error at mediaDevices.getUserMedia(): ${err}`);
  }
}

/**
 * @param {HTMLVideoElement} videoElement
 * @param {MediaStream} stream
 */
async function playVideo(videoElement, stream) {
  // HTMLMediaElementのsrcObjectにMediaStreamを入力元として渡す
  videoElement.srcObject = stream;
  try {
    await videoElement.play();
  } catch (err) {
    console.error(`Error at auto play: ${err}`);
  }
}

/**
 * @param {boolean} isOffer
 * @return {RTCPeerConnection} peer
 */
function prepareNewConnection(isOffer) {
  // SkyWayのstunサーバ
  const pcConfig = {
    iceServers: [{ urls: "stun:stun.webrtc.ecl.ntt.com:3478" }],
  };
  const peer = new RTCPeerConnection(pcConfig);

  // ざっくりリモートのペアからストリームが来たときのイベントハンドラ
  peer.ontrack = (ev /* RTCTrackEvent */) => {
    console.log("--- peer.ontrack() ---");
    playVideo(remoteVideo, ev.streams[0]);
  };

  // IceCandidateイベントのハンドラ
  // まだよくわからない
  // candidate情報の収集とは
  peer.onicecandidate = (ev /*icecandidate event */) => {
    if (ev.candidate) {
      console.log(ev.candidate);
    } else {
      console.log("empty ice event");
      sendSdp(peer.localDescription);
    }
  };

  peer.onnegotiationneeded = async () => {
    try {
      if (isOffer) {
        let offer = await peer.createOffer(); // SDPのoffer側接続情報を生成
        console.log("createOffer() success in promise");

        // このセットが完了するとブラウザがcandidate情報収集を始める
        await peer.setLocalDescription(offer);
        console.log("setLocalDescription() success in promise");

        sendSdp(peer.localDescription);
      }
    } catch (err) {
      console.error(`Error at setLocalDescription(offer): ${err}`);
    }
  };

  if (localStream) {
    console.log("Adding local stream...");
    // RTCPeerConnection.addTrackでストリームのトラックを入れるとペアに送られる
    localStream
      .getTracks()
      .forEach((track) => peer.addTrack(track, localStream));
  } else {
    console.warn("no local stream, but continue.");
  }

  return peer;
}

/**
 * @param {RTCSessionDescription} sessionDescription
 */
function sendSdp(sessionDescription) {
  console.log("--- sending sdp ---");
  textForSendSdp.value = sessionDescription.sdp;
  textForSendSdp.focus();
  textForSendSdp.select();
}

function connect() {
  if (!peerConnection) {
    console.log("make offer");
    peerConnection = prepareNewConnection(true);
  } else {
    console.warn("peer connection already exists.");
  }
}

async function makeAnswer() {
  console.log("Sending answer. Creating remote session description...");
  if (!peerConnection) {
    console.error("peerConnection does not exist.");
    return;
  }
  try {
    let answer = await peerConnection.createAnswer();
    console.log("createAnswer() success in promise");

    await peerConnection.setLocalDescription(answer);
    console.log("setLocalDescription() success in promise");
    sendSdp(peerConnection.setLocalDescription);
  } catch (err) {
    console.error(err);
  }
}

function onSdpText() {
  const text = textToReceiveSdp.value;
  if (peerConnection) {
    // offer側
    console.log("Received answer text...");
    const answer = new RTCSessionDescription({
      type: "answer",
      sdp: text,
    });
    setAnswer(answer);
  } else {
    // answer側
    console.log("Received offer text...");
    const offer = new RTCSessionDescription({
      type: "offer",
      sdp: text,
    });
    setOffer(offer);
  }
  textToReceiveSdp.value = "";
}

/**
 * @param {RTCSessionDescription} sessionDescription
 */
async function setOffer(sessionDescription) {
  if (peerConnection) {
    console.error("peerConnection already exists");
  }
  peerConnection = prepareNewConnection(false);
  try {
    await peerConnection.setRemoteDescription(sessionDescription);
    console.log("setRemoteDescription(answer) success in promise");
    makeAnswer();
  } catch (err) {
    console.error(`Error at setRemoteDescription(offer): ${err}`);
  }
}

/**
 * @param {RTCSessionDescription} sessionDescription
 */
async function setAnswer(sessionDescription) {
  if (!peerConnection) {
    console.error("peerConnection does not exist");
    return;
  }
  try {
    await peerConnection.setRemoteDescription(sessionDescription);
    console.log("setRemoteDescription(answer) success in promise");
  } catch (err) {
    console.error(`Error at setRemoteDescription(answer): ${err}`);
  }
}
