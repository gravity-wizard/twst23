//
//  ucGameClock.swift
//  two3
//
//  Created by G on 11/29/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

internal extension ChildVC  { // timeSender
  func startTimer(at: Double?,
                  f:String = #function) -> Double {
    
    gm.gameTime = at ?? gm.gameTime
    // resume if nil
    timerDuration = gm.gameTime
    timerButton.setText(tmcs: .play)
    return toggleTimer(timerButton)
  }
  func resumeTimer() -> Double {
    print(#function)
    
    if timerObject == nil {
      bg(.weird); return gm.gameTime
    }
    timerButton.setText(tmcs: .resume)
    bg(.resume)
    return toggleTimer(timerButton)
  }
  func pauseTimer() -> Double {
    print(#function)
    if timerObject == nil {
//      gui(xt)
      bg(.weird); return gm.gameTime
    }
    timerButton.setText(tmcs: .pause)
    bg(.pause)
    return toggleTimer(timerButton)
  }
  @objc func toggleTimer0bjc(tndr: TimerButton) {
    print("tt0", tndr.titleLabel!.text!)
    let tmcs = tndr.titleLabel!.text!
    
    switch tmcs {
    case TMCSnm.play.rawValue:
      _ = startTimer(at: 0)
    case TMCSnm.pause.rawValue:
      _ = pauseTimer()
    case TMCSnm.resume.rawValue:
      _ = resumeTimer()
    default: print("wrd tmcs")
    }
    //    recenterTimerViews()
  }
  func toggleTimer(_ tndr: TimerButton,
                   u:String = #function) -> Double {
    let u2 = #function
    print(u2, u, "Δ⏱️Δ ", timerDuration, tndr.titleLabel!.text!)
    
    if gm.state == .solved { return 0.00 - gm.gameTime }
    
    var on = false
    
    if tndr.chkText( .play)
      || tndr.chkText(.resume) {
      tndr.setText(tmcs:.pause)
      on = true
    }
    // prevent click crash during shuffle
    psGrid.isUserInteractionEnabled = on
    if on {
      print("tmron", on)
      if #available(iOS 10.0, *) {
        timerObject = Timer.scheduledTimer(
          withTimeInterval: Gitss.gcInterval,
          repeats: true, block: { [weak self] (_) in
            guard let strongSelf = self else { return }
            strongSelf.timerDuration += Gitss.gcDuration
            
            let strongDouble
              = strongSelf.timerDuration
            self!.timerValue = strongDouble
            self!.updateTimer(
              to: self!.timerValue)
            self!.gm.state = .fixing
        })
      } else {
        // Fallback on earlier versions
      }
    } else {
      gm.state = .paused
      tndr.setText(tmcs:.resume)
      //            tndr.sizeToFit()
      timerObject!.invalidate()
      print(gm.gameName, gm.state)
    }
    
    return timerValue
  }
}
extension Double {
  func dblString(
    _ nm: String = "",
    f: String = #function) -> String {
    let sr =
      //        f + " " +
      nm + " " + String(describing: self)
    return sr }
  
  func frmtNdigits(_ fN: Int) -> String {
    return String(format: "%.\(fN)f", self)
  }
}
//https://stackoverflow.com/questions/29711679/forcing-a-number-to-be-displayed-with-2-decimal-places-using-swift

