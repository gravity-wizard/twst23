//
//  viewCon_overrides.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
extension ViewController {
  override func viewWillTransition(
    to size: CGSize,
    with coordinator: UIViewControllerTransitionCoordinator) {
    super.viewWillTransition(to: size, with: coordinator)

    if UIDevice.current.userInterfaceIdiom == .phone {
      print("running on iPhone")
    }
    prepTransition(size: size)
//
  }}

extension ChildVC {
  override func viewDidLayoutSubviews() {
  }}

extension ViewController {
  override func viewDidAppear(_ animated: Bool) {
    
    receiveNotifications()
    
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(orientationChanged),
      name: UIDevice.orientationDidChangeNotification,
      object: nil)
    
    let cd = UIDevice.current
    cd.beginGeneratingDeviceOrientationNotifications()
    
    for vc in childArr {
      if vc.gm.state == .suspended {
        let ck = vc.resumeTimer()
        assert(abs(vc.gm.gameTime - ck) < 0.100)
      }}
  }
  override func viewWillDisappear(_ animated: Bool) {
    let cd = UIDevice.current
    cd.endGeneratingDeviceOrientationNotifications()
    
    for vc in childArr {
      if vc.gm.state == .fixing {
        vc.gm.gameTime =
          vc.pauseTimer()
        vc.gm.state  = .suspended
      }}
//    for vc in childArr {
//      assert(vc.timerObject == nil) // fails on close macos
//      }
  }
}
