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

function wsOnline(callback) {

    const socket = new WebSocket(WebSocketUrl);

    socket.addEventListener('open', (event) => {
        console.log('WebSocket 连接已建立:', event);
        online(callback);
    });

    socket.addEventListener('message', (event) => {
        console.log('收到服务器消息:', event.data);
        processIM(event.data);
    });

    socket.addEventListener('close', (event) => {
        console.log('WebSocket 连接已关闭:', event);
        callback.SocketClosed(event);
    })
    socket.addEventListener('error', (event) => {
        console.error('WebSocket 错误发生:', event);
        const errorMessage = event.data || '未提供详细错误信息';
        console.error('WebSocket 错误信息:', errorMessage);
        callback.SocketError(errorMessage);
    });

    return socket;
}

function online(callback) {
    const root = protobuf.parse(webSocketProtoDefinition).root;
    const WsMsg = root.lookupType("WsMsg");

    // const msg
    const wsMessage = WsMsg.create({
        version: 1,
        Hash: new Uint8Array([1, 2, 3]),
        Sig: new Uint8Array([4, 5, 6]),
        typ: root.lookupEnum("WsMsgType").values.Online,
        msg: {
            online: {
                UID: callback.getAddress(),
                voipToken: "",
                UnixTime: Date.now()/1000,
                devToken: "",
                devTyp: 4,
            }
        }
    });

    const binaryData = WsMsg.encode(wsMessage).finish();

    const trimmedBinaryData = trimZeroData(binaryData);
}

function processIM(data) {

}