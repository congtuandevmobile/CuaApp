internal import Expo
import React
import ReactAppDependencyProvider
import UIKit

@main
class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {
  var window: UIWindow?
  var reactNativeFactory: RCTReactNativeFactory?

  var reactNativeFactoryModuleName: String {
    "Cua"
  }

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    delegate.dependencyProvider = RCTAppDependencyProvider()

    let factory = ExpoReactNativeFactory(delegate: delegate)
    reactNativeFactory = factory

    #if DEBUG
    factory.devMenuConfiguration = RCTDevMenuConfiguration(
      devMenuEnabled: true,
      shakeGestureEnabled: true,
      keyboardShortcutsEnabled: true
    )
    #endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
}

final class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  override func bundleURL() -> URL? {
    #if DEBUG
    let bundleURL = RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
    return bundleURL ?? URL(string: "http://127.0.0.1:8081/index.bundle?platform=ios&dev=true&minify=false&runModule=true")
    #else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
    #endif
  }
}

