import {TransactionType, Address, AggregateTransaction, Transaction} from 'nem2-sdk'
import {AppMosaic, AppWallet, AppState} from '@/core/model'
import {
   getNamespacesFromAddress, getTransactionTypesFromAggregate, mosaicsAmountViewFromAddress
} from '@/core/services'

const txTypeToGetNamespaces = [
  TransactionType.REGISTER_NAMESPACE,
  TransactionType.MOSAIC_ALIAS,
  TransactionType.ADDRESS_ALIAS,
]

const txTypeToSetAccountInfo = [
   TransactionType.LINK_ACCOUNT,
]

/**
 * This module reacts to confirmed transactions
 * By default, the mosaic balances are checked everyTime
 */
export const onTransactionRefreshModule = (store: any) => { // @TODO: check how to type it
  store.registerModule('onTransactionRefresh', onTransactionRefreshModule)

  store.subscribe(async (mutation, state: AppState) => {
    /**
     * Extracts all hexIds from transactions,
     * Add them to store.account.mosaics
     */
    if (mutation.type === 'ADD_CONFIRMED_TRANSACTION') {
     try {
        const {node, networkCurrency} = state.account
        const {address} = state.account.wallet
        const appWallet = new AppWallet(state.account.wallet)
        const accountAddress = Address.createFromRawAddress(address)

        const mosaicAmountViews = await mosaicsAmountViewFromAddress(node, accountAddress)
        const appMosaics = mosaicAmountViews.map(x => AppMosaic.fromMosaicAmountView(x))
        const ownedNetworkCurrency = appMosaics.find(({hex}) => hex === networkCurrency.hex)
        const balance = ownedNetworkCurrency === undefined ? 0 : ownedNetworkCurrency.balance

        appWallet.updateAccountBalance(balance, store)
        store.commit('UPDATE_MOSAICS', appMosaics)

        const transaction: Transaction = mutation.payload[0].rawTx

        const transactionTypes: TransactionType[] = transaction instanceof AggregateTransaction
            ? getTransactionTypesFromAggregate(transaction)
            : [transaction.type]

        if (txTypeToGetNamespaces.some(a => transactionTypes.some(b => b === a))) {
            const namespaces = await getNamespacesFromAddress(address, node)
            store.commit('SET_NAMESPACES', namespaces)
        }

         if (txTypeToSetAccountInfo.some(a => transactionTypes.some(b => b === a))) {
            appWallet.setAccountInfo(store)
         }
     } catch (error) {
        console.error(error)
     }
    }

    if (mutation.type === 'ADD_CONFIRMED_MULTISIG_ACCOUNT_TRANSACTION') {
      try {
         const {node} = state.account
         const {address, transaction} = mutation.payload[0]
         const accountAddress = Address.createFromRawAddress(address)
         const mosaicAmountViews = await mosaicsAmountViewFromAddress(node, accountAddress)
         const appMosaics = mosaicAmountViews.map(x => AppMosaic.fromMosaicAmountView(x))
         store.commit('UPDATE_MULTISIG_ACCOUNT_MOSAICS', appMosaics)
         const txType = transaction.type
 
         if (txTypeToGetNamespaces.includes(txType)) {
            const namespaces = await getNamespacesFromAddress(address, node)
            store.commit('SET_MULTISIG_ACCOUNT_NAMESPACES', namespaces)
         }  
      } catch (error) {
       console.error(error)
      }
     }
  })
}
