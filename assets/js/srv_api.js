const chainData_api_allFriendIDs = "/query/friend/List";

async function fetchData(url) {
    const apiUrl = 'http://'+CurrentServerUrl+url;
    const response = await fetch(apiUrl);

    // 不处理异常，让调用者处理
    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return await response.json();
}

async function apiLoadFriendIDs(address){
    const jsonData = await fetchData(chainData_api_allFriendIDs);
    console.log('JSON data:', jsonData);
    return []
}