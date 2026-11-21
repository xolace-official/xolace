package expo.modules.quotevideo

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.annotation.OptIn
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.audio.DefaultGainProvider
import androidx.media3.common.audio.GainProcessor
import androidx.media3.common.util.UnstableApi
import androidx.media3.effect.BitmapOverlay
import androidx.media3.effect.Crop
import androidx.media3.effect.OverlayEffect
import androidx.media3.effect.Presentation
import androidx.media3.transformer.Composition
import androidx.media3.transformer.EditedMediaItem
import androidx.media3.transformer.EditedMediaItemSequence
import androidx.media3.transformer.Effects
import androidx.media3.transformer.ExportException
import androidx.media3.transformer.ExportResult
import androidx.media3.transformer.Transformer
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.util.UUID

/** What JS passes: the loop, the transparent overlay (scrim, quote, wordmark), the format, the sound. */
class ExportOptions : Record {
  @Field val videoUri: String = ""
  @Field val overlayUri: String = ""
  /** "story" (720 × 1280) or "square" (720 × 720). */
  @Field val size: String = "story"
  /** Where the crop sits vertically, 0 top … 1 bottom. */
  @Field val focusY: Double = 0.5
  /** The loop's ambient sound (AAC). Optional: without it the video is silent. */
  @Field val audioUri: String? = null
}

class QuoteVideoException(message: String, cause: Throwable? = null) :
  CodedException("ERR_QUOTE_VIDEO", message, cause)

/** The source frame as it's shown: its size after the rotation the file asks for. */
private data class Source(val width: Int, val height: Int, val durationUs: Long)

/**
 * The Quotes share card as a real video on Android, the same contract as the iOS module: one loop
 * cropped to the format, the overlay PNG on top, the loop's ambient sound under it (looped or cut
 * to the loop's length, with a short fade in and out), exported as H.264/AAC mp4 into the cache.
 * Media3 Transformer, on the main looper.
 */
