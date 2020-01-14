import { AppWallet } from './AppWallet'

export class HardwareWallet {
  appWallet: AppWallet
  generationHash: string

  constructor (appWallet: AppWallet, generationHash: string) {
    this.appWallet = appWallet
    this.generationHash = generationHash
  }
}
