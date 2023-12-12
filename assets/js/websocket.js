const WebSocketUrl = "ws://127.0.0.1:26666/user/online";
// const WebSocketUrl = "ws://chat.simplenets.org:26666";

const webSocketProtoDefinition = `
            syntax = "proto3";
            
            enum WsMsgType{
              Online = 0;
              OnlineACK = 1;
              IMData = 2;
              PullUnread = 3;
              Offline = 4;
              WsMsgAck = 5;
            }
            
            message WSOnline{
              string UID = 1;
              string voipToken = 2;
              int64 UnixTime = 3;
              string devToken = 4;
              int32  devTyp = 5;
            }
            
            message WSOnlineAck{
              bool Success = 1;
              int64 Seq = 2;
            }
            
            enum WsAckType{
              PeerMsgNoRight = 0;
              GroupMsgNoRight = 1;
              GroupMemberChanged = 2;
              IMAck = 3;
              IMRst = 4;
              BindingChanged = 5;
            }
            
            message GroupTo {
              string grpID = 1;
              map<string, bytes> AesKey = 2;
            }
            
            message MsgReceiver {
              oneof To{
                string  peerAddr = 1;
                GroupTo grp = 2;
              }
            }
            
            message WSCryptoMsg{
              int32 version = 1;
              int64 ID = 2;
              string From = 3;
              MsgReceiver To = 4;
              bytes PayLoad = 5;
              int64 UnixTime = 6;
            }
            
            message WSMsgAck{
              int64 MsgID = 1;
              WsAckType Status = 2;
              string Receiver = 3;
              bytes demo = 4;
              int64 UnixTime = 5;
            }
            
            message WSPullUnread{
              string Receiver = 1;
              int64 FromUnixTime = 2;
              bytes Sig = 3;
              int32 version = 4;
            }
            
            message WSPackedUnread{
              string Receiver = 1;
              repeated WsMsg msg = 2;
            }
            
            message WsMsg{
              int32 version = 10;
              bytes Hash = 1;
              bytes Sig = 2;
              WsMsgType typ = 3;
              oneof payload{
                WSOnline online = 4;
                WSOnlineAck olAck = 5;
                WSCryptoMsg msg = 6;
                WSPullUnread unread = 7;
                WSMsgAck msgAck = 8;
              };
            }
        `;

const clientMsgProtoDefinition = `syntax = "proto3";

message ProPlainTxt {
  string txt = 1;
}

message ProImg {
  bytes content = 1;
  string hash = 2;
  bytes key = 3;
}

message ProVoice {
  int32 len = 1;
  bytes content = 2;
}

message ProLocation {
  string name = 1;
  double long = 2;
  double lat = 3;
}

message ProFile {
  string name = 1;
  bytes content = 2;
  int32 typ = 3;
}

message ProVideoWithHash {
  string hash = 1;
  bytes thumb = 2;
  bool isHorizon = 3;
  bytes key = 4;
}

message ProRedPacket {
  string from = 1;
  string to = 2;
  int64 amount = 3;
  string fromEth = 4;
  int64 sendTime = 5;
  bytes fromSig = 6;
}

message ProContact {
  string uid = 1;
  string recommender = 2;
}

message ProRedPackAck {
  int64 redPackId = 1;
  string txHash = 2;
  string receiverID = 3;
}

message VoipCallInfo {
  bool isVideo = 1;
  int32 duration = 2;
  int32 status = 3;
  int64 callTime = 4;
}

`;


let pbsProtocolRootObj = protobuf.parse(webSocketProtoDefinition).root;
const WsMsg = pbsProtocolRootObj.lookupType("WsMsg");
const WsOnlineMsg = pbsProtocolRootObj.lookupType("WSOnline");
const WSCryptoMsg = pbsProtocolRootObj.lookupType("WSCryptoMsg");
const WSPackedUnread = pbsProtocolRootObj.lookupType("WSPackedUnread");

