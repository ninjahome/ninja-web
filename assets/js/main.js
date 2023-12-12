function togglePanels(button, panelToShow) {
    document.getElementById('messageControlPanel').style.display = 'none';
    document.getElementById('friendControlPanel').style.display = 'none';
    document.getElementById('settingsMenu').style.display = 'none';

    document.getElementById('messageContentArea').style.display = 'none';
    document.getElementById('contactContentArea').style.display = 'none';
    document.getElementById('settingContentArea').style.display = 'none';

    document.getElementById('accountSettingContentArea').style.visibility = 'hidden';

    document.getElementById(panelToShow).style.display = 'block';
    toggleButton(button);
}

function toggleButton(button) {
    const buttons = document.querySelectorAll('.button');
    buttons.forEach(b => b.classList.remove('selected'));

    if (!button) {
        button = buttons[0];
    }
    button.classList.add('selected');
}

function logout() {
    quitFromSession();
}

let selfAccountInfo = null;
let currentPeer = null;

function selfAccountSettings() {
    loadSelfDetails(curWalletObj, true).then(result => {

        document.getElementById('settingContentArea').style.display = 'block';
        document.getElementById('accountSettingContentArea').style.visibility = 'visible';
        if (result.avatarBase64) {
            document.getElementById('avatarImage').src = "data:image/png;base64," + result.avatarBase64;
        } else {
            document.getElementById('avatarImage').src = DefaultAvatarUrl;
        }
        document.getElementById('blockchainAddress').innerText = curWalletObj.address;
        document.getElementById('selfAccountNickname').innerText = result.name;
        document.getElementById('expireDays').innerText = calculateDays(result.balance) + ' 天';
        document.getElementById('ethAddress').innerText = curWalletObj.EthAddrStr();
        document.getElementById('ethBalance').innerText = result.ethBalance + ' ETH';
        document.getElementById('usdtBalance').innerText = result.usdtBalance + ' USDT';
        selfAccountInfo = result;
    }).catch(err => {
        console.log(err)
        showModal("查询账号信息失败:" + err);
    });
}

Handlebars.registerHelper('formatTime', function (time) {
    const currentDate = new Date();
    const messageDate = new Date(time);
    const timeDiff = currentDate - messageDate;

    if (timeDiff > 24 * 60 * 60 * 1000) {
        const day = messageDate.getDate();
        const month = messageDate.getMonth() + 1; // Month is zero-based
        const year = messageDate.getFullYear().toString().slice(-2); // Get last two digits of the year
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    } else {
        const minutes = messageDate.getUTCMinutes();
        const hours = messageDate.getHours();
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    }
});


class IMManager {
    constructor() {
    }

    async newPeerMsg(msgItem) {
        saveNewMsg(msgItem).then(message => {
        });
        const message = await toShowAbleMsgItem(msgItem);
        if (currentPeer === msgItem.from) {
            appendNewMsgNode(message);
        }
        addOrUpdateMsgTipsItem(message.peerAddr, message.msgPayload).then(r => {
        })
    }

    SocketClosed() {
        showModal("聊天链接断开:");
    }

    SocketError(err) {
        showModal("聊天链接异常:" + err);
    }

    SignData(data) {
        return curWalletObj.SignRawData(data);
    }

    AesKeyFromPeer(peer) {
        return curWalletObj.AesKeyFromPeer(peer);
    }

    OnlineResult(err) {
        if (!err) {
            console.log("online success!");
            return;
        }
        showModal("online failed");
    }
}

let cachedMsgTipMap = new Map();
let curWalletObj = null;
let websocketApi = null;
document.addEventListener("DOMContentLoaded", async function () {
    await dbManager.openDatabase();
    checkSessionKeyPriKey();
    window.addEventListener('popstate', function () {
        clearSessionStorage();
    })
    websocketApi = new WSDelegate(curWalletObj.address, new IMManager())

    initModal().then(async response => {
        cachedMsgTipMap = await cacheLoadCachedMsgTipsList(curWalletObj.address);
        refreshMsgTipsList().then(r => {
        });
        loadCombinedContacts(false);
        websocketApi.wsOnline().then(s => {
        });
        initMsgSender();
    });

    togglePanels(null, 'messageControlPanel', 'messageContentArea');
    document.getElementById('msgSearchInput').addEventListener('keyup', function (event) {
        if (event.key === 'Enter') {
            searchAccountMetaByAddress().then(r => {
                showSearchedAccountMeta(r);
            });
        }
    });
});

window.addEventListener('beforeunload', () => {
    dbManager.closeDatabase(); // 在页面卸载前关闭数据库连接
});

