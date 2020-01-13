import { Transaction, SignedTransaction } from 'nem2-sdk';
import { AppWallet } from './AppWallet';
import { AppState } from './types'
import { Store } from 'vuex'

export class HardwareWallet {
  appWallet: AppWallet;
  generationHash: string;

  constructor (appWallet: AppWallet, generationHash: string) {
    this.appWallet = appWallet;
    this.generationHash = generationHash;
  }
}