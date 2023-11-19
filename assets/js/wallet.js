// wallet.js

class AllLocalWallet {
    constructor(data = { addresses: [] }) {
        this.createTime = new Date();
        this.addresses = data.addresses || [];
    }

    addWallet(address) {
        this.addresses.push(address);
        this.saveToLocalStorage();
    }

    getWallets() {
        return this.addresses;
    }

    saveToLocalStorage() {
        const dataToStore = JSON.stringify(this);
        localStorage.setItem(DBKeyAllWallets, dataToStore);
    }
}


// 创建一个函数，通过localStorage加载或创建AllLocalWallet对象
function loadOrCreateWallet() {
    const storedWalletString = localStorage.getItem(DBKeyAllWallets);

    let allWallets;
    if (storedWalletString) {
        // 如果已经有存储的数据，则加载
        const storedWalletData = JSON.parse(storedWalletString);
        allWallets = new AllLocalWallet(storedWalletData);
    } else {
        // 如果没有存储的数据，则创建一个新的对象
        allWallets = new AllLocalWallet();
    }

    return allWallets;
}

class EncryptedKeyJSON {
    constructor(address, crypto, id, version) {
        this.Address = address;
        this.Crypto = crypto; // 假设 crypto 是 CryptoJSON 类的实例
        this.ID = id;
        this.Version = version;
    }
}

async function newWallet(password) {
    try {
        const key = generateNewLightSubKey();
        console.log("raw key:", key.toString());

        const passwordBytes = stringToBytes(password);
        const cryptoStruct = await encryptData(key.privateKey, passwordBytes);
        const encryptedKeyJSON = new EncryptedKeyJSON(
            key.AddrStr(),
            cryptoStruct,
            key.ID,
            WalletVer);
        const jsonString = JSON.stringify(encryptedKeyJSON, null, '\t');
        // 存储在本地存储中
        localStorage.setItem(DBKeyWalletAddr+key.AddrStr(), jsonString);
        const allWallets = loadOrCreateWallet();
        allWallets.addWallet(key.AddrStr())
        return jsonString
    } catch (error) {
        console.error("Error:", error);
        throw error; // 抛出异常
    }
}

class CryptoStruct {
    constructor(cipher, cipherText, cipherParams, kdf, kdfParams, mac) {
        this.Cipher = cipher;
        this.CipherText = cipherText;
        this.CipherParams = cipherParams;
        this.KDF = kdf;
        this.KDFParams = kdfParams;
        this.MAC = mac;
    }
}


async function encryptData(privateKey, passwordBytes) {
    const salt = generateSalt(32);
    const derivedKey = await deriveKeyFromPassword(passwordBytes, salt);

    const encryptKey = derivedKey.slice(0, 16);
    const iv = generateSalt(16);

    const encryptedPrivateKey = await encryptPrivateKey(encryptKey, privateKey, iv);

    const lastPiece = derivedKey.slice(16, 32);
    const combinedArray = new Uint8Array([...lastPiece, ...encryptedPrivateKey]);

    const mac = Web3.utils.sha3(combinedArray);

    const scryptParams = {
        n: LightScryptN,
        r: ScryptR,
        p: LightScryptP,
        dklen: ScryptDKLen,
        salt: Buffer.from(salt).toString('hex'),
    };

    const cipherParams = {
        IV: Buffer.from(iv).toString('hex'),
    };

    return new CryptoStruct(
        "aes-128-ctr",
        Buffer.from(encryptedPrivateKey).toString('hex'),
        cipherParams,
        "scrypt",
        scryptParams,
        Buffer.from(mac).toString('hex')
    );
}

function generateSalt(len) {
    const salt = new Uint8Array(len);
    window.crypto.getRandomValues(salt);
    return salt;
}

async function deriveKeyFromPassword(passwordBytes, salt) {
    return new Promise((resolve) => {
        scrypt(passwordBytes, salt, { N: LightScryptN, r: ScryptR, p: LightScryptP, dkLen: ScryptDKLen, encoding: 'binary' }, resolve);
    });
}

async function encryptPrivateKey(key, privateKey, iv) {
    try {
        const importedKey = await importAesKey(key);
        const encrypted = await window.crypto.subtle.encrypt(
            { name: "AES-CTR", counter: iv, length: 128 },
            importedKey,
            privateKey
        );
        return new Uint8Array(encrypted);
    } catch (error) {
        console.error("Encryption Error:", error);
        throw error;
    }
}

async function importAesKey(key) {
    return window.crypto.subtle.importKey("raw", key, { name: "AES-CTR" }, false, ["encrypt", "decrypt"]);
}

class LightSubKey {
    constructor(light, id, address, privateKey) {
        this.Light = light;
        this.ID = id;
        this.Address = address;
        this.privateKey = privateKey;
    }

    AddrStr() {
        // 在这里使用 base58 编码库对 this.Address 进行编码
        const encodedAddress = base58.encode(this.Address);
        // 返回带有前缀的编码后的地址字符串
        return SubAddrPrefix + encodedAddress;
    }

    toString() {
        return JSON.stringify({
            Light: this.Light,
            ID: this.ID,
            Address: this.Address,
            privateKey: this.privateKey
        });
    }
}

function ToSubAddr(addStr){

    if (!addStr.startsWith(SubAddrPrefix)) {
        return { error: "字符串不以NJ开头", result: null };
    }

    const base58Str = addStr.substring(SubAddrPrefix.length);
    const decodedResult = base58.decode(base58Str);

    if (!decodedResult) {
        return { error: "解码失败", result: null };
    }

    return { error: null, result: decodedResult };
}

function generateNewLightSubKey() {
    const keyPair = generateKeyPair();
    const publicKey = keyPair.publicKey;
    const privateKey = keyPair.privateKey;

    const addr = generateSubAddr(publicKey);
    const id = generateUUID();
    return new LightSubKey(true, id, addr, privateKey);
}


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


function generateUUID() {
    // 生成 UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0,
            v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}
// 将字符串转换为字节数组
function stringToBytes(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
}

// 将字节数组转换为字符串
function bytesToString(bytes) {
    const decoder = new TextDecoder();
    return decoder.decode(bytes);
}
// 定义 SubAddressLen
const SubAddressLen = 32;
const  LightScryptN = 4096;
const  LightScryptP = 6;
const ScryptR      = 8;
const ScryptDKLen  = 32;
const SubAddrPrefix = "NJ";
const WalletVer =1;
const  DBKeyWalletAddr = '__key__address';
const  DBKeyAllWallets = '__key__all_wallets__';
