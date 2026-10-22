import ExpoModulesCore
import CoreHaptics

public class NativeCoreHapticsModule: Module {
  // Create a property to store the CHHapticEngine instance
    var hapticEngine: CHHapticEngine?

    public func definition() -> ModuleDefinition {
      Name("NativeCoreHaptics")

      // Initialize haptic engine when module is created
      OnCreate {
        self.initializeHapticEngine()
      }

      // Clean up haptic engine when module is destroyed
      OnDestroy {
        self.cleanupHapticEngine()
      }

      // Handle app lifecycle events
      OnAppEntersForeground {
        self.restartHapticEngineIfNeeded()
      }

      OnAppEntersBackground {
        self.pauseHapticEngine()
      }

      // MARK: - API Functions

      // Function to play a transient haptic
      AsyncFunction("impact") { (sharpness: Double, intensity: Double) in
        guard let engine = self.hapticEngine else {
          print("Haptic engine not initialized")
          return
        }

        let sharpnessParameter = CHHapticEventParameter(parameterID: .hapticSharpness, value: Float(sharpness))
        let intensityParameter = CHHapticEventParameter(parameterID: .hapticIntensity, value: Float(intensity))

        do {
          let event = CHHapticEvent(
            eventType: .hapticTransient,
            parameters: [intensityParameter, sharpnessParameter],
            relativeTime: 0
          )

          let pattern = try CHHapticPattern(events: [event], parameters: [])
          let player = try engine.makePlayer(with: pattern)
          try player.start(atTime: CHHapticTimeImmediate)
        } catch {
          print("Failed to play haptic pattern: \(error)")
        }
      }.runOnQueue(.main)

      // Function to play a full haptic pattern from JS
      AsyncFunction("playPattern") { (patternData: HapticPatternData) in
        guard let engine = self.hapticEngine else {
          print("Haptic engine not initialized")
          return
        }

        do {
          let pattern = try patternData.toCHHapticPattern()
          let player = try engine.makePlayer(with: pattern)
          try player.start(atTime: CHHapticTimeImmediate)
        } catch {
          print("Failed to play complex haptic pattern: \(error)")
        }
      }.runOnQueue(.main)
    }

    // MARK: - Private Engine Management Methods

    private func initializeHapticEngine() {
      guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else {
        print("Haptic engine not supported on this device")
        return
      }

      do {
        self.hapticEngine = try CHHapticEngine()
        try self.hapticEngine?.start()

        // Set up reset handler for automatic recovery
        self.hapticEngine?.resetHandler = { [weak self] in
          print("Haptic engine reset - restarting automatically")
          self?.restartHapticEngineIfNeeded()
        }

        // Set up stopped handler
        self.hapticEngine?.stoppedHandler = { [weak self] reason in
          print("Haptic engine stopped with reason: \(reason)")
          switch reason {
          case .audioSessionInterrupt, .applicationSuspended:
            break // expected, will restart on foreground
          case .idleTimeout, .systemError, .notifyWhenFinished, .gameControllerDisconnect, .engineDestroyed:
            self?.restartHapticEngineIfNeeded()
          @unknown default:
            print("Unknown stop reason: \(reason)")
          }
        }

        print("Haptic engine initialized successfully")
      } catch {
        print("Failed to initialize haptic engine: \(error)")
      }
    }

    private func cleanupHapticEngine() {
      hapticEngine?.stop()
      hapticEngine = nil
      print("Haptic engine cleaned up")
    }

    private func restartHapticEngineIfNeeded() {
      guard CHHapticEngine.capabilitiesForHardware().supportsHaptics else { return }

      do {
        if hapticEngine == nil {
          initializeHapticEngine()
        } else {
          try hapticEngine?.start()
          print("Haptic engine restarted")
        }
      } catch {
        print("Failed to restart haptic engine: \(error)")
        cleanupHapticEngine()
        initializeHapticEngine()
      }
    }

    private func pauseHapticEngine() {
      print("App entering background - haptic engine will idle")
    }
}

// MARK: - Record structures to represent CHHapticPattern dictionary from JavaScript

