const chainData_api_allFriendIDs = "/query/friend/List";
const chainData_api_account_meta = "/query/account/accSimpleMeta";

const CurrentServerUrl = "127.0.0.1:26668";
// const CurrentServerUrl = "chat.simplenets.org:26668";


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

async function httpRequest(url, requestData, timeout = 10000) {
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
                console.log("========>>>didn't find any data from server");
                return null;
            }
            throw new Error(`HTTP error: ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const decodedApiResponse = ApiResponse.decode(new Uint8Array(arrayBuffer));

        const responseData = ApiResponse.toObject(decodedApiResponse);

        const textDecoder = new TextDecoder('utf-8');
        const jsonString = textDecoder.decode(responseData.chainData);

        console.log("jsonString===>>>",jsonString)

        return JSON.parse(jsonString);
    } finally {
        clearTimeout(timeoutId); // 清除定时器
    }
}

async function apiGetAccountMetaWithoutAvatar(address) {
    const textEncoder = new TextEncoder();
    const param = textEncoder.encode(address);

    const jsonObj = await httpRequest(chainData_api_account_meta, param);
    if (!jsonObj) {
        return null;
    }
    return jsonObj;
}

async function apiLoadFriendIDs(address) {

    const textEncoder = new TextEncoder();
    const param = textEncoder.encode(address);

    const jsonData = await httpRequest(chainData_api_allFriendIDs, param);
    if (!jsonData) {
        return [];
    }

    const friendsOfContact = jsonData.demo;
    if (friendsOfContact.length === 0) {
        return []
    }
    console.log(friendsOfContact)
    const refreshedContact = [];
    for (const key in friendsOfContact) {
        if (!friendsOfContact.hasOwnProperty(key)) {
            continue;
        }
        const value = friendsOfContact[key];
        console.log(`Key: ${key}, Value: ${value}, alias:${value.alias}`);
        let contactDetails = cacheLoadContactDetails(key);
        if (!contactDetails) {
            contactDetails = apiGetAccountMetaWithoutAvatar(key);
            if (!contactDetails) {
                console.log("failed to load account info for key:=>", key)
                contactDetails = new contactItem(
                    key,
                    DefaultAvatarUrl,
                    "",
                    value.alias,
                    value.demo
                );
            }

            refreshedContact.push(contactDetails);
        }
    }
    localStorage.setItem(DBKeyAllContactData, JSON.stringify(refreshedContact)) //.getItem(DBKeyAllContactData)
    return refreshedContact;
}