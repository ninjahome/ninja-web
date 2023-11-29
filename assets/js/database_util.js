let __globalCurWalletAddr = null;
let __globalAllCombinedContact = new Map();

function initCurrentDBKey(address) {
    storeDataToLocalStorage(DBKeyLastUsedWallet, address);
}

function getGlobalCurrentAddr() {
    if (!__globalCurWalletAddr) {
        __globalCurWalletAddr = getDataFromLocalStorage(DBKeyLastUsedWallet);
    }
    return __globalCurWalletAddr;
}

/*****************************************************************************************
 *
 *                               account meta
 *
 * *****************************************************************************************/
class accountMeta {
    constructor(nonce, address, name, avatarBase64, balance, updateTime) {
        this.nonce = nonce;
        this.address = address;
        this.name = name;
        this.avatarBase64 = avatarBase64;
        this.balance = balance;
        this.updateTime = updateTime;
    }

    static fromSrvJson(jsonObj) {
        return new accountMeta(jsonObj.nonce, jsonObj.addr, jsonObj.name, null, jsonObj.balance, jsonObj.touch_time,)
    }

    syncToDB() {
        storeDataToLocalStorage(metaDataKey(this.address), this);
    }

    static fromLocalJson(json) {
        return new accountMeta(json.nonce, json.address, json.name, json.avatarBase64, json.balance, json.updateTime);
    }

    static defaultMeta(address) {
        return new accountMeta(-1, address, "", null,// ,
            0, 0);
    }

    async queryAvatarData() {
        const avatarBase64 = await apiGetMetaAvatar(this.address);
        if (!avatarBase64) {
            console.log("query avatar raw data failed:", this.address);
            return null;
        }

        // console.log("avatarBase64:=>", avatarBase64)
        const isDataUri = avatarBase64 && avatarBase64.startsWith('data:application/octet-stream;base64,');
        const cleanedBase64 = isDataUri ? avatarBase64.slice('data:application/octet-stream;base64,'.length) : avatarBase64;

        this.avatarBase64 = cleanedBase64;
        storeDataToLocalStorage(metaAvatarBlobKey(this.address), cleanedBase64);
        return cleanedBase64;
    }
}

function metaAvatarUrlKey(address) {
    return DBKeyMetaAvatarUrl + address;
}

function metaAvatarBlobKey(address) {
    return DBKeyMetaAvatarBlob + address;
}

function metaDataKey(address) {
    return DBKeyMetaDetails + address;
}

function cacheLoadMeta(address) {
    const key = metaDataKey(address);
    let meta = getDataFromLocalStorage(key);
    if (!meta) {
        return null;
    }
    return accountMeta.fromLocalJson(meta);
}

// return getDataFromLocalStorage(metaDataKey(address))

/*****************************************************************************************
 *
 *                               contract
 *
 * *****************************************************************************************/

class contactItem {
    constructor(address, alias, remark) {
        this.address = address;
        this.alias = alias;
        this.remark = remark;
    }


    static fromJson(json) {
        return new contactItem(json.address, json.alias, json.remark);
    }
}

function contactListKey() {
    return DBKeyAllContactData + getGlobalCurrentAddr();
}


/*****************************************************************************************
 *
 *                               contract
 *
 * *****************************************************************************************/
class combinedContact {
    constructor(meta, contact) {
        this.meta = meta;
        this.contact = contact;
    }
}

function getCombinedContactByAddress(address) {
    return __globalAllCombinedContact.get(address)
}

async function initAllContactWithDetails(forceReload = false) {

    if (__globalAllCombinedContact.size > 0 && !forceReload) {
        return __globalAllCombinedContact;
    }

    __globalAllCombinedContact = new Map();
    let contactList;
    const storedData = localStorage.getItem(contactListKey())
    if (forceReload || !storedData) {
        contactList = await apiLoadContactListFromServer(getGlobalCurrentAddr());
        if (contactList) {
            localStorage.setItem(contactListKey(), JSON.stringify(contactList))
        }
    } else {
        contactList = JSON.parse(storedData);
    }

    if (!contactList) {
        return __globalAllCombinedContact;
    }

    for (const contactData of contactList) {
        const contact = contactItem.fromJson(contactData)
        const address = contact.address
        let meta = cacheLoadMeta(address);
        if (meta) {
            __globalAllCombinedContact.set(address, new combinedContact(meta, contact));
            continue;
        }

        meta = await apiGetAccountMeta(address);
        if (!meta) {
            meta = accountMeta.defaultMeta(address);
        } else {
            meta.avatarBase64 = await meta.queryAvatarData();
        }
        meta.syncToDB();
        __globalAllCombinedContact.set(address, new combinedContact(meta, contact));
    }
    return __globalAllCombinedContact;
}

/*****************************************************************************************
 *
 *                               self details
 *
 * *****************************************************************************************/
class SelfDetails {
    constructor(meta, ethBalance, usdtBalance) {
        this.meta = meta;
        this.ethBalance = ethBalance;
        this.usdeBalance = usdtBalance;
    }
}

function selfDataDBKey() {
    return DBKeySelfDetails + getGlobalCurrentAddr()
}

async function loadSelfDetails(force) {
    const dbKey = selfDataDBKey()
    const storedData = getDataFromLocalStorage(dbKey);
    if (!force && storedData) {
        const meta = accountMeta.fromLocalJson(storedData.meta)
        return new SelfDetails(meta, 0, 0);
    }

    const meta = await apiGetAccountMeta(getGlobalCurrentAddr())
    if (!meta) {
        return null
    }
    const accInfo = new SelfDetails(meta, 0, 0)
    storeDataToLocalStorage(dbKey, accInfo)
    return accInfo;
}

/*****************************************************************************************
 *
 *                               message logic
 *
 * *****************************************************************************************/

class messageTipsItem {
    constructor(address, avatarBase64, nickname, time, description) {
        this.address = address;
        this.avatarBase64 = avatarBase64;
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

    const item_1 = new messageTipsItem("NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg", null, "日本聪", currentDate, "文本消息");
    const item_2 = new messageTipsItem("NJJ5ryLVoNG9Cm9yaPheMQH4tpUYoGyKYXGWNfFqLTFGLP", null, "中本聪", currentDate, "文本消息");
    const item_3 = new messageTipsItem("NJA1fmxxVFRY2XWvcPU41zfxMrjb2iXDzaRW4jSD1gVCFg", null, "V神", twoDaysAgo, "文本消息");

    result.push(item_1);
    result.push(item_2);
    result.push(item_3);

    return result
}

class messageItem {
    constructor(isSelf, avatarBase64, nickname, msgPayload, time) {
        this.isSelf = isSelf;
        this.avatarBase64 = avatarBase64;
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

    const msg_1 = new messageItem(true, null, "中本聪", "早上好", twoDaysAgo);
    const msg_2 = new messageItem(false, null, "日本聪", "您好！很开心和您聊天😊", twoDaysAgo);

    const msg_3 = new messageItem(true, null, "中本聪", "最近项目的进展咋样？", currentDate);

    const msg_4 = new messageItem(false, null, "日本聪", "项目进展顺利，我们在使用新的技术编程", currentDate);

    result.push(msg_1);
    result.push(msg_2);
    result.push(msg_3);
    result.push(msg_4);
    return result;

}