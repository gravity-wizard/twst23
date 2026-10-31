//
//  SceneDelegate.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

  var window: UIWindow?

  @available(iOS 13.0, *)
  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    print("willConnectTo", scene, session, connectionOptions)
    // Use this method to optionally configure and attach the UIWindow `window` to the provided UIWindowScene `scene`.
    // If using a storyboard, the `window` property will automatically be initialized and attached to the scene.
    // This delegate does not imply the connecting scene or session are new (see `application:configurationForConnectingSceneSession` instead).
    guard let _ = (scene as? UIWindowScene) else { return }
  }

  @available(iOS 13.0, *)
  func sceneDidDisconnect(_ scene: UIScene) {
     print("sceneDidDisconnect", scene)
    // Called as the scene is being released by the system.
    // This occurs shortly after the scene enters the background, or when its session is discarded.
    // Release any resources associated with this scene that can be re-created the next time the scene connects.
    // The scene may re-connect later, as its session was not neccessarily discarded (see `application:didDiscardSceneSessions` instead).
  }

  @available(iOS 13.0, *)
  func sceneDidBecomeActive(_ scene: UIScene) {
     print("sceneDidEnterBackground", scene)
    // Called when the scene has moved from an inactive state to an active state.
    // Use this method to restart any tasks that were paused (or not yet started) when the scene was inactive.
  }

  @available(iOS 13.0, *)
  func sceneWillResignActive(_ scene: UIScene) {
     print("sceneWillResignActive", scene)
    // Called when the scene will move from an active state to an inactive state.
    // This may occur due to temporary interruptions (ex. an incoming phone call).
  }

  @available(iOS 13.0, *)
  func sceneWillEnterForeground(_ scene: UIScene) {
     print("sceneWillEnterForeground", scene)
    // Called as the scene transitions from the background to the foreground.
    // Use this method to undo the changes made on entering the background.
  }

  @available(iOS 13.0, *)
  func sceneDidEnterBackground(_ scene: UIScene) {
    
    print("sceneDidEnterBackground", scene)
    // Called as the scene transitions from the foreground to the background.
    // Use this method to save data, release shared resources, and store enough scene-specific state information
    // to restore the scene back to its current state.
  }
}

//@UIApplicationMain
//class AppDelegate: UIResponder, UIApplicationDelegate {
//
//   var window: UIWindow?
//
//
//   func application(application: UIApplication, didFinishLaunchingWithOptions launchOptions: [NSObject: AnyObject]?) -> Bool {
//      // Override point for customization after application launch.
//
//      let lbl = UILabel()
//      lbl.text = "+"
//      lbl.sizeToFit()
//
//      window!.addSubview(lbl)
//
//      lbl.center = (window?.center)!
//
//      window!.backgroundColor=UIColor.orangeColor()
//
//      return true
//   }
//
//   func applicationWillResignActive(application: UIApplication) {
//      // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
//      // Use this method to pause ongoing tasks, disable timers, and throttle down OpenGL ES frame rates. Games should use this method to pause the game.
//   }
//
//   func applicationDidEnterBackground(application: UIApplication) {
//      // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
//      // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
//   }
//
//   func applicationWillEnterForeground(application: UIApplication) {
//      // Called as part of the transition from the background to the inactive state; here you can undo many of the changes made on entering the background.
//   }
//
//   func applicationDidBecomeActive(application: UIApplication) {
//      // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
//   }
//
//   func applicationWillTerminate(application: UIApplication) {
//      // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
//   }
//
//
//}
