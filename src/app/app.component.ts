import { Component, OnInit } from '@angular/core';
import { BluetoothService } from './bluetooth.service';  // Make sure this path is correct
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  //title = 'BluetoothLEApp';
  devices: any[] = [];
  unpairedDevices: any[] = []; // Add array to hold unpaired devices

  constructor(private bluetoothService: BluetoothService) {}

  async ngOnInit() {
    await this.bluetoothService.initializeBluetooth();
    this.scanPairedDevices();
  }

  async scanPairedDevices() {
    try {
      await this.bluetoothService.scanDevices();
      this.devices = this.bluetoothService.devices;
    } catch (error) {
      console.error('Error scanning paired devices:', error);
    }
  }

  async scanUnpairedDevices() {
    try {
      await this.bluetoothService.scanUnpairedDevices();
      this.unpairedDevices = this.bluetoothService.unpairedDevices;
    } catch (error) {
      console.error('Error scanning unpaired devices:', error);
    }
  }

  async connectToDevice(address: string) {
    try {
      await this.bluetoothService.connectToDevice(address);
    } catch (error) {
      console.error('Error connecting to device:', error);
    }
  }

  async disconnect() {
    try {
      await this.bluetoothService.disconnect();
    } catch (error) {
      console.error('Error disconnecting from device:', error);
    }
  }
}
