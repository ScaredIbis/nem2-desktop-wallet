import {localRead, localSave} from "@/core/utils/utils.ts"
import {
    Account,
    AccountPropertyModification,
    Address,
    Crypto,
    NetworkType,
    PropertyType,
    Transaction,
    PropertyModificationType,
    MosaicId
} from 'nem2-sdk'
import CryptoJS from 'crypto-js'
import {WalletApiRxjs} from "@/core/api/WalletApiRxjs.ts";
import {AccountApiRxjs} from "@/core/api/AccountApiRxjs.ts";
import {NamespaceApiRxjs} from "@/core/api/NamespaceApiRxjs.ts";
import {MultisigApiRxjs} from "@/core/api/MultisigApiRxjs.ts";
import {filterApi} from "@/core/api/filterApi.ts";
import {BlockApiRxjs} from "@/core/api/BlockApiRxjs.ts";
import {formateNemTimestamp} from "@/core/utils/utils.ts";
import {concatAll} from 'rxjs/operators';
import rxjs from 'rxjs'

export const saveLocalWallet = (wallet, encryptObj, index, mnemonicEnCodeObj?) => {
    let localData: any[] = []
    let isExist: boolean = false
    try {
        localData = JSON.parse(localRead('wallets'))
    } catch (e) {
        localData = []
    }
    let saveData = {
        name: wallet.name,
        ciphertext: encryptObj ? encryptObj.ciphertext : localData[index].ciphertext,
        iv: encryptObj ? encryptObj.iv : localData[index].iv,
        networkType: wallet.networkType,
        address: wallet.address,
        publicKey: wallet.publicKey,
        mnemonicEnCodeObj: mnemonicEnCodeObj || wallet.mnemonicEnCodeObj
    }
    let account = wallet
    account = Object.assign(account, saveData)
    for (let i in localData) {
        if (localData[i].address === account.address) {
            localData[i] = saveData
            isExist = true
        }
    }
    if (!isExist) localData.unshift(saveData)
    localSave('wallets', JSON.stringify(localData))
    return account
}

export const getAccountDefault = async (name, account, netType, node?, currentXEM1?, currentXEM2?) => {
    let storeWallet = {}

    const Wallet = new WalletApiRxjs().getWallet(
        name,
        account.privateKey,
        netType,
    )
    storeWallet = {
        name: Wallet.wallet.name,
        address: Wallet.wallet.address['address'],
        networkType: Wallet.wallet.address['networkType'],
        privateKey: Wallet.privateKey,
        publicKey: account.publicKey,
        publicAccount: account.publicAccount,
        mosaics: [],
        wallet: Wallet.wallet,
        password: Wallet.password,
        balance: 0
    }
    if (!node) return storeWallet
    storeWallet = await setWalletMosaic(storeWallet, node, currentXEM1, currentXEM2)
    storeWallet = await setMultisigAccount(storeWallet, node)
    return storeWallet
}

export const setWalletMosaic = async (storeWallet, node, currentXEM1, currentXEM2) => {
    let wallet = storeWallet
    wallet.balance = 0
    wallet.mosaics = []
    await new AccountApiRxjs().getAccountInfo(wallet.address, node).subscribe((accountInfo) => {
        let mosaicList = accountInfo.mosaics
        mosaicList.map((item: any) => {
            item.hex = item.id.toHex()
            if (item.id.toHex() == currentXEM2 || item.id.toHex() == currentXEM1) {
                wallet.balance = item.amount.compact() / 1000000
            }
        })
        wallet.mosaics = mosaicList
    }, () => {
        wallet.balance = 0
        wallet.mosaics = []

    })
    return wallet
}

export const setMultisigAccount = async (storeWallet, node) => {
    let wallet = storeWallet
    wallet.isMultisig = false
    await new AccountApiRxjs().getMultisigAccountInfo(wallet.address, node).subscribe((accountInfo) => {
            wallet.isMultisig = true
        }, (error) => {
            wallet.isMultisig = false
        }
    )
    return wallet
}

export const getNamespaces = async (address, node) => {
    let list = []
    let namespace = {}
    new NamespaceApiRxjs().getNamespacesFromAccount(
        Address.createFromRawAddress(address),
        node
    ).then((namespacesFromAccount) => {
        namespacesFromAccount.result.namespaceList
            .sort((a, b) => {
                return a['namespaceInfo']['depth'] - b['namespaceInfo']['depth']
            }).map((item, index) => {
            if (!namespace.hasOwnProperty(item.namespaceInfo.id.toHex())) {
                namespace[item.namespaceInfo.id.toHex()] = item.namespaceName
            } else {
                return
            }
            let namespaceName = ''
            item.namespaceInfo.levels.map((item, index) => {
                namespaceName += namespace[item.id.toHex()] + '.'
            })
            namespaceName = namespaceName.slice(0, namespaceName.length - 1)
            const newObj = {
                value: namespaceName,
                label: namespaceName,
                alias: item.namespaceInfo.alias,
                levels: item.namespaceInfo.levels.length,
                name: namespaceName,
                duration: item.namespaceInfo.endHeight.compact(),
            }
            list.push(newObj)
        })
    })
    return list
}

