import * as Keychain from 'react-native-keychain';

export class SecureStorage {
  /**
   * Save a value securely using react-native-keychain
   * @param key Storage key
   * @param value Value to store
   */
  static async setItem(key: string, value: string): Promise<void> {
    try {
      await Keychain.setGenericPassword(key, value, {
        service: `lumenpay_${key}`,
        accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
      });
    } catch (error: any) {
      console.error(`SecureStorage setItem error for key ${key}:`, error);
      throw new Error('Failed to save data securely');
    }
  }

  /**
   * Retrieve a value securely
   * @param key Storage key
   */
  static async getItem(key: string): Promise<string | null> {
    try {
      const credentials = await Keychain.getGenericPassword({
        service: `lumenpay_${key}`,
      });
      if (credentials) {
        return credentials.password;
      }
      return null;
    } catch (error: any) {
      console.error(`SecureStorage getItem error for key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value securely
   * @param key Storage key
   */
  static async deleteItem(key: string): Promise<void> {
    try {
      await Keychain.resetGenericPassword({
        service: `lumenpay_${key}`,
      });
    } catch (error: any) {
      console.error(`SecureStorage deleteItem error for key ${key}:`, error);
    }
  }
}
