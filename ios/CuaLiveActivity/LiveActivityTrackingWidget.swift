// LiveActivityTrackingWidget.swift
// A TEMPLATE for the UI of the Live Activity. Add it to your Widget Extension target (NOT to the app target) together
// with `ios/Shared/LiveActivityTrackingAttributes.swift`, then edit it freely: the module only needs the attributes.
//
// Setup in the Widget Extension:
//   1. File > New > Target > Widget Extension (tick "Include Live Activity" or delete what Xcode generates).
//   2. Add this file and ios/Shared/LiveActivityTrackingAttributes.swift to that target.
//   3. In the app's Info.plist: NSSupportsLiveActivities = YES.
//
// Everything shown comes from the attributes the app passed to `startActivity` (title, labels, accent colour, deep
// link) and from the content state of each update, so there are no resources or lproj files to maintain here.

import ActivityKit
import SwiftUI
import WidgetKit

@main
struct LiveActivityTrackingWidgetBundle: WidgetBundle {
  var body: some Widget {
    LiveActivityTrackingWidget()
  }
}

/// Layout follows the UPRACE widget: the app mark is the identity (compact leading, minimal, expanded trailing, lock
/// screen leading); the sport appears as a glyph + name on the lock screen and as the title of the expanded island.
@available(iOS 16.2, *)
struct LiveActivityTrackingWidget: Widget {
  var body: some WidgetConfiguration {
    ActivityConfiguration(for: LiveActivityTrackingAttributes.self) { context in
      LockScreenView(attributes: context.attributes, state: context.state)
        .widgetURL(URL(string: context.attributes.deepLinkUrl))
        .activityBackgroundTint(context.state.status == "paused" ? Color(hex: "#272E35") : .white)
        .activitySystemActionForegroundColor(.black)
    } dynamicIsland: { context in
      let paused = context.state.status == "paused"
      return DynamicIsland {
        DynamicIslandExpandedRegion(.trailing) {
          Group {
            if paused { PauseBadge(size: 28) } else { CuaMark(onLight: false).frame(width: 28, height: 28) }
          }
          .padding(.trailing, 14)
        }
        DynamicIslandExpandedRegion(.bottom) {
          if let url = URL(string: context.attributes.deepLinkUrl) {
            Link(destination: url) { IslandExpandedView(attributes: context.attributes, state: context.state) }
          } else {
            IslandExpandedView(attributes: context.attributes, state: context.state)
          }
        }
      } compactLeading: {
        CuaMark(onLight: false, small: true).frame(width: 22, height: 22)
      } compactTrailing: {
        if paused {
          PauseBadge(size: 22)
        } else {
          TimerText(state: context.state)
            .font(.system(size: 13, weight: .bold).monospacedDigit())
            .foregroundStyle(.white)
            .contentTransition(.identity)
            .frame(width: context.state.elapsedSeconds >= 3600 ? 60 : 42, alignment: .trailing)
        }
      } minimal: {
        if paused { PauseBadge(size: 22) } else { CuaMark(onLight: false, small: true).frame(width: 22, height: 22) }
      }
      .widgetURL(URL(string: context.attributes.deepLinkUrl))
    }
    .contentMarginsDisabled()
  }
}

// MARK: - Lock screen

@available(iOS 16.2, *)
private struct LockScreenView: View {
  let attributes: LiveActivityTrackingAttributes
  let state: LiveActivityTrackingAttributes.ContentState

  var body: some View {
    let isPaused = state.status == "paused"
    let isCycling = attributes.activityType.lowercased().contains("cycling")

    VStack(spacing: 0) {
      if isPaused {
        Text(attributes.labels.pausedTitle)
          .font(.system(size: 15, weight: .bold))
          .foregroundStyle(.white)
          .frame(maxWidth: .infinity)
          .padding(.vertical, 10)
      }

      VStack(spacing: 12) {
        HStack(spacing: 8) {
          CuaMark(onLight: true).frame(width: 24, height: 24)
          Text(verbatim: "CUA")
            .font(.system(size: 16, weight: .heavy))
            .tracking(1.2)
            .foregroundStyle(Color(hex: "#0B1020"))
          Spacer()
          HStack(spacing: 6) {
            Image(systemName: sportSymbol(attributes.activityType))
              .font(.system(size: 14, weight: .semibold))
            Text(attributes.title).font(.system(size: 14))
          }
          .foregroundStyle(Color(hex: "#272E35"))
        }

        HStack(spacing: 0) {
          StatColumn(valueView: Text(formatDistance(state.distanceMeters)), label: attributes.labels.distance)
          StatColumn(valueView: TimerText(state: state), label: attributes.labels.time)
          StatColumn(
            valueView: Text(isCycling ? formatSpeed(state.paceSecondsPerKm) : formatPace(state.paceSecondsPerKm)),
            label: isCycling ? attributes.labels.speed : attributes.labels.pace)
        }
      }
      .padding(.horizontal, 16)
      .padding(.vertical, 14)
      .background(Color.white)
      .clipShape(RoundedRectangle(cornerRadius: 16))
    }
  }
}

// MARK: - Dynamic Island expanded