function showSearchedAccountMeta(meta) {
    if (!meta) {
        return;
    }

    const popup = document.getElementById('searchedMetaPopupDialog');
    // 显示弹出窗口
    popup.style.display = 'flex';

    if (meta.avatarBase64) {
        document.getElementById("searchedUsrAvatar").src = "data:image/png;base64," + meta.avatarBase64;
    } else {
        document.getElementById("contactAvatarImage").src = DefaultAvatarUrl;
    }

    const expireDays = calculateDays(meta.balance)
    document.getElementById("searchedUsrBasicInfo").innerHTML = `
        <span>昵称：${meta.name}</span>
        <p>地址：${meta.address}</p>
        <p>余额: ${expireDays} 天</p>
    `;

    const buttonRow = document.querySelector("#searchedMetaPopupDialog .user-info-button-row");
    if (meta.address === curWalletObj.address) {
        buttonRow.innerHTML = `
        <button onclick="closePopup()">关闭</button>
    `
        return
    }

    buttonRow.innerHTML = `
        <button onclick="startChatWithFriend('${meta.address}', closePopup)">开始聊天</button>
        <button onclick="closePopup()">关闭</button>
    `
}

// 关闭弹出窗口的函数
function closePopup() {
    const popup = document.getElementById('searchedMetaPopupDialog');
    popup.style.display = 'none';
}

async function searchAccountMetaByAddress() {
    const msgSearchInput = document.getElementById('msgSearchInput');
    const blockchainAddress = msgSearchInput.value.trim();
    msgSearchInput.value = '';
    if (!isBlockchainAddress(blockchainAddress)) {
        showModal("不是有效的Ninja地址");
        return null;
    }
    let meta = await dbManager.getData(IndexedDBManager.META_TABLE_NAME, blockchainAddress);

    reloadMetaFromSrv(blockchainAddress).then(r => {
        showSearchedAccountMeta(r);
    })
    if (!meta) {
        return new accountMeta(-1, blockchainAddress, "", null, 0, 0)
    }
    return meta;
}

function isBlockchainAddress(address) {
    return address.toLowerCase().startsWith('nj');
}

let isComposing = false

function initMsgSender() {
    const messageInput = document.getElementById('messageInput');
    messageInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            if (!event.shiftKey) {
                if (isComposing) {
                    return;
                }
                event.preventDefault();
                sendMessage().then(r => {
                    console.log("send message success");
                });
            }
        }
    });
    messageInput.addEventListener('compositionstart', function (event) {
        isComposing = true;
    });

    messageInput.addEventListener('compositionend', function (event) {
        // const finalInput = event.data;
        isComposing = false;
    });
}

function appendNewMsgNode(message) {
    const messageContainer = document.getElementById('messageContainer');
    const messageTemplate = Handlebars.compile(document.getElementById('messageTemplate').innerHTML);
    messageContainer.innerHTML += messageTemplate({messages: [message]});

    messageContainer.scrollTop = messageContainer.scrollHeight;
}

async function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageText = messageInput.value;
    messageInput.value = '';
    if (messageText.trim() === '') {
        return;
    }
    if (!selfAccountInfo) {
        selfAccountInfo = await loadSelfDetails(curWalletObj, true);
    }

    const payload = new msgPayLoad(MsgMediaTyp.MMTTxt, messageText);
    const msgTime = new Date();
    const storedItem = new storedMsgItem(Math.floor(msgTime.getTime()),
        selfAccountInfo.address, currentPeer, payload, false, selfAccountInfo.address);

    const message = new showAbleMsgItem(true, selfAccountInfo.avatarBase64,
        selfAccountInfo.name, messageText, msgTime, currentPeer);
    appendNewMsgNode(message);

    websocketApi.sendPlainTxt(payload.wrapToWebsocket(), currentPeer, msgTime).then(r => {
        addOrUpdateMsgTipsItem(message.peerAddr, message.msgPayload).then(r => {
        })
        saveNewMsg(storedItem).then(r => {
        });
    });
}

function checkSessionKeyPriKey() {
    const keyData = getDataFromSessionStorage(SessionKeyCurWalletObj);
    if (!keyData) {
        window.location.href = "/";
    }
    curWalletObj = new LightSubKey(keyData.light, keyData.id, keyData.address, Object.values(keyData.privateKey));
    loadSelfDetails(curWalletObj, true).then(r => {
        console.log("load self contact detail success");
        selfAccountInfo = r;
    });
}

// 清空 sessionStorage
function clearSessionStorage() {
    sessionStorage.clear();
    curWalletObj = null;
}

