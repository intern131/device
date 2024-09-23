// File: bluetooth.service.ts

import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

declare var bluetoothSerial: any;
declare var cordova: any; // For permissions

@Injectable({
  providedIn: 'root',
})
export class BluetoothService {
  pairedDevices: any[] = []; // Devices connected via the app
  unpairedDevices: any[] = []; // Devices not connected via the app
  bluetoothEnabled: boolean = false; // Track Bluetooth status
  connectedDevice: any = null; // Currently connected device
  connectedDevices: any[] = []; // List of devices connected via the app
  batteryLevel: number | null = null; // Battery level of connected device

  // Subjects for data communication
  private dataReceivedSubject = new Subject<string>();
  dataReceived$ = this.dataReceivedSubject.asObservable();

  constructor() {}

  // Check if Bluetooth is enabled
  async isBluetoothEnabled(): Promise<boolean> {
    return new Promise((resolve) => {
      bluetoothSerial.isEnabled(
        () => {
          console.log('Bluetooth is enabled');
          this.bluetoothEnabled = true;
          resolve(true);
        },
        () => {
          console.error('Bluetooth is not enabled');
          this.bluetoothEnabled = false;
          resolve(false);
        }
      );
    });
  }

  // Enable Bluetooth
  async enableBluetooth(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      bluetoothSerial.enable(
        () => {
          console.log('Bluetooth has been enabled');
          this.bluetoothEnabled = true;
          resolve(true);
        },
        (error: any) => {
          console.error('Error enabling Bluetooth:', error);
          this.bluetoothEnabled = false;
          reject(error);
        }
      );
    });
  }

  // Request Location Permission (Android)
  async requestLocationPermission(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (cordova && cordova.plugins && cordova.plugins.diagnostic) {
        cordova.plugins.diagnostic.requestLocationAuthorization(
          (status: any) => {
            console.log('Location authorization status: ', status);
            resolve();
          },
          (error: any) => {
            console.error('Error requesting location authorization: ', error);
            reject(error);
          },
          cordova.plugins.diagnostic.locationAuthorizationMode.ALWAYS
        );
      } else {
        // If on iOS or not available, resolve immediately
        resolve();
      }
    });
  }

  // Scan for devices
  async scanForDevices(): Promise<void> {
    // Ensure Bluetooth is enabled
    const enabled = await this.isBluetoothEnabled();
    if (!enabled) {
      throw new Error('Bluetooth is not enabled.');
    }

    // Request location permission
    await this.requestLocationPermission();

    // Clear previous lists
    this.pairedDevices = [];
    this.unpairedDevices = [];

    // Scan for paired devices
    const pairedDevices = await this.scanPairedDevices();

    // Scan for unpaired devices
    const unpairedDevices = await this.scanUnpairedDevices();

    // Combine devices
    const discoveredDevices = [...pairedDevices, ...unpairedDevices];

    // Categorize devices
    discoveredDevices.forEach((device) => {
      if (this.connectedDevices.some((d) => d.address === device.address)) {
        // Device has been connected via the app before
        if (!this.pairedDevices.some((d) => d.address === device.address)) {
          this.pairedDevices.push(device);
        }
      } else {
        // Device has not been connected via the app
        if (!this.unpairedDevices.some((d) => d.address === device.address)) {
          this.unpairedDevices.push(device);
        }
      }
    });
  }

  // Scan for paired devices
  async scanPairedDevices(): Promise<any[]> {
    return new Promise((resolve) => {
      bluetoothSerial.list(
        (devices: any[]) => {
          console.log('Paired devices:', devices);
          resolve(devices || []);
        },
        (error: any) => {
          console.error('Error listing paired devices:', error);
          resolve([]);
        }
      );
    });
  }

  // Scan for unpaired devices
  async scanUnpairedDevices(): Promise<any[]> {
    return new Promise((resolve) => {
      bluetoothSerial.discoverUnpaired(
        (devices: any[]) => {
          console.log('Discovered unpaired devices:', devices);
          devices.forEach((device) => {
            console.log(
              `Device Address: ${device.address}, Name: ${device.name}, ID: ${device.id}`
            );
          });
          const deviceMap = new Map<string, any>();
          devices.forEach((device) => {
            if (!deviceMap.has(device.address)) {
              deviceMap.set(device.address, device);
            }
          });
          const uniqueDevices = Array.from(deviceMap.values());
          resolve(uniqueDevices);
        },
        (error: any) => {
          console.error('Error discovering devices:', error);
          resolve([]);
        }
      );
    });
  }

  // Connect to a device
  async connectToDevice(device: any): Promise<void> {
    return new Promise(async (resolve, reject) => {
      // Request Bluetooth connect permission (if necessary)
      await this.requestBluetoothConnectPermission();

      bluetoothSerial.connect(
        device.address,
        () => {
          console.log('Connected to device:', device);
          this.connectedDevice = device;

          // Start data subscription
          this.subscribeToData();

          // Read battery level if supported
          // You may need to implement this based on your device's capabilities
          // this.requestBatteryLevel();

          // Add to connectedDevices if not already present
          if (!this.connectedDevices.some((d) => d.address === device.address)) {
            this.connectedDevices.push(device);
          }

          // Add to paired devices if not already present
          if (!this.pairedDevices.some((d) => d.address === device.address)) {
            this.pairedDevices.push(device);
          }

          // Remove from unpaired devices if present
          this.unpairedDevices = this.unpairedDevices.filter(
            (d) => d.address !== device.address
          );

          resolve();
        },
        (error: any) => {
          console.error('Error connecting to device:', error);
          reject(error);
        }
      );
    });
  }

  // Request Bluetooth Connect Permission (Android 12+)
  async requestBluetoothConnectPermission(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (cordova && cordova.plugins && cordova.plugins.diagnostic) {
        cordova.plugins.diagnostic.requestBluetoothAuthorization(
          (status: any) => {
            console.log('Bluetooth connect authorization status: ', status);
            resolve();
          },
          (error: any) => {
            console.error('Error requesting Bluetooth connect authorization: ', error);
            reject(error);
          }
        );
      } else {
        // If not available, resolve immediately
        resolve();
      }
    });
  }

  // Disconnect from the connected device
  async disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.connectedDevice) {
        // Unsubscribe from data
        this.unsubscribeFromData();

        bluetoothSerial.disconnect(
          () => {
            console.log('Disconnected from device');

            // Remove from connectedDevices
            this.connectedDevices = this.connectedDevices.filter(
              (d) => d.address !== this.connectedDevice.address
            );

            // Reset connectedDevice
            this.connectedDevice = null;

            resolve();
          },
          (error: any) => {
            console.error('Error disconnecting from device:', error);
            reject(error);
          }
        );
      } else {
        console.warn('No device is currently connected.');
        resolve();
      }
    });
  }

  // Send data to the connected device
  async sendData(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.connectedDevice) {
        reject('No device connected.');
        return;
      }

      // Convert data to ArrayBuffer
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(data);

      bluetoothSerial.write(
        dataBuffer.buffer,
        () => {
          console.log('Data sent successfully.');
          resolve();
        },
        (error: any) => {
          console.error('Error sending data:', error);
          reject(error);
        }
      );
    });
  }

  // Subscribe to data received from the device
  subscribeToData(): void {
    // Adjust the delimiter to match what the device uses
    const delimiter = '\n'; // Change if your device uses a different delimiter

    bluetoothSerial.subscribe(
      delimiter,
      (data: string) => {
        console.log('Data received:', data);
        this.dataReceivedSubject.next(data);
      },
      (error: any) => {
        console.error('Error subscribing to data:', error);
      }
    );
  }

  // Unsubscribe from data
  unsubscribeFromData(): void {
    bluetoothSerial.unsubscribe(
      () => {
        console.log('Unsubscribed from data.');
      },
      (error: any) => {
        console.error('Error unsubscribing from data:', error);
      }
    );
  }
}
