let __globalAllCombinedContact = new Map();

/*****************************************************************************************
 *
 *                               account meta
 *
 * *****************************************************************************************/
class accountMeta {
    constructor(nonce, address, name, avatarBase64, balance, updateTime, ethBalance, usdtBalance) {
        this.nonce = nonce;
        this.address = address;
        this.name = name;
        this.avatarBase64 = avatarBase64;
        this.balance = balance;
        this.updateTime = updateTime;
        this.ethBalance = ethBalance;
        this.usdtBalance = usdtBalance;
    }
}

async function queryAvatarData(address) {
    const avatarBase64 = await apiGetMetaAvatar(address);
    if (!avatarBase64) {
        console.log("query avatar raw data failed:", address);
        return null;
    }
    const isDataUri = avatarBase64 && avatarBase64.startsWith('data:application/octet-stream;base64,');
    return isDataUri ? avatarBase64.slice('data:application/octet-stream;base64,'.length) : avatarBase64;
}

async function reloadMetaFromSrv(address) {
    const meta = await apiGetAccountMeta(address)
    if (!meta) {
        return null;
    }
    meta.avatarBase64 = await queryAvatarData(address);
    await dbManager.addOrUpdateData(IndexedDBManager.META_TABLE_NAME, meta);
    return meta;
}


/*****************************************************************************************
 *
 *                               contract
 *
 * *****************************************************************************************/

class contactItem {
    constructor(owner, address, alias, remark) {
        this.owner = owner;
        this.address = address;
        this.alias = alias;
        this.remark = remark;
    }
}

class combinedContact {
    constructor(meta, contact) {
        this.meta = meta;
        this.contact = contact;
    }
}

function getCombinedContactByAddress(address) {
    return __globalAllCombinedContact.get(address)
}

async function initAllContactWithDetails(curAddr, forceReload = false) {

    if (__globalAllCombinedContact.size > 0 && !forceReload) {
        return __globalAllCombinedContact;
    }

    __globalAllCombinedContact = new Map();

    let contactList = await dbManager.queryData(IndexedDBManager.CONTACT_TABLE_NAME, (data) => {
        return data.owner === curAddr;
    });

    if (forceReload || contactList.length === 0) {
        contactList = await apiLoadContactListFromServer(curAddr);
        if (contactList) {
            await dbManager.clearAndFillWithCondition(IndexedDBManager.CONTACT_TABLE_NAME, contactList, (data) => {
                return data.owner === curAddr;
            })
        }
    }

    if (!contactList) {
        return __globalAllCombinedContact;
    }

    for (const contact of contactList) {
        const address = contact.address
        let meta = await dbManager.getData(IndexedDBManager.META_TABLE_NAME, address);
        const cc = new combinedContact(meta, contact);
        __globalAllCombinedContact.set(address, cc);
        if (!meta) {
            reloadMetaFromSrv(address).then(r => {
                console.log("reload meta from server success", address);
                cc.meta = r;
            })
        }
    }

    return __globalAllCombinedContact;
}

/*****************************************************************************************
 *
 *                               self details
 *
 * *****************************************************************************************/

async function loadSelfDetails(walletObj, force) {
    const address = walletObj.address
    let meta = await dbManager.getData(IndexedDBManager.META_TABLE_NAME, address)
    if (!force && meta) {
        return meta;
    }

    meta = await apiGetAccountMeta(address)
    if (!meta) {
        return new accountMeta(-1, address, "",
            null, 0, 0, 0.0, 0.0);
    }
    meta.avatarBase64 = await queryAvatarData(address);
    const eth = await apiWeb3EthBalance(walletObj.EthAddrStr());
    meta.ethBalance = eth[0];
    meta.usdtBalance = eth[1];

    await dbManager.addOrUpdateData(IndexedDBManager.META_TABLE_NAME, meta);
    return meta;
}

/*****************************************************************************************
 *
 *                               message tips
 *
 * *****************************************************************************************/
class messageTipsToShow {
    constructor(tips, meta) {
        this.tips = tips;
        this.meta = meta;
    }
}

class messageTipsItem {
    constructor(owner, peer, time, description) {
        this.owner = owner;
        this.peer = peer;
        this.time = time;
        this.description = description;
    }
}