@OptIn(markerClass = [UnstableApi::class])
class QuoteVideoModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("QuoteVideo")

    AsyncFunction("exportQuoteVideo") { options: ExportOptions, promise: Promise ->
      val context = appContext.reactContext
      if (context == null) {
        promise.reject(QuoteVideoException("The app isn't ready to make the video."))
        return@AsyncFunction
      }
      try {
        export(context.applicationContext, options, promise)
      } catch (e: Exception) {
        promise.reject(QuoteVideoException(e.message ?: "The video couldn't be made.", e))
      }
    }
  }

  private fun export(context: Context, options: ExportOptions, promise: Promise) {
    val started = SystemClock.elapsedRealtime()
    val video = localFile(options.videoUri)
      ?: throw QuoteVideoException("The loop's file isn't on the phone.")
    val square = options.size == "square"
    val outW = WIDTH
    val outH = if (square) WIDTH else STORY_HEIGHT
    val overlay = loadOverlay(options.overlayUri, outW, outH)
      ?: throw QuoteVideoException("The words couldn't be drawn onto the video.")
    val source = probe(video)
    val sound = options.audioUri?.let { localFile(it) }

    clearOldExports(context.cacheDir)
    val out = File(context.cacheDir, "$EXPORT_PREFIX${options.size}-${UUID.randomUUID().toString().take(8)}.mp4")

    val start = { withSound: Boolean, onFail: (ExportException) -> Unit ->
      val composition = composition(video, overlay, source, outW, outH, options.focusY, if (withSound) sound else null)
      Transformer.Builder(context)
        .setVideoMimeType(MimeTypes.VIDEO_H264)
        .setAudioMimeType(MimeTypes.AUDIO_AAC)
        .addListener(object : Transformer.Listener {
          override fun onCompleted(composition: Composition, exportResult: ExportResult) {
            promise.resolve(
              mapOf(
                "uri" to Uri.fromFile(out).toString(),
                "ms" to (SystemClock.elapsedRealtime() - started).toInt(),
                "bytes" to out.length().toInt(),
                "hasAudio" to (withSound && sound != null),
              )
            )
          }

          override fun onError(composition: Composition, exportResult: ExportResult, exportException: ExportException) {
            onFail(exportException)
          }
        })
        .build()
        .start(composition, out.absolutePath)
    }

    val fail = { e: Exception -> promise.reject(QuoteVideoException(e.message ?: "The video couldn't be made.", e)) }
    // Transformer must be built and started on a thread with a Looper; it calls back there too.
    Handler(Looper.getMainLooper()).post {
      try {
        start(true) { first ->
          if (sound == null) {
            fail(first)
          } else {
            // A sound that won't decode shouldn't cost the video: make it silent instead.
            out.delete()
            start(false, fail)
          }
        }
      } catch (e: Exception) {
        fail(e)
      }
    }
  }

  private fun composition(
    video: File,
    overlay: Bitmap,
    source: Source,
    outW: Int,
    outH: Int,
    focusY: Double,
    sound: File?,
  ): Composition {
    val frame = EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(video)))
      .setRemoveAudio(true)
      .setEffects(
        Effects(
          emptyList(),
          listOf(
            crop(source, outW.toFloat() / outH, focusY),
            Presentation.createForWidthAndHeight(outW, outH, Presentation.LAYOUT_SCALE_TO_FIT),
            OverlayEffect(listOf(BitmapOverlay.createStaticBitmapOverlay(overlay))),
          ),
        )
      )
      .build()
    val sequences = mutableListOf(EditedMediaItemSequence.withVideoFrom(listOf(frame)))
    var effects = Effects.EMPTY
    if (sound != null) {
      val ambient = EditedMediaItem.Builder(MediaItem.fromUri(Uri.fromFile(sound)))
        .setRemoveVideo(true)
        .build()
      // Looping: repeated until the loop's video ends, and cut there.
      sequences += EditedMediaItemSequence.Builder(setOf(C.TRACK_TYPE_AUDIO))
        .addItem(ambient)
        .setIsLooping(true)
        .build()
      // Fades on the mixed output, so a repeat of the sound doesn't fade in again.
      val fadeIn = minOf(FADE_IN_US, source.durationUs / 2)
      val fadeOut = minOf(FADE_OUT_US, source.durationUs - fadeIn)
      val gain = DefaultGainProvider.Builder(1f)
        .addFadeAt(0, fadeIn, DefaultGainProvider.FADE_IN_LINEAR)
        .addFadeAt(source.durationUs - fadeOut, fadeOut, DefaultGainProvider.FADE_OUT_LINEAR)
        .build()
      effects = Effects(listOf(GainProcessor(gain)), emptyList())
    }
    return Composition.Builder(sequences).setEffects(effects).build()
  }

  /**
   * Cover the output's aspect: keep the whole width or height and cut the other, centred
   * horizontally and placed vertically by focusY. Crop works in NDC, -1 … 1 with y up.
   */
  private fun crop(source: Source, aspect: Float, focusY: Double): Crop {
    val sourceAspect = source.width.toFloat() / source.height
    if (sourceAspect > aspect) {
      val half = aspect / sourceAspect
      return Crop(-half, half, -1f, 1f)
    }
    val keep = 2f * sourceAspect / aspect
    val focus = focusY.coerceIn(0.0, 1.0).toFloat()
    val top = 1f - (2f - keep) * focus
    return Crop(-1f, 1f, top - keep, top)
  }

  private fun probe(video: File): Source {
    val retriever = MediaMetadataRetriever()
    try {
      retriever.setDataSource(video.absolutePath)
      val w = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_WIDTH)?.toIntOrNull()
      val h = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_HEIGHT)?.toIntOrNull()
      val rotation = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_VIDEO_ROTATION)?.toIntOrNull() ?: 0
      val ms = retriever.extractMetadata(MediaMetadataRetriever.METADATA_KEY_DURATION)?.toLongOrNull()
      if (w == null || h == null || ms == null || w <= 0 || h <= 0 || ms <= 0) {
        throw QuoteVideoException("The loop has no video.")
      }
      val turned = rotation == 90 || rotation == 270
      return Source(if (turned) h else w, if (turned) w else h, ms * 1000)
    } finally {
      retriever.release()
    }
  }

  private fun loadOverlay(uri: String, width: Int, height: Int): Bitmap? {
    val file = localFile(uri) ?: return null
    val bitmap = BitmapFactory.decodeFile(file.absolutePath) ?: return null
    if (bitmap.width == width && bitmap.height == height) return bitmap
    return Bitmap.createScaledBitmap(bitmap, width, height, true)
  }

  private fun localFile(uri: String): File? {
    val path = if (uri.startsWith("file://")) Uri.parse(uri).path else uri
    val file = path?.let { File(it) } ?: return null
    return if (file.exists() && file.length() > 0) file else null
  }

  /** Each export is shared or saved before the next one starts, so only the newest is kept. */
  private fun clearOldExports(dir: File) {
    dir.listFiles { f -> f.name.startsWith(EXPORT_PREFIX) && f.name.endsWith(".mp4") }
      ?.forEach { it.delete() }
  }

  private companion object {
    const val WIDTH = 720
    const val STORY_HEIGHT = 1280
    const val EXPORT_PREFIX = "quote-video-"
    const val FADE_IN_US = 250_000L
    const val FADE_OUT_US = 1_000_000L
  }
}
