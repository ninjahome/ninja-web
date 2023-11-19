// utils.js
function stringToBytes(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

function bytesToString(bytes) {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}

function hexStringToUint8Array(hexString) {
    // 从十六进制字符串创建字节数组
    const arrayBuffer = new Uint8Array(hexString.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    })).buffer;

    return new Uint8Array(arrayBuffer);
}

// 存储数据到sessionStorage
function storeDataToSessionStorage(key, value) {
    sessionStorage.setItem(key, JSON.stringify(value));
}

// 从sessionStorage获取数据
function getDataFromSessionStorage(key) {
    const storedValue = sessionStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : null;
}

function logout() {
    // 清空sessionStorage
    sessionStorage.clear();

    // 其他退出逻辑...
}

// Constants
const SubAddressLen = 32;
const LightScryptN = 4096;
const LightScryptP = 6;
const ScryptR = 8;
const ScryptDKLen = 32;
const SubAddrPrefix = "NJ";
const WalletVer = 1;
const DBKeyWalletAddr = '__key__address';
const DBKeyAllWallets = '__key__all_wallets__';
const SessionKeyPriKey = '__key_global_private_key__';