let pbsClientMsgRootObj = protobuf.parse(clientMsgProtoDefinition).root;
const ProPlainTxt = pbsClientMsgRootObj.lookupType("ProPlainTxt");

const MsgMediaTyp = {
    MMTTxt: 1,
    MMTImg: 2,
    MMTRedPacket: 22,
    MMTContact: 23,
    MMNostrMsg: 30,
};

// 封装消息
function wrapWithType(typ, msg) {
    let data = null;
    switch (typ) {
        case MsgMediaTyp.MMTTxt:
            data = ProPlainTxt.encode(ProPlainTxt.create(msg)).finish();
            break;
        default:
            console.error("Unknown message type:", typ);
            return null;
    }
    const buf = new Uint8Array(1 + data.length);
    buf[0] = typ;
    buf.set(data, 1);
    // console.log("======>>>", buf);
    return buf;
}

function unwrapWithType(data) {
    // console.log("======>>>", data);
    const typ = data[0];
    const msgData = data.subarray(1);

    let msg;
    switch (typ) {
        case MsgMediaTyp.MMTTxt:
            msg = ProPlainTxt.decode(msgData);
            return new msgPayLoad(MsgMediaTyp.MMTTxt, msg.txt)

        default:
            console.error("Unknown message type:", typ);
            return null;
    }
}

class UnreadMsgQuery {
    constructor(receiver, fromTim) {
        this.owner = receiver;
        this.time = fromTim;
    }

    Raw() {
        // 将对象转换为 JSON 字符串
        const rawData = JSON.stringify(this);
        // 将 JSON 字符串编码为 Uint8Array
        return new TextEncoder().encode(rawData);
    }
}

class WSDelegate {
    constructor(address, callback) {
        this.address = address;
        this.socket = null;
        this.callback = callback;
    }

    async wsOnline() {

        const socket = new WebSocket(WebSocketUrl);
        this.socket = socket;
        socket.onopen = (event) => {
            this.queryUnreadMsg();
            this.online();
        };

        socket.onmessage = (event) => {
            this.processWsMsg(event.data);
        };

        socket.onclose = (event) => {
            console.log('WebSocket connection closed:', event);
            this.callback.SocketClosed(event);
        };

        socket.onerror = (event) => {
            console.error('WebSocket error:', event);
            const errorMessage = event.data || '未提供详细错误信息';
            this.callback.SocketError(errorMessage);
        };
        return socket;
    }

    online() {

        const msgObj = {
            devTyp: 4,
            voipToken: "0",
            devToken: "0",
            UID: this.address,
            UnixTime: Math.floor(Date.now() / 1000),
        }

        const msgData = WsOnlineMsg.create(msgObj);
        const trimmedMsgData = WsOnlineMsg.encode(msgData).finish();
        const sig = this.callback.SignData(trimmedMsgData);
        const wsMessage = WsMsg.create({
            version: 1,
            Hash: null,
            Sig: sig,
            typ: pbsProtocolRootObj.lookupEnum("WsMsgType").values.Online,
            online: msgObj,
        });

        const binaryData = WsMsg.encode(wsMessage).finish();
        // const trimmedBinaryData = trimZeroData(binaryData);
        this.socket.send(binaryData);
    }

