package com.anonymous.blahread

import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise

class TimerServiceModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    override fun getName(): String = "TimerService"

    @ReactMethod
    fun startService(bookId: String, promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, TimerForegroundService::class.java).apply {
                action = TimerForegroundService.ACTION_START
                putExtra(TimerForegroundService.EXTRA_BOOK_ID, bookId)
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                reactApplicationContext.startForegroundService(intent)
            } else {
                reactApplicationContext.startService(intent)
            }
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message ?: e.toString())
        }
    }

    @ReactMethod
    fun stopService(promise: Promise) {
        try {
            val intent = Intent(reactApplicationContext, TimerForegroundService::class.java).apply {
                action = TimerForegroundService.ACTION_STOP
            }
            reactApplicationContext.startService(intent)
            promise.resolve(null)
        } catch (e: Exception) {
            promise.reject("SERVICE_ERROR", e.message ?: e.toString())
        }
    }
}