@available(iOS 16.2, *)
private struct IslandExpandedView: View {
  let attributes: LiveActivityTrackingAttributes
  let state: LiveActivityTrackingAttributes.ContentState

  var body: some View {
    let isPaused = state.status == "paused"
    let isCycling = attributes.activityType.lowercased().contains("cycling")

    VStack(spacing: 14) {
      HStack(spacing: 6) {
        Image(systemName: isPaused ? "pause.fill" : sportSymbol(attributes.activityType))
        Text(isPaused ? attributes.labels.paused : attributes.title)
      }
      .font(.system(size: 18, weight: .bold))
      .foregroundStyle(isPaused ? Color(hex: "#FFB84D") : .white)
      .frame(maxWidth: .infinity, alignment: .center)

      HStack(spacing: 0) {
        IslandStatColumn(valueView: TimerText(state: state), label: attributes.labels.time)
        IslandStatColumn(
          valueView: Text(isCycling ? formatSpeed(state.paceSecondsPerKm) : formatPace(state.paceSecondsPerKm)),
          label: isCycling ? attributes.labels.speed : attributes.labels.pace)
        IslandStatColumn(valueView: Text(formatDistance(state.distanceMeters)), label: attributes.labels.distance)
      }
    }
    .padding(.horizontal, 8)
    .padding(.bottom, 6)
  }
}

/// The amber pause disc (the design's paused colour) shown instead of the timer or the mark while paused.
private struct PauseBadge: View {
  var size: CGFloat

  var body: some View {
    ZStack {
      Circle().fill(Color(hex: "#FFB84D"))
      Image(systemName: "pause.fill")
        .font(.system(size: size * 0.45, weight: .bold))
        .foregroundStyle(Color(hex: "#1A1000"))
    }
    .frame(width: size, height: size)
  }
}

private struct IslandStatColumn<ValueView: View>: View {
  let valueView: ValueView
  let label: String

  var body: some View {
    VStack(spacing: 2) {
      valueView
        .font(.system(size: 20, weight: .bold).monospacedDigit())
        .foregroundStyle(.white)
        .minimumScaleFactor(0.7)
        .lineLimit(1)
        .contentTransition(.identity)
      Text(label)
        .font(.system(size: 9))
        .foregroundStyle(.white.opacity(0.6))
        .multilineTextAlignment(.center)
        .minimumScaleFactor(0.7)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity)
  }
}

private struct IslandDivider: View {
  var body: some View {
    Rectangle().fill(.white.opacity(0.25)).frame(width: 1, height: 32)
  }
}

private struct StatColumn<ValueView: View>: View {
  let valueView: ValueView
  let label: String

  var body: some View {
    VStack(spacing: 2) {
      valueView
        .font(.system(size: 22, weight: .bold).monospacedDigit())
        .foregroundStyle(Color(hex: "#272E35"))
        .minimumScaleFactor(0.7)
        .lineLimit(1)
        .contentTransition(.identity)
      Text(label)
        .font(.system(size: 10))
        .foregroundStyle(Color(hex: "#555F6D"))
        .multilineTextAlignment(.center)
        .minimumScaleFactor(0.7)
        .lineLimit(2)
    }
    .frame(maxWidth: .infinity)
  }
}

// MARK: - CUA mark

/// The CUA logo (`assets/brand/cua-mark.svg`): a "C" that is also a crab claw. Drawn as shapes, so the extension needs
/// no image assets. On white it is the one-colour variant of the brand rules (ink C, cyan and green tips); on dark it
/// is the volt-to-cyan gradient. Under 64 pt the speed lines would be noise, so `small` drops them.
private struct CuaMark: View {
  var onLight: Bool
  var small: Bool = false

  var body: some View {
    GeometryReader { geo in
      let u = min(geo.size.width, geo.size.height) / 100
      ZStack {
        claw(u)
          .stroke(
            onLight
              ? AnyShapeStyle(Color(hex: "#0B1020"))
              : AnyShapeStyle(LinearGradient(colors: [Color(hex: "#C8FF3D"), Color(hex: "#4FD8FF")], startPoint: .bottomLeading, endPoint: .topTrailing)),
            style: StrokeStyle(lineWidth: 15 * u, lineCap: .round))
        Circle().fill(Color(hex: onLight ? "#0A79B8" : "#4FD8FF")).frame(width: 16 * u, height: 16 * u).position(x: 76 * u, y: 26 * u)
        Circle().fill(Color(hex: onLight ? "#4D7A00" : "#C8FF3D")).frame(width: 16 * u, height: 16 * u).position(x: 76 * u, y: 74 * u)
        if !small {
          speedLines(u).stroke(Color(hex: onLight ? "#0B1020" : "#F4F6FB"), style: StrokeStyle(lineWidth: 5 * u, lineCap: .round))
        }
      }
    }
    .aspectRatio(1, contentMode: .fit)
    .accessibilityHidden(true)
  }

