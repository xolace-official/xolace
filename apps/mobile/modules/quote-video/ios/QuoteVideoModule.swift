import AVFoundation
import ExpoModulesCore
import CoreImage
import UIKit

/// What JS passes: the loop, the transparent overlay (scrim, quote, wordmark) and the format.
struct ExportOptions: Record {
  @Field var videoUri: String = ""
  @Field var overlayUri: String = ""
  /// The loop's ambient sound (AAC). Optional: older JS never sends it, and the video is silent.
  @Field var audioUri: String? = nil
  /// "story" (720 × 1280) or "square" (720 × 720).
  @Field var size: String = "story"
  /// Where the crop sits vertically, 0 top … 1 bottom (Hearth is framed from the bottom).
  @Field var focusY: Double = 0.5
}

/// A readable rejection for JS.
final class QuoteVideoException: GenericException<String> {
  override var reason: String { param }
}

/// The Quotes share card as a real video: the loop with the words on it, made on the phone.
/// AVFoundation only: the video track of one loop, cropped to the format, with the overlay PNG
/// composited on top by Core Image, and the loop's ambient sound when JS passes one (the loop's
/// mp4 is silent), exported as H.264/AAC mp4 into the caches directory.
public class QuoteVideoModule: Module {
  private static let width: CGFloat = 720
  private static let storyHeight: CGFloat = 1280
  private static let fps: Int32 = 30
  /// Short ramps so the sound doesn't click in or stop dead where the loop ends.
  private static let fadeIn = CMTime(value: 1, timescale: 4)
  private static let fadeOut = CMTime(value: 1, timescale: 1)

  public func definition() -> ModuleDefinition {
    Name("QuoteVideo")

    AsyncFunction("exportQuoteVideo") { (options: ExportOptions, promise: Promise) in
      Self.export(options) { result in
        switch result {
        case .success(let value): promise.resolve(value)
        case .failure(let error): promise.reject(QuoteVideoException(error.localizedDescription))
        }
      }
    }
  }

  private static func fileURL(_ uri: String) -> URL? {
    if uri.hasPrefix("file://") { return URL(string: uri) }
    return URL(fileURLWithPath: uri)
  }

  private static let exportPrefix = "quote-video-"

  /// Each export is shared or saved before the next one starts, so only the newest is kept.
  private static func clearOldExports(in caches: URL) {
    let names = (try? FileManager.default.contentsOfDirectory(atPath: caches.path)) ?? []
    for name in names where name.hasPrefix(exportPrefix) && name.hasSuffix(".mp4") {
      try? FileManager.default.removeItem(at: caches.appendingPathComponent(name))
    }
  }

  private static func fail(_ message: String) -> NSError {
    NSError(domain: "QuoteVideo", code: 1, userInfo: [NSLocalizedDescriptionKey: message])
  }

  /// Lays the ambient sound under the video, repeated or trimmed to `duration`, with a fade in
  /// and out. Best effort: a sound that won't load leaves the video silent rather than failing it.
  private static func addSound(_ uri: String?, to composition: AVMutableComposition, duration: CMTime) async -> AVAudioMix? {
    guard let uri, let url = fileURL(uri), FileManager.default.fileExists(atPath: url.path) else { return nil }
    let asset = AVURLAsset(url: url)
    guard let source = try? await asset.loadTracks(withMediaType: .audio).first,
          let length = try? await asset.load(.duration), length > .zero,
          let track = composition.addMutableTrack(withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid) else {
      return nil
    }
    var at = CMTime.zero
    while at < duration {
      let piece = CMTimeMinimum(length, duration - at)
      do {
        try track.insertTimeRange(CMTimeRange(start: .zero, duration: piece), of: source, at: at)
      } catch {
        composition.removeTrack(track)
        return nil
      }
      at = at + piece
    }
    let params = AVMutableAudioMixInputParameters(track: track)
    let rampIn = CMTimeMinimum(fadeIn, duration)
    let rampOut = CMTimeMinimum(fadeOut, duration - rampIn)
    params.setVolumeRamp(fromStartVolume: 0, toEndVolume: 1, timeRange: CMTimeRange(start: .zero, duration: rampIn))
    params.setVolumeRamp(fromStartVolume: 1, toEndVolume: 0, timeRange: CMTimeRange(start: duration - rampOut, duration: rampOut))
    let mix = AVMutableAudioMix()
    mix.inputParameters = [params]
    return mix
  }

