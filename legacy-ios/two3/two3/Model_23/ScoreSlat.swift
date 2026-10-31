//
//  g0scoreSlat.swift
//  two3
//
//  Created by G on 12/31/19.
//  Copyright © 2019 akapps. All rights reserved.
//

import UIKit

class MenuSlat: SlatView {}
class SettingsSlat: MenuSlat {}

class SlatView: UIView {
  //  class Slat: UILabel {
  var isExtended = false
  var doneButton = UIButton()
  //  isUserInteractionEnabled = true critical_for_label
}
let g0sAlphaSlats: CGFloat = 0.75
class ScoreSlat: SlatView {
  var titleBar = Stat(stub: " Title: ")
  var statArr: [Stat] = []
  var moveArr: [MoveStat] = []
  var timeArr: [TimeStat] = []
  
  init( /// step1_collect_sequence
    title: String,
    times: [Double],
    moves: [Int],
    u: String = #function) { let u2 = #function
    /// n0t-note+ notePlus for bestPractice
    //MARK: note+GS+191231a u2_is_calledFunction
    print(u2, title, times, moves, u) /// g0scoreSlat?.tag <-- example
    /// step2_prepend_u2_&_print arguments in sequence, then chain tags
    
    titleBar.text = title
    let tc = times.count
    let mc = moves.count
    assert(tc==2 && mc==2) /// step3_assert
    ///    frame = g0sTopRect /// step4_breakHere__dbug
    super.init(frame: g0sTopRect)
    //    backgroundColor = .cyan wrd noResponse
    
    var nof: Int = 1
    //    let noff = CGFloat(nof) // n of float
    //    let all = CGFloat(tc) + CGFloat(mc)
    
    // elementWidthAllotted
    let ewa = frame.width  * 1.0 / (5.5) * 1.00// 153.6 iPad
    let eha = frame.height * 1.0 / (4.0) * 1.00// 20.48 ipad
    //    let stub: String = " o 0 o 0 o 0 o 0 o 0 o "
    let maxMove = " 000_000 "      // < millionMoves
    let maxTime = " 000_000:00:00 " // < millionHours
    
//    let statFont = true
    FontSize.digits = self.sizedFont(.dinCond).pointSize
    //    titleLabel!.font = sizedFont(.dinCond)
    
    // elementMagnifiers
    let ewm: CGFloat = 1.50 // width
    let ehm: CGFloat = 1.10 // height
    let eAlpha: CGFloat = g0sAlphaSlats
    
    let rw = 1 // skip1row
    //    statArr = []
    for (i, time) in TimeStat.Stub.allCases .enumerated() {
      nof += 1
      let s = TimeStat(stub: time.rawValue)
      
      let maxText = s.stub! + maxTime
      s.text = maxText
      //      s.sizeToFit()
      s.frame.size.width  = ewa * ewm
      s.frame.size.height = eha * ehm
      s.font = s.sizedFont(.dinStat)
      s.alpha = eAlpha
      
      addSubview(s)
      statArr.append(s)
      assert(s.setTag(i: nof))
      //      print(u, "ts.text", s.text!)
      s.textColor = s.auto(color: nil)
      s.center.x += CGFloat(00 + nof / 2) * ewa
      s.center.y += CGFloat(rw + nof % 2) * eha
      
      let initTimeText = s.stub! + String(times[i]) // + String(nof)
      print(u2, initTimeText, initTimeText)
      s.text = initTimeText
      //      s.backgroundColor = .gray
    }
    nof += 2 // skipCenterCollumn
    
    for (i, move) in MoveStat.Stub.allCases .enumerated() {
      nof += 1
      let s = MoveStat(stub: move.rawValue)
      
      let maxText = s.stub! + maxMove
      s.text = maxText
      //          s.sizeToFit()
      s.frame.size.width  = ewa * ewm
      s.frame.size.height = eha * ehm
      s.font = s.sizedFont(.dinStat)
      s.alpha = eAlpha
      
      addSubview(s)
      statArr.append(s) // tagWhen added to an array
      assert(s.setTag(i: nof))
      //      print(u, "ts.text", s.text!)
      s.textColor = s.auto(color: nil)
      s.center.x += CGFloat(00 + nof / 2) * ewa
      s.center.y += CGFloat(rw + nof % 2) * eha
      s.text = s.stub! + String(moves[i]) // + String(nof)
      //          s.backgroundColor = .gray
    }
  }
  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }
}