struct HapticEventParameter: Record {
  @Field
  var parameterID: String

  @Field
  var value: Double
}

struct HapticEvent: Record {
  @Field
  var eventType: String

  @Field
  var time: Double = 0.0

  @Field
  var eventDuration: Double?

  @Field
  var parameters: [HapticEventParameter] = []
}

struct HapticParameterCurveControlPoint: Record {
  @Field
  var relativeTime: Double

  @Field
  var value: Double
}

struct HapticParameterCurve: Record {
  @Field
  var parameterID: String

  @Field
  var controlPoints: [HapticParameterCurveControlPoint] = []

  @Field
  var relativeTime: Double = 0.0
}

struct HapticPatternData: Record {
  @Field
  var events: [HapticEvent] = []

  @Field
  var parameterCurves: [HapticParameterCurve] = []
}

// MARK: - Extensions for cleaner conversion

extension HapticParameterCurve {
  func toCHHapticParameterCurve() -> CHHapticParameterCurve {
    let parameterID = CHHapticDynamicParameter.ID(from: self.parameterID)
    let controlPoints = self.controlPoints.map { controlPoint in
      CHHapticParameterCurve.ControlPoint(
        relativeTime: controlPoint.relativeTime,
        value: Float(controlPoint.value)
      )
    }

    return CHHapticParameterCurve(
      parameterID: parameterID,
      controlPoints: controlPoints,
      relativeTime: self.relativeTime
    )
  }
}

extension HapticPatternData {
  func toCHHapticPattern() throws -> CHHapticPattern {
    let events = try self.events.map { try $0.toCHHapticEvent() }
    let parameterCurves = self.parameterCurves.map { $0.toCHHapticParameterCurve() }

    return try CHHapticPattern(events: events, parameterCurves: parameterCurves)
  }
}

extension HapticEvent {
  func toCHHapticEvent() throws -> CHHapticEvent {
    let eventType = try CHHapticEvent.EventType(from: self.eventType)
    let parameters = self.parameters.map { param in
      CHHapticEventParameter(
        parameterID: CHHapticEvent.ParameterID(from: param.parameterID),
        value: Float(param.value)
      )
    }

    if let duration = self.eventDuration {
      return CHHapticEvent(
        eventType: eventType,
        parameters: parameters,
        relativeTime: self.time,
        duration: duration
      )
    } else {
      return CHHapticEvent(
        eventType: eventType,
        parameters: parameters,
        relativeTime: self.time
      )
    }
  }
}

// MARK: - CHHaptic Conversion Helpers

extension CHHapticEvent.EventType {
  init(from string: String) throws {
    switch string {
    case "hapticTransient": self = .hapticTransient
    case "hapticContinuous": self = .hapticContinuous
    case "audioContinuous": self = .audioContinuous
    case "audioCustom": self = .audioCustom
    default:
      throw NSError(domain: "HapticError", code: 1, userInfo: [
        NSLocalizedDescriptionKey: "Unknown event type: \(string)"
      ])
    }
  }
}

extension CHHapticEvent.ParameterID {
  init(from string: String) {
    switch string {
    case "hapticIntensity": self = .hapticIntensity
    case "hapticSharpness": self = .hapticSharpness
    case "attackTime": self = .attackTime
    case "decayTime": self = .decayTime
    case "releaseTime": self = .releaseTime
    case "sustained": self = .sustained
    case "audioVolume": self = .audioVolume
    case "audioPitch": self = .audioPitch
    case "audioPan": self = .audioPan
    case "audioBrightness": self = .audioBrightness
    default: self = .hapticIntensity // Safe fallback
    }
  }
}

extension CHHapticDynamicParameter.ID {
  init(from string: String) {
    switch string {
    case "hapticIntensityControl": self = .hapticIntensityControl
    case "hapticSharpnessControl": self = .hapticSharpnessControl
    case "audioVolumeControl": self = .audioVolumeControl
    case "audioPanControl": self = .audioPanControl
    case "audioBrightnessControl": self = .audioBrightnessControl
    case "audioPitchControl": self = .audioPitchControl
    default: self = .hapticIntensityControl // Safe fallback
    }
  }
}

