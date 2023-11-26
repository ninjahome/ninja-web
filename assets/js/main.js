function togglePanels(button, panelToShow, contentToShow) {
    document.getElementById('messageControlPanel').style.display = 'none';
    document.getElementById('friendControlPanel').style.display = 'none';
    document.getElementById('settingsMenu').style.display = 'none';

    document.getElementById('messageContentArea').style.display = 'none';
    document.getElementById('contactContentAreaBackGrd').style.display = 'none';
    document.getElementById('settingContentArea').style.display = 'none';

    document.getElementById('accountSettingContentArea').style.visibility = 'hidden';
    document.getElementById('contactContentArea').style.visibility = 'hidden';

    document.getElementById(panelToShow).style.display = 'block';
    document.getElementById(contentToShow).style.display = 'block';
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

function clearCallLocalCache(){
    openDialog(resetCache,"该操作请清空所有数据，包括账号，请确保账号已经保存");
}

function accountSetting() {
    document.getElementById('accountSettingContentArea').style.visibility = 'visible';
    document.getElementById('avatarImage').src = '/assets/logo.png';
    document.getElementById('blockchainAddress').innerText = '实际的区块链地址';
    document.getElementById('nickname').innerText = '实际的昵称';
    document.getElementById('ethBalance').innerText = '实际的ETH余额'; // 例如：'0.00 ETH'
    document.getElementById('usdtBalance').innerText = '实际的USDT余额';
}

Handlebars.registerHelper('formatTime', function (time) {
    const currentDate = new Date();
    const messageDate = new Date(time);
    const timeDiff = currentDate - messageDate;

    if (timeDiff > 24 * 60 * 60 * 1000) {
        // If the time difference is more than 24 hours, use DD/MM/YY format
        const day = messageDate.getDate();
        const month = messageDate.getMonth() + 1; // Month is zero-based
        const year = messageDate.getFullYear().toString().slice(-2); // Get last two digits of the year
        return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
    } else {
        // Otherwise, use MM:SS format
        const minutes = messageDate.getUTCMinutes();
        const seconds = messageDate.getSeconds();
        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }
});


let privateKey = null;
document.addEventListener("DOMContentLoaded", function () {
    checkSessionKeyPriKey();
    window.addEventListener('popstate', function () {
        clearSessionStorage();
    })

    initModal().then(response =>{
        loadCachedMsgTipsList();
        loadCachedFriendList();
    });

    addItemColorChangeAction();
    togglePanels(null, 'messageControlPanel', 'messageContentArea');
});

function addItemColorChangeAction() {
    const messageItems = document.querySelectorAll('.messageTipsItem');
    messageItems.forEach(item => {
        item.addEventListener('click', () => {
            messageItems.forEach(otherItem => otherItem.classList.remove('selected'));
            item.classList.add('selected');
        });
    });

    const friendListItem = document.querySelectorAll('.friendListItem');
    friendListItem.forEach(item => {
        item.addEventListener('click', () => {
            friendListItem.forEach(otherItem => otherItem.classList.remove('selected'));
            item.classList.add('selected');
        });
    });
}

function checkSessionKeyPriKey() {
    privateKey = getDataFromSessionStorage(SessionKeyPriKey);

    if (!privateKey) {
        window.location.href = "/";
    }
}

// 清空 sessionStorage
function clearSessionStorage() {
    sessionStorage.clear();
    privateKey = null;
}

function openExportDialog(opType) {
    clearErrorText();
    document.getElementById('passwordInput').value = '';
    document.getElementById('operationType').value = opType;
    document.getElementById('passwordDialog').style.display = 'block';
}

function closeExportDialog() {
    document.getElementById('passwordDialog').style.display = 'none';
    document.getElementById('operationType').value = '';
    document.getElementById('passwordInput').value = '';
    clearErrorText();
}

function validatePassword() {
    const password = document.getElementById('passwordInput').value;
    const operationType = document.getElementById('operationType').value;

    if (password.length === 0) {
        showError('密码不能为空');
        return;
    }

    const keyString = localStorage.getItem(DBKeyWalletAddr + privateKey.address);
    if (!keyString) {
        showError('加载钱包信息失败：' + privateKey.address);
        return
    }

    getEncryptedKeyJSON(keyString, password).then(() => {
        clearErrorText();

        if (operationType === 'export') {
            saveDataToDisk(keyString, 'ninja_wallet.json');
        } else if (operationType === 'delete') {
            removeKeyItem(privateKey.address);
            window.location.href = '/';
        }

        closeExportDialog();

    }).catch((error) => {
        showError('密码错误，请重新输入:' + error);
    });
}

function showError(message) {
    const errorText = document.getElementById('errorText');
    errorText.innerText = message;
    errorText.style.display = 'block';
}

function clearErrorText() {
    const errorText = document.getElementById('errorText');
    errorText.innerText = ''; // 清空错误信息
    errorText.style.display = 'none'; // 隐藏错误提示
}

function loadCachedMsgListForAddr(address) {

    cacheLoadCachedMsgListForAddr(address).then(messages => {
        const messageTemplate = Handlebars.compile(document.getElementById('messageTemplate').innerHTML);
        document.getElementById('messageContainer').innerHTML = messageTemplate({messages});
    }).catch(error => {
        showModal("加载好友列表失败:" + error);
    });
}


function loadCachedMsgTipsList() {
    const source = document.getElementById("messageTipsListTemplate").innerHTML;

    const template = Handlebars.compile(source);

    const messages = cacheLoadCachedMsgTipsList()
    document.getElementById("messageTipsList").innerHTML = template({messages: messages});
}

function clearCachedMsg() {
}

function renderFriendList(friendsInfos) {
    const source = document.getElementById("friendListTemplate").innerHTML;
    const template = Handlebars.compile(source);
    document.getElementById("friendList").innerHTML = template({friends: friendsInfos});
}

function loadCachedFriendList() {
    const friends = cacheLoadCachedFriedList();
    renderFriendList(friends);
    apiLoadFriendIDs(privateKey.address).then(newResult => {
        renderFriendList(newResult);
    }).catch(error => {
        showModal("加载好友列表失败：" + error);
    });
}

function fullFillContact(contactInfo) {
    document.getElementById('contactContentArea').style.visibility = 'visible';
    // const contactInfo = cacheLoadContactDetails(address);
    document.getElementById("contactAvatarImage").src = contactInfo.avatarUrl;
    document.getElementById("contactInfoContainer").innerHTML = `
        <span>昵称：${contactInfo.nickname}</span>
        <p>地址：${contactInfo.address}</p>
        <p>别名: ${contactInfo.alias}</p>
        <p>备注: ${contactInfo.demo}</p>
    `;

    const buttonRow = document.querySelector("#contactContentArea .button-row");
    buttonRow.innerHTML = `
        <button onclick="startChatWithFriend('${contactInfo.address}')">开始聊天</button>
        <button onclick="deleteFriend('${address}')">删除好友</button>
    `;
}

function startChatWithFriend(friendAddress) {
    console.log("start to chat with friend:", friendAddress);
}

function deleteFriend(friendAddress) {
    console.log("start to delete friend:", friendAddress);
}