// Update your client/src/services/socket.js file with this improved implementation

import { io } from 'socket.io-client';

let socket = null;

export const initializeSocket = (token) => {
  if (!token) {
    console.error('Cannot initialize socket: No token provided');
    return null;
  }

  // Check if we already have a connection
  if (socket && socket.connected) {
    console.log('Reusing existing socket connection');
    return socket;
  }

  // Clean up any existing socket before creating a new one
  if (socket) {
    console.log('Disconnecting existing socket before creating new one');
    socket.disconnect();
  }

  console.log('Initializing new socket connection with token');
  
  // Create new socket connection
  socket = io('http://localhost:5000', {
    auth: { token },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000
  });

  // Connection events
  socket.on('connect', () => {
    console.log('✅ Connected to socket server with ID:', socket.id);
  });

  socket.on('connectionSuccess', (data) => {
    console.log('✅ Server confirmed authentication:', data);
  });

  socket.on('connect_error', (error) => {
    console.error('❌ Socket connection error:', error.message);
    
    // Decode token for debugging
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      console.log('Token payload:', decoded);
    } catch (e) {
      console.error('Failed to decode token:', e);
    }
  });

  socket.on('disconnect', (reason) => {
    console.warn('⚠️ Socket disconnected:', reason);
  });

  socket.on('error', (error) => {
    console.error('Socket error:', error);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    console.log('Manually disconnecting socket');
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => {
  if (!socket) {
    console.warn('Attempted to get socket but it is not initialized');
  }
  return socket;
};

export const subscribeToDriverUpdates = (rideId, callback) => {
  if (!socket) {
    console.error('Cannot subscribe: Socket not initialized');
    return;
  }
  
  console.log(`Subscribing to driver updates for ride ${rideId}`);
  socket.on('driverLocationUpdated', callback);
  socket.on('rideAccepted', callback);
  socket.on('rideCompleted', callback);
  socket.on('rideCancelled', callback);
};

export const unsubscribeFromDriverUpdates = () => {
  if (!socket) return;
  
  console.log('Unsubscribing from driver updates');
  socket.off('driverLocationUpdated');
  socket.off('rideAccepted');
  socket.off('rideCompleted');
  socket.off('rideCancelled');
};

// Export a method to emit events with error handling
export const emitEvent = (eventName, data, callback) => {
  if (!socket) {
    console.error(`Cannot emit ${eventName}: Socket not initialized`);
    if (callback) callback({ success: false, error: 'Socket not connected' });
    return;
  }
  
  console.log(`Emitting ${eventName} event:`, data);
  if (callback) {
    socket.emit(eventName, data, callback);
  } else {
    socket.emit(eventName, data);
  }
};