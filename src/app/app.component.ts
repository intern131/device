// File: app.component.ts

import { Component, OnInit } from '@angular/core';
import { BluetoothService } from './bluetooth.service';
import { CommonModule, NgIf, NgFor } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgIf, NgFor, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  bluetoothEnabled: boolean = false;
  pairedDevices: any[] = [];
  unpairedDevices: any[] = [];
  connectedDevice: any = null;
  isScanning: boolean = false;

  // For data communication
  dataToSend: string = '';
  receivedData: string = '';
  dataSubscription: Subscription | null = null;

  // For file selection
  selectedFile: File | null = null;

  // Battery level
  batteryLevel: number | null = null;

  constructor(private bluetoothService: BluetoothService) {}

  ngOnInit() {
    this.checkBluetoothStatus();
  }

  ngOnDestroy() {
    // Unsubscribe from data reception when component is destroyed
    if (this.dataSubscription) {
      this.dataSubscription.unsubscribe();
    }
  }

  async checkBluetoothStatus() {
    this.bluetoothEnabled = await this.bluetoothService.isBluetoothEnabled();
    if (this.bluetoothEnabled) {
      console.log('Bluetooth is enabled');
    } else {
      console.log('Bluetooth is disabled');
    }
  }

  async enableBluetooth() {
    try {
      await this.bluetoothService.enableBluetooth();
      this.bluetoothEnabled = true;
      console.log('Bluetooth enabled');
    } catch (error) {
      console.error('Failed to enable Bluetooth:', error);
    }
  }

  async scanForDevices() {
    if (this.isScanning) {
      console.warn('Already scanning for devices.');
      return;
    }

    this.isScanning = true;
    try {
      await this.bluetoothService.scanForDevices();
      this.pairedDevices = this.bluetoothService.pairedDevices;
      this.unpairedDevices = this.bluetoothService.unpairedDevices;
    } catch (error) {
      console.error('Error scanning for devices:', error);
    } finally {
      this.isScanning = false;
    }
  }

  async connectToDevice(device: any) {
    try {
      await this.bluetoothService.connectToDevice(device);
      this.connectedDevice = device;
      console.log('Connected to device:', this.getDeviceName(device));

      // Subscribe to data reception
      this.dataSubscription = this.bluetoothService.dataReceived$.subscribe(
        (data) => {
          this.onDataReceived(data);
        }
      );

      // Update battery level if applicable
      this.batteryLevel = this.bluetoothService.batteryLevel;

      await this.scanForDevices(); // Update device lists
    } catch (error) {
      console.error('Error connecting to device:', error);
    }
  }

  async disconnect() {
    try {
      await this.bluetoothService.disconnect();
      this.connectedDevice = null;
      console.log('Disconnected from device');

      // Unsubscribe from data reception
      if (this.dataSubscription) {
        this.dataSubscription.unsubscribe();
        this.dataSubscription = null;
      }

      // Reset battery level
      this.batteryLevel = null;

      await this.scanForDevices(); // Update device lists
    } catch (error) {
      console.error('Error disconnecting from device:', error);
    }
  }

  // Handle file selection
  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  // Send data to the device
  async sendData() {
    if (!this.selectedFile) {
      alert('Please select a file to send.');
      return;
    }

    try {
      const fileData = await this.readFileAsText(this.selectedFile);
      await this.bluetoothService.sendData(fileData);
      console.log('Data sent successfully.');
    } catch (error) {
      console.error('Error sending data:', error);
    }
  }

  // Read file as text
  readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = (error) => {
        reject(error);
      };
      reader.readAsText(file);
    });
  }

  // Handle data received from the device
  onDataReceived(data: string) {
    // Append received data to the display area
    this.receivedData += data + '\n';
    console.log('Data received:', data);
  }

  // Get device name with fallback options
  getDeviceName(device: any): string {
    if (device.name && device.name.trim() !== '') {
      return device.name;
    } else if (device.id && device.id.trim() !== '') {
      return device.id;
    } else if (device.address && device.address.trim() !== '') {
      return device.address;
    } else {
      return 'Unnamed Device';
    }
  }

  // TrackBy function
  trackByAddress(index: number, device: any): string {
    return device.address;
  }
}
