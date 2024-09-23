// File: MainActivity.java
package com.example.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothManager;
import android.bluetooth.BluetoothServerSocket;
import android.bluetooth.BluetoothSocket;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.widget.Toast;

import com.getcapacitor.BridgeActivity;

import androidx.annotation.NonNull;
import androidx.annotation.RequiresApi;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.UUID;

public class MainActivity extends BridgeActivity {

  private static final int REQUEST_PERMISSIONS = 1;
  private static final int REQUEST_ENABLE_BLUETOOTH = 2;

  private static final String TAG = "MainActivity";

  private BluetoothAdapter bluetoothAdapter;
  private AcceptThread acceptThread;

  // UUID for SPP (Serial Port Profile)
  private static final UUID MY_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Request necessary permissions at runtime
    requestPermissionsIfNecessary();
  }

  private void initializeBluetooth() {
    BluetoothManager bluetoothManager = (BluetoothManager) getSystemService(BLUETOOTH_SERVICE);
    if (bluetoothManager != null) {
      bluetoothAdapter = bluetoothManager.getAdapter();
      if (bluetoothAdapter != null) {
        if (!bluetoothAdapter.isEnabled()) {
          Intent enableBtIntent = new Intent(BluetoothAdapter.ACTION_REQUEST_ENABLE);
          if (ActivityCompat.checkSelfPermission(this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
            // TODO: Consider calling
            //    ActivityCompat#requestPermissions
            // here to request the missing permissions, and then overriding
            //   public void onRequestPermissionsResult(int requestCode, String[] permissions,
            //                                          int[] grantResults)
            // to handle the case where the user grants the permission. See the documentation
            // for ActivityCompat#requestPermissions for more details.
            return;
          }
          startActivityForResult(enableBtIntent, REQUEST_ENABLE_BLUETOOTH);
        } else {
          startServer();
        }
      } else {
        Toast.makeText(this, "Bluetooth not supported on this device", Toast.LENGTH_LONG).show();
      }
    } else {
      Toast.makeText(this, "Bluetooth Manager not available", Toast.LENGTH_LONG).show();
    }
  }

  private void startServer() {
    acceptThread = new AcceptThread();
    acceptThread.start();
    Toast.makeText(this, "Bluetooth server started", Toast.LENGTH_SHORT).show();
  }

  private void stopServer() {
    if (acceptThread != null) {
      acceptThread.cancel();
      acceptThread = null;
      Toast.makeText(this, "Bluetooth server stopped", Toast.LENGTH_SHORT).show();
    }
  }

  private class AcceptThread extends Thread {
    private final BluetoothServerSocket serverSocket;

    public AcceptThread() {
      BluetoothServerSocket tmp = null;
      try {
        if (ActivityCompat.checkSelfPermission(MainActivity.this, Manifest.permission.BLUETOOTH_CONNECT) != PackageManager.PERMISSION_GRANTED) {
          // Permissions should have been granted before this point
          Log.e(TAG, "Bluetooth CONNECT permission not granted");
          // Assign tmp to null to satisfy final variable assignment
          tmp = null;
        } else {
          tmp = bluetoothAdapter.listenUsingRfcommWithServiceRecord("BluetoothSPPServer", MY_UUID);
        }
      } catch (IOException e) {
        Log.e(TAG, "Socket's listen() method failed", e);
      }
      serverSocket = tmp;
    }

    public void run() {
      if (serverSocket == null) {
        Log.e(TAG, "Server socket is null. Cannot accept connections.");
        return;
      }

      BluetoothSocket socket;
      while (true) {
        try {
          Log.d(TAG, "Waiting for a connection...");
          socket = serverSocket.accept();
        } catch (IOException e) {
          Log.e(TAG, "Socket's accept() method failed", e);
          break;
        }

        if (socket != null) {
          Log.d(TAG, "Connection accepted.");
          manageConnectedSocket(socket);
          try {
            serverSocket.close();
          } catch (IOException e) {
            Log.e(TAG, "Could not close the server socket", e);
          }
          break;
        }
      }
    }

    private void manageConnectedSocket(BluetoothSocket socket) {
      ConnectedThread connectedThread = new ConnectedThread(socket);
      connectedThread.start();
    }

    public void cancel() {
      try {
        if (serverSocket != null) {
          serverSocket.close();
        }
      } catch (IOException e) {
        Log.e(TAG, "Could not close the server socket", e);
      }
    }
  }

  private class ConnectedThread extends Thread {
    private final BluetoothSocket mmSocket;
    private final InputStream inStream;
    private final OutputStream outStream;

    public ConnectedThread(BluetoothSocket socket) {
      mmSocket = socket;
      InputStream tmpIn = null;
      OutputStream tmpOut = null;

      try {
        tmpIn = mmSocket.getInputStream();
        tmpOut = mmSocket.getOutputStream();
      } catch (IOException e) {
        Log.e(TAG, "Error occurred when creating input/output streams", e);
      }

      inStream = tmpIn;
      outStream = tmpOut;
    }

    public void run() {
      byte[] buffer = new byte[1024];
      int bytes;

      while (true) {
        try {
          bytes = inStream.read(buffer);
          String receivedData = new String(buffer, 0, bytes);
          Log.d(TAG, "Received: " + receivedData);

          // Echo back the received data
          outStream.write(buffer, 0, bytes);
          Log.d(TAG, "Sent: " + receivedData);

        } catch (IOException e) {
          Log.e(TAG, "Input stream was disconnected", e);
          break;
        }
      }
    }

    public void write(byte[] bytes) {
      try {
        outStream.write(bytes);
      } catch (IOException e) {
        Log.e(TAG, "Error occurred when sending data", e);
      }
    }

    public void cancel() {
      try {
        mmSocket.close();
      } catch (IOException e) {
        Log.e(TAG, "Could not close the connect socket", e);
      }
    }
  }

  private void requestPermissionsIfNecessary() {
    String[] permissions = {
      Manifest.permission.BLUETOOTH,
      Manifest.permission.BLUETOOTH_ADMIN,
      Manifest.permission.ACCESS_FINE_LOCATION,
      Manifest.permission.ACCESS_COARSE_LOCATION,
      Manifest.permission.BLUETOOTH_SCAN,
      Manifest.permission.BLUETOOTH_CONNECT,
      Manifest.permission.BLUETOOTH_ADVERTISE
    };

    boolean allPermissionsGranted = true;
    for (String permission : permissions) {
      if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
        allPermissionsGranted = false;
        break;
      }
    }

    if (!allPermissionsGranted) {
      ActivityCompat.requestPermissions(this, permissions, REQUEST_PERMISSIONS);
    } else {
      initializeBluetooth();
    }
  }

  @Override
  public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions,
                                         @NonNull int[] grantResults) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);

    if (requestCode == REQUEST_PERMISSIONS) {
      boolean allPermissionsGranted = true;
      for (int result : grantResults) {
        if (result != PackageManager.PERMISSION_GRANTED) {
          allPermissionsGranted = false;
          break;
        }
      }

      if (allPermissionsGranted) {
        initializeBluetooth();
        Toast.makeText(this, "Permissions granted", Toast.LENGTH_SHORT).show();
      } else {
        Toast.makeText(this, "Permissions denied", Toast.LENGTH_SHORT).show();
      }
    }
  }

  @Override
  public void onDestroy() {
    super.onDestroy();
    stopServer();
  }
}