function loadCachedMsgListForAddr(item, address) {
    document.getElementById("messageContentArea").style.display = 'block';
    if (currentPeer) {
        const itemElem = document.querySelector('li[data-address="' + currentPeer + '"]');
        if (itemElem) {
            itemElem.classList.remove('selected');
        }
    }
    item.classList.add('selected');
    currentPeer = address;

    cacheLoadCachedMsgListForAddr(address, curWalletObj.address).then(messages => {
        const messageTemplate = Handlebars.compile(document.getElementById('messageTemplate').innerHTML);
        document.getElementById('messageContainer').innerHTML = messageTemplate({messages});
        document.getElementById('blockchainAddressOfPeer').innerText = address
    })
}


async function refreshMsgTipsList() {
    const source = document.getElementById("messageTipsListTemplate").innerHTML;
    const template = Handlebars.compile(source);
    const messages = await wrapToShowAbleMsgTipsList(cachedMsgTipMap);
    document.getElementById("messageTipsList").innerHTML = template({messages: messages});

    if (currentPeer) {
        const itemElem = document.querySelector('li[data-address="' + currentPeer + '"]');
        itemElem.classList.add('selected');
    }
}

function removeMsgTipsItem(event, address, id) {
    event.stopPropagation();
    cachedMsgTipMap.delete(address);
    removeMsgOfPeer(address, curWalletObj.address).then(r => {
    });
    removeCachedMsgTipsFromDb(id).then(r => {
        refreshMsgTipsList().then(r => {
        });
    });
}

function clearCachedMsg() {
    openDialog(function () {
        cachedMsgTipMap.clear();
        removeMsgOfAccount(curWalletObj.address).then(r => {
            removeMsgTipsOfAccount(curWalletObj.address).then(r => {
                window.location.reload();
            })
        });
    }, "确认要删除当前账号的所有消息吗？");
}

function loadCombinedContacts(force) {
    const address = curWalletObj.address;
    initAllContactWithDetails(address, force).then(friends => {
        const valuesArray = Array.from(friends.values());
        const source = document.getElementById("friendListTemplate").innerHTML;
        const template = Handlebars.compile(source);
        document.getElementById("friendList").innerHTML = template({friends: valuesArray});
        if (force) {
            showModal("好友列表更新成功！");
        }
    }).catch(error => {
        showModal("加载好友列表失败：" + error);
    });
}

let lastSelectedFriendItem = null;

async function fullFillContact(item, address) {
    if (lastSelectedFriendItem) {
        lastSelectedFriendItem.classList.remove('selected');
    }
    item.classList.add('selected');
    lastSelectedFriendItem = item;
    const contactInfo = getCombinedContactByAddress(address)
    if (!contactInfo) {
        return;
    }

    document.getElementById('contactContentArea').style.display = 'flex';
    let meta = contactInfo.meta;
    if (!meta) {
        meta = await reloadMetaFromSrv(address);
        if (!meta) {
            meta = new accountMeta(-1, address, '', null, 0, 0, 0, 0,)
        }
    }
    if (meta.avatarBase64) {
        document.getElementById("contactAvatarImage").src = "data:image/png;base64," + meta.avatarBase64;
        document.getElementById("contact-avatar-" + address).src = "data:image/png;base64," + meta.avatarBase64;
    } else {
        document.getElementById("contactAvatarImage").src = DefaultAvatarUrl;
    }

    const expireDays = calculateDays(meta.balance)
    document.getElementById("contactInfoContainer").innerHTML = `
        <span>昵称：${meta.name}</span>
        <p>地址：${meta.address}</p>
        <p>别名: ${contactInfo.contact.alias}</p>
        <p>备注: ${contactInfo.contact.remark}</p>
        <p>余额: ${expireDays} 天</p>
    `;

    const buttonRow = document.querySelector("#contactContentArea .button-row");
    buttonRow.innerHTML = `
        <button onclick="startChatWithFriend('${meta.address}', null)">开始聊天</button>
        <button onclick="deleteFriend('${meta.address}')">删除好友</button>
    `;
}

async function addOrUpdateMsgTipsItem(address, desc) {
    let msgTipItem = cachedMsgTipMap.get(address);
    if (!msgTipItem) {
        msgTipItem = new messageTipsItem(selfAccountInfo.address, address, new Date(), desc);
        cachedMsgTipMap.set(address, msgTipItem);
    } else {
        msgTipItem.time = new Date();
        msgTipItem.description = desc;
    }

    await refreshMsgTipsList();
    cacheSyncCachedMsgTipsToDb(msgTipItem).then(r => {
    });
}