async function cacheSyncCachedMsgTipsToDb(item) {
    const result = await dbManager.addOrUpdateData(IndexedDBManager.MSG_TIP_TABLE_NAME, item);
    item.id = result.id
}

async function removeCachedMsgTipsFromDb(id) {
    await dbManager.deleteData(IndexedDBManager.MSG_TIP_TABLE_NAME, id);
}

async function removeMsgTipsOfAccount(owner){
    await dbManager.deleteDataWithCondition(IndexedDBManager.MSG_TIP_TABLE_NAME, data=>data.owner === owner);
}

async function cacheLoadCachedMsgTipsList(address) {
    const result = new Map();

    const arrays = await dbManager.queryData(IndexedDBManager.MSG_TIP_TABLE_NAME, (data) => {
        return data.owner === address;
    });

    for (const item of arrays) {
        result.set(item.peer, item);
    }

    return result;
}

async function wrapToShowAbleMsgTipsList(data) {
    const result = [];
    for (const [key, value] of data) {
        const meta = await dbManager.getData(IndexedDBManager.META_TABLE_NAME, key);
        const item = new messageTipsToShow(value, meta);
        result.push(item);
    }
    result.sort((a, b) => b.tips.time - a.tips.time);
    return result;
}

/*****************************************************************************************
 *
 *                               message item;
 *
 * *****************************************************************************************/

class showAbleMsgItem {
    constructor(isSelf, avatarBase64, nickname, msgPayload, time, peer) {
        this.isSelf = isSelf;
        this.avatarBase64 = avatarBase64;
        this.nickname = nickname;
        this.msgPayload = msgPayload;
        this.time = time;
        this.peerAddr = peer;
    }
}

class msgPayLoad {
    constructor(typ, txt, data) {
        this.typ = typ;
        this.txt = txt;
        this.data = data;
    }

    wrapToWebsocket() {
        return wrapWithType(MsgMediaTyp.MMTTxt, {txt: this.txt});
    }
}

class storedMsgItem {

    constructor(msgId, from, to, payload, isGrp, owner) {
        this.msgId = msgId;
        this.from = from;
        this.to = to;
        this.payload = payload;
        this.isGrp = isGrp;
        this.owner = owner;
    }
}

async function toShowAbleMsgItem(msg) {
    let meta = await findProperMeta(msg.from);
    const isSelf = msg.from === msg.owner;
    const peerAddr = isSelf ? msg.to : msg.from;
    return new showAbleMsgItem(isSelf, meta.avatar, meta.name,
        msg.payload.txt, new Date(msg.msgId), peerAddr);
}

async function saveNewMsg(item) {
    dbManager.addData(IndexedDBManager.MESSAGE_TABLE_NAME, item).then(id => {
        item.id = id;
    });
}

async function cacheLoadCachedMsgListForAddr(address, owner) {

    const items = await dbManager.queryData(IndexedDBManager.MESSAGE_TABLE_NAME, (data) => {
        return data.owner === owner;
    })
    if (items.length === 0) {
        return [];
    }

    const showAble = [];
    for (const msg of items) {
        const item = await toShowAbleMsgItem(msg);
        showAble.push(item);
    }

    showAble.sort((a, b) => a.time - b.time);
    return showAble;
}

async function removeMsgOfPeer(address, owner) {
    await dbManager.deleteDataWithCondition(IndexedDBManager.MESSAGE_TABLE_NAME, data => {
        return data.owner === owner && (data.from === address || data.to === address)
    });
}

async function removeMsgOfAccount(owner){
    await dbManager.deleteDataWithCondition(IndexedDBManager.MESSAGE_TABLE_NAME, data => {
        return data.owner === owner
    });
}

async function findProperMeta(address) {
    const contact = getCombinedContactByAddress(address);
    let name = ""
    let avatar = null;
    if (!contact) {
        let meta = await dbManager.getData(IndexedDBManager.META_TABLE_NAME, address);
        if (!meta) {
            meta = await reloadMetaFromSrv(address);
        }
        if (!meta) {
            return {name, avatar};
        }
        name = meta.name;
        avatar = meta.avatarBase64;
        return {name, avatar};
    }

    name = contact.alias ?? (contact.meta ? contact.meta.name : "");
    avatar = contact.meta ? (contact.meta.avatarBase64 ?? null) : null;
    return {name, avatar};
}