extension ViewController {
  func slatMakeTopByFractions(
    x: CGFloat,
    y: CGFloat,
    u: String = #function) { let u2 = #function
    print(u2,x,y,u, "!assert(scoreSlat == nil)", g0scoreSlat?.tag as Any)
    
    var w7 = x
    var h7 = y
    
    if x == 0 && !g0vPortraight {
      w7 = g0sDownDefault.dx
    }
    if y == 0 && !g0vPortraight {
      h7 = g0sDownDefault.dy
    }
    if x == 0 && g0vPortraight {
      w7 = g0sAcrossDefault.dx
    }
    if y == 0 && g0vPortraight {
      h7 = g0sAcrossDefault.dy
    }
    
    if x > 16.1 { w7 = x } // override with pixel width
    if y > 16.1 { h7 = y } // override with pixel height
    
    if x > 0.1 && x < 16.2 { w7 = view.frame.width / x } // frational width
    if y > 0.1 && x < 16.2 { h7 = view.frame.height / y } // frational height
    
    if g0scoreSlat != nil {
      g0scoreSlat!.frame.size.width = w7
      g0scoreSlat!.frame.size.height = h7
      
      g0scoreSlat!.doneButton.frame.origin.x =
        g0scoreSlat!.frame.width - g0scoreSlat!.doneButton.frame.width
      print("dunBtn", g0scoreSlat?.doneButton.center ?? .zero)
      
      //      view.addSubview(scoreSlat!)
      
      if #available(iOS 13.0, *) {
        g0scoreSlat?.backgroundColor = .some(.systemIndigo)
      } else {
        // Fallback on earlier versions
      }
      print(u, w7, h7, " g0scoreSlat != nil { return } ")
//      let resume:Int?
      
      g0scoreSlat?.isHidden = true
      
      return
    }
    g0scoreSlat = view.fractionalScoreSlat(width: w7, height: h7)
    
    let burgerScaleFactor: CGFloat = 1.0
    let edge = burgerHeight * burgerScaleFactor
    topBurger.frame.size = CGSize(width: edge, height: edge)
    
    topBurger.center.y = g0sTopY // 0.0
    
    print("scoreSlat", g0scoreSlat!)
    g0scoreSlat?.backgroundColor = .purple
    
    view.addSubview(g0scoreSlat!) // autoColor
    view.addSubview(topBurger)
    slatColorize1bt()// toTest autoColor
    let x = g0scoreSlat!.xButton(text: .hide)
    g0scoreSlat!.doneButton = x
    x.addTarget(self, action: #selector(
      xButtonClicked(sndr: )), for: .touchUpInside)
    
    topBurger.addTarget(self, action: #selector( /// =================>
      grabButtonClicked1bt(sndr: )), for: .touchUpInside)
    
    let numberOfPopButtons = 2//populateMenusTop()
    topBurger.hamburger(quant: numberOfPopButtons)
    
  }
  func slatColorize1bt(u:String=#function) {
    let u2 = #function
    print(u2, u, g0scoreSlat?.tag as Any)
    g0scoreSlat?.backgroundColor = CCBLU.bluemdm.__uiColor()
    
  }}