    async processWsMsg(data) {
        const response = new Response(data);
        const arrayBuffer = await response.arrayBuffer();
        const websocketMsg = WsMsg.decode(new Uint8Array(arrayBuffer));

        const responseData = WsMsg.toObject(websocketMsg);
        switch (responseData.typ) {
            case pbsProtocolRootObj.lookupEnum("WsMsgType").values.Online:
                const onlinePayload = responseData.online;
                console.log("Received WSOnline payload:", onlinePayload);
                break;
            case pbsProtocolRootObj.lookupEnum("WsMsgType").values.OnlineACK:
                const olAckPayload = responseData.olAck;
                if (olAckPayload.Success) {
                    this.callback.OnlineResult(null);
                } else {
                    this.callback.OnlineResult("online failed");
                }
                break;
            case pbsProtocolRootObj.lookupEnum("WsMsgType").values.IMData:
                const msgPayload = responseData.msg;
                console.log("Received WSCryptoMsg payload:", msgPayload);
                this.procCryptoIM(msgPayload);

                break;
            case pbsProtocolRootObj.lookupEnum("WsMsgType").values.PullUnread:
                const unreadPayload = responseData.unread;
                console.log("Received WSPullUnread payload:", unreadPayload);
                break;
            case pbsProtocolRootObj.lookupEnum("WsMsgType").values.Offline:
                // 处理 Offline 类型
                break;
            case pbsProtocolRootObj.lookupEnum("WsMsgType").values.WsMsgAck:
                const msgAckPayload = responseData.msgAck;
                console.log("Received WSMsgAck payload:", msgAckPayload);
                break;
            default:
                console.log("Unknown payload type:", responseData.type);
                break;
        }
    }

    procCryptoIM(imMsg) {
        console.log("Received WSCryptoMsg payload:", imMsg.From, imMsg.To, imMsg.UnixTime);
        const receiver = imMsg.To.peerAddr;
        const peerAddr = imMsg.From;
        if (!receiver) {
            console.log("unsupported group msg")
            return;
        }

        if (this.address !== receiver) {
            console.log("this message is not for me!!!")
            return;
        }

        const key = this.callback.AesKeyFromPeer(peerAddr);
        AesDecryptData(imMsg.PayLoad, key).then(msg => {
            const result = unwrapWithType(msg);
            const msgItem = new storedMsgItem(imMsg.UnixTime, peerAddr,
                this.address, result, false, this.address);
            this.callback.newPeerMsg(msgItem).then(r => {
            });
        });
    }

    async queryUnreadMsg() {
        let hasData = true;
        let startTim = 0;
        while (hasData) {
            startTim = startTim + 1;
            const query = new UnreadMsgQuery(this.address, startTim)
            const param = query.Raw();
            const sig = this.callback.SignData(param)
            const msgData = await httpRequest(websocket_api_load_unread, param, true, sig);
            if (!msgData || msgData.length === 0) {
                console.log("no unread messages");
                return;
            }
            const msgRaw = WSPackedUnread.decode(msgData);
            const unreadObj = WSPackedUnread.toObject(msgRaw);
            console.log(unreadObj.Receiver)
            console.log(unreadObj.msg)
            if (unreadObj.msg.length === 0) {
                hasData = false;
                return;
            }

            for (const wsMsg of unreadObj.msg) {
                const msg = wsMsg.msg;
                this.procCryptoIM(msg);
                console.log(msg.UnixTime)
                if (msg.UnixTime > startTim) {
                    startTim = msg.UnixTime;
                }
            }
        }
    }


    async sendPlainTxt(wrappedMsg, peerAddr, time) {
        const key = this.callback.AesKeyFromPeer(peerAddr);
        const encryptedMsg = await AesEncryptData(wrappedMsg, key);
        const unixTime = Math.floor(time.getTime());
        const cryptoMsgObj = {
            version: 1,
            ID: unixTime,
            From: this.address,
            To: {peerAddr: peerAddr}, // Set the destination peerAddr
            PayLoad: encryptedMsg, // Set your payload data
            UnixTime: unixTime,
        };

        const cryptoMsg = WSCryptoMsg.create(cryptoMsgObj);

        const wsMessage = WsMsg.create({
            version: 1,
            Hash: null,
            Sig: null, // Set your signature data
            typ: pbsProtocolRootObj.lookupEnum("WsMsgType").values.IMData, // Set the appropriate message type
            msg: cryptoMsg,
        });


        const binaryData = WsMsg.encode(wsMessage).finish();
        // console.log(uint8ArrayToHexString(binaryData));
        // const trimmedBinaryData = trimZeroData(binaryData);
        this.socket.send(binaryData);
    }
}