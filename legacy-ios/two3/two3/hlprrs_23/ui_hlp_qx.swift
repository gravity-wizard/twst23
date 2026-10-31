//
//  ui_hlp_qx.swift
//  two3
//
//  Created by G on 11/30/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import Foundation
// ui(#function + u + nm.rawValue)
/// _ _ _ f U n c t i o n I n f o r m a t i o n _ _ _
let xt = "+xt"
let x0t = "x0t" // was exit
let tfx = " tempFix "
// halt(ms:) 0ui(_:u:)slideNextDieIn(_:_:_:)impos+xt
extension Int {
  func ui(_ ms: String, u: String = #function) {
    gui(String(self) + #function + u + ms)
  }}
extension Double {
  func ui(_ ms: String, u: String = #function) {
    gui(String(self) + #function + u + ms)
  }}

internal // global
func gui(_ ms: String, u: String = #function) {
  print(#function + u, ms)
  if ms.contains(xt) { halt(message: ms) }
}
func halt(message: String,
          u:String = #function) {
  let u2 = #function
  print(u2, u, message)
  
  print("place a break here to halt the program")
}

extension Game {
  func ckMaxTries(
    u: String = #function) -> Bool {
    tries += 1
    let exceeds = tries > maxTries
    if exceeds {
      print (#function + u, gameName, gmtitle, tries)
    }
    return exceeds
  }
}
