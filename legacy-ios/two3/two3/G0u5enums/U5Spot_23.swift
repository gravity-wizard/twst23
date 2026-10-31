//
//  U5Spot.swift
//  two4
//
//  Created by G on 11/21/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit
enum ABREV {
  case TL
  case TR
  case BL
  case BR
}
extension ChildVC {
  func centerSPOT(bv: ABREV) -> CGPoint {
    var cp = CGPoint.zero
    let tlc = topLeftCenter(pivot: psGrid)
    let trc = psGrid.mirrorX(point: tlc.cp!)
    switch bv {
      case .TL: cp = tlc.cp!
      case .TR: cp = trc
      case .BL: cp = psGrid.mirrorY(point: tlc.cp!)
      case .BR: cp = psGrid.mirrorY(point: trc)
    }
    return cp
  }
}

class U5TimeElement: U5Element { }
class U5Element {
  var cp:  CGPoint?
//  var cp0: CGPoint?
  var u5abe = U5Label()
  var u5btn = U5Button()
}
class U5Button: UIButton {}

class MoverLabel: U5Label {

  func getStringFor(move: Int) -> String {
        let fast = move // normal
//            let fast = move << move
        return "Move: " + fast.delimiter
  }
  
  func attibuted(moveText: String) -> NSMutableAttributedString {
    
    let att = NSMutableAttributedString(string: moveText)
    
    att.addAttribute(NSAttributedString.Key.font,
                     value:UIFont.systemFont(ofSize: FontSize.leader),
                      range:NSMakeRange(0, 5))
    att.addAttribute(NSAttributedString.Key.foregroundColor,
                     value:CCBLU.beige.__uiColor(),
                      range:NSMakeRange(0, 5))
    
    self.attributedText = att
    
    //    sizeToFit()
    return att
    
  }
}

class TimerLabel: U5Label {
  
  func getStringFor(time: Double) -> String {
    let fast = time // normal
//            let fast = pow(time, .pi) // quick
    //    let fast = pow(time, 5.0) // commentIn 2test
    //    let twoDigitDouble = fast.frmtNdigits(2)
    let oneDigitDouble = fast.dbRound(1)//frmtNdigits(1)
    //    let wholeNumber = fast.frmtNdigits(0)
    if fast < 1000 {
      text =  String(oneDigitDouble) // 1dg
    } else { text = 13.timeText(ti: fast, leader: nil) }
    
    return "Time: " + text!
  }
  
  func attibuted(timeText: String) -> NSMutableAttributedString {
        let att = NSMutableAttributedString(string: timeText)
    
    att.addAttribute(NSAttributedString.Key.font,
                      value:UIFont.systemFont(ofSize: FontSize.leader),
                      range:NSMakeRange(0, 5))
    att.addAttribute(NSAttributedString.Key.foregroundColor,
                     value:CCBLU.beige.__uiColor(),
                      range:NSMakeRange(0, 5))
    
    self.attributedText = att
    
    //    sizeToFit()
    return att
  }
}

class U5TimeLabel: U5Label {}
class U5Label: UILabel {
  
  var name: String = "u5 unNamed"
  
  public convenience init(_ maxText: String) {
    self.init()
    text = maxText
//    let fontSize = UIFont.systemFontSize
    
//   let font = UIFont(name: "HelveticaNeue-Thin", size: 16.0)!
//    font = UIFont(name: "DIN Alternate",
//                  size: 1.10 * FontSize.digits)!
    
    font = UIFont.monospacedDigitSystemFont(
      ofSize: 1.0 * FontSize.digits,
      weight: UIFont.Weight.semibold)
    
    sizeToFit()
  }
  init() {
    super.init(frame: .zero)
    if #available(iOS 10.0, *) {
      adjustsFontForContentSizeCategory = true
    } else {
      // Fallback on earlier versions
    }
  }
  required init?(coder: NSCoder) {
    fatalError("u5abe wrdimp")
  }}
extension Int {
  func timeText(
    ti: TimeInterval,
    leader: String?)
    -> String {
      let duration = ti //: TimeInterval = 7200.0
      let formatter = DateComponentsFormatter()
      formatter.unitsStyle = .positional
      // Use the appropriate positioning for the current locale
      formatter.allowedUnits = [ .hour, .minute, .second ]
      // Units to display in the formatted string
      formatter.zeroFormattingBehavior = [ .dropLeading ]
//      formatter.zeroFormattingBehavior = [ .pad ]
      // Pad with zeroes where appropriate for the locale
      let formattedDuration = formatter.string(from: duration)!
      
      let maxDuration = formattedDuration.maxLength(length: self)
      
      return (leader ?? "") + maxDuration
  }}
//https://stackoverflow.com/questions/32958709/how-do-you-limit-uilabel-characters-in-swift
//https://stackoverflow.com/questions/35215694/format-timer-label-to-hoursminutesseconds-in-swift/35215847
extension String {
  func maxLength(length: Int) -> String {
    var str = self
    let nsString = str as NSString
    if nsString.length >= length {
      str = nsString.substring(with:
        NSRange(
          location: 0,
          length: nsString.length > length ? length : nsString.length)
      )
    }
    return  str
  }}

