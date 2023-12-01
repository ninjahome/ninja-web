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


let pbsRootObj = null;

async function wsOnline(callback) {

    pbsRootObj = protobuf.parse(webSocketProtoDefinition).root;

    const socket = new WebSocket(WebSocketUrl);

    socket.onopen = (event) => {
        console.log('WebSocket connection opened:', event);

        online(callback, socket);
    };

    socket.onmessage = (event) => {
        console.log('Received message:', event.data);
        processIM(callback,event.data);
    };

    socket.onclose = (event) => {
        // 处理连接关闭事件
        console.log('WebSocket connection closed:', event);
        callback.SocketClosed(event);
    };

    socket.onerror = (event) => {
        // 处理WebSocket错误事件
        console.error('WebSocket error:', event);
        const errorMessage = event.data || '未提供详细错误信息';
        callback.SocketError(errorMessage);
    };
    return socket;
}

function online(callback, socket) {
    const WsMsg = pbsRootObj.lookupType("WsMsg");
    const WsOnlineMsg = pbsRootObj.lookupType("WSOnline");

    const msgObj = {
        devTyp: 4,
        voipToken: "0",
        devToken: "0",
        UID: callback.getAddress(),
        UnixTime: Math.floor(Date.now() / 1000),
    }

    const msgData = WsOnlineMsg.create(msgObj);
    const trimmedMsgData = WsOnlineMsg.encode(msgData).finish();
    const sig = callback.SignData(trimmedMsgData);
    const wsMessage = WsMsg.create({
        version: 1,
        Hash: null,
        Sig: sig,
        typ: pbsRootObj.lookupEnum("WsMsgType").values.Online,
        online: msgObj,
    });

    const binaryData = WsMsg.encode(wsMessage).finish();

    const trimmedBinaryData = trimZeroData(binaryData);
    socket.send(trimmedBinaryData);
}

async function processIM(callback, data) {
    const WsMsg = pbsRootObj.lookupType("WsMsg");
    const response = new Response(data);
    const arrayBuffer = await response.arrayBuffer();
    const websocketMsg = WsMsg.decode(new Uint8Array(arrayBuffer));
// 将 WsMsg 对象转换为 JavaScript 对象
    const responseData = WsMsg.toObject(websocketMsg);
    console.log("type=>",pbsRootObj.lookupEnum("WsMsgType").values.OnlineACK);
    console.log("responseData.type value:", responseData.typ);
    // 读取 payload
    switch (responseData.typ) {
        case pbsRootObj.lookupEnum("WsMsgType").values.Online:
            const onlinePayload = responseData.online;
            console.log("Received WSOnline payload:", onlinePayload);
            // 处理 WSOnline 对象
            break;
        case pbsRootObj.lookupEnum("WsMsgType").values.OnlineACK:
            const olAckPayload = responseData.olAck;
            console.log("Received WSOnlineAck payload:", olAckPayload);
            // 处理 WSOnlineAck 对象
            if (olAckPayload.Success){
                callback.OnlineResult(null);
            }else{
                callback.OnlineResult("online failed");
            }
            break;
        case pbsRootObj.lookupEnum("WsMsgType").values.IMData:
            const msgPayload = responseData.msg;
            console.log("Received WSCryptoMsg payload:", msgPayload);
            // 处理 WSCryptoMsg 对象
            break;
        case pbsRootObj.lookupEnum("WsMsgType").values.PullUnread:
            const unreadPayload = responseData.unread;
            console.log("Received WSPullUnread payload:", unreadPayload);
            // 处理 WSPullUnread 对象
            break;
        case pbsRootObj.lookupEnum("WsMsgType").values.Offline:
            // 处理 Offline 类型
            break;
        case pbsRootObj.lookupEnum("WsMsgType").values.WsMsgAck:
            const msgAckPayload = responseData.msgAck;
            console.log("Received WSMsgAck payload:", msgAckPayload);
            // 处理 WSMsgAck 对象
            break;
        default:
            console.log("Unknown payload type:", responseData.type);
            // 处理未知类型
            break;
    }
}