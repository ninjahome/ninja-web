const chainData_api_allFriendIDs = "/query/friend/List";
const chainData_api_updateAccount   = "/tx/account/update"
const chainData_api_account_meta = "/query/account/accSimpleMeta";
const chainData_api_account_avatar = "/query/account/accAvatar";
const websocket_api_load_unread = "/tx/message/unread";

const DefaultHttpTimeOut = 60_000//10_000 //10 seconds

const web3Api = new Web3(new Web3.providers.HttpProvider(YOUR_ETHEREUM_NODE_URL));
const USDT_CONTRACT_ADDRESS = '0x7243E5de57BD28aE2F2a34394CEd01F90B5577C7';  // USDT 合约地址

const httpApiProtoDefinition = `
            syntax = "proto3";
            
            message ApiRequest {
                bytes Sig = 3;
                bytes rawData = 2;
            }
            
            message ApiResponse{
                oneof payload{
                  string txHash = 1;
                  bytes chainData = 2;
                }
            }
        `;

async function httpRequest(url, requestData, needRawData = false, signature = null, timeout = DefaultHttpTimeOut) {
    const apiUrl =  CurrentServerUrl + url;

    const root = protobuf.parse(httpApiProtoDefinition).root;
    const ApiRequest = root.lookupType("ApiRequest");
    const ApiResponse = root.lookupType("ApiResponse");

    // 创建一个 JavaScript 对象
    const myObject = {
        rawData: requestData,
        Sig: signature,
    };
    const binaryData = ApiRequest.encode(myObject).finish();

    const trimmedBinaryData = trimZeroData(binaryData);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const options = {
        method: 'POST', // 指定请求方法为 POST
        headers: {
            'Content-Type': 'application/json', // 指定请求体的数据类型为 JSON
        },
        body: trimmedBinaryData.buffer,
        signal: controller.signal,
    };
    try {
        const response = await fetch(apiUrl, options);

        if (!response.ok) {
            const data = await response.text();
            if (data.startsWith("not found")) {
                console.log("httpRequest:result not found",url);
                return null;
            }
            throw new Error(`HTTP error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const decodedApiResponse = ApiResponse.decode(new Uint8Array(arrayBuffer));

        const responseData = ApiResponse.toObject(decodedApiResponse);
        if (needRawData) {
            return responseData.chainData;
        }

        if (responseData.txHash){
            return responseData.txHash;
        }
        const textDecoder = new TextDecoder('utf-8');
        const jsonString = textDecoder.decode(responseData.chainData);

        console.log("httpRequest result:", jsonString)

        return JSON.parse(jsonString);
    } finally {
        clearTimeout(timeoutId); // 清除定时器
    }
}

function readBinaryDataAsBase64(binaryData) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = function () {
            // 读取完成后，将base64数据传递给resolve
            resolve(reader.result);
        };

        reader.onerror = function (error) {
            // 如果发生错误，将错误信息传递给reject
            reject(error);
        };

        // 将二进制数据读取为DataURL
        reader.readAsDataURL(binaryData);
    });
}

async function apiGetMetaAvatar(address) {
    const textEncoder = new TextEncoder();
    const param = textEncoder.encode(address);

    const avatarData = await httpRequest(chainData_api_account_avatar, param, true);
    if (!avatarData || avatarData.length === 0) {
        console.log("avatar data not found:", address);
        return null;
    }
    const blob = new Blob([avatarData]);
    return await readBinaryDataAsBase64(blob);
}

async function apiGetAccountMeta(address) {
    const textEncoder = new TextEncoder();
    const param = textEncoder.encode(address);

    const jsonObj = await httpRequest(chainData_api_account_meta, param);
    if (!jsonObj) {
        console.log("account meta not found:", address);
        return null;
    }
    return new accountMeta(jsonObj.nonce, jsonObj.addr, jsonObj.name,
        null, jsonObj.balance, jsonObj.touch_time, 0.0, 0.0)
}


async function apiLoadContactListFromServer(address) {

    const textEncoder = new TextEncoder();
    const param = textEncoder.encode(address);

    const jsonData = await httpRequest(chainData_api_allFriendIDs, param);
    if (!jsonData) {
        console.log("friends not found:", address)
        return [];
    }

    const friendsOfContact = jsonData.demo;
    if (friendsOfContact.length === 0) {
        console.log("no friends for this account:", address)
        return []
    }

    const refreshedContact = [];
    for (const key in friendsOfContact) {
        const value = friendsOfContact[key];
        // console.log(`friend relation data => Key: ${key}, Value: ${value}, alias:${value.alias} remark:${value.remark}`);
        const item = new contactItem(address, key, value.alias, value.remark)
        refreshedContact.push(item);
    }

    return refreshedContact;
}

async function apiWeb3EthBalance(address) {
    const balance = await web3Api.eth.getBalance(address)
    const ethBalance = web3Api.utils.fromWei(balance, 'ether')
    const usdtContract = new web3Api.eth.Contract([
        {
            "constant": true,
            "inputs": [{"name": "_owner", "type": "address"}],
            "name": "balanceOf",
            "outputs": [{"name": "balance", "type": "uint256"}],
            "type": "function"
        }
    ], USDT_CONTRACT_ADDRESS);

    // 查询余额
    const usdtBalance = await usdtContract.methods.balanceOf(address).call();
    const balanceFloat = parseFloat(usdtBalance.toString()) / 100; // 假设代币有 18 位小数
// 保留两位小数
    const roundedBalance = balanceFloat.toFixed(2);
    console.log(` address ${address}: ${roundedBalance} USDT ${ethBalance} ETH`);
    return [ethBalance, roundedBalance];
}

class UpdateAccount {
    constructor(from, nickName, avatar) {
        this.from = from;
        this.nick_name = nickName || null;
        this.avatar = avatar || null;
    }

    raw() {
        // 将对象转换为 JSON 字符串
        const rawData = JSON.stringify(this);
        // 将 JSON 字符串编码为 Uint8Array
        return new TextEncoder().encode(rawData);
    }
}