extension ViewController {
  @objc func grabButtonClicked1bt(sndr: UIButton?) {
    //    let u2 = #function
    //    print(u2, "isext", g0scoreSlat!.isExtended)
    
    simTopBurgerClick(sndr)
  }
  func simTopBurgerClick(_ sender: UIButton?,
                         u: String = #function) {
    let u2 = #function
    print(u2, sender?.tag as Any, u, "isext", g0scoreSlat!.isExtended)
    
    if g0scoreSlat!.isExtended {
      g0scoreSlat?.isHidden = false
      vcSlatRetractTop(unlock: true)
      return
    }
//    let trigger = 1 trigger rebuild
    //    g0scoreSlat!.tag = 0 - 723 // trigger gbc
    
    let bounds = UIScreen.main.bounds // bugFixed
    g0vPortraight = bounds.width < bounds.height
    let isPortraight = g0vPortraight
    //    isPortraight = UIDevice.current.orientation.isPortrait
    
    print("isPortraight", isPortraight, bounds)
    
    if isPortraight {
      let across: CGVector = topBurger.acrossVector
      g0scoreSlatRightByFractions(x: across.dx, y: across.dy)
    } else {
      let down: CGVector = topBurger.downVector
      g0scoreSlatDownByFractions(x: down.dx, y: down.dy)
    }
    
    //    view.bringSubviewToFront(sndr!)
    view.bringSubviewToFront(topBurger)
    view.bringSubviewToFront(grab1bb)
    
  }
  func g0scoreSlatDownByFractions(x: CGFloat, y: CGFloat) {
    if g0scoreSlat?.tag ?? (-190426) < 1 { slatMakeTopByFractions(x: x, y: y) }
    assert(g0scoreSlat!.frame != .zero)
    assert(g0scoreSlat!.superview == view)
    
    g0scoreSlat?.isHidden = false
    self.topBurger.isUserInteractionEnabled = false
    g0scoreSlat!.superview?.bringSubviewToFront(g0scoreSlat!)
    UIView.animate(withDuration: 0.3, delay:0.05, animations: {
      
      g0scoreSlat!.frame.origin = .zero
      g0scoreSlat!.center.y = 0 + g0scoreSlat!.frame.height / 2.0
      
      //      self.scoreSlat!.frame.origin = .zero
      //      self.scoreSlat!.center.y = 0 + self.scoreSlat!.frame.height / 2.0
      
    }, completion: { finished in
      g0scoreSlat?.isExtended = true
      self.topBurger.isUserInteractionEnabled = true
      g0scoreSlat!.unlockUIvw()
      //      self.scoreSlat!.unlockUIvw()
    })
  }
  
  func g0scoreSlatRightByFractions(
    x: CGFloat,
    y: CGFloat,
    u: String = #function) { let u2 = #function
    print(u2, x, y, u, g0scoreSlat?.tag as Any)
    if g0scoreSlat?.tag ?? (-191826) < 1 { slatMakeTopByFractions(x: x, y: y) }
    assert(g0scoreSlat!.frame != .zero)
    
    //    assert(scoreSlat!.superview == view)
    g0scoreSlat?.isHidden = false
    self.topBurger.isUserInteractionEnabled = false
    g0scoreSlat!.superview?.bringSubviewToFront(g0scoreSlat!)
    UIView.animate(withDuration: 0.3, delay:0.05, animations: {
      
      //      self. // buggy fixedGlobal
      g0scoreSlat!.frame.origin = .zero
      //      self.
      g0scoreSlat!.center.x = 0 + // self.
        g0scoreSlat!.frame.width / 2.0
      
    }, completion: { finished in
      g0scoreSlat!.isExtended = true
      self.topBurger.isUserInteractionEnabled = true
      //      self.scoreSlat!.unlockUIvw()
    })
  }
  func vcSlatRetractTop(
    unlock: Bool,
    u: String = #function) { let u2 = #function
    print(u2, unlock, u, g0scoreSlat?.tag as Any)
    
    //    let frac: CGVector = topBurger.across!
    if g0scoreSlat?.tag ?? (-140912) < 0 { slatMakeTopByFractions(x: 0, y: 0) }
    
    self.topBurger.isUserInteractionEnabled = false
    g0scoreSlat!.superview?.bringSubviewToFront(g0scoreSlat!)
    UIView.animate(withDuration: 0.3, delay:0.05, animations: {
      
      g0scoreSlat!.frame.origin.y = 0.0
      g0scoreSlat!.center.x =
        0.0 - g0scoreSlat!.frame.width / 2.0
      
    }, completion: { finished in
      g0scoreSlat?.isHidden = true
      g0scoreSlat?.isExtended = false
      self.topBurger.isUserInteractionEnabled = true
      //                self.unlockUserInterfaceQ()
    })
  }}

