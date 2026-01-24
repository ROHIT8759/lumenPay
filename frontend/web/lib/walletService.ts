












import {
  Keypair,
  Account,
  Horizon,
  TransactionBuilder,
  Networks,
  Operation,
  Transaction,
  Memo,
  Asset
} from '@stellar/stellar-sdk';

const STELLAR_TESTNET_URL = 'https://horizon-testnet.stellar.org';
const STELLAR_PUBLIC_URL = 'https://horizon.stellar.org';


const USDC_ISSUER = process.env.STELLAR_USDC_ISSUER || 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export interface BuildTransactionParams {
  sourcePublicKey: string;
  destinationPublicKey: string;
  amount: string;
  asset: 'native' | 'usdc';
  memo?: string;
}

export interface UnsignedTransaction {
  xdr: string;
  networkPassphrase: string;
  source: string;
  fee: string;
  sequence: string;
}

class NonCustodialWalletService {
  private horizonServer: Horizon.Server;
  private networkPassphrase: string;
  private isTestnet: boolean;

  constructor(isTestnet: boolean = true) {
    this.isTestnet = isTestnet;
    const url = isTestnet ? STELLAR_TESTNET_URL : STELLAR_PUBLIC_URL;
    this.horizonServer = new Horizon.Server(url);
    this.networkPassphrase = isTestnet ? Networks.TESTNET : Networks.PUBLIC;
  }

  


  async getBalance(publicKey: string): Promise<{
    native: string;
    usdc: string;
    error?: string
  }> {
    try {
      const account = await this.horizonServer.accounts().accountId(publicKey).call();

      let nativeBalance = '0';
      let usdcBalance = '0';

      const nativeAsset = account.balances.find((b: any) => b.asset_type === 'native');
      if (nativeAsset) {
        nativeBalance = nativeAsset.balance;
      }

      const usdcAsset = account.balances.find(
        (b: any) => b.asset_type === 'credit_alphanum4' && b.asset_code === 'USDC'
      );
      if (usdcAsset) {
        usdcBalance = usdcAsset.balance;
      }

      return { native: nativeBalance, usdc: usdcBalance };
    } catch (error: any) {
      console.error('Balance fetch error:', error);
      return {
        native: '0',
        usdc: '0',
        error: error.message
      };
    }
  }

  




  async buildPaymentTransaction(params: BuildTransactionParams): Promise<{
    transaction: UnsignedTransaction;
    error?: string
  }> {
    try {
      const { sourcePublicKey, destinationPublicKey, amount, asset, memo } = params;

      
      const sourceAccount = await this.horizonServer
        .accounts()
        .accountId(sourcePublicKey)
        .call();

      const account = new Account(sourceAccount.account_id, sourceAccount.sequence);

      let builder = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase
      });

      if (memo) {
        builder = builder.addMemo(Memo.text(memo));
      }

      
      const operation = asset === 'native'
        ? Operation.payment({
          destination: destinationPublicKey,
          amount: amount,
          asset: Asset.native()
        })
        : Operation.payment({
          destination: destinationPublicKey,
          amount: amount,
          asset: new Asset('USDC', USDC_ISSUER)
        });

      const transaction = builder
        .addOperation(operation)
        .setTimeout(300)
        .build();

      
      return {
        transaction: {
          xdr: transaction.toEnvelope().toXDR('base64'),
          networkPassphrase: this.networkPassphrase,
          source: sourcePublicKey,
          fee: transaction.fee,
          sequence: transaction.sequence,
        }
      };
    } catch (error: any) {
      console.error('Transaction build error:', error);
      return {
        transaction: {
          xdr: '',
          networkPassphrase: this.networkPassphrase,
          source: '',
          fee: '0',
          sequence: '0',
        },
        error: error.message
      };
    }
  }

  




  async submitSignedTransaction(signedXdr: string): Promise<{
    txHash: string;
    success: boolean;
    error?: string
  }> {
    try {
      const transaction = new Transaction(signedXdr, this.networkPassphrase);

      
      if (transaction.signatures.length === 0) {
        return {
          txHash: '',
          success: false,
          error: 'Transaction has no signatures'
        };
      }

      const result = await this.horizonServer.submitTransaction(transaction);

      return {
        txHash: result.hash,
        success: true
      };
    } catch (error: any) {
      console.error('Transaction submission error:', error);
      return {
        txHash: '',
        success: false,
        error: error.response?.data?.extras?.result_codes?.transaction || error.message
      };
    }
  }

  


  async accountExists(publicKey: string): Promise<boolean> {
    try {
      await this.horizonServer.accounts().accountId(publicKey).call();
      return true;
    } catch {
      return false;
    }
  }

  


  async fundTestnetAccount(publicKey: string): Promise<{
    success: boolean;
    error?: string
  }> {
    if (!this.isTestnet) {
      return {
        success: false,
        error: 'Friendbot only available on testnet'
      };
    }

    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`
      );

      if (!response.ok) {
        throw new Error(`Friendbot returned ${response.status}`);
      }

      return { success: true };
    } catch (error: any) {
      console.error('Funding error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  


  async createStellarAccount(publicKey: string): Promise<{
    success: boolean;
    error?: string
  }> {
    try {
      const fundResult = await this.fundTestnetAccount(publicKey);
      if (!fundResult.success) {
        throw new Error(fundResult.error || 'Failed to fund account');
      }

      const exists = await this.accountExists(publicKey);
      if (!exists) {
        throw new Error('Account creation verification failed');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Stellar account creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  


  async getTransactionDetails(txHash: string): Promise<any> {
    try {
      const tx = await this.horizonServer.transactions().transaction(txHash).call();
      return tx;
    } catch (error: any) {
      console.error('Transaction lookup error:', error);
      return null;
    }
  }

  


  isValidPublicKey(publicKey: string): boolean {
    try {
      Keypair.fromPublicKey(publicKey);
      return true;
    } catch {
      return false;
    }
  }

  


  async buildCreateAccountTransaction(
    sourcePublicKey: string,
    newAccountPublicKey: string,
    startingBalance: string = '1'
  ): Promise<{ transaction: UnsignedTransaction; error?: string }> {
    try {
      const sourceAccount = await this.horizonServer
        .accounts()
        .accountId(sourcePublicKey)
        .call();

      const account = new Account(sourceAccount.account_id, sourceAccount.sequence);

      const transaction = new TransactionBuilder(account, {
        fee: '100',
        networkPassphrase: this.networkPassphrase
      })
        .addOperation(Operation.createAccount({
          destination: newAccountPublicKey,
          startingBalance: startingBalance
        }))
        .setTimeout(300)
        .build();

      return {
        transaction: {
          xdr: transaction.toEnvelope().toXDR('base64'),
          networkPassphrase: this.networkPassphrase,
          source: sourcePublicKey,
          fee: transaction.fee,
          sequence: transaction.sequence,
        }
      };
    } catch (error: any) {
      return {
        transaction: {
          xdr: '',
          networkPassphrase: this.networkPassphrase,
          source: '',
          fee: '0',
          sequence: '0',
        },
        error: error.message
      };
    }
  }
}


export const walletService = new NonCustodialWalletService(true);


export { NonCustodialWalletService };
