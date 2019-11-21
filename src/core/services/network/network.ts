import {
    QueryParams,
    TransactionType,
    NamespaceService,
    NamespaceHttp,
    ChainHttp,
    BlockHttp,
    Transaction,
    MosaicDefinitionTransaction,
    AliasTransaction,
    MosaicAliasTransaction,
    Mosaic,
    Namespace,
    NodeHttp
} from "nem2-sdk"
import {Message} from "@/config/index.ts"
import {AppMosaic, ChainStatus, AppState} from '@/core/model'
import {Store} from 'vuex'

export const getNetworkGenerationHash = async (that: any): Promise<void> => {
    try {
        const block = await new BlockHttp(that.$store.state.account.node).getBlockByHeight(1).toPromise()
        that.$store.commit('SET_IS_NODE_HEALTHY', true)
        that.$Notice.success({
            title: that.$t(Message.NODE_CONNECTION_SUCCEEDED) + ''
        })
        console.log("TCL: block.generationHash", block.generationHash)
        that.$store.commit('SET_GENERATION_HASH', block.generationHash)
    } catch (error) {
        console.error(error)
        that.$Notice.error({
            title: that.$t(Message.NODE_CONNECTION_ERROR) + ''
        })
        that.$store.commit('SET_IS_NODE_HEALTHY', false)
    }
}

/**
 * Retrieves and handle data about cat.currency and eventual cat.harvest
 * In the first block's transactions
 */
export const setCurrentNetworkMosaic = async (store: Store<AppState>) => {
    try {
        const {node} = store.state.account

        const genesisBlockInfoList = await new BlockHttp(node)
            .getBlockTransactions(2, new QueryParams(100))
            .toPromise()
        console.log("TCL: setCurrentNetworkMosaic -> genesisBlockInfoList", genesisBlockInfoList)

        const mosaicDefinitionTx: any[] = genesisBlockInfoList
            .filter(({type}) => type === TransactionType.MOSAIC_DEFINITION)

        if (!mosaicDefinitionTx.length) {
            throw new Error('Did not find the network currency definition transaction')
        }

        const mosaicAliasTx: any[] = genesisBlockInfoList
            .filter(({type}) => type === TransactionType.MOSAIC_ALIAS)

        if (!mosaicAliasTx.length) {
            throw new Error('Did not find the network currency namespace alias transaction')
        }

        const [networkCurrencyAliasTx]: any = mosaicAliasTx
        const [networkMosaicDefinitionTx]: any = mosaicDefinitionTx
        const networkMosaicNamespace = await new NamespaceService(new NamespaceHttp(node))
            .namespace(networkCurrencyAliasTx.namespaceId).toPromise()
        console.log("TCL: setCurrentNetworkMosaic -> networkMosaicNamespace", networkMosaicNamespace)

        store.commit('SET_NETWORK_CURRENCY', {
            hex: networkMosaicDefinitionTx.mosaicId.toHex(),
            divisibility: networkMosaicDefinitionTx.divisibility,
            ticker: networkMosaicNamespace.name.split('.')[1].toUpperCase(),
            name: networkMosaicNamespace.name,
        })

        const [, harvestCurrencyAliasTx]: any | false = mosaicAliasTx.length > 1 ? mosaicAliasTx : false
        const [, harvestMosaicDefinitionTx]: any | false = mosaicAliasTx.length > 1 ? mosaicDefinitionTx : false
        const harvestMosaicNamespace: Namespace | false = mosaicAliasTx.length > 1
            ? await new NamespaceService(new NamespaceHttp(node))
                .namespace(harvestCurrencyAliasTx.namespaceId).toPromise()
            : false

        const appMosaics = [
            AppMosaic.fromGetCurrentNetworkMosaic(networkMosaicDefinitionTx, networkMosaicNamespace)
        ]

        if (harvestCurrencyAliasTx && harvestMosaicNamespace) appMosaics.push(
            AppMosaic.fromGetCurrentNetworkMosaic(harvestMosaicDefinitionTx, harvestMosaicNamespace)
        )
        console.log("TCL: setCurrentNetworkMosaic -> appMosaics", appMosaics)

        store.commit('UPDATE_MOSAICS', appMosaics)
        store.commit('SET_NETWORK_MOSAICS', appMosaics)
    } catch (error) {
        console.log("TCL: setCurrentNetworkMosaic -> error", error)
        store.commit('SET_IS_NODE_HEALTHY', false)
    }
}

export const getCurrentBlockHeight = async (store: Store<AppState>) => {
    try {
        const {node} = store.state.account
        const heightUint = await new ChainHttp(node).getBlockchainHeight().toPromise()
        const height = heightUint.compact()
        console.log("TCL: getCurrentBlockHeight -> height", height)
        store.commit('SET_CHAIN_HEIGHT', height)
        const blockInfo = await new BlockHttp(node).getBlockByHeight(height).toPromise()
        console.log("TCL: getCurrentBlockHeight -> blockInfo", blockInfo)
        store.commit('SET_CHAIN_STATUS', new ChainStatus(blockInfo))
    } catch (error) {
        store.commit('SET_CHAIN_HEIGHT', 0)
        store.commit('SET_IS_NODE_HEALTHY', false)
    }
}

export const getNodeInfo = async (store: Store<AppState>) => {
    const node = store.state.account.node
    const nodeHttp = new NodeHttp(node)
    const nodeInfo = await nodeHttp.getNodeInfo().toPromise()
    store.commit('SET_NODE_NETWORK_TYPE', nodeInfo.networkIdentifier)
}
