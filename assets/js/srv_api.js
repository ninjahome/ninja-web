const chainData_api_allFriendIDs = "/query/friend/List";
const chainData_api_account_meta = "/query/account/accSimpleMeta";
const chainData_api_account_avatar = "/query/account/accAvatar";

const CurrentServerUrl = "127.0.0.1:26668";
// const CurrentServerUrl = "chat.simplenets.org:26668";
const DefaultHttpTimeOut = 60_000//10_000 //10 seconds

const protoDefinition = `
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

async function httpRequest(url, requestData, needRawData = false, timeout = DefaultHttpTimeOut) {
    const apiUrl = 'http://' + CurrentServerUrl + url;

    const root = protobuf.parse(protoDefinition).root;
    const ApiRequest = root.lookupType("ApiRequest");
    const ApiResponse = root.lookupType("ApiResponse");

    // 创建一个 JavaScript 对象
    const myObject = {
        rawData: requestData,
        Sig: null,
    };
    const binaryData = ApiRequest.encode(myObject).finish();

    let nonZeroIndex = 0;
    while (nonZeroIndex < binaryData.length && binaryData[nonZeroIndex] === 0) {
        nonZeroIndex++;
    }
    const trimmedBinaryData = binaryData.slice(nonZeroIndex);

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
                console.log("httpRequest:result not found");
                return null;
            }
            throw new Error(`HTTP error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const decodedApiResponse = ApiResponse.decode(new Uint8Array(arrayBuffer));

        const responseData = ApiResponse.toObject(decodedApiResponse);
        if (needRawData){
            return responseData.chainData;
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

async  function apiGetMetaAvatar(address){
    const textEncoder = new TextEncoder();
    const param = textEncoder.encode(address);

    const avatarData = await httpRequest(chainData_api_account_avatar, param, true);
    if (!avatarData || avatarData.length === 0){
        return  null;
    }
    const blob = new Blob([avatarData]);
    return await readBinaryDataAsBase64(blob);
}

async function apiGetAccountMeta(address) {
    const textEncoder = new TextEncoder();
    const param = textEncoder.encode(address);

    const jsonObj = await httpRequest(chainData_api_account_meta, param);
    if (!jsonObj) {
        return null;
    }
    return accountMeta.fromSrvJson(jsonObj);
}


async function apiLoadContactListFromServer(address) {

    const textEncoder = new TextEncoder();
    const param = textEncoder.encode(address);

    const jsonData = await httpRequest(chainData_api_allFriendIDs, param);
    if (!jsonData) {
        console.log("no friends data got from http server:", address)
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
        console.log(`friend relation data => Key: ${key}, Value: ${value}, alias:${value.alias} remark:${value.remark}`);
        const item = new contactItem(key, value.alias, value.remark)
        refreshedContact.push(item);
    }

    return refreshedContact;
}