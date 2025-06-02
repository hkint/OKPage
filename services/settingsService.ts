// okpage/services/settingsService.ts

/**
 * Saves a key-value pair to chrome.storage.sync.
 * @param key The key for the setting.
 * @param value The value of the setting.
 * @returns A promise that resolves when the setting is saved, or rejects on error.
 */
export function saveSetting<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!(chrome && chrome.storage && chrome.storage.sync)) {
      const errMessage = "chrome.storage.sync is not available.";
      console.error(errMessage);
      reject(new Error(errMessage));
      return;
    }
    chrome.storage.sync.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.error(`Error saving setting '${key}':`, chrome.runtime.lastError.message);
        reject(chrome.runtime.lastError);
      } else {
        // console.log(`Setting '${key}' saved successfully.`); // Optional: reduce console noise
        resolve();
      }
    });
  });
}

/**
 * Loads a setting from chrome.storage.sync.
 * @param key The key of the setting to load.
 * @param defaultValue The default value to return if the key is not found.
 * @returns A promise that resolves with the loaded value or the default value.
 */
export function loadSetting<T>(key: string, defaultValue: T): Promise<T> {
  return new Promise((resolve) => {
    if (!(chrome && chrome.storage && chrome.storage.sync)) {
      console.warn("chrome.storage.sync is not available. Returning default value for key:", key);
      resolve(defaultValue);
      return;
    }
    chrome.storage.sync.get([key], (result) => {
      if (chrome.runtime.lastError) {
        console.error(`Error loading setting '${key}':`, chrome.runtime.lastError.message);
        resolve(defaultValue);
      } else {
        resolve(result[key] === undefined ? defaultValue : result[key] as T);
      }
    });
  });
}

/**
 * Loads multiple settings from chrome.storage.sync.
 * Keys that are not found will not be present in the result object.
 * @param keys An array of keys for the settings to load.
 * @returns A promise that resolves with an object containing the loaded key-value pairs.
 */
export function loadMultipleSettings(keys: string[]): Promise<{ [key: string]: any }> {
  return new Promise((resolve) => {
    if (!(chrome && chrome.storage && chrome.storage.sync)) {
      console.warn("chrome.storage.sync is not available. Returning empty object.");
      resolve({});
      return;
    }
    chrome.storage.sync.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error loading multiple settings:', chrome.runtime.lastError.message);
        resolve({}); // Return empty object on error
      } else {
        resolve(result);
      }
    });
  });
}

/**
 * Removes a setting from chrome.storage.sync.
 * @param key The key of the setting to remove.
 * @returns A promise that resolves when the setting is removed, or rejects on error.
 */
export function removeSetting(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!(chrome && chrome.storage && chrome.storage.sync)) {
      const errMessage = "chrome.storage.sync is not available.";
      console.error(errMessage);
      reject(new Error(errMessage));
      return;
    }
    chrome.storage.sync.remove(key, () => {
      if (chrome.runtime.lastError) {
        console.error(`Error removing setting '${key}':`, chrome.runtime.lastError.message);
        reject(chrome.runtime.lastError);
      } else {
        // console.log(`Setting '${key}' removed successfully.`); // Optional: reduce console noise
        resolve();
      }
    });
  });
}
