async function initModal() {
    await fetch('/assets/modal.html')
        .then(response => response.text())
        .then(html => {
            // 插入 HTML 内容到页面中
            document.body.insertAdjacentHTML('beforeend', html);
        })
        .catch(error => {
            console.error('Failed to fetch modal.html:', error);
        });
}

/*****************************************************************************************
 *
 *                               tips dialog
 *
 * *****************************************************************************************/
function showModal(message) {
    const modalText = document.getElementById("modalText");
    modalText.innerHTML = message;

    const modal = document.getElementById("myModal");
    modal.style.display = "block";
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById("myModal");
    modal.style.display = "none";
}
/*****************************************************************************************
 *
 *                               common dialog
 *
 * *****************************************************************************************/

let commonDialogCallbackFunction;
function openDialog(callback,message) {
    commonDialogCallbackFunction = callback;
    const dialog = document.getElementById('common-ok-dialog');
    const dialogMessage = document.getElementById('dialogMessage');
    dialogMessage.innerText = message;
    dialog.style.display = 'block';
}

function closeDialog() {
    const dialog = document.getElementById('common-ok-dialog');
    dialog.style.display = 'none';
    commonDialogCallbackFunction = null;
}

function executeCallback() {
    if (typeof commonDialogCallbackFunction === 'function') {
        // 在这里执行回调函数
        commonDialogCallbackFunction();
    }

    // 关闭对话框
    closeDialog();
}


/*****************************************************************************************
 *
 *                               password dialog
 *
 * *****************************************************************************************/
let passwordDialogCallBackFunction;
function openPasswordDialog(callback) {
    passwordDialogCallBackFunction = callback;
    clearErrorText();
    document.getElementById('passwordInput').value = '';
    document.getElementById('passwordDialog').style.display = 'block';
}

function closePasswordDialog() {
    passwordDialogCallBackFunction = null;
    document.getElementById('passwordDialog').style.display = 'none';
    document.getElementById('passwordInput').value = '';
    clearErrorText();
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

async function openCurrentWallet() {

    const password = document.getElementById('passwordInput').value;

    if (password.length === 0) {
        showError('密码不能为空');
        return;
    }

    const wallet = await dbManager.getData(IndexedDBManager.WALLET_TABLE_NAME,curWalletObj.address);
    if (!wallet){
        showError('加载钱包信息失败：' + curWalletObj.address);
        return
    }

    if (typeof passwordDialogCallBackFunction !== 'function') {
        // 在这里执行回调函数
        return;
    }
    getEncryptedKeyJSON(wallet.jsonStr, password).then(() => {
        clearErrorText();
        passwordDialogCallBackFunction(wallet.jsonStr, password);
        closePasswordDialog();

    }).catch((error) => {
        showError('密码错误，请重新输入:' + error);
    });
}
