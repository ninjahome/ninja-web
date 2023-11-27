
function initCurrentDBKey(address) {
    storeDataToLocalStorage(DBKeyLastUsedWallet, address);
}

function getGlobalCurrentAddr(){
    return getDataFromLocalStorage(DBKeyLastUsedWallet);
}

/*****************************************************************************************
 *
 *                               account meta
 *
 * *****************************************************************************************/
class accountMeta {
    constructor(nonce, address, name, avatarUrl, balance, updateTime) {
        this.nonce = nonce;
        this.address = address;
        this.name = name;
        this.avatarUrl = avatarUrl;
        this.balance = balance;
        this.updateTime = updateTime;
    }

    static fromSrvJson(jsonObj) {
        return new accountMeta(
            jsonObj.nonce,
            jsonObj.addr,
            jsonObj.name,
            "",
            jsonObj.balance,
            jsonObj.touch_time,
        )
    }

    syncToDB() {
        storeDataToLocalStorage(metaDataKey(this.address), this);
    }

    static fromJson(json) {
        return new accountMeta(json.nonce, json.address, json.name, json.avatarUrl, json.balance, json.updateTime);
    }
}

function metaDataKey(address) {
    return DBKeyMetaDetails + address;
}

function cacheLoadMetaInfo(address) {
    const  key = metaDataKey(address);
    let meta = getDataFromLocalStorage(key);
    if (!meta){
        return null;
    }
    return accountMeta.fromJson(meta);
}

// return getDataFromLocalStorage(metaDataKey(address))

/*****************************************************************************************
 *
 *                               contract
 *
 * *****************************************************************************************/

class contactItem {
    constructor(address, meta, alias, demo) {
        this.address = address;
        this.meta = meta;
        this.alias = alias;
        this.demo = demo;
    }

    syncToDB() {
        storeDataToLocalStorage(contactKey(this.address), this);
    }

    static fromJson(json) {
        return new contactItem(json.address,
            json.meta,
            json.alias,
            json.demo);
    }
}

function contactKey(address) {
    return DBKeyContactDetails + getGlobalCurrentAddr()+ "__" + address;
}

function cacheLoadContactInfo(address) {
    const  key = contactKey(address);
    let contactDetails = getDataFromLocalStorage(key);
    if (!contactDetails){
        return null;
    }

    return contactItem.fromJson(contactDetails);
}

function contactListKey() {
    return DBKeyAllContactData + getGlobalCurrentAddr();
}

function cacheSetContractList(friendsList) {
    const string = JSON.stringify(friendsList)
    localStorage.setItem(contactListKey(), string)
}

function cacheLoadContractList() {
    const storedData = localStorage.getItem(contactListKey())
    if (!storedData) {
        return [];
    }
    return JSON.parse(storedData);
}

/*****************************************************************************************
 *
 *                               message logic
 *
 * *****************************************************************************************/

class messageTipsItem {
    constructor(address, avatarUrl, nickname, time, description) {
        this.address = address;
        this.avatarUrl = avatarUrl;
        this.nickname = nickname;
        this.time = time;
        this.description = description;
    }
}

function cacheLoadCachedMsgTipsList() {

    const result = [];
    const currentDate = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(currentDate.getDate() - 2);

    const item_1 = new messageTipsItem("NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg",
        "/assets/logo.png", "日本聪",
        currentDate, "文本消息");
    const item_2 = new messageTipsItem("NJJ5ryLVoNG9Cm9yaPheMQH4tpUYoGyKYXGWNfFqLTFGLP",
        "/assets/logo.png", "中本聪",
        currentDate, "文本消息");
    const item_3 = new messageTipsItem("NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg",
        "/assets/logo.png", "V神",
        twoDaysAgo, "文本消息");

    result.push(item_1);
    result.push(item_2);
    result.push(item_3);

    return result
}

class messageItem {
    constructor(isSelf, avatarUrl, nickname, msgPayload, time) {
        this.isSelf = isSelf;
        this.avatarUrl = avatarUrl;
        this.nickname = nickname;
        this.msgPayload = msgPayload;
        this.time = time;
    }
}

async function cacheLoadCachedMsgListForAddr(address) {

    const result = [];

    const currentDate = new Date();
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(currentDate.getDate() - 2);

    const msg_1 = new messageItem(true, "/assets/logo.png",
        "中本聪", "早上好", twoDaysAgo);
    const msg_2 = new messageItem(false, "/assets/logo.png",
        "日本聪", "您好！很开心和您聊天😊", twoDaysAgo);

    const msg_3 = new messageItem(true, "/assets/logo.png",
        "中本聪", "最近项目的进展咋样？", currentDate);

    const msg_4 = new messageItem(false, "/assets/logo.png",
        "日本聪", "项目进展顺利，我们在使用新的技术编程", currentDate);

    result.push(msg_1);
    result.push(msg_2);
    result.push(msg_3);
    result.push(msg_4);
    return result;

}