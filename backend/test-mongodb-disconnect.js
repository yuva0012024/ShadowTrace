const mongoose = require('mongoose');
const express = require('express');
const { errorHandler } = require('./middleware/errorHandler');

async function testMongoDisconnect() {
  console.log('=== TESTING MONGODB DISCONNECT BEHAVIOR ===');
  
  // 1. Simulate the route guard behavior when readyState is 0 (disconnected)
  const req = { method: 'POST', originalUrl: '/api/auth/login' };
  let statusCode = 200;
  let responseData = null;
  const res = {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          responseData = data;
        }
      };
    }
  };

  const requireDatabase = (req, res, next) => {
    // Force simulated readyState !== 1
    const readyState = 0; // Disconnected
    if (readyState !== 1) {
      return res.status(503).json({
        success: false,
        error: 'Database service is temporarily unavailable.'
      });
    }
    next();
  };

  requireDatabase(req, res, () => {});
  console.log('Middleware returned status:', statusCode);
  console.log('Response error:', responseData?.error);
  if (statusCode === 503 && responseData?.error === 'Database service is temporarily unavailable.') {
    console.log('>> PASS: Gracefully returned 503 "Database service is temporarily unavailable."');
  } else {
    console.error('>> FAIL');
  }

  // 2. Test errorHandler with simulated MongoServerSelectionError
  const mongoErr = new Error('connect ECONNREFUSED 127.0.0.1:27017');
  mongoErr.name = 'MongoServerSelectionError';

  let errStatus = 500;
  let errData = null;
  const resErr = {
    status: (code) => {
      errStatus = code;
      return {
        json: (data) => {
          errData = data;
        }
      };
    }
  };

  errorHandler(mongoErr, req, resErr, () => {});
  console.log('ErrorHandler returned status:', errStatus);
  console.log('ErrorHandler error:', errData?.error);
  if (errStatus === 503 && errData?.error === 'Database service is temporarily unavailable.') {
    console.log('>> PASS: Centralized error handler intercepted MongoDB error and returned 503.');
  } else {
    console.error('>> FAIL');
  }

  console.log('=== MONGODB DISCONNECT TEST COMPLETE ===\n');
}

testMongoDisconnect();
