// crypto.js
class CryptoStruct {
    constructor(cipher, cipherText, cipherParams, kdf, kdfParams, mac) {
        this.cipher = cipher;
        this.ciphertext = cipherText;
        this.cipherParams = cipherParams;
        this.kdf = kdf;
        this.kdfParams = kdfParams;
        this.mac = mac;
    }
}

async function encryptData(privateKey, passwordBytes) {
    const salt = generateSalt(32);
    const scryptParams = {
        n: LightScryptN,
        r: ScryptR,
        p: LightScryptP,
        dklen: ScryptDKLen,
        salt: salt
    };

    const derivedKey = await deriveKeyFromPassword(passwordBytes, scryptParams);

    const encryptKey = derivedKey.slice(0, 16);
    const iv = generateSalt(16);

    const encryptedPrivateKey = await encryptPrivateKey(encryptKey, privateKey, iv);

    const lastPiece = derivedKey.slice(16, 32);
    const combinedArray = new Uint8Array([...lastPiece, ...encryptedPrivateKey]);

    const mac = Web3.utils.sha3(combinedArray);

    const cipherParams = {
        iv: uint8ArrayToHexString(iv),
    };

    scryptParams.salt = uint8ArrayToHexString(salt)

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

async function deriveKeyFromPassword(passwordBytes, param) {
    return new Promise((resolve) => {
        scrypt(passwordBytes, param.salt, { N: param.n,
            r: param.r,
            p: param.p,
            dkLen: param.dkLen,
            encoding: 'binary' }, resolve);
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
    if (cryptoStruct.cipher !== "aes-128-ctr") {
        throw new Error("Unsupported cipher");
    }
    // 从 CryptoStruct 中获取所需的信息
    const { ciphertext, cipherParams, kdf, kdfParams, mac } = cryptoStruct;
    const { iv } = cipherParams;

    // 将参数转换为字节数组
    const passwordBytes = stringToBytes(password);
    const cipherTextBytes = hexStringToUint8Array(ciphertext);
    const ivBytes = hexStringToUint8Array(iv);
    kdfParams.salt = hexStringToUint8Array(kdfParams.salt)
    // 通过口令和盐派生密钥
    const derivedKey = await deriveKeyFromPassword(passwordBytes, kdfParams);

    // 检查mac是否匹配
    const combinedArray = new Uint8Array([...derivedKey.slice(16, 32), ...cipherTextBytes]);
    const calculatedMAC = Web3.utils.sha3(combinedArray).substring("0x".length);
    if (calculatedMAC !== mac) {
        console.log("calculated:",calculatedMAC,"\t mac", mac);
        throw new Error("mac verification failed");
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

function GenerateAesKey(peerNjAddr, selfPriKey){
    const edwardsPublicKey = ToSubAddr(peerNjAddr)
    // console.log(uint8ArrayToHexString(edwardsPublicKey));
    // 转换为X25519公钥
    const x25519PublicKey = sodium.crypto_sign_ed25519_pk_to_curve25519(edwardsPublicKey);

    // console.log('X25519公钥:', uint8ArrayToHexString(x25519PublicKey));

    // 转换为X25519私钥
    const x25519PrivateKey = sodium.crypto_sign_ed25519_sk_to_curve25519(Uint8Array.from(selfPriKey));

    // console.log('X25519私钥:', uint8ArrayToHexString(x25519PrivateKey));

    // console.log("aes key is=>",uint8ArrayToHexString(sharedKey));
    return sodium.crypto_scalarmult(x25519PrivateKey, x25519PublicKey);
}

async function AesEncryptData(plainData, key) {
    // Copy the input data to avoid modification
    const plainDataCopy = new Uint8Array(plainData);

    // Copy the key to avoid modification
    const keyBytes = new Uint8Array(key);

    // Generate a random IV
    const iv = crypto.getRandomValues(new Uint8Array(16));
    // const iv = hexStringToUint8Array("24cc1d94babc1afe333b7beab3440ac2");
    // Import key
    const importedKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-CBC" },
        false,
        ["encrypt"]
    );

    // PKCS#7 padding
    const blockSize = 16; // AES block size
    const padding = blockSize - (plainDataCopy.length % blockSize);
    const paddedData = new Uint8Array(plainDataCopy.length + padding);
    paddedData.set(plainDataCopy);
    paddedData.fill(padding, plainDataCopy.length);

    // Encrypt using AES-CBC algorithm
    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-CBC',
            iv: iv,
        },
        importedKey,
        paddedData
    );
    const encryptedBuf = new Uint8Array(encrypted,0, paddedData.length);
    // Combine IV and encrypted data
    const result = new Uint8Array(iv.length + encryptedBuf.length);
    result.set(iv);
    result.set(encryptedBuf, iv.length);
    return result;
}


async function AesDecryptData(ciphertext, key) {
    // Copy the input data to avoid modification
    const ciphertextCopy = new Uint8Array(ciphertext);

    // Copy the key to avoid modification
    const keyBytes = new Uint8Array(key);

    // Extract IV and encrypted data
    const iv = ciphertextCopy.slice(0, 16);
    const encryptedData = ciphertextCopy.slice(16);

    // Import key
    const importedKey = await crypto.subtle.importKey(
        "raw",
        keyBytes,
        { name: "AES-CBC" },
        false,
        ["decrypt"]
    );

    // Decrypt using AES-CBC algorithm
    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-CBC',
            iv: iv,
        },
        importedKey,
        encryptedData
    );
    console.log("encryptedData=>",uint8ArrayToHexString(encryptedData));
    console.log("decrypted=>",uint8ArrayToHexString(new Uint8Array(decrypted)));
    return new Uint8Array(decrypted);
}