  private static func export(_ options: ExportOptions, done: @escaping (Result<[String: Any], Error>) -> Void) {
    let started = CFAbsoluteTimeGetCurrent()
    guard let videoURL = fileURL(options.videoUri), FileManager.default.fileExists(atPath: videoURL.path) else {
      return done(.failure(fail("The loop's file isn't on the phone.")))
    }
    guard let overlayURL = fileURL(options.overlayUri),
          let overlay = UIImage(contentsOfFile: overlayURL.path)?.cgImage else {
      return done(.failure(fail("The words couldn't be drawn onto the video.")))
    }
    let renderSize = CGSize(width: width, height: options.size == "square" ? width : storyHeight)
    let asset = AVURLAsset(url: videoURL)

    asset.loadTracks(withMediaType: .video) { tracks, error in
      guard let source = tracks?.first else {
        return done(.failure(fail(error?.localizedDescription ?? "The loop has no video.")))
      }
      Task {
        do {
          let (duration, natural, transform) = try await (
            asset.load(.duration), source.load(.naturalSize), source.load(.preferredTransform)
          )
          let composition = AVMutableComposition()
          guard let track = composition.addMutableTrack(withMediaType: .video, preferredTrackID: kCMPersistentTrackID_Invalid) else {
            return done(.failure(fail("Couldn't make the video track.")))
          }
          let range = CMTimeRange(start: .zero, duration: duration)
          try track.insertTimeRange(range, of: source, at: .zero)
          let audioMix = await addSound(options.audioUri, to: composition, duration: duration)

          // Cover the render size: scale the frame to fill, centre it horizontally and place it
          // vertically by focusY (Core Image is y-up, so the bottom is y 0), then lay the overlay
          // over it. Core Image rather than AVVideoCompositionCoreAnimationTool, whose
          // CALayer render path traps on the iOS Simulator (IOSurface xpc_shmem misuse).
          let oriented = CGRect(origin: .zero, size: natural).applying(transform)
          let size = CGSize(width: abs(oriented.width), height: abs(oriented.height))
          let scale = max(renderSize.width / size.width, renderSize.height / size.height)
          let scaled = CGSize(width: size.width * scale, height: size.height * scale)
          let dx = (renderSize.width - scaled.width) / 2
          let focus = CGFloat(min(max(options.focusY, 0), 1))
          let dy = (renderSize.height - scaled.height) * (1 - focus)
          let frame = CGRect(origin: .zero, size: renderSize)
          let words = CIImage(cgImage: overlay).transformed(by: CGAffineTransform(
            scaleX: renderSize.width / CGFloat(overlay.width), y: renderSize.height / CGFloat(overlay.height)))

          let video = AVMutableVideoComposition(asset: composition) { request in
            let source = request.sourceImage
            let placed = source
              .transformed(by: CGAffineTransform(translationX: -source.extent.minX, y: -source.extent.minY))
              .transformed(by: CGAffineTransform(scaleX: scale, y: scale))
              .transformed(by: CGAffineTransform(translationX: dx, y: dy))
            request.finish(with: words.composited(over: placed).cropped(to: frame), context: nil)
          }
          video.renderSize = renderSize
          video.frameDuration = CMTime(value: 1, timescale: fps)

          let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
          clearOldExports(in: caches)
          let out = caches.appendingPathComponent("\(exportPrefix)\(options.size)-\(UUID().uuidString.prefix(8)).mp4")
          guard let session = AVAssetExportSession(asset: composition, presetName: AVAssetExportPresetHighestQuality) else {
            return done(.failure(fail("This phone can't make the video.")))
          }
          session.outputURL = out
          session.outputFileType = .mp4
          session.shouldOptimizeForNetworkUse = true
          session.videoComposition = video
          session.audioMix = audioMix
          session.exportAsynchronously {
            switch session.status {
            case .completed:
              let bytes = (try? FileManager.default.attributesOfItem(atPath: out.path)[.size] as? NSNumber)?.intValue ?? 0
              let ms = Int((CFAbsoluteTimeGetCurrent() - started) * 1000)
              done(.success(["uri": out.absoluteString, "ms": ms, "bytes": bytes, "hasAudio": audioMix != nil]))
            default:
              done(.failure(fail(session.error?.localizedDescription ?? "The video couldn't be made.")))
            }
          }
        } catch {
          done(.failure(error))
        }
      }
    }
  }
}