  /// The large arc from the upper tip (76,26) round the left to the lower tip (76,74), centre (50,50), r 34.
  private func claw(_ u: CGFloat) -> Path {
    Path { p in
      let start = atan2(-24.0, 26.0), end = start - (2 * .pi - 2 * abs(start))
      let steps = 48
      for i in 0...steps {
        let a = start + (end - start) * Double(i) / Double(steps)
        let pt = CGPoint(x: (50 + 34 * cos(a)) * u, y: (50 + 34 * sin(a)) * u)
        if i == 0 { p.move(to: pt) } else { p.addLine(to: pt) }
      }
    }
  }

  private func speedLines(_ u: CGFloat) -> Path {
    Path { p in
      p.move(to: CGPoint(x: 58 * u, y: 42 * u)); p.addLine(to: CGPoint(x: 80 * u, y: 42 * u))
      p.move(to: CGPoint(x: 52 * u, y: 50 * u)); p.addLine(to: CGPoint(x: 82 * u, y: 50 * u))
      p.move(to: CGPoint(x: 58 * u, y: 58 * u)); p.addLine(to: CGPoint(x: 80 * u, y: 58 * u))
    }
  }
}

// MARK: - Sport icon

/// An SF Symbol for the sport name; any sport without its own symbol gets a generic one.
private func sportSymbol(_ type: String) -> String {
  switch type.lowercased() {
  case "running", "running_indoor", "trackandfield": return "figure.run"
  case "walking": return "figure.walk"
  case "hiking": return "figure.hiking"
  case "cycling", "cycling_indoor", "handcycling": return "bicycle"
  case "swimming", "swimming_pool", "swimming_open_water": return "figure.pool.swim"
  case "soccer": return "soccerball"
  case "basketball": return "basketball"
  case "tennis", "tabletennis", "badminton", "squash", "racquetball", "pickleball": return "figure.tennis"
  case "volleyball": return "volleyball"
  case "americanfootball", "australianfootball", "rugby": return "football"
  case "baseball", "softball": return "baseball"
  case "golf": return "figure.golf"
  case "yoga", "pilates", "flexibility", "mindandbody", "taichi": return "figure.yoga"
  case "rowing": return "figure.rower"
  case "elliptical": return "figure.elliptical"
  case "stairclimbing", "stairs", "steptraining": return "figure.stairs"
  case "boxing", "kickboxing", "martialarts": return "figure.boxing"
  case "climbing": return "figure.climbing"
  case "downhillskiing", "crosscountryskiing", "snowboarding", "snowsports": return "figure.skiing.downhill"
  case "highintensityintervaltraining", "traditionalstrengthtraining", "functionalstrengthtraining",
    "crosstraining", "coretraining", "mixedcardio":
    return "figure.highintensity.intervaltraining"
  default: return "figure.mixed.cardio"
  }
}

// MARK: - Formatters

@ViewBuilder
private func TimerText(state: LiveActivityTrackingAttributes.ContentState) -> some View {
  if state.status == "active" {
    Text(Date(timeIntervalSince1970: Double(state.activeStartTimestamp) / 1000), style: .timer)
      .multilineTextAlignment(.center)
  } else {
    Text(formatDuration(state.elapsedSeconds))
  }
}

private func formatDistance(_ meters: Double) -> String {
  let km = meters / 1000.0
  return km < 10 ? String(format: "%.2f", km) : String(format: "%.1f", km)
}

private func formatDuration(_ seconds: Int) -> String {
  let h = seconds / 3600
  let m = (seconds % 3600) / 60
  let s = seconds % 60
  return h > 0 ? String(format: "%d:%02d:%02d", h, m, s) : String(format: "%02d:%02d", m, s)
}

private func formatPace(_ secsPerKm: Double) -> String {
  guard secsPerKm > 0 else { return "00:00" }
  return String(format: "%02d:%02d", Int(secsPerKm) / 60, Int(secsPerKm) % 60)
}

private func formatSpeed(_ secsPerKm: Double) -> String {
  guard secsPerKm > 0 else { return "0.0" }
  return String(format: "%.1f", 3600.0 / secsPerKm)
}

// MARK: - Color helper

extension Color {
  init(hex: String) {
    let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
    var int: UInt64 = 0
    Scanner(string: hex).scanHexInt64(&int)
    self.init(
      red: Double((int >> 16) & 0xFF) / 255, green: Double((int >> 8) & 0xFF) / 255, blue: Double(int & 0xFF) / 255)
  }
}

// MARK: - Preview

@available(iOS 17.0, *)
#Preview(
  "Lock Screen", as: .content,
  using: LiveActivityTrackingAttributes(
    activityType: "soccer", startTimestamp: Int(Date().timeIntervalSince1970 * 1000), title: "Soccer",
    deepLinkUrl: "", accentColor: "#0A84FF",
    labels: .init(
      distance: "Distance (km)", time: "Time", pace: "Pace (min/km)", speed: "Speed (km/h)", paused: "Paused",
      pausedTitle: "Paused"))
) {
  LiveActivityTrackingWidget()
} contentStates: {
  LiveActivityTrackingAttributes.ContentState(
    elapsedSeconds: 22 * 60 + 50, distanceMeters: 5_210, paceSecondsPerKm: 5 * 60 + 45, heartRate: 158,
    calories: 312, steps: 4_820, status: "active")
}
