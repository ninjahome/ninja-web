// wallet.js

function generateKeyPair() {
    // 生成密钥对
    var keyPair = nacl.sign.keyPair();

    // 获取公钥和私钥
    var publicKey = keyPair.publicKey;
    var privateKey = keyPair.secretKey;

    return { publicKey, privateKey };
}

function generateSubAddr(publicKey) {
    // 将公钥转换为 SubAddr
    var subAddr = new Uint8Array(SubAddressLen);
    subAddr.set(publicKey.subarray(0, SubAddressLen));

    return subAddr;
}

function NewLightSubKey(password) {
    // 生成密钥对
    var keyPair = generateKeyPair();

    // 获取公钥和私钥
    var publicKey = keyPair.publicKey;
    var privateKey = keyPair.privateKey;

    // 将公钥转换为 SubAddr
    var addr = generateSubAddr(publicKey);

    // 生成 UUID
    var id = generateUUID();

    // 创建 Key 对象
    var key = {
        Light: true,
        ID: id,
        Address: addr,
        privateKey: privateKey,
    };

    var hash = Web3.utils.sha3('your data to hash');
    console.log('Hash:', hash);

    var salt = "your_salt";
    var logN = 14; // 或者你选择的参数
    var r = 8; // 或者你选择的参数
    var p = 1; // 或者你选择的参数

    scrypt(password, salt, logN, r, p, 64, function(derivedKey) {
        console.log("scrypt: ",derivedKey);
    });


    return key;
}

function generateUUID() {
    // 生成 UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function encryptData(password){
    var salt = new Uint8Array(32);
    window.crypto.getRandomValues(salt);
    scrypt(password, salt, LightScryptN, ScryptR, LightScryptP, ScryptDKLen, function(derivedKey) {
        console.log("scrypt: ",derivedKey);
    });
}

// 定义 SubAddressLen
const SubAddressLen = 32;
const  LightScryptN = 1 << 12;
const  LightScryptP = 6;
const ScryptR      = 8;
const ScryptDKLen  = 32;