export const createRootNamespace = (namespaceName, duration, networkType, maxFee) => {
    return new NamespaceApiRxjs().createdRootNamespace(namespaceName, duration, networkType, maxFee)
}

export const createSubNamespace = (rootNamespaceName, subNamespaceName, networkType, maxFee) => {
    return new NamespaceApiRxjs().createdSubNamespace(subNamespaceName, rootNamespaceName, networkType, maxFee)
}
export const multisigAccountInfo = (address, node) => {
    return new MultisigApiRxjs().getMultisigAccountInfo(address, node).subscribe((multisigInfo) => {
        return multisigInfo
    })
}

export const encryptKey = (data, password) => {
    return Crypto.encrypt(data, password)
}

export const decryptKey = (wallet, password) => {
    let encryptObj = {
        ciphertext: wallet.ciphertext,
        iv: wallet.iv.data ? wallet.iv.data : wallet.iv,
        key: password
    }
    return Crypto.decrypt(encryptObj)
}

export const decryptKeystore = (encryptStr: string) => {
    const words = CryptoJS.enc.Base64.parse(encryptStr)
    const parseStr = words.toString(CryptoJS.enc.Utf8)
    return parseStr
}

//
export const encryptKeystore = (decryptStr: string) => {
    let str = CryptoJS.enc.Utf8.parse(decryptStr)
    str = CryptoJS.enc.Base64.stringify(str)
    return str
}


export const createBondedMultisigTransaction = (transaction: Array<Transaction>, multisigPublickey: string, networkType: NetworkType, account: Account, fee: number) => {
    return new MultisigApiRxjs().bondedMultisigTransaction(networkType, account, fee, multisigPublickey, transaction)
}

export const createCompleteMultisigTransaction = (transaction: Array<Transaction>, multisigPublickey: string, networkType: NetworkType, fee: number) => {
    return new MultisigApiRxjs().completeMultisigTransaction(networkType, fee, multisigPublickey, transaction)
}

export const creatrModifyAccountPropertyTransaction = (propertyType: PropertyType, modifications: Array<any>, networkType: NetworkType, fee: number,) => {
    //address
    if (propertyType === PropertyType.BlockAddress || propertyType === PropertyType.AllowAddress) {
        modifications = modifications.map((item) => {
            return AccountPropertyModification.createForAddress(
                // TODO AFTER SDK COMPLETE  add PropertyModificationType
                PropertyModificationType.Remove,
                Address.createFromRawAddress(item.value)
            )
        })
        return filterApi.creatrModifyAccountPropertyAddressTransaction({
            propertyType,
            modifications,
            networkType,
            fee
        }).then((result) => {
            return result.result.modifyAccountPropertyAddressTransaction
        })
    }
    // entity type
    if (propertyType === PropertyType.BlockTransaction || propertyType === PropertyType.AllowTransaction) {
        modifications = modifications.map((item) => {
            return AccountPropertyModification.createForEntityType(
                // TODO AFTER SDK COMPLETE  add PropertyModificationType
                PropertyModificationType.Remove,
                item.value
            )
        })
        return filterApi.creatrModifyAccountPropertyEntityTypeTransaction({
            propertyType,
            modifications,
            networkType,
            fee
        }).then((result) => {
            return result.result.modifyAccountPropertyEntityTypeTransaction
        })
    }
    // mosaic
    if (propertyType === PropertyType.BlockMosaic || propertyType === PropertyType.AllowMosaic) {
        modifications = modifications.map((item) => {
            // TODO AFTER SDK COMPLETE  add PropertyModificationType
            return AccountPropertyModification.createForMosaic(
                PropertyModificationType.Remove,
                new MosaicId(item.value)
            )
        })
        return filterApi.creatrModifyAccountPropertyMosaicTransaction({
            propertyType,
            modifications,
            networkType,
            fee
        }).then((result) => {
            return result.result.modifyAccountPropertyMosaicTransaction
        })
    }
}

/*  transactionList: pointer of target array  Array
*   node:node   stirng
*   offset: time zone   number
* */

export const getBlockInfoByTransactionList = (transactionList: Array<any>, node: string, offset: number) => {
    const blockHeightList = transactionList.map((item) => {
        const height = item.transactionInfo.height.compact()
        new BlockApiRxjs().getBlockByHeight(node, height).subscribe((info) => {
            if (info) {
                item.time = formateNemTimestamp(info.timestamp.compact(), offset)
            }
            if (item.dialogDetailMap) {
                item.dialogDetailMap.timestamp = formateNemTimestamp(info.timestamp.compact(), offset)
            }
            return
        })
        return item.transactionInfo.height.compact()
    })
}