async function startChatWithFriend(address, callback) {

    await addOrUpdateMsgTipsItem(address, "");

    const btn = document.getElementById("messageButton");
    togglePanels(btn, 'messageControlPanel');
    const liElement = document.querySelector('li[data-address="' + address + '"]');
    loadCachedMsgListForAddr(liElement, address);
    if (callback) {
        callback();
    }
}

function deleteFriend(contact) {
    console.log("start to delete friend:", contact);
}

function exportWallet(keyString, password) {
    saveDataToDisk(keyString, 'ninja_wallet.json');
}

function removeWallet(keyString, password) {
    dbManager.deleteData(IndexedDBManager.WALLET_TABLE_NAME, curWalletObj.address).then(r => {
        window.location.href = '/';
    })
}

function openFileInputForAvatarImg() {
    if (!IsVip(selfAccountInfo)) {
        showModal("只有会员才能操作头像");
        return;
    }
    // 触发文件选择框点击事件
    const fileInput = document.getElementById('avatarImgFileInput');
    fileInput.click();

    // 监听文件选择框的change事件
    fileInput.addEventListener('change', handleFileSelectForAvatar);
}

function handleFileSelectForAvatar(event) {
    const fileInput = event.target;

    if (fileInput.files && fileInput.files[0]) {
        const selectedFile = fileInput.files[0];

        const reader = new FileReader();

        reader.onload = function (e) {
            const img = new Image();
            img.src = e.target.result;

            img.onload = function () {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // 设置 canvas 大小与图片原始大小相同
                canvas.width = img.width;
                canvas.height = img.height;

                // 在 canvas 上绘制原始图片
                ctx.drawImage(img, 0, 0, img.width, img.height);

                // 定义目标文件大小（单位：字节）
                const targetFileSize = 26 * 1024; // 26 KB

                let quality = 0.9; // 初始压缩质量

                while (canvas.toDataURL('image/jpeg', quality).length > targetFileSize) {
                    // 不断降低压缩质量，直到满足目标文件大小
                    quality -= 0.01;
                }
                const base64ImageDataWithPrefix = canvas.toDataURL('image/jpeg', quality);
                postToServer(base64ImageDataWithPrefix);
            };
        };

        reader.readAsDataURL(selectedFile);
    }
}

// 保存压缩后的图片数据
function saveCompressedImage(blob) {
    // 在这里可以处理保存压缩后的图片数据，例如上传到服务器
    console.log('Compressed Image Blob:', blob);

    // 如果需要保存到本地，可以创建一个下载链接
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = 'compressed_image.jpg'; // 你希望的文件名
    downloadLink.click();
}

function postToServer(compressedData) {
    const base64ImageData = compressedData.split(',')[1];
    const item = new UpdateAccount(curWalletObj.address, "", base64ImageData);
    const param = item.raw();
    // saveDataToFile(param, 'raw_data.bin');
    const sig = curWalletObj.SignRawData(param)
    httpRequest(chainData_api_updateAccount, param, false, sig).then(result => {
        console.log("update avatar result:", result);
        showModal("更新成功")
        document.getElementById('avatarImage').src = compressedData;
    }).catch(err => {
        showModal("更新失败:", err.toString());
    })
}

function saveDataToFile(data, fileName) {
    const blob = new Blob([data], {type: 'application/octet-stream'});
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function saveEditingNickname(btnElement) {
    const editBtn = document.getElementById("nickNameEditButton");
    editBtn.style.display = 'block';
    btnElement.style.display = 'none';
    const editInput = document.getElementById("newNickNameForEdit");
    console.log(editInput.value);

    const item = new UpdateAccount(curWalletObj.address, editInput.value, null);
    const param = item.raw();
    const sig = curWalletObj.SignRawData(param)
    httpRequest(chainData_api_updateAccount, param, false, sig).then(result => {
        console.log("update avatar result:", result);
    }).catch(err => {
        showModal("更新失败:", err.toString());
    })

    const element = document.getElementById("selfAccountNickname")
    element.innerHTML = editInput.value;
    const parentElement = editInput.parentNode;
    if (parentElement) {
        parentElement.removeChild(editInput);
    }
}

function startEditingNickname(btnEle) {
    if (!IsVip(selfAccountInfo)) {
        showModal("只有会员才能修改昵称");
        return;
    }

    const element = document.getElementById("selfAccountNickname")
    const saveBtn = document.getElementById("nickNameSaveButton");
    saveBtn.style.display = 'block';
    btnEle.style.display = 'none';
    const input = document.createElement('input');
    input.type = 'text';
    input.id = "newNickNameForEdit";
    input.value = element.textContent;
    element.innerHTML = '';
    element.appendChild(input);
    input.focus();
}