import { Injectable } from '@angular/core';
import { Plugins } from '@capacitor/core';

declare var bluetoothSerial: any;

@Injectable({
  providedIn: 'root',
})
export class BluetoothService {
  devices: any[] = [];
  unpairedDevices: any[] = []; // Array to hold unpaired devices

  constructor() {}

  // Initialize Bluetooth
  async initializeBluetooth() {
    try {
      bluetoothSerial.isEnabled(
        () => {
          console.log('Bluetooth is enabled');
        },
        () => {
          console.error('Bluetooth is not enabled');
          bluetoothSerial.enable(); // Request user to enable Bluetooth
        }
      );
    } catch (error) {
      console.error('Error initializing Bluetooth:', error);
    }
  }

  // Scan for Classic Bluetooth devices
  async scanDevices() {
    this.devices = [];
    try {
      bluetoothSerial.list(
        (devices: any[]) => {
          devices.forEach(device => {
            console.log('Device found:', JSON.stringify(device)); // Log each device
            this.devices.push(device); // Store the device object
          });
          console.log('Devices found:', JSON.stringify(this.devices)); // Log full device array
        },
        (error: any) => {
          console.error('Error scanning devices:', error);
        }
      );
    } catch (error) {
      console.error('Error scanning devices:', error);
    }
  }

  // Scan for unpaired Bluetooth devices
  async scanUnpairedDevices() {
    this.unpairedDevices = []; // Clear the array before scanning
    try {
      bluetoothSerial.discoverUnpaired(
        (devices: any[]) => {
          if (devices && devices.length) {
            devices.forEach(device => {
              console.log('Unpaired device found:', JSON.stringify(device));
              this.unpairedDevices.push(device); // Store unpaired device object
            });
            console.log('Unpaired devices found:', JSON.stringify(this.unpairedDevices));
          } else {
            console.log('No unpaired devices found.');
          }
        },
        (error: any) => {
          console.error('Error discovering unpaired devices:', error);
        }
      );
    } catch (error) {
      console.error('Error discovering unpaired devices:', error);
    }
  }

  // Connect to a device
  async connectToDevice(address: string) {
    try {
      bluetoothSerial.connect(
        address,
        () => {
          console.log('Connected to device');
        },
        (error: any) => {
          console.error('Error connecting to device:', error);
        }
      );
    } catch (error) {
      console.error('Error connecting to device:', error);
    }
  }

  // Disconnect from a device
  async disconnect() {
    try {
      bluetoothSerial.disconnect(
        () => {
          console.log('Disconnected from device');
        },
        (error: any) => {
          console.error('Error disconnecting from device:', error);
        }
      );
    } catch (error) {
      console.error('Error during disconnect:', error);
    }
  }
}
