//
//  TimeStat.swift
//  two3
//
//  Created by G on 12/31/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
class TimeStat: Stat {
    enum Stub: String, CaseIterable {
      case nowTime  = "Current Time: "
      case bestTime = "Personal Best: "
  //    static let allValues
  //        = TimeText.allCases.map { $0.rawValue }
    }
}
// n0t-!assert change '!' to '?' to chain optional iff nil
extension VC {
  func setNowStat(time: Double,
                  timeText: String,
                  u: String = #function) {
    //    let u2 = #function
    //    print(u2, time, u, g0scoreSlat?.tag as Any)
    /// step2_prepend_u2_&_print
    
    if g0scoreSlat == nil {
      //      print(u2, " g0scoreSlat == nil { return } ")
      return
    }
    let nowLabel =
      seekTimeStat(stub: .nowTime, inArr: g0scoreSlat!.statArr)
    nowLabel?.text = (nowLabel?.stub! ?? g0sTimeText) + timeText
    
    let doHideStat = ShowStat.timerSlatNow.rawValue % 2 == 0
    nowLabel?.isHidden = doHideStat
    
//    let toTryNow = true // n0t-toTryNow setsAlert
//    setBestStat(time: time, timeText: timeText)
  }
  func setBestStat(time: Double,
                   timeText: String,
                   u: String = #function) {
    let u2 = #function; print(u2, time, u, g0scoreSlat?.tag as Any)
    /// step2_prepend_u2_&_print
    
    if g0scoreSlat == nil {
      //      print(u2, " g0scoreSlat == nil { return } ")
      return
    }
    let nowLabel =
      seekTimeStat(stub: .bestTime, inArr: g0scoreSlat!.statArr)
    
    var newText = (nowLabel?.stub! ?? g0sBestText) + timeText
    
    if time > g0sTimeThreshold { newText = timeText }
    
    nowLabel?.text = newText

    
    let threshold = true //time < g0sTimeThreshold
    let hideStat = ShowStat.timerSlatBest.rawValue % 2 == 0
    let doHideStat = threshold && hideStat
    nowLabel?.isHidden = doHideStat
    
  }
  
  func getNowTimeString() -> String? {
    let timeNowLabel = seekTimeStat(stub: .nowTime, inArr: g0scoreSlat!.statArr)
    let timeNowString = timeNowLabel?.text
//    print("timeNowString", timeNowString as Any)
    
    return timeNowString
  }

  func seekTimeStat(
    stub: TimeStat.Stub,
    inArr stats: [Stat],
    u: String = #function) -> TimeStat? {
//    let u2 = #function; print(u2, stats, u, g0scoreSlat?.tag)
    // step2_prepend_u2_&_print arguments in sequence, then chain global tags
    var q = 0 // quanity
    var result: TimeStat?
    for e in stats {
      if e is TimeStat == false { continue }
    
      if (e.text!.contains(stub.rawValue)) {
        e.text = stub.rawValue
        result = (e as! TimeStat)
        q += 1
      }
    }
//    if q != 1 { print(u2, u, "wrdQ", q) }
    return result
  }
}

extension ChildVC {
//  func topLeftCenter(pivot: Pivot) -> U5Element {
    func u5timeElement() -> U5TimeElement {
    
    let formattedTimeText
      = 13.timeText(ti: 9876543210, leader: "Obsolete?")
      let clock = TimerLabel(formattedTimeText)
      
    let zeroTimeText_1dg = "0.0"
//    clockYposition = .below
    var timeBox = CGRect()
    timeBox.size = clock.frame.size
    clock.frame = timeBox
    clock.textColor = clock.auto(color: nil)

    clock.textAlignment = .right
    clock.text = zeroTimeText_1dg
    
    let timeSpot = U5TimeElement()
    timeSpot.cp = clock.center
    timeSpot.u5abe = clock
    
    return timeSpot
  }
}
