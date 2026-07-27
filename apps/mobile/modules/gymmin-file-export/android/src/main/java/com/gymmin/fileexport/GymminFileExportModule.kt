package com.gymmin.fileexport

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.IOException

private const val EXPORT_NOTIFICATION_CHANNEL_ID = "workout-exports"
private const val MAX_EXPORT_BYTES = 32 * 1024 * 1024
private const val MAX_EXPORT_BASE64_LENGTH = 44_739_248

class GymminFileExportModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("GymminFileExport")

    AsyncFunction("saveToDownloadsAsync") {
        filename: String,
        mimeType: String,
        contentBase64: String,
        notificationTitle: String,
        notificationOpenLabel: String,
        showNotification: Boolean ->
      val context = requireNotNull(appContext.reactContext) {
        "Android context is unavailable."
      }
      require(Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        "Public Downloads export requires Android 10 or newer."
      }

      val safeFilename = validateFilename(filename)
      require(contentBase64.length <= MAX_EXPORT_BASE64_LENGTH) {
        "Export file exceeds the supported size."
      }
      val bytes = Base64.decode(contentBase64, Base64.DEFAULT)
      require(bytes.size <= MAX_EXPORT_BYTES) {
        "Export file exceeds the supported size."
      }

      val uri = saveToDownloads(context, safeFilename, mimeType, bytes)
      val notificationShown = showNotification && showDownloadNotification(
        context,
        uri,
        mimeType,
        notificationTitle,
        safeFilename,
        notificationOpenLabel
      )

      mapOf(
        "notificationShown" to notificationShown,
        "uri" to uri.toString()
      )
    }

    AsyncFunction("openFileAsync") { uriValue: String, mimeType: String ->
      val context = requireNotNull(appContext.reactContext) {
        "Android context is unavailable."
      }
      openFile(context, Uri.parse(uriValue), mimeType)
    }
  }

  private fun validateFilename(filename: String): String {
    val value = filename.trim()
    require(value.isNotEmpty() && value.length <= 180) {
      "Export filename is invalid."
    }
    require(!value.contains('/') && !value.contains('\\')) {
      "Export filename must not contain a path."
    }
    return value
  }

  private fun saveToDownloads(
    context: Context,
    filename: String,
    mimeType: String,
    bytes: ByteArray
  ): Uri {
    val resolver = context.contentResolver
    val values = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, filename)
      put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
      put(MediaStore.MediaColumns.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/Gymmin")
      put(MediaStore.MediaColumns.IS_PENDING, 1)
    }
    val collection = MediaStore.Downloads.getContentUri(MediaStore.VOLUME_EXTERNAL_PRIMARY)
    val uri = resolver.insert(collection, values)
      ?: throw IOException("Could not create the exported file.")

    try {
      resolver.openOutputStream(uri, "w")?.use { output ->
        output.write(bytes)
        output.flush()
      } ?: throw IOException("Could not open the exported file.")

      values.clear()
      values.put(MediaStore.MediaColumns.IS_PENDING, 0)
      resolver.update(uri, values, null, null)
      return uri
    } catch (error: Throwable) {
      resolver.delete(uri, null, null)
      throw error
    }
  }

  private fun createOpenFileIntent(uri: Uri, mimeType: String): Intent {
    return Intent(Intent.ACTION_VIEW).apply {
      setDataAndType(uri, mimeType)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
  }

  private fun openFile(context: Context, uri: Uri, mimeType: String) {
    val viewIntent = createOpenFileIntent(uri, mimeType)
    val chooser = Intent.createChooser(viewIntent, null).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
    }
    context.startActivity(chooser)
  }

  private fun showDownloadNotification(
    context: Context,
    uri: Uri,
    mimeType: String,
    title: String,
    filename: String,
    openLabel: String
  ): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      return false
    }

    val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    val compatManager = NotificationManagerCompat.from(context)
    if (!compatManager.areNotificationsEnabled()) {
      return false
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      manager.createNotificationChannel(
        NotificationChannel(
          EXPORT_NOTIFICATION_CHANNEL_ID,
          title,
          NotificationManager.IMPORTANCE_DEFAULT
        )
      )
      if (manager.getNotificationChannel(EXPORT_NOTIFICATION_CHANNEL_ID)?.importance ==
        NotificationManager.IMPORTANCE_NONE
      ) {
        return false
      }
    }

    val openIntent = createOpenFileIntent(uri, mimeType)
    val pendingIntent = PendingIntent.getActivity(
      context,
      uri.toString().hashCode(),
      openIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val notification = NotificationCompat.Builder(context, EXPORT_NOTIFICATION_CHANNEL_ID)
      .setSmallIcon(android.R.drawable.stat_sys_download_done)
      .setContentTitle(title)
      .setContentText(filename)
      .setContentIntent(pendingIntent)
      .setAutoCancel(true)
      .setCategory(Notification.CATEGORY_PROGRESS)
      .setPriority(NotificationCompat.PRIORITY_DEFAULT)
      .addAction(0, openLabel, pendingIntent)
      .build()

    return try {
      compatManager.notify(uri.toString().hashCode(), notification)
      true
    } catch (_: SecurityException) {
      false
    }
  }
}
