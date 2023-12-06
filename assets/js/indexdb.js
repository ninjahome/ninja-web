class IndexedDBManager {
    constructor(databaseName, version) {
        this.databaseName = databaseName;
        this.version = version;
        this.db = null;
    }

    initWalletTable(db) {
        if (!db.objectStoreNames.contains('wallets')) {
            const walletStore = db.createObjectStore('wallets', {keyPath: 'address'});
            walletStore.createIndex('addressIndex', 'address', {unique: true});
        }
    }

    initMetaTable(db) {

    }

    initContactTable(db) {

    }

    initMsgTipTable(db) {

    }

    initMsgItemTable(db) {

    }

    openDatabase() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.databaseName, this.version);

            request.onupgradeneeded = event => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                const newVersion = event.newVersion;
                if (oldVersion < 1) {
                    // 数据库版本为 1 时的迁移逻辑
                    this.initWalletTable(db);
                    this.initMetaTable(db);
                    this.initContactTable(db);
                    this.initMsgTipTable(db);
                    this.initMsgItemTable(db);
                }

            };

            request.onsuccess = event => {
                this.db = event.target.result;
                resolve();
            };

            request.onerror = event => {
                reject(`Error opening database: ${event.target.error}`);
            };
        });
    }

    closeDatabase() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
    }

    addData(storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);
            const request = objectStore.add(data);

            request.onsuccess = () => {
                resolve(`Data added to ${storeName} successfully`);
            };

            request.onerror = event => {
                reject(`Error adding data to ${storeName}: ${event.target.error}`);
            };
        });
    }

    getData(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const objectStore = transaction.objectStore(storeName);

            const request = objectStore.get(id);

            request.onsuccess = event => {
                const result = event.target.result;
                if (result) {
                    resolve(result);
                } else {
                    reject(`No data found with ID ${id} in ${storeName}`);
                }
            };

            request.onerror = event => {
                reject(`Error getting data from ${storeName}: ${event.target.error}`);
            };
        });
    }

    updateData(storeName, id, newData) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);

            const request = objectStore.put({...newData, id});

            request.onsuccess = () => {
                resolve(`Data updated in ${storeName} successfully`);
            };

            request.onerror = event => {
                reject(`Error updating data in ${storeName}: ${event.target.error}`);
            };
        });
    }

    deleteData(storeName, id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const objectStore = transaction.objectStore(storeName);

            const request = objectStore.delete(id);

            request.onsuccess = () => {
                resolve(`Data deleted from ${storeName} successfully`);
            };

            request.onerror = event => {
                reject(`Error deleting data from ${storeName}: ${event.target.error}`);
            };
        });
    }
}

// Example Usage:
const dbManager = new IndexedDBManager('ninja-protocol', 1);

dbManager.openDatabase().then(() => {
    console.log("index db open success");
})
//     const dataToAddToTable1 = { name: 'John Doe', age: 30 };
//     dbManager.addData('table1', dataToAddToTable1)
//         .then(result => console.log(result))
//         .catch(error => console.error(error));
//
//     const idToGetFromTable1 = 1;
//     dbManager.getData('table1', idToGetFromTable1)
//         .then(result => console.log(result))
//         .catch(error => console.error(error));
//
//     const idToUpdateInTable1 = 1;
//     const newDataForTable1 = { name: 'Updated Name', age: 31 };
//     dbManager.updateData('table1', idToUpdateInTable1, newDataForTable1)
//         .then(result => console.log(result))
//         .catch(error => console.error(error));
//
//     const idToDeleteFromTable1 = 1;
//     dbManager.deleteData('table1', idToDeleteFromTable1)
//         .then(result => console.log(result))
//         .catch(error => console.error(error));
// });
