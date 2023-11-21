// crypto.js
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
        salt: uint8ArrayToHexString(salt)
    };

    const cipherParams = {
        IV: uint8ArrayToHexString(iv),
    };

    return new CryptoStruct(
        "aes-128-ctr",
        uint8ArrayToHexString(encryptedPrivateKey),
        cipherParams,
        "scrypt",
        scryptParams,
        mac.substring("0x".length)
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


async function decryptData(cryptoStruct, password) {
    // 首先检查Cipher变量是否等于"aes-128-ctr"
    if (cryptoStruct.Cipher !== "aes-128-ctr") {
        throw new Error("Unsupported cipher");
    }
    // 从 CryptoStruct 中获取所需的信息
    const { CipherText, CipherParams, KDF, KDFParams, MAC } = cryptoStruct;
    const { IV } = CipherParams;

    // 将参数转换为字节数组
    const passwordBytes = stringToBytes(password);
    const cipherTextBytes = hexStringToUint8Array(CipherText);
    const ivBytes = hexStringToUint8Array(IV);

    // 通过口令和盐派生密钥
    const derivedKey = await deriveKeyFromPassword(passwordBytes, hexStringToUint8Array(KDFParams.salt));

    // 检查MAC是否匹配
    const combinedArray = new Uint8Array([...derivedKey.slice(16, 32), ...cipherTextBytes]);
    const calculatedMAC = Web3.utils.sha3(combinedArray).substring("0x".length);
    if (calculatedMAC !== MAC) {
        console.log("calculated:",calculatedMAC,"\t mac", MAC);
        throw new Error("MAC verification failed");
    }

    // 使用派生密钥和IV解密私钥
    const decryptKey = derivedKey.slice(0, 16);
    return await decryptPrivateKey(decryptKey, cipherTextBytes, ivBytes);
}

async function decryptPrivateKey(key, cipherText, iv) {
    try {
        const importedKey = await importAesKey(key);
        const decrypted = await window.crypto.subtle.decrypt(
            { name: "AES-CTR", counter: iv, length: 128 },
            importedKey,
            cipherText
        );
        return new Uint8Array(decrypted);
    } catch (error) {
        console.error("Decryption Error:", error);
        throw error;
    }
}