import {NativeModules, Platform} from 'react-native';
import type {HealthSummary, HealthConnectStatus, PermissionResult} from '../types/health';

const {VitoHealthModule} = NativeModules;

/**
 * Error thrown when the native module is not available
 * (e.g., running on iOS or unsupported device).
 */
export class HealthModuleNotAvailableError extends Error {
  constructor() {
    super('VitoHealthModule is not available on this platform.');
    this.name = 'HealthModuleNotAvailableError';
  }
}

/**
 * Wrapper around the Android Native Module for Health Connect.
 *
 * All methods return Promises. If the native module is not linked
 * (e.g., running on iOS or testing), they throw HealthModuleNotAvailableError.
 */
function guardModule(): void {
  if (!VitoHealthModule || Platform.OS !== 'android') {
    throw new HealthModuleNotAvailableError();
  }
}

/**
 * Check if Health Connect is available on the device.
 */
export function checkAvailability(): Promise<HealthConnectStatus> {
  guardModule();
  return VitoHealthModule.checkAvailability();
}

/**
 * Request Health Connect permissions from the user.
 */
export function requestPermissions(): Promise<PermissionResult> {
  guardModule();
  return VitoHealthModule.requestPermissions();
}

/**
 * Read all health data for today from Health Connect.
 */
export function getHealthData(): Promise<HealthSummary> {
  guardModule();
  return VitoHealthModule.getHealthData();
}

/**
 * Open the Google Play Store to install / update Health Connect.
 */
export function openHealthConnectStore(): Promise<void> {
  guardModule();
  return VitoHealthModule.openHealthConnectStore();
}
