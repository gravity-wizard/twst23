//
//  AppDelegate.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

//var csetrr = ColorSetter( .light )

var ggXtru  = ggX // slide23 slider game puzzle
var ggXnot  = gg46 // gamePair for each app title

//var gg21    = Game2x1()
//var gg2q    = Game2x2()
//var gg32    = Game3x2()
//var gg43    = Game4x3()
//var gg4q    = Game4x4() // medium

var ggX     = Game_X_()
var gg46    = Game4x6()

let skpMIX    = 0
let skpFLIP   = 0
let disableFLIP = false
let disableSHUFFLE = false

let skpREAD   = 0
let skpROTT   = 0

///n0t  all false or 0 4normal \ \ \
//let ovrHIDE   = true
let ovrHIDE   = false // statusBar too


//let hidC0LR: UIColor = .orange
let hidC0LR: UIColor = .clear
let hidC0LR1: UIColor = .red
//let hidC0LR: UIColor = .clear
//let hidC0LR2: UIColor = .blue
let hidC0LR2: UIColor = .clear
//let hidC0LR3: UIColor = .systemBlue
let hidC0LR3: UIColor = .clear

let hidC0LR4mag: UIColor = .yellow
//let hidC0LR4: UIColor = .clear

//  0xFFeeDDccAA.hxa()

let skpHOME   = 0
let skpHOLE   = 0
let skpORIENT = 0
let skpRESIZE = 0
let skpEdgAbe = 1
let skpEdgBtn = 0
// earlyReturn = 1


@available(iOS 13.0, *)
@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
  
  var window: UIWindow?

  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
    // Override point for customization after application launch.
    
    window?.makeKeyAndVisible()
    
    return true
  }

  // MARK: UISceneSession Lifecycle

  func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
    // Called when a new scene session is being created.
    // Use this method to select a configuration to create the new scene with.
    return UISceneConfiguration(name: "Default Configuration", sessionRole: connectingSceneSession.role)
  }

  func application(_ application: UIApplication, didDiscardSceneSessions sceneSessions: Set<UISceneSession>) {
    // Called when the user discards a scene session.
    // If any sessions were discarded while the application was not running, this will be called shortly after application:didFinishLaunchingWithOptions.
    // Use this method to release any resources that were specific to the discarded scenes, as they will not return.
  }
}

