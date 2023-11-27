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
    if (typeof hexString !== 'string') {
        throw new Error('输入不是字符串');
    }

    // 从映射到整数的 hexString 创建一个 ArrayBuffer，然后使用它创建一个 Uint8Array
    const arrayBuffer = new Uint8Array(hexString.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16);
    })).buffer;

    return new Uint8Array(arrayBuffer);
}

function uint8ArrayToHexString(uint8Array) {
    if (!(uint8Array instanceof Uint8Array)) {
        throw new Error('Input is not a Uint8Array');
    }

    return Array.from(uint8Array, byte => ('0' + (byte & 0xFF).toString(16)).slice(-2)).join('');
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

function removeDataFromSessionStorage(key){
    sessionStorage.removeItem(key)
}

function quitFromSession(){
    sessionStorage.clear();
    window.location.href = "/";
}


function storeDataToLocalStorage(key, value){
    localStorage.setItem(key, JSON.stringify(value));
}

function  getDataFromLocalStorage(key){
    const storedValue = localStorage.getItem(key);
    return storedValue ? JSON.parse(storedValue) : null;
}

function resetCache(){
    localStorage.clear();
    window.location.href = "/";
}
function saveDataToDisk(data, fileName){
    const blob = new Blob([data], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
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
const DBKeyLastUsedWallet = '__key_last_used_address__';

const SessionKeyPriKey = '__key_global_private_key__';
const SessionCurWallet = '__key_global_current_wallet__';

const DBKeyAllContactData = '__key__all_contact_data__';
const DBKeyMetaDetails = '__key__meta_details__';
const DBKeyMetaAvatarUrl = '__key__meta_avatar_url__';
const DBKeyMetaAvatarBlob = '__key__meta_avatar_blob__';
// const DBKeyAllCombinedContact = '__key__all_combined_contact__';


const DefaultAvatarUrl = "/assets/logo.png";
