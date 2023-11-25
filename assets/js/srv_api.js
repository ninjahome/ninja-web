const chainData_api_allFriendIDs = "/query/friend/List";
const CurrentServerUrl = "127.0.0.1:26668";
// const CurrentServerUrl = "chat.simplenets.org:26668";

async function fetchData(url, requestData) {
    const apiUrl = 'http://'+CurrentServerUrl+url;

    const options = {
        method: 'POST', // 指定请求方法为 POST
        headers: {
            'Content-Type': 'application/json', // 指定请求体的数据类型为 JSON
            // 其他自定义请求头（如果有）
        },
        body:JSON.stringify({'this is a string':"fine"}),
    };

    const response = await fetch(apiUrl, options);

    // 不处理异常，让调用者处理
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const jsonData = await response.json();
    console.log('JSON data:=>', jsonData);
    return jsonData;
}

async function apiLoadFriendIDs(address){
    const textEncoder = new TextEncoder();
    const param  = textEncoder.encode(address);
    const jsonData = await fetchData(chainData_api_allFriendIDs, param.buffer);
    return []
}