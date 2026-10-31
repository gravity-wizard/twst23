//
//  note_hlp.swift
//  two3
//
//  Created by G on 12/8/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import SwiftUI


//let note = prepNote(name: .ready)
//send(note)
//NotificationCenter.default.post(
//  name: .didReadyGame, object: self)
extension Notification.Name {
  static let notGameReady = Notification.Name("notGameReady")
  static let truGameReady = Notification.Name("truGameReady")
  static let didCompleteTask = Notification.Name("didCompleteTask")
}
//The notification names are now available as static constants on the Notification.Name type, so you can use this syntax:
//
extension ViewController {
  func receiveNotifications() {
    
//    NotificationCenter.default.addObserver(
//      self,
//      selector: #selector(orientationChanged),
//      name: UIDevice.orientationDidChangeNotification,
//      object: nil)
    
    
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onNotGameReady(_:)),
      name: .notGameReady,
      object: nil)
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(onTruGameReady(_:)),
      name: .truGameReady,
      object: nil)
  }
  
  @objc func onNotGameReady(_ notification: Notification) {
    
    gui(#function + x0t)
    refreshOuterViews()
    
  }
  @objc func onTruGameReady(_ notification: Notification) {
    
    gui(#function + x0t)
    refreshOuterViews()
    
  }
}
